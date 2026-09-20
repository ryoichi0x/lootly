// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LootlyEscrow
/// @notice Holds the configured USDC token for one marketplace order at a time.
/// @dev Lootly order UUIDs must be converted off-chain to bytes32 before calling this contract.
contract LootlyEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum State { AWAITING_DEPOSIT, FUNDED, RELEASED, REFUNDED, DISPUTED }

    struct Escrow {
        bytes32 orderId;
        address buyer;
        address seller;
        uint256 amount;
        State state;
    }

    IERC20 public immutable usdc;
    mapping(bytes32 => Escrow) private escrows;

    error ZeroAddress();
    error ZeroAmount();
    error DuplicateOrder(bytes32 orderId);
    error EscrowNotFound(bytes32 orderId);
    error Unauthorized();
    error InvalidState(State expected, State actual);
    error InvalidParticipants();
    error UnsupportedToken();

    event EscrowCreated(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event EscrowFunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event EscrowReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);
    event EscrowRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event EscrowDisputed(bytes32 indexed orderId, address indexed openedBy);
    event DisputeResolved(bytes32 indexed orderId, bool released, address indexed resolver);
    event UnsupportedTokenRecovered(address indexed token, address indexed recipient, uint256 amount);

    constructor(address usdcToken, address initialOwner) Ownable(initialOwner) {
        if (usdcToken == address(0) || initialOwner == address(0)) revert ZeroAddress();
        usdc = IERC20(usdcToken);
    }

    function createEscrow(bytes32 orderId, address buyer, address seller, uint256 amount) external {
        if (orderId == bytes32(0)) revert ZeroAmount();
        if (buyer == address(0) || seller == address(0) || buyer == seller) revert InvalidParticipants();
        if (amount == 0) revert ZeroAmount();
        if (escrows[orderId].buyer != address(0)) revert DuplicateOrder(orderId);
        if (msg.sender != buyer) revert Unauthorized();
        escrows[orderId] = Escrow(orderId, buyer, seller, amount, State.AWAITING_DEPOSIT);
        emit EscrowCreated(orderId, buyer, seller, amount);
    }

    function deposit(bytes32 orderId) external nonReentrant {
        Escrow storage escrow = _escrow(orderId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (escrow.state != State.AWAITING_DEPOSIT) revert InvalidState(State.AWAITING_DEPOSIT, escrow.state);
        usdc.safeTransferFrom(msg.sender, address(this), escrow.amount);
        escrow.state = State.FUNDED;
        emit EscrowFunded(orderId, msg.sender, escrow.amount);
    }

    function release(bytes32 orderId) external nonReentrant {
        Escrow storage escrow = _escrow(orderId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (escrow.state != State.FUNDED) revert InvalidState(State.FUNDED, escrow.state);
        escrow.state = State.RELEASED;
        usdc.safeTransfer(escrow.seller, escrow.amount);
        emit EscrowReleased(orderId, escrow.seller, escrow.amount);
    }

    function refund(bytes32 orderId) external nonReentrant {
        Escrow storage escrow = _escrow(orderId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (escrow.state != State.FUNDED) revert InvalidState(State.FUNDED, escrow.state);
        escrow.state = State.REFUNDED;
        usdc.safeTransfer(escrow.buyer, escrow.amount);
        emit EscrowRefunded(orderId, escrow.buyer, escrow.amount);
    }

    function dispute(bytes32 orderId) external {
        Escrow storage escrow = _escrow(orderId);
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller) revert Unauthorized();
        if (escrow.state != State.FUNDED) revert InvalidState(State.FUNDED, escrow.state);
        escrow.state = State.DISPUTED;
        emit EscrowDisputed(orderId, msg.sender);
    }

    /// @notice Resolves only an already-disputed escrow; owner cannot redirect funds arbitrarily.
    function resolveDispute(bytes32 orderId, bool releaseToSeller) external onlyOwner nonReentrant {
        Escrow storage escrow = _escrow(orderId);
        if (escrow.state != State.DISPUTED) revert InvalidState(State.DISPUTED, escrow.state);
        escrow.state = releaseToSeller ? State.RELEASED : State.REFUNDED;
        if (releaseToSeller) usdc.safeTransfer(escrow.seller, escrow.amount);
        else usdc.safeTransfer(escrow.buyer, escrow.amount);
        emit DisputeResolved(orderId, releaseToSeller, msg.sender);
    }

    function getEscrow(bytes32 orderId) external view returns (Escrow memory) {
        return _escrow(orderId);
    }

    /// @dev Only unsupported tokens can be recovered; configured USDC can never be swept.
    function recoverUnsupportedToken(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(usdc)) revert UnsupportedToken();
        if (recipient == address(0) || amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(recipient, amount);
        emit UnsupportedTokenRecovered(token, recipient, amount);
    }

    function _escrow(bytes32 orderId) internal view returns (Escrow storage escrow) {
        escrow = escrows[orderId];
        if (escrow.buyer == address(0)) revert EscrowNotFound(orderId);
    }
}
