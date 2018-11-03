const PaymentsHub = artifacts.require("./PaymentsHub.sol");
const limit = web3.toWei(10);

module.exports = function(deployer) {
	deployer.deploy(PaymentsHub, limit, {gas:15000000});
};

