// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RideBookingEscrow
 * @notice Trustless fare escrow and settlement for RIDE TOKENS mobility on Sidra Chain.
 * @dev Supports both RIDE token payments (with automatic 15% discount) and native SDA payments.
 * Target Network: Sidra Chain (Chain ID: 97453)
 * Deployed RIDE Token: 0xe91cAC00C1092611EB598B284a87A623a35aF9b7
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IDriverStaking {
    function getDriverFeeBps(address driver) external view returns (uint256);
}

contract RideBookingEscrow {
    // --- Custom Errors ---
    error TripAlreadyExists();
    error TripNotFound();
    error InvalidTripState();
    error Unauthorized();
    error InsufficientPayment();
    error ExcessPaymentRefundFailed();
    error TransferFailed();
    error ZeroAddress();
    error ContractPaused();
    error InvalidParameters();
    error DisputeAllocationExceeded();

    // --- State Types ---
    enum TripStatus { 
        None,           // 0: Uninitialized
        Deposited,      // 1: Fare locked in escrow
        InProgress,     // 2: Pickup confirmed, ride active
        Completed,      // 3: Destination reached, funds settled
        Cancelled,      // 4: Ride aborted, refund processed
        Disputed        // 5: Dispute logged, funds frozen
    }

    struct Trip {
        bytes32 tripId;
        address passenger;
        address driver;
        uint256 fareAmount;       // Agreed gross fare
        uint256 depositAmount;    // Actual amount deposited (discounted if paid in RIDE)
        bool isRideToken;         // True if paid in RIDE, false if native SDA
        TripStatus status;
        uint256 depositTimestamp;
        uint256 completedTimestamp;
        uint256 feeBpsSnapshot;   // Driver commission fee basis points at completion
    }

    // --- State Variables ---
    address public owner;
    address public treasury;
    address public verifier;
    IERC20 public immutable rideToken;
    IDriverStaking public stakingVault;

    bool public paused;
    uint256 public constant BASE_PLATFORM_FEE_BPS = 800; // 8.0%
    uint256 public constant TOKEN_DISCOUNT_BPS = 1500;   // 15.0% discount when paying in RIDE
    uint256 public constant BPS_DENOMINATOR = 10000;

    mapping(bytes32 => Trip) public trips;

    // --- Reentrancy Guard ---
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Events ---
    event TripDeposited(
        bytes32 indexed tripId,
        address indexed passenger,
        address indexed driver,
        uint256 grossFare,
        uint256 depositAmount,
        bool isRideToken
    );
    event TripStarted(bytes32 indexed tripId, address indexed driver);
    event TripCompleted(
        bytes32 indexed tripId,
        address indexed driver,
        uint256 driverPayout,
        uint256 platformFee,
        uint256 feeBpsUsed
    );
    event TripCancelled(
        bytes32 indexed tripId,
        address indexed refundTo,
        uint256 refundAmount,
        string reason
    );
    event TripDisputed(bytes32 indexed tripId, address indexed reporter, string reason);
    event DisputeResolved(
        bytes32 indexed tripId,
        uint256 passengerRefund,
        uint256 driverPayout,
        uint256 platformFee
    );
    event TreasuryUpdated(address indexed newTreasury);
    event VerifierUpdated(address indexed newVerifier);
    event StakingVaultUpdated(address indexed newVault);
    event PausedStateChanged(bool isPaused);

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

    constructor(
        address _rideToken,
        address _treasury,
        address _verifier
    ) {
        if (_rideToken == address(0) || _treasury == address(0)) revert ZeroAddress();
        owner = msg.sender;
        rideToken = IERC20(_rideToken);
        treasury = _treasury;
        verifier = _verifier != address(0) ? _verifier : msg.sender;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Deposit fare into escrow for a trip.
     * @param tripId Unique identifier for the trip.
     * @param driver Designated driver address.
     * @param grossFare Agreed trip fare in wei (or token units).
     * @param payWithRide True if paying with RIDE token (15% discount applied), false if native SDA.
     */
    function depositFare(
        bytes32 tripId,
        address driver,
        uint256 grossFare,
        bool payWithRide
    ) external payable whenNotPaused nonReentrant {
        if (trips[tripId].status != TripStatus.None) revert TripAlreadyExists();
        if (driver == address(0) || driver == msg.sender) revert InvalidParameters();
        if (grossFare == 0) revert InsufficientPayment();

        uint256 requiredDeposit = grossFare;

        if (payWithRide) {
            if (msg.value > 0) revert InvalidParameters(); // No native SDA expected for RIDE payment

            // Apply 15% discount for RIDE token payments
            uint256 discount = (grossFare * TOKEN_DISCOUNT_BPS) / BPS_DENOMINATOR;
            requiredDeposit = grossFare - discount;

            // Transfer RIDE tokens from passenger to escrow
            bool success = rideToken.transferFrom(msg.sender, address(this), requiredDeposit);
            if (!success) revert TransferFailed();
        } else {
            // Native SDA payment
            if (msg.value < grossFare) revert InsufficientPayment();
            requiredDeposit = grossFare;

            // Refund any excess native payment
            if (msg.value > grossFare) {
                uint256 excess = msg.value - grossFare;
                (bool excessSuccess, ) = payable(msg.sender).call{value: excess}("");
                if (!excessSuccess) revert ExcessPaymentRefundFailed();
            }
        }

        trips[tripId] = Trip({
            tripId: tripId,
            passenger: msg.sender,
            driver: driver,
            fareAmount: grossFare,
            depositAmount: requiredDeposit,
            isRideToken: payWithRide,
            status: TripStatus.Deposited,
            depositTimestamp: block.timestamp,
            completedTimestamp: 0,
            feeBpsSnapshot: BASE_PLATFORM_FEE_BPS
        });

        emit TripDeposited(tripId, msg.sender, driver, grossFare, requiredDeposit, payWithRide);
    }

    /**
     * @notice Mark trip as in-progress once pickup is confirmed.
     */
    function startTrip(bytes32 tripId) external whenNotPaused {
        Trip storage trip = trips[tripId];
        if (trip.status != TripStatus.Deposited) revert InvalidTripState();
        if (msg.sender != trip.passenger && msg.sender != trip.driver && msg.sender != verifier && msg.sender != owner) {
            revert Unauthorized();
        }

        trip.status = TripStatus.InProgress;
        emit TripStarted(tripId, trip.driver);
    }

    /**
     * @notice Complete trip and release escrowed funds to driver.
     * Can be confirmed by passenger, designated verifier, or contract owner.
     */
    function completeTrip(bytes32 tripId) external whenNotPaused nonReentrant {
        Trip storage trip = trips[tripId];
        if (trip.status != TripStatus.Deposited && trip.status != TripStatus.InProgress) {
            revert InvalidTripState();
        }

        // Only passenger, designated verifier, or owner can finalize
        if (msg.sender != trip.passenger && msg.sender != verifier && msg.sender != owner) {
            revert Unauthorized();
        }

        trip.status = TripStatus.Completed;
        trip.completedTimestamp = block.timestamp;

        // Calculate platform fee based on driver staking tier
        uint256 feeBps = BASE_PLATFORM_FEE_BPS;
        if (address(stakingVault) != address(0)) {
            try stakingVault.getDriverFeeBps(trip.driver) returns (uint256 customBps) {
                if (customBps < feeBps) {
                    feeBps = customBps;
                }
            } catch {}
        }
        trip.feeBpsSnapshot = feeBps;

        uint256 feeAmount = (trip.depositAmount * feeBps) / BPS_DENOMINATOR;
        uint256 driverPayout = trip.depositAmount - feeAmount;

        // Execute payouts
        if (trip.isRideToken) {
            if (feeAmount > 0) {
                bool feeSuccess = rideToken.transfer(treasury, feeAmount);
                if (!feeSuccess) revert TransferFailed();
            }
            bool payoutSuccess = rideToken.transfer(trip.driver, driverPayout);
            if (!payoutSuccess) revert TransferFailed();
        } else {
            if (feeAmount > 0) {
                (bool feeSuccess, ) = payable(treasury).call{value: feeAmount}("");
                if (!feeSuccess) revert TransferFailed();
            }
            (bool driverSuccess, ) = payable(trip.driver).call{value: driverPayout}("");
            if (!driverSuccess) revert TransferFailed();
        }

        emit TripCompleted(tripId, trip.driver, driverPayout, feeAmount, feeBps);
    }

    /**
     * @notice Cancel ride and refund passenger before in-progress trip occurs.
     */
    function cancelTrip(bytes32 tripId, string calldata reason) external nonReentrant {
        Trip storage trip = trips[tripId];
        if (trip.status != TripStatus.Deposited) revert InvalidTripState();

        // Passenger, assigned driver, verifier, or owner can trigger cancellation
        if (msg.sender != trip.passenger && msg.sender != trip.driver && msg.sender != verifier && msg.sender != owner) {
            revert Unauthorized();
        }

        trip.status = TripStatus.Cancelled;
        uint256 refundAmount = trip.depositAmount;

        if (trip.isRideToken) {
            bool success = rideToken.transfer(trip.passenger, refundAmount);
            if (!success) revert TransferFailed();
        } else {
            (bool success, ) = payable(trip.passenger).call{value: refundAmount}("");
            if (!success) revert TransferFailed();
        }

        emit TripCancelled(tripId, trip.passenger, refundAmount, reason);
    }

    /**
     * @notice Report dispute during ride to freeze settlement pending review.
     */
    function disputeTrip(bytes32 tripId, string calldata reason) external {
        Trip storage trip = trips[tripId];
        if (trip.status != TripStatus.Deposited && trip.status != TripStatus.InProgress) {
            revert InvalidTripState();
        }
        if (msg.sender != trip.passenger && msg.sender != trip.driver) revert Unauthorized();

        trip.status = TripStatus.Disputed;
        emit TripDisputed(tripId, msg.sender, reason);
    }

    /**
     * @notice Resolve dispute by admin/verifier with custom refund and payout splits.
     */
    function resolveDispute(
        bytes32 tripId,
        uint256 passengerRefund,
        uint256 driverPayout
    ) external onlyVerifierOrOwner nonReentrant {
        Trip storage trip = trips[tripId];
        if (trip.status != TripStatus.Disputed) revert InvalidTripState();
        if (passengerRefund + driverPayout > trip.depositAmount) revert DisputeAllocationExceeded();

        trip.status = TripStatus.Completed;
        trip.completedTimestamp = block.timestamp;

        uint256 remainingFee = trip.depositAmount - (passengerRefund + driverPayout);

        if (trip.isRideToken) {
            if (passengerRefund > 0) {
                bool s1 = rideToken.transfer(trip.passenger, passengerRefund);
                if (!s1) revert TransferFailed();
            }
            if (driverPayout > 0) {
                bool s2 = rideToken.transfer(trip.driver, driverPayout);
                if (!s2) revert TransferFailed();
            }
            if (remainingFee > 0) {
                bool s3 = rideToken.transfer(treasury, remainingFee);
                if (!s3) revert TransferFailed();
            }
        } else {
            if (passengerRefund > 0) {
                (bool s1, ) = payable(trip.passenger).call{value: passengerRefund}("");
                if (!s1) revert TransferFailed();
            }
            if (driverPayout > 0) {
                (bool s2, ) = payable(trip.driver).call{value: driverPayout}("");
                if (!s2) revert TransferFailed();
            }
            if (remainingFee > 0) {
                (bool s3, ) = payable(treasury).call{value: remainingFee}("");
                if (!s3) revert TransferFailed();
            }
        }

        emit DisputeResolved(tripId, passengerRefund, driverPayout, remainingFee);
    }

    // --- Admin Configuration ---
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroAddress();
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    function setStakingVault(address _vault) external onlyOwner {
        stakingVault = IDriverStaking(_vault);
        emit StakingVaultUpdated(_vault);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    /**
     * @notice Query full trip details in a single view call.
     */
    function getTrip(bytes32 tripId) external view returns (Trip memory) {
        Trip memory t = trips[tripId];
        if (t.status == TripStatus.None) revert TripNotFound();
        return t;
    }
}
