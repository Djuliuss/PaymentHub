const PaymentsHub = artifacts.require("./PaymentsHub.sol");
const Wallet = artifacts.require("./Wallet.sol");
const BigNumber = require('bignumber.js');
const Promise = require("bluebird");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });
const expectedExceptionPromise = require("./utils/expectedException.js");
const addEvmFunctions = require("./utils/evmFunctions.js");
addEvmFunctions(web3);
Promise.promisifyAll(web3.evm, { suffix: "Promise" });

contract('PaymentsHub', async function(accounts) { 
    const ownerHub = accounts[0];
    const Alice = accounts[1];
    const Bob = accounts[2];
    const Charlie = accounts[3];
    const limit = 3000000;
    let instance;

    beforeEach("should create a PaymentsHub contract", async () => {
        instance = await PaymentsHub.new(limit,{from: ownerHub, gas:5000000});   
    });
    
    describe("Create wallet", function() {
        it ("should create a wallet for Alice", async () => {
            let tx = await instance.createWallet(Alice, {from: ownerHub});
            assert.strictEqual(tx.receipt.logs.length, 2);
            assert.strictEqual(tx.logs.length, 2);
            let logEntered; 
            logEntered = tx.logs[0];
            assert.strictEqual(logEntered.event, "LogOwnerSet");
            assert.strictEqual(logEntered.args.previousOwner, instance.address); 
            assert.strictEqual(logEntered.args.newOwner, Alice);
            logEntered = tx.logs[1];
            assert.strictEqual(logEntered.event, "LogCreateWallet");
            assert.strictEqual(logEntered.args.walletOwner, Alice);
            let AliceWallet = logEntered.args.wallet;
            let instanceAccount = Wallet.at(AliceWallet);
            let paymentHub = await instanceAccount.paymentHub({from: ownerHub});
            assert.strictEqual(paymentHub, instance.address);
            let walletOwner = await instanceAccount.getOwner({from: ownerHub});
            assert.strictEqual(walletOwner, Alice);
            let walletData = await instance.wallets(Alice);
            assert.strictEqual(walletData[0], AliceWallet);
        });

        it ("should not allow to create two wallets to Alice", async () => {
            await instance.createWallet(Alice, {from: ownerHub});
            await expectedExceptionPromise(async () => {
                await instance.createWallet(Alice);
                }, 3000000);
        });

        it ("should create a wallet for Alice and a wallet for Bob", async () => {
            await instance.createWallet(Alice, {from: ownerHub})
            let tx = await instance.createWallet(Bob, {from: ownerHub});
            assert.strictEqual(tx.receipt.logs.length, 2);
            assert.strictEqual(tx.logs.length, 2);
            let logEntered; 
            logEntered = tx.logs[0];
            assert.strictEqual(logEntered.event, "LogOwnerSet");
            assert.strictEqual(logEntered.args.previousOwner, instance.address); 
            assert.strictEqual(logEntered.args.newOwner, Bob);
            logEntered = tx.logs[1];
            assert.strictEqual(logEntered.event, "LogCreateWallet");
            assert.strictEqual(logEntered.args.walletOwner, Bob);
            let AliceWallet = logEntered.args.wallet;
            let instanceAccount = Wallet.at(AliceWallet);
            let paymentHub = await instanceAccount.paymentHub({from: ownerHub});
            assert.strictEqual(paymentHub, instance.address);
            let walletOwner = await instanceAccount.getOwner({from: ownerHub});
            assert.strictEqual(walletOwner, Bob);
            let walletData = await instance.wallets(Bob, {from: ownerHub});
            assert.strictEqual(walletData[0], AliceWallet);
        });

        it ("should not allow you to create a wallet if you are not the owner", async () => {
            await expectedExceptionPromise(async () => {
                await instance.createWallet(Alice, {from: Alice});
                }, 3000000);
        });

    });
  
    describe("Process payments", function() {
        let AliceWallet;
        beforeEach("should create a wallet for Alice", async () => {
            let tx = await instance.createWallet(Alice, {from: ownerHub});   
            logEntered = tx.logs[1];
            AliceWallet = logEntered.args.wallet;
        }); 
        
        it ("should not allow you to send a first payment higher than daily limit to Alice wallet", async () => {
            await expectedExceptionPromise(async () => {
                const higherThanLimit = limit + 1;
                await instance.processPayment(Alice, {from: Bob, value: higherThanLimit});
                }, 3000000);
        });

        it ("should process one payment for Alice lower than daily amount", async () => {  
            const thirdOfLimit = limit / 3;
            let tx = await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
            assert.strictEqual(tx.receipt.logs.length, 1);
            assert.strictEqual(tx.logs.length, 1);
            let logEntered; 
            logEntered = tx.logs[0];
            assert.strictEqual(logEntered.event, "LogProcessPayment");
            assert.strictEqual(logEntered.args.payee, Alice);
            assert.strictEqual(logEntered.args.amount.toNumber(), thirdOfLimit);
            assert.strictEqual(logEntered.args.payer, Bob);
            let walletData = await instance.wallets(Alice);
            assert.strictEqual(walletData[0], AliceWallet);
            assert.strictEqual(walletData[1].toNumber(), thirdOfLimit);
            let balance = await web3.eth.getBalance(AliceWallet);
            assert.strictEqual(balance.toNumber(), thirdOfLimit);
  
        });

        it ("should not allow to send payments straight into Alice wallet", async () => {  
            const thirdOfLimit = limit / 3;
            await expectedExceptionPromise(async () => {
                await web3.eth.sendTransaction({from: Bob, to: AliceWallet, value: thirdOfLimit});
                }, 3000000);
        });

        it ("should process two payments for Alice that keep her below the daily limit", async () => {  
            const thirdOfLimit = limit / 3;
            await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
            let tx = await instance.processPayment(Alice, {from: Charlie, value: thirdOfLimit});
            assert.strictEqual(tx.receipt.logs.length, 1);
            assert.strictEqual(tx.logs.length, 1);
            let logEntered; 
            logEntered = tx.logs[0];
            assert.strictEqual(logEntered.event, "LogProcessPayment");
            assert.strictEqual(logEntered.args.payee, Alice);
            assert.strictEqual(logEntered.args.amount.toNumber(), thirdOfLimit);
            assert.strictEqual(logEntered.args.payer, Charlie);
            let walletData = await instance.wallets(Alice);
            assert.strictEqual(walletData[0], AliceWallet);
            assert.strictEqual(walletData[1].toNumber(), 2 * thirdOfLimit);
            let balance = await web3.eth.getBalance(AliceWallet);
            assert.strictEqual(balance.toNumber(), 2 * thirdOfLimit);
        });

        describe("Daily limit", function() {

            const thirdOfLimit = limit / 3;

            beforeEach("Should send two initial payments", async () => {
                await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
                await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
            });

            it ("should reject a third payment for Alice that gets her over the daily limit", async () => {  
                await expectedExceptionPromise(async () => {
                await instance.processPayment(Alice, {from: Charlie, value: 2 * thirdOfLimit});
                }, 3000000);
                let walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[0], AliceWallet);
                assert.strictEqual(walletData[1].toNumber(), 2 * thirdOfLimit);
                let balance = await web3.eth.getBalance(AliceWallet);
                assert.strictEqual(balance.toNumber(), 2 * thirdOfLimit);
            });

            it ("one day goes by. It should accept the third payment for Alice from previous test", async () => {  
                let walletData = await instance.wallets(Alice);
                let startTimeStamp = walletData[2].toNumber();
                const numberHoursPassed = 25;
                await web3.evm.increaseTimePromise(startTimeStamp + numberHoursPassed * 60 * 60 * 1000);
                let tx = await instance.processPayment(Alice, {from: Charlie, value: 2 * thirdOfLimit});
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                let logEntered; 
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogProcessPayment");
                assert.strictEqual(logEntered.args.payee, Alice);
                assert.strictEqual(logEntered.args.amount.toNumber(), 2 * thirdOfLimit);
                assert.strictEqual(logEntered.args.payer, Charlie);
                walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[0], AliceWallet);
                assert.strictEqual(walletData[1].toNumber(), 2 * thirdOfLimit);
                let balance = await web3.eth.getBalance(AliceWallet);
                assert.strictEqual(balance.toNumber(), 4 * thirdOfLimit);
            });

            it ("should accept the third payment that exceeds the daily limit on the same day if whitelisted", async () => {
                let tx = await instance.addWalletWhitelist(Alice, {from: ownerHub});
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                let logEntered; 
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogAddWalletWhitelist");
                assert.strictEqual(logEntered.args.walletOwner, Alice);
                assert.strictEqual(logEntered.args.index.toNumber(), 0);
                walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[3], true);
                tx = await instance.processPayment(Alice, {from: Charlie, value: 2 * thirdOfLimit});
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogProcessPayment");
                assert.strictEqual(logEntered.args.payee, Alice);
                assert.strictEqual(logEntered.args.amount.toNumber(), 2 * thirdOfLimit);
                assert.strictEqual(logEntered.args.payer, Charlie);
                walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[0], AliceWallet);
                assert.strictEqual(walletData[1].toNumber(), 4 * thirdOfLimit);
                let balance = await web3.eth.getBalance(AliceWallet);
                assert.strictEqual(balance.toNumber(), 4 * thirdOfLimit);
            });
        
            it ("whitelisted and then un-whitelisted: should reject the payment", async () => {
                let tx = await instance.addWalletWhitelist(Alice, {from: ownerHub});
                let logEntered = tx.logs[0];
                let index = logEntered.args.index.toNumber();
                tx = await instance.removeWalletWhiteList(Alice, index, {from: ownerHub}); 
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogRemoveWalletWhiteList");
                assert.strictEqual(logEntered.args.walletOwner, Alice);
                assert.strictEqual(logEntered.args.index.toNumber(), index);
                let walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[3], false);
                await expectedExceptionPromise(async () => {
                    await instance.processPayment(Alice, {from: Charlie, value: 2 * thirdOfLimit});
                }, 3000000);
                walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[0], AliceWallet);
                assert.strictEqual(walletData[1].toNumber(), 2 * thirdOfLimit);
                let balance = await web3.eth.getBalance(AliceWallet);
                assert.strictEqual(balance.toNumber(), 2 * thirdOfLimit);
            });
        
            it ("should accept the third payment that exceeds the daily limit if daily limit is increased enough", async () => {
                let tx = await instance.setDailyLimit(2 * limit, {from: ownerHub});
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                let logEntered; 
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogSetDailyLimit");
                assert.strictEqual(logEntered.args.newLimit.toNumber(), 2 * limit);
                tx = await instance.processPayment(Alice, {from: Charlie, value: 2 * thirdOfLimit});
                assert.strictEqual(tx.receipt.logs.length, 1);
                assert.strictEqual(tx.logs.length, 1);
                logEntered = tx.logs[0];
                assert.strictEqual(logEntered.event, "LogProcessPayment");
                assert.strictEqual(logEntered.args.payee, Alice);
                assert.strictEqual(logEntered.args.amount.toNumber(), 2 * thirdOfLimit);
                assert.strictEqual(logEntered.args.payer, Charlie);
                walletData = await instance.wallets(Alice);
                assert.strictEqual(walletData[0], AliceWallet);
                assert.strictEqual(walletData[1].toNumber(), 4 * thirdOfLimit);
                let balance = await web3.eth.getBalance(AliceWallet);
                assert.strictEqual(balance.toNumber(), 4 * thirdOfLimit);
            });

        });
    
        it ("should not allow you to whitelist same wallet twice", async () => {
            tx = await instance.addWalletWhitelist(Alice, {from: ownerHub});
            await expectedExceptionPromise(async () => {
                await instance.addWalletWhitelist(Alice, {from: ownerHub});
                }, 3000000);
        });
    
        it ("should not allow you to whitelist if not owner of the hub", async () => {
            await expectedExceptionPromise(async () => {
                await instance.addWalletWhitelist(Alice, {from: Bob});
                }, 3000000);
        });

        it ("should not allow you to remove from whitelist if not owner of the hub", async () => {
            let tx = await instance.addWalletWhitelist(Alice, {from: ownerHub});
            let logEntered = tx.logs[0];
            let index = logEntered.args.index.toNumber();
            await expectedExceptionPromise(async () => {
                await instance.removeWalletWhiteList(Alice, index, {from: Bob});
                }, 3000000);
        });
        
        it ("should not allow you to change daily limit if not owner of the hub", async () => {
            await expectedExceptionPromise(async () => {
                await instance.setDailyLimit(2 * limit, {from: Bob});
                }, 3000000);
        });

    });
  
    describe("Account", function() {
        let AliceWallet;
        beforeEach("should create a wallet for Alice and process a couple of payments", async () => {
            const thirdOfLimit = limit / 3;
            let tx = await instance.createWallet(Alice, {from: ownerHub});   
            logEntered = tx.logs[1];
            AliceWallet = logEntered.args.wallet;
            await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
            await instance.processPayment(Alice, {from: Bob, value: thirdOfLimit});
        });

        it ("should allow Alice to withdraw her funds", async () => {
            const thirdOfLimit = limit / 3;
            let instanceAccount = Wallet.at(AliceWallet);
            let toAccount = accounts[4]; 
            let balanceBeforeWithdrawal = await web3.eth.getBalance(toAccount);
            let tx = await instanceAccount.withdraw(2 * thirdOfLimit, toAccount, {from: Alice});
            assert.strictEqual(tx.receipt.logs.length, 1);
            assert.strictEqual(tx.logs.length, 1);
            let logEntered; 
            logEntered = tx.logs[0];
            assert.strictEqual(logEntered.event, "LogWithdrawal");
            assert.strictEqual(logEntered.args.amount.toNumber(), 2 * thirdOfLimit); 
            assert.strictEqual(logEntered.args.toAccount, toAccount);
            let balanceAfterWithdrawal = await web3.eth.getBalance(toAccount);
            assert.isTrue(balanceAfterWithdrawal.toNumber() == balanceBeforeWithdrawal.toNumber() + 2 * thirdOfLimit);
            let balanceAccountAlice = await web3.eth.getBalance(AliceWallet);
            assert.isTrue(balanceAccountAlice.toNumber() == 0);
        });

        it ("should not allow to withdraw if not walletholder", async () => {  
            const thirdOfLimit = limit / 3;
            let instanceAccount = Wallet.at(AliceWallet);
            let toAccount = accounts[4];
            let balanceBeforeWithdrawal = await web3.eth.getBalance(toAccount);
            await expectedExceptionPromise(async () => {
                await instanceAccount.withdraw(2 * thirdOfLimit, toAccount, {from: Charlie});
                }, 3000000);
            let balanceAfterWithdrawal = await web3.eth.getBalance(toAccount);
            assert.isTrue(balanceAfterWithdrawal.toNumber() == balanceBeforeWithdrawal.toNumber());
        });

        it ("should allow to withdraw once and then reject if trying to withdraw more than remaining", async () => {  
            const thirdOfLimit = limit / 3;
            let instanceAccount = Wallet.at(AliceWallet);
            let toAccount = accounts[4]; 
            let balanceBeforeWithdrawal = await web3.eth.getBalance(toAccount);
            await instanceAccount.withdraw(thirdOfLimit, toAccount, {from: Alice});
            await expectedExceptionPromise(async () => {
                await instanceAccount.withdraw(2 * thirdOfLimit, toAccount, {from: Charlie});
                }, 3000000);
            let balanceAfterWithdrawal = await web3.eth.getBalance(toAccount);
            assert.isTrue(balanceAfterWithdrawal.toNumber() == balanceBeforeWithdrawal.toNumber() + thirdOfLimit);
            let balanceAccountAlice = await web3.eth.getBalance(AliceWallet);
            assert.isTrue(balanceAccountAlice.toNumber() == thirdOfLimit);
        });

    });

});

