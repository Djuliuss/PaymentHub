const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
const paymentsHubJson = require("../../build/contracts/PaymentsHub.json");
const walletJson = require("../../build/contracts/Wallet.json");
const addEvmFunctions = require("./utils/evmFunctions.js");

require("file-loader?name=../index.html!../index.html");
require("file-loader?name=../stylesheets.css!../stylesheets.css");

if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
} else {
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
}

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });
addEvmFunctions(web3);
Promise.promisifyAll(web3.evm, { suffix: "Promise" });

const PaymentsHub = truffleContract(paymentsHubJson);
PaymentsHub.setProvider(web3.currentProvider);
const Wallet = truffleContract(walletJson);
Wallet.setProvider(web3.currentProvider);

window.addEventListener('load', () => {
    let deployed;
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length == 0) {
                $("#balance").html("N/A");
                throw new Error("No account with which to transact");
            }
            window.ownerHub = accounts[0];
            window.Alice = accounts[1];
            window.Bob = accounts[2];
            window.Charlie = accounts[3];
            window.Dave = accounts[4];
            return fetchDailyLimit();
        })    
        .then( limitWei => {
        	let dailyLimit = web3.fromWei(limitWei,"ether");
        	$("#dailyLimit").html(dailyLimit.toString(10));
            return web3.eth.getBalancePromise(window.Alice);
        })
        .then(balance => {
            ethBalance = web3.fromWei(balance,"ether");
        	$("#balanceAlice").html(ethBalance.toString(10));
            return web3.eth.getBalancePromise(window.Bob);
        })
        .then(balance => {
            ethBalance = web3.fromWei(balance,"ether");
        	$("#balanceBob").html(ethBalance.toString(10));
            return web3.eth.getBalancePromise(window.Charlie);
        })
        .then(balance => { 
            ethBalance = web3.fromWei(balance,"ether");
        	$("#balanceCharlie").html(ethBalance.toString(10));
            return web3.eth.getBalancePromise(window.Dave);
        })
        .then(balance => { 
            ethBalance = web3.fromWei(balance,"ether");
        	$("#balanceDave").html(ethBalance.toString(10));
            return;
        })
        .then(() => $("#setDailyLimitBtn").click(setDailyLimit))
        .then(() => $("#skipBtn").click(skip))
        .then(() => $("#createWalletBtn").click(createWallet))
        .then(() => $("#whitelistBtn").click(whitelist))
        .then(() => $("#sendAliceBtn").click({buttonNumber: 1 }, processPayment))
        .then(() => $("#sendBobBtn").click({buttonNumber: 2 }, processPayment))
        .then(() => $("#sendCharlieBtn").click({buttonNumber: 3 }, processPayment))
        .then(() => $("#sendDaveBtn").click({buttonNumber: 4 }, processPayment))
        .then(() => $("#withdrawAliceBtn").click({buttonNumber: 5 }, withdraw))
        .then(() => $("#withdrawBobBtn").click({buttonNumber: 6 }, withdraw))
        .then(() => $("#withdrawCharlieBtn").click({buttonNumber: 7 }, withdraw))
        .then(() => $("#withdrawDaveBtn").click({buttonNumber: 8 }, withdraw))
        .catch(console.error);
});

const setDailyLimit = () => {
    const gas = 300000; let deployed;
    let newLimit = $("input[name='setDailyLimit']").val()
    return PaymentsHub.deployed()
        .then(_deployed => {
            deployed = _deployed;
            return deployed.setDailyLimit.call(web3.toWei(newLimit), {from: window.ownerHub, gas: gas})
        })
        .then(success => {
        	if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            return deployed.setDailyLimit.sendTransaction(web3.toWei(newLimit), {from: window.ownerHub, gas: gas})
		})
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (parseInt(receipt.status) != 1) {
                console.error("Wrong status");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution, status not 1");
            } else if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                $("#status").html("Limit updated");
            }
            return fetchDailyLimit();
        })
        .then( limitWei => {
            let dailyLimit = web3.fromWei(limitWei,"ether");
            $("#dailyLimit").html(dailyLimit.toString(10));
        })
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
};

const skip = () => {
    return web3.evm.increaseTimePromise(Date.now() + 24 * 60 * 60 * 1000)
    .then( () => {
        $("#status").html("24 hours skipped")
    })
    .catch(e => {
        $("#status").html(e.toString());
        console.error(e);
    });

};

