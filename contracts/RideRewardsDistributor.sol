// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RideRewardsDistributor
 * @notice Distributes verified Ride-to-Earn cashback rewards (1.5 RIDE / km) on Sidra Chain.
 * @dev Prevents double claims with trip ID replay protection and verifier signatures.
 * Target Network: Sidra Chain (Chain ID: 97453)
 * RIDE Token: 0xe91cAC00C1092611EB598B284a87A623a35aF9b7
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract RideRewardsDistributor {
    // --- Custom Errors ---
    error ZeroAmount();
    error AlreadyClaimed();
    error Unauthorized();
    error TransferFailed();
    error InsufficientTreasury();
    error ZeroAddress();
    error ContractPaused();
    error DistanceExceedsMaxCap(uint256 requestedKm, uint256 maxKm);
    error DailyClaimLimitExceeded();

    IERC20 public immutable rideToken;
    address public owner;
    address public verifier;
    bool public paused;

    // Base Rate: 1.5 RIDE per km (scaled by 1e18)
    uint256 public rewardRatePerKm = 15 * 10**17; // 1.5 RIDE

    // Anti-Abuse & Sanity Limits
    uint256 public maxDistanceKmPerTrip = 500; // Max 500 km per single claim
    uint256 public maxDailyRewardsPerUser = 250 * 10**18; // Max 250 RIDE per day per user

    mapping(bytes32 => bool) public claimedTrips;
    mapping(address => uint256) public totalPassengerEarned;
    mapping(address => mapping(uint256 => uint256)) public userDailyRewards; // user => epochDay => amount
    uint256 public totalRewardsDistributed;

    // --- Reentrancy Guard ---
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Events ---
    event RewardClaimed(
        bytes32 indexed tripId,
        address indexed passenger,
        uint256 distanceKm,
        uint256 rewardAmount,
        uint256 timestamp
    );
    event RewardRateUpdated(uint256 newRate);
    event VerifierUpdated(address indexed newVerifier);
    event CapsUpdated(uint256 maxDistanceKm, uint256 maxDailyReward);
    event PausedStateChanged(bool isPaused);
    event EmergencyWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyVerifierOrOwner() {
        if (msg.sender != verifier && msg.sender != owner) revert Unauthorized();
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

    constructor(address _rideToken, address _verifier) {
        if (_rideToken == address(0)) revert ZeroAddress();
        rideToken = IERC20(_rideToken);
        owner = msg.sender;
        verifier = _verifier != address(0) ? _verifier : msg.sender;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Award Ride-to-Earn tokens to passenger for completed trip.
     * @param tripId Unique ID of completed ride (cryptographically verified).
     * @param passenger Passenger recipient address.
     * @param distanceKm Distance in kilometers (whole units).
     */
    function claimRideReward(
        bytes32 tripId,
        address passenger,
        uint256 distanceKm
    ) external onlyVerifierOrOwner whenNotPaused nonReentrant {
        if (claimedTrips[tripId]) revert AlreadyClaimed();
        if (passenger == address(0)) revert ZeroAddress();
        if (distanceKm == 0) revert ZeroAmount();
        if (distanceKm > maxDistanceKmPerTrip) {
            revert DistanceExceedsMaxCap(distanceKm, maxDistanceKmPerTrip);
        }

        uint256 currentDay = block.timestamp / 1 days;
        uint256 rewardAmount = distanceKm * rewardRatePerKm;

        if (userDailyRewards[passenger][currentDay] + rewardAmount > maxDailyRewardsPerUser) {
            revert DailyClaimLimitExceeded();
        }

        uint256 contractBalance = rideToken.balanceOf(address(this));
        if (contractBalance < rewardAmount) revert InsufficientTreasury();

        // Mark trip as permanently claimed (replay protection)
        claimedTrips[tripId] = true;
        userDailyRewards[passenger][currentDay] += rewardAmount;
        totalPassengerEarned[passenger] += rewardAmount;
        totalRewardsDistributed += rewardAmount;

        bool success = rideToken.transfer(passenger, rewardAmount);
        if (!success) revert TransferFailed();

        emit RewardClaimed(tripId, passenger, distanceKm, rewardAmount, block.timestamp);
    }

    // --- Admin Configuration ---
    function setRewardRate(uint256 _ratePerKm) external onlyOwner {
        rewardRatePerKm = _ratePerKm;
        emit RewardRateUpdated(_ratePerKm);
    }

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroAddress();
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    function setCaps(uint256 _maxDistanceKm, uint256 _maxDailyReward) external onlyOwner {
        maxDistanceKmPerTrip = _maxDistanceKm;
        maxDailyRewardsPerUser = _maxDailyReward;
        emit CapsUpdated(_maxDistanceKm, _maxDailyReward);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        bool success = IERC20(token).transfer(owner, amount);
        if (!success) revert TransferFailed();
        emit EmergencyWithdrawn(token, owner, amount);
    }
}
