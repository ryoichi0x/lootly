// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LootlyEscrow} from "../src/LootlyEscrow.sol";

contract ReentrantToken is IERC20 {
    mapping(address=>uint256) public balanceOf; mapping(address=>mapping(address=>uint256)) public allowance; uint256 public totalSupply; address public callback; bytes public payload; bool public attack;
    function transfer(address to,uint256 amount) external returns(bool){_move(msg.sender,to,amount);_attack();return true;}
    function approve(address spender,uint256 amount) external returns(bool){allowance[msg.sender][spender]=amount;emit Approval(msg.sender,spender,amount);return true;}
    function transferFrom(address from,address to,uint256 amount) external returns(bool){require(allowance[from][msg.sender]>=amount,"allowance");allowance[from][msg.sender]-=amount;_move(from,to,amount);_attack();return true;}
    function mint(address to,uint256 amount) external{balanceOf[to]+=amount;totalSupply+=amount;emit Transfer(address(0),to,amount);}
    function setAttack(address target,bytes calldata data) external{callback=target;payload=data;attack=true;}
    function _attack() internal{if(attack){attack=false;(callback).call(payload);}}
    function _move(address from,address to,uint256 amount) internal{require(balanceOf[from]>=amount,"balance");balanceOf[from]-=amount;balanceOf[to]+=amount;emit Transfer(from,to,amount);}
}
contract LootlyEscrowReentrancyTest is Test {
    ReentrantToken token; LootlyEscrow escrow; address buyer=address(0xB0B); address seller=address(0x5E11); address admin=address(0xAD); bytes32 id=keccak256("reentrant"); uint256 amount=10e6;
    function setUp() public{token=new ReentrantToken();escrow=new LootlyEscrow(address(token),admin);token.mint(buyer,100e6);vm.prank(buyer);token.approve(address(escrow),100e6);vm.prank(buyer);escrow.createEscrow(id,buyer,seller,amount);}
    function testDepositReentrancyBlocked() public{token.setAttack(address(escrow),abi.encodeCall(escrow.deposit,(id)));vm.prank(buyer);escrow.deposit(id);(,,,,LootlyEscrow.State state)=escrow.getEscrow(id);assertEq(uint8(state),uint8(LootlyEscrow.State.FUNDED));}
    function testReleaseReentrancyBlocked() public{vm.prank(buyer);escrow.deposit(id);token.setAttack(address(escrow),abi.encodeCall(escrow.release,(id)));vm.prank(buyer);escrow.release(id);}
    function testRefundReentrancyBlocked() public{vm.prank(buyer);escrow.deposit(id);token.setAttack(address(escrow),abi.encodeCall(escrow.refund,(id)));vm.prank(buyer);escrow.refund(id);}
    function testUnsupportedRecoveryReentrancyProtected() public{ReentrantToken unsupported=new ReentrantToken();unsupported.mint(address(escrow),1);unsupported.setAttack(address(escrow),abi.encodeCall(escrow.recoverUnsupportedToken,(address(unsupported),admin,1)));vm.prank(admin);escrow.recoverUnsupportedToken(address(unsupported),admin,1);assertEq(unsupported.balanceOf(admin),1);}
}
