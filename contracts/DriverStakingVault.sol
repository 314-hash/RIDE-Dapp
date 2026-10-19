// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DriverStakingVault
 * @notice Staking vault for RIDE TOKENS mobility drivers on Sidra Chain.
 * @dev Staking RIDE reduces platform commission fees and increases dispatch priority.
 * Target Network: Sidra Chain (Chain ID: 97453)
 * RIDE Token: 0xe91cAC00C1092611EB598B284a87A623a35aF9b7
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract DriverStakingVault {
    // --- Custom Errors ---
    error ZeroAmount();
    error InsufficientStake();
    error CooldownActive(uint256 unlockTimestamp, uint256 currentTimestamp);
    error NoPendingUnstake();
    error ExistingCooldownPending();
    error Unauthorized();
    error TransferFailed();
    error ZeroAddress();
    error ContractPaused();

    enum DriverTier { 
        Standard, // 0: 0 RIDE staked -> 8.0% platform fee
        Silver,   // 1: 50 RIDE staked -> 6.0% platform fee
        Gold,     // 2: 100 RIDE staked -> 4.5% platform fee
        Diamond   // 3: 250 RIDE staked -> 2.0% platform fee
    }

    struct StakeInfo {
        uint256 stakedAmount;
        uint256 unlockTimestamp;
        uint256 pendingUnstakeAmount;
        uint256 totalLifetimeEarnings;
        uint256 lastStakedTimestamp;
    }

    IERC20 public immutable rideToken;
    address public owner;
    bool public paused;

    uint256 public constant UNSTAKE_COOLDOWN = 2 days;

    // Minimum tokens for each tier (18 decimals)
    uint256 public constant SILVER_THRESHOLD  = 50 * 10**18;  // 50 RIDE
    uint256 public constant GOLD_THRESHOLD    = 100 * 10**18; // 100 RIDE
    uint256 public constant DIAMOND_THRESHOLD = 250 * 10**18; // 250 RIDE

    // Commission fee basis points (10000 = 100%)
    uint256 public constant STANDARD_FEE_BPS = 800; // 8.0%
    uint256 public constant SILVER_FEE_BPS   = 600; // 6.0%
    uint256 public constant GOLD_FEE_BPS     = 450; // 4.5%
    uint256 public constant DIAMOND_FEE_BPS  = 200; // 2.0%
    uint256 public constant BPS_DENOMINATOR  = 10000;

    mapping(address => StakeInfo) public driverStakes;
    uint256 public totalStakedTokens;

    // --- Reentrancy Guard ---
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Events ---
    event Staked(address indexed driver, uint256 amount, uint256 newTotalStake, DriverTier tier);
    event UnstakeRequested(address indexed driver, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed driver, uint256 amount, uint256 remainingStake, DriverTier newTier);
    event UnstakeCancelled(address indexed driver, uint256 amountRestored);
    event PausedStateChanged(bool isPaused);

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    constructor(address _rideToken) {
        if (_rideToken == address(0)) revert ZeroAddress();
        rideToken = IERC20(_rideToken);
        owner = msg.sender;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Stake RIDE tokens to upgrade driver tier and reduce platform fees.
     * @param amount Token amount in wei (18 decimals).
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        bool success = rideToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        StakeInfo storage info = driverStakes[msg.sender];
        info.stakedAmount += amount;
        info.lastStakedTimestamp = block.timestamp;
        totalStakedTokens += amount;

        DriverTier tier = getDriverTier(msg.sender);
        emit Staked(msg.sender, amount, info.stakedAmount, tier);
    }

    /**
     * @notice Request to unstake tokens (initiates 2-day anti-abuse cooldown).
     * @param amount Token amount to unstake.
     */
    function requestUnstake(uint256 amount) external whenNotPaused nonReentrant {
        StakeInfo storage info = driverStakes[msg.sender];
        if (amount == 0 || info.stakedAmount < amount) revert InsufficientStake();

        // If driver already has pending unstake, require either finalizing or explicit consolidation
        if (info.pendingUnstakeAmount > 0 && block.timestamp < info.unlockTimestamp) {
            revert ExistingCooldownPending();
        }

        info.stakedAmount -= amount;
        info.pendingUnstakeAmount += amount;
        info.unlockTimestamp = block.timestamp + UNSTAKE_COOLDOWN;

        emit UnstakeRequested(msg.sender, amount, info.unlockTimestamp);
    }

    /**
     * @notice Cancel pending unstake and restake tokens immediately without penalty.
     */
    function cancelUnstake() external whenNotPaused nonReentrant {
        StakeInfo storage info = driverStakes[msg.sender];
        uint256 pending = info.pendingUnstakeAmount;
        if (pending == 0) revert NoPendingUnstake();

        info.pendingUnstakeAmount = 0;
        info.stakedAmount += pending;
        info.unlockTimestamp = 0;

        emit UnstakeCancelled(msg.sender, pending);
    }

    /**
     * @notice Finalize unstake and receive tokens after 2-day cooldown has elapsed.
     */
    function finalizeUnstake() external nonReentrant {
        StakeInfo storage info = driverStakes[msg.sender];
        uint256 amount = info.pendingUnstakeAmount;
        if (amount == 0) revert NoPendingUnstake();
        if (block.timestamp < info.unlockTimestamp) {
            revert CooldownActive(info.unlockTimestamp, block.timestamp);
        }

        info.pendingUnstakeAmount = 0;
        info.unlockTimestamp = 0;
        totalStakedTokens -= amount;

        bool success = rideToken.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        DriverTier newTier = getDriverTier(msg.sender);
        emit Unstaked(msg.sender, amount, info.stakedAmount, newTier);
    }

    /**
     * @notice Get current driver tier based on active stake.
     */
    function getDriverTier(address driver) public view returns (DriverTier) {
        uint256 amount = driverStakes[driver].stakedAmount;
        if (amount >= DIAMOND_THRESHOLD) return DriverTier.Diamond;
        if (amount >= GOLD_THRESHOLD) return DriverTier.Gold;
        if (amount >= SILVER_THRESHOLD) return DriverTier.Silver;
        return DriverTier.Standard;
    }

    /**
     * @notice Get platform fee in basis points for a given driver.
     * Called by RideBookingEscrow to apply driver tier commission discount.
     */
    function getDriverFeeBps(address driver) external view returns (uint256) {
        DriverTier tier = getDriverTier(driver);
        if (tier == DriverTier.Diamond) return DIAMOND_FEE_BPS;
        if (tier == DriverTier.Gold) return GOLD_FEE_BPS;
        if (tier == DriverTier.Silver) return SILVER_FEE_BPS;
        return STANDARD_FEE_BPS;
    }

    /**
     * @notice Get full driver stake info in one call.
     */
    function getStakeInfo(address driver) external view returns (
        uint256 activeStake,
        uint256 pendingUnstake,
        uint256 unlockTimestamp,
        DriverTier tier,
        uint256 feeBps
    ) {
        StakeInfo memory s = driverStakes[driver];
        DriverTier t = getDriverTier(driver);
        uint256 bps = t == DriverTier.Diamond ? DIAMOND_FEE_BPS :
                      t == DriverTier.Gold ? GOLD_FEE_BPS :
                      t == DriverTier.Silver ? SILVER_FEE_BPS : STANDARD_FEE_BPS;
        return (s.stakedAmount, s.pendingUnstakeAmount, s.unlockTimestamp, t, bps);
    }

    // --- Admin Functions ---
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }
}
