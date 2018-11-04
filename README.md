# Payment Hub

This repository contains an Ethereum implementation to run a Payment Hub that features a daily limit for customer payments and a whitelist of customers who are allowed to receive ether with no limitations.
The system will feature the following two type of participants:

 - Administrator: who will manage the customer whitelist, the daily limit settings and the onboarding of new customers by creating new wallet contracts.
 - Customers: who will own a wallet contract to receive their payments.

Both administrator and customers will be identified by an Ethereum Externally Owned Account.

# Contracts
The implementation features two main artifacts written in Solidity: Wallet.sol and PaymentHub.sol. 

 - **Wallet.sol**, is the contract that will be owned by the customers of the platform. It will store ether coming from other customers payments. The function `withdraw()`can be used to withdraw ether from the wallet. 
 - **PaymentHub.sol** is the contract that will be owned by the administrator of the platform, featuring the following functions:
 
 1. `createWallet()` : to create a new wallet for a customer of the platform, which will be used to collect the ether coming from the payments of other customers.
 2. `addWalletWhitelist()` : to include a customer into the Whitelist that will prevent them to have any daily limitations for receiving payments.
 3. `removeWalletWhiteList()`: to remove a customer from the Whitelist.
 4. `setDailyLimit()`: to modify the daily limit for customer payments.
 5. `processPayment()`: customers will use this function to send payments to other customers of the platform. The function will validate if the customer can receive the payment with the current limit and whitelist settings and if that is not the case the payment will be rejected. Otherwise, the ether will be transferred to the payee wallet.
 
# Tests

The folder `tests` contain a batch of scripts that can be run with `Truffle`. 
To execute the tests, simply run `truffle test`on a machine running with `ganache` or another Ethereum development network on node `8545`.
If using `ganache-cli`, you need the following flags when launching it: `ganache-cli -l 15000000 --allowUnlimitedCtractSize`

# Dapp

The project also contains a  simple dapp that can be run from the browser which allows to experiment with the functionality of the platform.
To run the dapp, first run `npm install`.
Once all the packages have been installed, follow these steps, (or run script `./runDapp.sh`):

 1. `./node_modules/.bin/truffle migrate --reset`
 2. `./node_modules/.bin/webpack-cli --mode development`
 3. `php -S 0.0.0.0:8000 -t ./build/app`
 4. open the browser at `localhost:8000`


