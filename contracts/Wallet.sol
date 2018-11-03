pragma solidity ^0.4.24;

import "./Ownable.sol";

contract Wallet is Ownable {
    
    address public paymentHub;
    
    event LogWithdrawal(uint amount, address indexed toAccount);
    
    constructor(address _paymentHub) public {
        paymentHub = _paymentHub;
    }
    
    function withdraw(uint amount, address toAccount) public fromOwner returns (bool success) {
        require(amount <= address(this).balance, "not enough balance");
        toAccount.transfer(amount);
        emit LogWithdrawal(amount, toAccount);
        return true;
    }   
    
    function() public payable {
        require(msg.sender == paymentHub, "Only the Payment Hub can transfer funds to the account");
    }
}


