pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./Wallet.sol";

contract PaymentsHub is Ownable {
    
    uint public dailyLimit;
    struct WalletData {
        address wallet;
        uint dailyBalance;
        uint startDate;
        bool whitelisted;
    }
    mapping(address => WalletData) public wallets;
    address[] public whitelist;
    
    event LogCreateWallet(address indexed walletOwner, address indexed wallet);
    event LogSetDailyLimit(uint newLimit);
    event LogAddWalletWhitelist(address indexed walletOwner, uint index);
    event LogRemoveWalletWhiteList(address indexed walletOwner,uint index);
    event LogProcessPayment(address indexed payee, uint amount, address indexed payer);
    
    constructor(uint _dailyLimit) public {
        dailyLimit = _dailyLimit;
    }
    
    function createWallet(address walletOwner) public fromOwner returns (bool success) {
        
        require(wallets[walletOwner].wallet == address(0x0), "Account holder already has a wallet");
        Wallet newWallet = new Wallet(address(this));
        newWallet.setOwner(walletOwner);
        wallets[walletOwner] = WalletData ({
            wallet: address(newWallet),
            dailyBalance: 0,
            startDate: 0,
            whitelisted: false
        });
        emit LogCreateWallet(walletOwner, address(newWallet));
        return true;
    }
    
    function addWalletWhitelist(address walletOwner) public fromOwner returns (uint _index) {
        require(walletData.wallet != address(0x0), "Address not an wallet owner");
        WalletData storage walletData = wallets[walletOwner];
        require(!walletData.whitelisted, "Wallet already in whitelist");
        walletData.whitelisted = true;
        whitelist.push(walletOwner);
        uint index = whitelist.length - 1; 
        emit LogAddWalletWhitelist(walletOwner, index);
        return index;
    }

    function removeWalletWhiteList(address walletOwner, uint index) public fromOwner returns (bool success) {
        require(walletData.wallet != address(0x0), "Address not an wallet owner");
        WalletData storage walletData = wallets[walletOwner];
        require(walletData.whitelisted, "Wallet not in whitelist");
        require(whitelist[index] == walletOwner, "Index value incorrect");
        walletData.whitelisted = false;
        for (uint i = index; i<whitelist.length-1; i++){
            whitelist[i] = whitelist[i+1];
        }
        delete whitelist[whitelist.length-1];
        whitelist.length--;
        emit LogRemoveWalletWhiteList(walletOwner, index);
        return true;
    }
  

    function setDailyLimit(uint newLimit) public fromOwner returns (bool success) { 
        require(dailyLimit != newLimit, "Limit already set to this value");
        dailyLimit = newLimit;
        emit LogSetDailyLimit(newLimit);
        return true;
    }
    
    function processPayment(address payee) public payable returns (bool success) {
        WalletData storage walletData = wallets[payee];
        require(walletData.wallet != address(0x0), "Payee does not have an wallet");
        if (now >= walletData.startDate + 1 days) {
            if (!walletData.whitelisted) {
                require(msg.value <= dailyLimit, "Amount bigger than daily limit. Rejecting Payment");
            }
            walletData.dailyBalance = msg.value;
            walletData.startDate = now;
        }
        else {
            if (!walletData.whitelisted) {
                require(walletData.dailyBalance + msg.value <= dailyLimit, "Daily limit exceeded. Rejecting Payment");
            }
            walletData.dailyBalance += msg.value;
        }
        emit LogProcessPayment(payee, msg.value, msg.sender);
        walletData.wallet.transfer(msg.value);
        return true;
    }
   
    
}