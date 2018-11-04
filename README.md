# Payment Hub

This repository contains an Ethereum implementation to run a Payment Hub that features a daily limit for customer payments and a whitelist of customers who are allow to send ether with no limitations.
The system will feature the following two type of participants:
	- Administrator: who will manage the whitelist, the daily limit and the onboarding of new customers by creating new wallet contracts.
	- Customers: who will use own a wallet contract to receive their payments.
	Both administrator and customers will be identified by an Ethereum Externally Owned Account.

# Contracts
The implementation features two main artifacts written in Solidity: Wallet.sol and PaymentHub.sol. 
	- **Wallet.sol**, is the contract that will be owned by customers of the platform. It will store ether coming from other customers payments. The function `withdraw()`can be used to withdraw ether from the wallet. 
	- **PaymentHub.sol** is the contract that will be owned by the administrator of the platform, featuring the following functions:
		
 1. `createWallet()` : to create a new wallet for a customer of the platform, which will be used to collect the ether coming from the payments of other customers of the platform.
 2. `addWalletWhitelist()` : to include a customer into the Whitelist that will prevent them to have any daily limitations for receiving payments.
 3. `removeWalletWhiteList()`: to remove a customer from the Whitelist.
 4. `setDailyLimit()`: to modify the daily limit for customer payments.
 5. `processPayment()`: customers will use this function to send payments to other customers of the platform. The function will validate if the customer can receive the payment with the current limit and whitelist and if that is not the case the payment will be rejected.

 
