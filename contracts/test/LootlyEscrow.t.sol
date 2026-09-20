// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LootlyEscrow} from "../src/LootlyEscrow.sol";

contract MockUSDC is IERC20 {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function transfer(address to, uint256 value) external returns (bool) { _move(msg.sender, to, value); return true; }
    function approve(address spender, uint256 value) external returns (bool) { allowance[msg.sender][spender] = value; emit Approval(msg.sender, spender, value); return true; }
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "allowance");
        allowance[from][msg.sender] -= value;
        _move(from, to, value);
        return true;
    }
    function mint(address to, uint256 value) external { balanceOf[to] += value; totalSupply += value; emit Transfer(address(0), to, value); }
    function _move(address from, address to, uint256 value) internal { require(balanceOf[from] >= value, "balance"); balanceOf[from] -= value; balanceOf[to] += value; emit Transfer(from, to, value); }
}

contract LootlyEscrowTest is Test {
    MockUSDC token;
    LootlyEscrow escrow;
    bytes32 constant A = keccak256("lootly-order-a");
    bytes32 constant B = keccak256("lootly-order-b");
    address buyer = address(0xB0B);
    address seller = address(0x5E11);
    address other = address(0xA11CE);
    address admin = address(0xAD);
    uint256 constant PRICE = 150e6;

    function setUp() public {
        token = new MockUSDC();
        escrow = new LootlyEscrow(address(token), admin);
        token.mint(buyer, 1000e6);
        vm.prank(buyer);
        token.approve(address(escrow), type(uint256).max);
    }

    function create(bytes32 id, uint256 amount) internal { vm.prank(buyer); escrow.createEscrow(id, buyer, seller, amount); }
    function fund(bytes32 id) internal { create(id, PRICE); vm.prank(buyer); escrow.deposit(id); }
    function dispute(bytes32 id) internal { vm.prank(seller); escrow.dispute(id); }

    function testAuthorizationRequiresDisputedStateForResolution() public {
        fund(A);
        dispute(A);
        vm.prank(other); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.resolveDispute(A, true);
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.resolveDispute(A, true);
        vm.prank(seller); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.resolveDispute(A, true);
        vm.prank(admin); escrow.resolveDispute(A, true);
        vm.prank(admin); vm.expectRevert(); escrow.resolveDispute(A, true);
        assertEq(token.balanceOf(seller), PRICE);
    }

    function testOnlyBuyerDepositsReleasesAndRefunds() public {
        create(A, PRICE);
        vm.prank(other); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.deposit(A);
        fund(B);
        vm.prank(other); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.release(B);
        vm.prank(other); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.refund(B);
    }

    function testAwaitingDepositRejectsAllSettlementAndDisputeActions() public {
        create(A, PRICE);
        vm.prank(buyer); vm.expectRevert(); escrow.release(A);
        vm.prank(buyer); vm.expectRevert(); escrow.refund(A);
        vm.prank(seller); vm.expectRevert(); escrow.dispute(A);
        vm.prank(admin); vm.expectRevert(); escrow.resolveDispute(A, true);
    }

    function testReleasedIsTerminal() public {
        fund(A);
        vm.prank(buyer); escrow.release(A);
        vm.prank(buyer); vm.expectRevert(); escrow.release(A);
        vm.prank(buyer); vm.expectRevert(); escrow.refund(A);
        vm.prank(buyer); vm.expectRevert(); escrow.dispute(A);
        vm.prank(admin); vm.expectRevert(); escrow.resolveDispute(A, true);
    }

    function testRefundedIsTerminal() public {
        fund(A);
        vm.prank(buyer); escrow.refund(A);
        vm.prank(buyer); vm.expectRevert(); escrow.release(A);
        vm.prank(buyer); vm.expectRevert(); escrow.refund(A);
        vm.prank(seller); vm.expectRevert(); escrow.dispute(A);
        vm.prank(admin); vm.expectRevert(); escrow.resolveDispute(A, true);
    }

    function testDisputedAllowsOnlyOwnerResolution() public {
        fund(A);
        dispute(A);
        vm.prank(buyer); vm.expectRevert(); escrow.release(A);
        vm.prank(buyer); vm.expectRevert(); escrow.refund(A);
        vm.prank(seller); vm.expectRevert(); escrow.dispute(A);
        vm.prank(other); vm.expectRevert(LootlyEscrow.Unauthorized.selector); escrow.resolveDispute(A, false);
        vm.prank(admin); escrow.resolveDispute(A, false);
        assertEq(token.balanceOf(buyer), 1000e6);
    }

    function testExactAccountingAndIsolation() public {
        fund(A); fund(B);
        uint256 buyerBefore = token.balanceOf(buyer);
        uint256 contractBefore = token.balanceOf(address(escrow));
        vm.prank(buyer); escrow.release(A);
        assertEq(token.balanceOf(seller), PRICE);
        assertEq(token.balanceOf(address(escrow)), contractBefore - PRICE);
        (,,,,LootlyEscrow.State stateB) = escrow.getEscrow(B);
        assertEq(uint8(stateB), uint8(LootlyEscrow.State.FUNDED));
        vm.prank(buyer); escrow.refund(B);
        assertEq(token.balanceOf(buyer), buyerBefore + PRICE);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testInputValidationAndUnknownOrder() public {
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.ZeroOrderId.selector); escrow.createEscrow(bytes32(0), buyer, seller, PRICE);
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.InvalidParticipants.selector); escrow.createEscrow(A, address(0), seller, PRICE);
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.InvalidParticipants.selector); escrow.createEscrow(A, buyer, buyer, PRICE);
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.ZeroAmount.selector); escrow.createEscrow(A, buyer, seller, 0);
        create(A, PRICE);
        vm.prank(buyer); vm.expectRevert(LootlyEscrow.DuplicateOrder.selector); escrow.createEscrow(A, buyer, seller, PRICE);
        vm.expectRevert(LootlyEscrow.EscrowNotFound.selector); escrow.getEscrow(B);
    }

    function testRecoveryRules() public {
        MockUSDC otherToken = new MockUSDC();
        otherToken.mint(address(escrow), 10);
        vm.prank(admin); vm.expectRevert(LootlyEscrow.UnsupportedToken.selector); escrow.recoverUnsupportedToken(address(token), admin, 1);
        vm.prank(admin); escrow.recoverUnsupportedToken(address(otherToken), admin, 10);
        assertEq(otherToken.balanceOf(admin), 10);
        vm.prank(admin); vm.expectRevert(LootlyEscrow.ZeroAddress.selector); escrow.recoverUnsupportedToken(address(otherToken), address(0), 1);
        vm.prank(admin); vm.expectRevert(LootlyEscrow.ZeroAmount.selector); escrow.recoverUnsupportedToken(address(otherToken), admin, 0);
    }

    function testFuzzValidAmounts(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1, 400e6);
        uint256 buyerBefore = token.balanceOf(buyer);
        uint256 contractBefore = token.balanceOf(address(escrow));
        token.mint(buyer, amount);
        bytes32 id = keccak256(abi.encode("fuzz", rawAmount));
        create(id, amount);
        vm.prank(buyer); escrow.deposit(id);
        assertEq(token.balanceOf(buyer), buyerBefore + amount);
        assertEq(token.balanceOf(address(escrow)), contractBefore + amount);
        uint256 sellerBefore = token.balanceOf(seller);
        vm.prank(buyer); escrow.release(id);
        assertEq(token.balanceOf(seller), sellerBefore + amount);
        assertEq(token.balanceOf(address(escrow)), contractBefore);
    }

    function testFuzzIndependentOrders(bytes32 id1, bytes32 id2) public {
        vm.assume(id1 != bytes32(0) && id2 != bytes32(0) && id1 != id2);
        fund(id1); fund(id2);
        vm.prank(buyer); escrow.release(id1);
        (,,,,LootlyEscrow.State state) = escrow.getEscrow(id2);
        assertEq(uint8(state), uint8(LootlyEscrow.State.FUNDED));
    }
}
