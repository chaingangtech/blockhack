
var util = require("util");
var util_obj = require("./utils.js");
var utils = new util_obj();

var stdin = process.stdin;
var stdout = process.stdout;
var stderr = process.stderr;

utils.funcs.addlog("Trxn Narration", function(level, msg) {console.log(level + " - [Narration: " + (new Date()) + "]: " + msg)});

utils.init()

	// TEST - INVESTOR PURCHASE
	//.then(() => {
	//	return utils.access_project("Inv1", "ZK1");
	//})
	//.then(() => {
	//	return utils.get_project_price("Inv1", "ZK1", "AUD", 10);
	//})
	//.then((paths) => {
	//	console.log(JSON.stringify(paths));
	//})
	.then(() => {
		return utils.purchase_project_source("Inv1", "ZK1", "AUD", 100, 0.9);
	})
	//.then(() => {
	//	return utils.purchase_project_dest("Inv1", "ZK1", 2, "AUD", 250);
	//})
	.then(() => {
		return utils.get_investor_balances("Inv1");
	})
	.then((balances) => {
		console.log(JSON.stringify(balances));
	})

	// TEST - PRIMARY MARKET OFFER (RESEARCHER)
	/*
	.then(() => {
		return utils.delete_offers("Res1", "ZK1");
	})
	.then(() => {
		return utils.offer_project("Res1", "ZK1", 30, 100, "AUD");
	})
	.then(() => {
		return utils.get_orders("ZK1", "AUD");
	})
	.then((orders) => {
		console.log(JSON.stringify(orders));
	})
	*/

	// TEST - FUND INVESTOR
	/*
	.then(() => {
		return utils.setup_funds_account("Inv1", "AUD", 10000);
	})
	.then(() => {
		return utils.fund_investor("Inv1", "AUD", 5000);
	})
	.then(() => {
		return utils.get_investor_balances("Inv1");
	})
	.then((balances) => {
		console.log(JSON.stringify(balances))
	})
	*/
	
	// TEST - VANILLA PAYMENT
	/*
	.then(() => {
		//return utils.funcs.make_payment("Res1", "Platform", "ZK1", 100);
		return utils.funcs.make_payment("Platform", "Res1", "ZK1", 100);
	})	
	*/

	// TEST - CREATE PROJECT
	/*
	.then(() => {
		return utils.create_project("Res1", "ZK1", "Zika Virus Investigation", "http://www.awesomeresearcher.com/Zika", "AABBCCDD12345678");
	})
	.then(() => {
		return utils.get_project_details();
	})
	.then((details) => {
		console.log(JSON.stringify(details));
		return;
	})
	.then(() => {
		return utils.get_project_balances();
	})
	.then((details) => {
		console.log(JSON.stringify(details));
		return;
	})
*/

	// TEST - ENTITY DOMAIN
	/*
	.then(() => {
		return utils.get_domain("Res1");
	})
	.then((domain) => {
		console.log("Domain [Before] : " + domain);
		return utils.set_domain("Res1", "http://www.awesomeresearcher.com");
	})
	.then(() => {
		return utils.get_domain("Res1");
	})
	.then((domain) => {
		console.log("Domain [After] : " + domain);
		return;
	})
*/
	//.catch((err) => stderr.write(util.format("Error: %d\n",err)))
	.finally(() => {
		utils.close()
			.then(() => process.exit());
	});
