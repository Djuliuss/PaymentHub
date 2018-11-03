 pragma solidity ^0.4.24;

  contract Ownable {
    address private owner;
    event LogOwnerSet(address indexed previousOwner, address indexed newOwner);
    
    modifier fromOwner {
        require(msg.sender == owner);   
         _;
    }
    
    constructor() public {
        owner = msg.sender;
    }

    function getOwner() public view returns (address)   {
        return owner;
    }
    
    function setOwner(address newOwner) fromOwner public returns(bool success) {
        require(newOwner != getOwner(), "contract already has this owner");
        emit LogOwnerSet(owner, newOwner);
        owner = newOwner;
        return true;
    }
}
