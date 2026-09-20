// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LootlyEscrow} from "../src/LootlyEscrow.sol";

contract MockUSDC is IERC20 {
    string public name = "Mock USDC"; string public symbol = "mUSDC"; uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf; mapping(address => mapping(address => uint256)) public allowance; uint256 public totalSupply;
    function transfer(address to, uint256 value) external returns (bool) { _move(msg.sender,to,value); return true; }
    function approve(address spender, uint256 value) external returns (bool) { allowance[msg.sender][spender]=value; emit Approval(msg.sender,spender,value); return true; }
    function transferFrom(address from,address to,uint256 value) external returns (bool) { require(allowance[from][msg.sender]>=value,"allowance"); allowance[from][msg.sender]-=value; _move(from,to,value); return true; }
    function mint(address to,uint256 value) external { balanceOf[to]+=value; totalSupply+=value; emit Transfer(address(0),to,value); }
    function _move(address from,address to,uint256 value) internal { require(balanceOf[from]>=value,"balance"); balanceOf[from]-=value; balanceOf[to]+=value; emit Transfer(from,to,value); }
}

contract LootlyEscrowTest is Test {
    MockUSDC token; LootlyEscrow escrow; bytes32 constant ORDER = keccak256("lootly-order-1"); bytes32 constant ORDER_2 = keccak256("lootly-order-2");
    address buyer = address(0xB0B); address seller = address(0x5E11); address other = address(0xA11CE); address admin = address(0xAD);
    uint256 constant PRICE = 150e6;
    function setUp() public { token=new MockUSDC(); escrow=new LootlyEscrow(address(token),admin); token.mint(buyer,1000e6); vm.prank(buyer); token.approve(address(escrow),type(uint256).max); }
    function _create(bytes32 id) internal { vm.prank(buyer); escrow.createEscrow(id,buyer,seller,PRICE); }
    function _fund(bytes32 id) internal { _create(id); vm.prank(buyer); escrow.deposit(id); }
    function testDepositAndState() public { _fund(ORDER); (,,address s,uint256 amount,LootlyEscrow.State state)=escrow.getEscrow(ORDER); assertEq(s,seller); assertEq(amount,PRICE); assertEq(uint8(state),uint8(LootlyEscrow.State.FUNDED)); assertEq(token.balanceOf(address(escrow)),PRICE); }
    function testWrongTokenCannotBeConfiguredAsUsdcWithoutDeploymentConfig() public { vm.expectRevert(); new LootlyEscrow(address(0),admin); }
    function testZeroAmountRejected() public { vm.prank(buyer); vm.expectRevert(); escrow.createEscrow(ORDER,buyer,seller,0); }
    function testZeroParticipantsRejected() public { vm.prank(buyer); vm.expectRevert(); escrow.createEscrow(ORDER,address(0),seller,PRICE); }
    function testDuplicateOrderRejected() public { _create(ORDER); vm.prank(buyer); vm.expectRevert(); escrow.createEscrow(ORDER,buyer,seller,PRICE); }
    function testUnauthorizedReleaseAndRefund() public { _fund(ORDER); vm.prank(other); vm.expectRevert(); escrow.release(ORDER); vm.prank(other); vm.expectRevert(); escrow.refund(ORDER); }
    function testBuyerReleasePaysSellerExactly() public { _fund(ORDER); uint256 beforeBalance=token.balanceOf(seller); vm.prank(buyer); escrow.release(ORDER); assertEq(token.balanceOf(seller),beforeBalance+PRICE); vm.expectRevert(); escrow.release(ORDER); }
    function testBuyerRefundPaysBuyerExactly() public { _fund(ORDER); uint256 beforeBalance=token.balanceOf(buyer); vm.prank(buyer); escrow.refund(ORDER); assertEq(token.balanceOf(buyer),beforeBalance+PRICE); vm.expectRevert(); escrow.refund(ORDER); }
    function testDisputeAndAdminResolution() public { _fund(ORDER); vm.prank(seller); escrow.dispute(ORDER); vm.prank(admin); escrow.resolveDispute(ORDER,false); assertEq(token.balanceOf(buyer),1000e6); }
    function testMultipleOrdersAreIndependent() public { _fund(ORDER); _fund(ORDER_2); vm.prank(buyer); escrow.release(ORDER); (,,,,LootlyEscrow.State state)=escrow.getEscrow(ORDER_2); assertEq(uint8(state),uint8(LootlyEscrow.State.FUNDED)); }
    function testUnsupportedTokenCannotBeRecoveredAsUsdc() public { vm.prank(admin); vm.expectRevert(); escrow.recoverUnsupportedToken(address(token),admin,1); }
    function testSellerCannotDisputeUnfundedOrder() public { _create(ORDER); vm.prank(seller); vm.expectRevert(); escrow.dispute(ORDER); }
}
