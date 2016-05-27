
var util = require("util");
var util_obj = require("./utils.js");
var utils = new util_obj();

var stdin = process.stdin;
var stdout = process.stdout;
var stderr = process.stderr;

utils.funcs.addlog("Trxn Narration", function(level, msg) {console.log(level + " - [Narration: " + (new Date()) + "]: " + msg)});

utils.init()

	/*.then(() => {
		var p = [];

		// Reseachers
		p.push(utils.set_domain("Res1", "http://www.drjanesmith.unsw.edu.au"));
		p.push(utils.set_domain("Res2", "http://www.drmargisargent.usyd.edu.au"));
		p.push(utils.set_domain("Res3", "http://www.drjohnbrown.usyd.edu.au"));
		
		
		p.push(utils.setup_funds_account("Res1", "AUD", 1000000));
		p.push(utils.setup_funds_account("Res2", "AUD", 1000000));
		p.push(utils.setup_funds_account("Res3", "AUD", 1000000));

		// Projects
		p.push(utils.create_project("Res1", "LCR", "Lung Cancer Research", "http://www.drjanesmith.unsw.edu.au/LungCancer", "ec2acc83d71f3d5119339e27476a1a60"));
		p.push(utils.create_project("Res2", "HTR", "Heart Transplant Research", "http://www.drmargisargent.usyd.edu.au/HeartTransplant", "7f5601c7888f8a5dbcc35c3871652c2c"));
		p.push(utils.create_project("Res3", "PCR", "Palative Care Research", "http://www.drjohnbrown.usyd.edu.au/PalativeCare", "cf1527dd54c51da5272cc87d0cd66109"));
		
		// Investors
		p.push(utils.setup_funds_account("Inv1", "AUD", 100000).then(function() {return utils.fund_investor("Inv1","AUD",10000)}));
		p.push(utils.setup_funds_account("Inv2", "AUD", 100000).then(function() {return utils.fund_investor("Inv2","AUD",100000)}));
		p.push(utils.setup_funds_account("Inv3", "AUD", 100000).then(function() {return utils.fund_investor("Inv3","AUD",5000)}));
		p.push(utils.access_project("Inv1", "LCR"));
		p.push(utils.access_project("Inv2", "LCR"));
		p.push(utils.access_project("Inv3", "LCR"));

		return Promise.all(p);
	})	*/ 
	/*.then(() => {
		return utils.offer_project("Res1", "LCR", 30, 1000, "AUD");
	})*/
	/*.then(() => {
		return utils.purchase_project_source("Inv2", "LCR", "AUD", 25000, 0.9);
		//return utils.purchase_project_dest("Inv1", "LCR", 5, "AUD", 6000);
	})
	
	.then(() => {
		return utils.purchase_project_source("Inv1", "LCR", "AUD", 5000, 0.9);
		//return utils.purchase_project_dest("Inv1", "LCR", 5, "AUD", 6000);
	})
	*/
	
	.then(() => {
		var p = [];
		p.push(utils.offer_project("Inv1", "LCR", 2, 1600, "AUD"));
		return Promise.all(p);
	})
	
	.then(() => {
		var p = [];
		//p.push(utils.get_project_details("LCR"));
		//p.push(utils.get_investor_balances("Res1"));
		//p.push(utils.get_investor_balances("Inv1"));
		//p.push(utils.get_project_price("Inv1", "LCR", "AUD", 1));
		//p.push(utils.get_project_purchase("Inv1", "LCR", "AUD", 1000));
		p.push(utils.get_orders("LCR", "AUD"));

		//p.push(utils.get_investor_balances("Inv1"));
		//p.push(utils.get_investor_balances("Inv2"));
		//p.push(utils.get_investor_balances("Inv3"));

		return Promise.all(p);
	})
	.then((details) => {
		details.forEach((detail) => {
			console.log("---------------------------------------------------------------");
			console.log(JSON.stringify(detail));
			console.log("---------------------------------------------------------------");
		})
		return;
	})

	
	//.catch((err) => stderr.write(util.format("Error: %d\n",err)))
	.finally(() => {
		utils.close()
			.then(() => process.exit());
	});