const createWallet = () => {
    const walletHolder = retreiveAccount($("#walletHolderCreate").val());
    const gas = 5000000; let deployed;
    return PaymentsHub.deployed()
        .then(_deployed => {
            deployed = _deployed;
            return deployed.createWallet.call(walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(success => {
        	if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            return deployed.createWallet.sendTransaction(walletHolder, {from: window.ownerHub, gas: gas})
		})
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (parseInt(receipt.status) != 1) {
                console.error("Wrong status");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution, status not 1");
            } else if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                $("#status").html("Wallet created");
            }
            return deployed.wallets.call(walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(wallet => {
            const boxes = selectBoxes(walletHolder);
            $(boxes.box1).html(wallet[0]);
            const balanceEth = web3.fromWei(wallet[1]);
            $(boxes.box2).html(balanceEth.toString());
            const whitelisted = wallet[3] ? "Yes" : "No";
            $(boxes.box3).html(whitelisted);
        })
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
};

const whitelist = () => {
    const walletHolder = retreiveAccount($("#whitelistThisWallet").val());
    const gas = 300000; let deployed;
    return PaymentsHub.deployed()
        .then(_deployed => {
            deployed = _deployed;
            return deployed.addWalletWhitelist.call(walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(success => {
        	if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            return deployed.addWalletWhitelist.sendTransaction(walletHolder, {from: window.ownerHub, gas: gas})
		})
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (parseInt(receipt.status) != 1) {
                console.error("Wrong status");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution, status not 1");
            } else if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                $("#status").html("Wallet whitelisted");
            }
            return deployed.wallets.call(walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(wallet => {
            const boxes = selectBoxes(walletHolder);
            $(boxes.box1).html(wallet[0]);
            const balanceEth = web3.fromWei(wallet[1]);
            $(boxes.box2).html(balanceEth.toString());
            const whitelisted = wallet[3] ? "Yes" : "No";
            $(boxes.box3).html(whitelisted);
        })
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
};

const processPayment = (event) => {
    const arguments = prepareArguments(event.data.buttonNumber);
    const gas = 300000; let deployed;
    return PaymentsHub.deployed()
        .then(_deployed => {
            deployed = _deployed;
            return deployed.processPayment.call(arguments.walletHolder, {from: arguments.fromAccount,
                                                                        value: web3.toWei(arguments.etherAmount), gas: gas})
        })
        .then(success => {
        	if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            return deployed.processPayment.sendTransaction(arguments.walletHolder, {from: arguments.fromAccount,
                                                                        value: web3.toWei(arguments.etherAmount), gas: gas})
        })
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (parseInt(receipt.status) != 1) {
                console.error("Wrong status");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution, status not 1");
            } else if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                $("#status").html("Payment sent");
            }
            return deployed.wallets.call(arguments.walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(wallet => {
            const boxes = selectBoxes(arguments.walletHolder);
            $(boxes.box1).html(wallet[0]);
            const balanceEth = web3.fromWei(wallet[1]);
            $(boxes.box2).html(balanceEth.toString());
            const whitelisted = wallet[3] ? "Yes" : "No";
            $(boxes.box3).html(whitelisted);
            return web3.eth.getBalancePromise(arguments.fromAccount);
        })
        .then( balance => {
            ethBalance = web3.fromWei(balance,"ether");
            const box = selectSendBox(arguments.fromAccount);
            $(box).html(ethBalance.toString(10));
        })
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
};

const fetchDailyLimit = () => {
    return PaymentsHub.deployed()
        .then(deployed => {
            return deployed.dailyLimit.call();
        })
}

const withdraw = (event) => {
    const arguments = prepareArguments(event.data.buttonNumber);
    const gas = 300000; let deployed, walletDeployed;
    return PaymentsHub.deployed()
        .then(_deployed => {
            deployed = _deployed;
            return deployed.wallets.call(arguments.walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then ( wallet => {
            const walletAddress = wallet[0];
            return Wallet.at(walletAddress);
        })    
        .then ( _deployed => {
            walletDeployed = _deployed
            return walletDeployed.withdraw.call(web3.toWei(arguments.etherAmount), arguments.walletHolder, 
                                    {from: arguments.fromAccount, gas: gas})
        })
        .then(success => {
        	if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            return walletDeployed.withdraw.sendTransaction(web3.toWei(arguments.etherAmount), arguments.walletHolder,
                                    {from: arguments.fromAccount, gas: gas})
        })
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (parseInt(receipt.status) != 1) {
                console.error("Wrong status");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution, status not 1");
            } else if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                $("#status").html("Withdrawal completed");
            }
            return deployed.wallets.call(arguments.walletHolder, {from: window.ownerHub, gas: gas})
        })
        .then(wallet => {
            const boxes = selectBoxes(arguments.walletHolder);
            $(boxes.box1).html(wallet[0]);
            const balanceEth = web3.fromWei(wallet[1]);
            $(boxes.box2).html(balanceEth.toString());
            const whitelisted = wallet[3] ? "Yes" : "No";
            $(boxes.box3).html(whitelisted);
            return web3.eth.getBalancePromise(arguments.fromAccount);
        })
        .then( balance => {
            ethBalance = web3.fromWei(balance,"ether");
            const box = selectSendBox(arguments.fromAccount);
            $(box).html(ethBalance.toString(10));
        })
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
}

const retreiveAccount = (boxOption) => {
    let account;
    switch (boxOption) {
        case "Alice":
            account = window.Alice;
            break;
        case "Bob":
            account = window.Bob;
            break;
        case "Charlie":
            account = window.Charlie;
            break;
        case "Dave":
            account = window.Dave;
            break;
    }
    return account;
}

const selectBoxes = (walletHolder) => {
    let box1, box2, box3;
    switch(walletHolder) {
        case window.Alice:
            box1 = "#walletAliceCreated";
            box2 = "#dailyPaymentsAlice";                   ; 
            box3 = "#whitelistedAlice";                   ;
            break;
        case window.Bob:
            box1 = "#walletBobCreated";
            box2 = "#dailyPaymentsBob";
            box3 = "#whitelistedBob";  
            break
        case window.Charlie:
            box1 = "#walletCharlieCreated";
            box2 = "#dailyPaymentsCharlie";
            box3 = "#whitelistedCharlie";
            break;
        case window.Dave:
            box1 = "#walletDaveCreated";      
            box2 = "#dailyPaymentsDave";
            box3 = "#whitelistedDave";
            break;
    }
    return {box1: box1,
            box2: box2,
            box3: box3}
}

const selectSendBox = (walletHolder) => {
    let box;
    switch(walletHolder) {
        case window.Alice:
            box = "#balanceAlice";
            break;
        case window.Bob:
            box = "#balanceBob";
            break;
        case window.Charlie:
            box = "#balanceCharlie";
            break;
        case window.Dave:
            box = "#balanceDave";
            break;
    }
    return box
}

const prepareArguments = (buttonNumber) => {
    let walletHolder, fromAccount, etherAmount;
    switch(buttonNumber) {
        case 1:      
            walletHolder = retreiveAccount($("#sendAliceTo").val());
            fromAccount = window.Alice;
            etherAmount = $("input[name='amountAliceSend']").val();
            break;
        case 2:
            walletHolder = retreiveAccount($("#sendBobTo").val());
            fromAccount = window.Bob;
            etherAmount = $("input[name='amountBobSend']").val();
            break;
        case 3:
            walletHolder = retreiveAccount($("#sendCharlieTo").val());
            fromAccount = window.Charlie;
            etherAmount = $("input[name='amountCharlieSend']").val();
            break;
        case 4:
            walletHolder = retreiveAccount($("#sendDaveTo").val());
            fromAccount = window.Dave;
            etherAmount = $("input[name='amountDaveSend']").val();
            break;
        case 5:
            walletHolder = window.Alice;
            fromAccount = window.Alice;
            etherAmount = $("input[name='amountAliceWithdraw']").val();
            break;
        case 6:
            walletHolder = window.Bob;
            fromAccount = window.Bob;
            etherAmount = $("input[name='amountBobWithdraw']").val();
            break;
        case 7:
            walletHolder = window.Charlie;
            fromAccount = window.Charlie;
            etherAmount = $("input[name='amountCharlieWithdraw']").val();
            break;
        case 8:
            walletHolder = window.Dave;
            fromAccount = window.Dave;
            etherAmount = $("input[name='amountDaveWithdraw']").val();
            break;    
    } 
    return {
            walletHolder: walletHolder,
            fromAccount: fromAccount,
            etherAmount: etherAmount
    }
}