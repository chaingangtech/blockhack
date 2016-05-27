"use strict";

var util_entities = require("./util_entities.js");
var util_funcs = require("./util_funcs.js");
var ripple_data = require("./ripple_data.js");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ACTOR FUNCTIONS
// Note: * indicates function has not been implemented
//
// PLATFORM
//  - create_project : setup and allocate units for a specific research project (would include appropriate vetting)
//  - *authorise_access_project : authorise an investor to access a project for investment (would include specific vetting)
//
// BANK
//  - *authorise_funds_account : accept the account request from the investor (with appropriate identity checks)
//  - fund_investor : allocates funds to an investor on the platform
//
// RESEARCHER
//  - set_domain : set the URL for the profile of the specific researcher
//  - setup_funds_account : setup platform account with bank
//  - get_project_balances : get the details of unit holdings for a specific project
//  - offer_project : set a price for primary market of a project
//  - delete_offers : removes all offers of sale for units in a primary market of a project
//
// INVESTOR
//  - get_domain : retrieves the URL for the profile of a researcher
//  - setup_funds_account : setup platform account with bank
//  - get_investor_balances : provides the monetary and research equity positions of the investor
//  - get_project_details : retrieve the details (description, website URL & hash) for a specific project
//  - offer_project : set a price for secondary market for a project
//  - delete_offers : removes all offers of sale for units in a secondary market for a project
//  - get_orders : retrieves details of the current primary and secondary markets for a project
//  - access_project : provide a connection for investment to a specific project
//  - get_project_purchase : get amount of units in a project (primary or secondary market) which can be purchased with a given amount of funds 
//  - get_project_price : get funds cost of specific number of units investment in a project (primary or secondary market)
//  - purchase_project_source : invest a specific amount of funds in a project (primary or secondary market)
//  - purchase_project_dest : invest a specific amount of units in a project (primary or secondary market)
// 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Promise.longStackTraces = true;

var utils = function() {
	this.funcs = new util_funcs("wss://s1.ripple.com:443", "project");
}

utils.prototype.init = function() {
	return this.funcs.init()
		.then(function() {
			return this.funcs.prepare_registration(null);
		}.bind(this));
}

utils.prototype.close = function() {
	return this.funcs.close();
}


//////////////////////////////
// Entity Administration
//////////////////////////////

utils.prototype.get_domain = function(addr) {
	return this.funcs.get_accountsettings()
		.then((settings) => {
			var ret = "";
			settings.forEach(function(setting) {
				if(setting.entity == addr || setting.pkey == addr) ret = setting.settings.domain;
			});
			if(ret == null) ret = "";
			return ret;
		});
}

utils.prototype.set_domain = function(addr, domain) {
	return this.funcs.update_accountsettings(addr, (ent, pkey, settings) => {
		settings.domain = domain;
		return true;
	});
}

utils.prototype.setup_funds_account = function(investor, currency, limit) {
	return this.funcs.create_trustline(investor, "Bank", currency, limit, 0, false);
}

//////////////////////////////
// GENERAL ENTITY sFUNCTIONS
//////////////////////////////

utils.prototype.get_investor_balances = function(investor) {
	var platform_pkey = this.funcs.entities.resolve("Platform");
	return this.funcs.get_balances(investor,null,null)
		.then(function(balances) {
			var ret = {funds : [], investments : []};
			balances[0].balances.forEach(function(balance) {
				if(balance.currency != "XRP") {
					if(balance.counterparty == platform_pkey) ret.investments.push({investment : balance.currency, holding : balance.value});
					else ret.funds.push({currency : balance.currency, balance : balance.value});
				}
			}.bind(this));
			return ret;
		}.bind(this));
}

//////////////////////////////
// PROJECT FUNCTIONS
//////////////////////////////

utils.prototype.create_project = function(addr, code, description, site, hash) {
	var memos = [
		{
			"type": "description",
      		"format": "plain/text",
      		"data": description
      	},
		{
			"type": "prospectus",
      		"format": "plain/text",
      		"data": site
      	},
		{
			"type": "hash",
      		"format": "plain/text",
      		"data": hash
      	}
	];
	return this.funcs.create_trustline(addr, "Platform", code, 100, 100, false, memos);
}

utils.prototype.get_project_details = function(code) {
	return this.funcs.get_transactions("Platform", {initiated : true, minLedgerVersion : 21380000, types : ["payment"]})
		.then((transactions) => {
			var ret = {};
			var description, project_site, researcher_pkey;
			var i = 0;
			while(i < transactions.length) {
				if(transactions[i].specification.memos != null) {
					var ccy = transactions[i].specification.destination.amount.currency;
					if(ret[ccy] == null && (ccy == code || code == null)) {
						ret[ccy] = {};
						transactions[i].specification.memos.forEach((memo) => {
							if(memo.type == "description") ret[ccy]["description"]	 = memo.data;
							if(memo.type == "prospectus") ret[ccy].project_site = memo.data;
							if(memo.type == "hash") ret[ccy].site_hash = memo.data;
						});
						ret[ccy].researcher_pkey = transactions[i].specification.destination.address;
					}
				}
				i++;
			}
			return ret;
		});		
}



utils.prototype.get_project_balances = function(code) {
	return this.funcs.get_balances("Platform",code,null)
		.then(function(balances) {
			var ret = {};
			balances[0].balances.forEach(function(balance) {
				if(balance.currency != "XRP") {
					if(ret[balance.currency] == null) ret[balance.currency] = [];
					var ent = this.funcs.entities.lookup(balance.counterparty);
					ret[balance.currency].push({holder : ent, pkey : balance.counterparty, balance : -1*balance.value});
				}
			}.bind(this));
			return ret;
		}.bind(this));
}


//////////////////////////////
// MARKET FUNCTIONS
//////////////////////////////

utils.prototype.offer_project = function(owner, code, amount, price, currency) {
	return this.funcs.create_order(owner, "sell", "Platform", code, amount, "Bank", currency, amount*price);
}

utils.prototype.bid_project = function(owner, code, amount, price, currency) {
	return this.funcs.create_order(owner, "buy", "Platform", code, amount, "Bank", currency, amount*price);
}

utils.prototype.delete_offers = function(owner, code) {
	return this.funcs.delete_allorders(owner, (order) => (order.specification.quantity.currency != code));
}

utils.prototype.get_orders = function(code, currency) {
	return this.funcs.get_orders("Platform", code, "Platform", currency, "Bank")
		.then((orders) => {
			var ret = {bids : [], asks : []};
			orders.asks.forEach((ask) => {
				ret.asks.push({units : ask.specification.quantity.value, total_price : ask.specification.totalPrice.value, exchange_rate : ask.properties.makerExchangeRate});
			});
			orders.bids.forEach((bid) => {
				ret.bids.push({units : bid.specification.quantity.value, total_price : bid.specification.totalPrice.value, exchange_rate : 1.0/bid.properties.makerExchangeRate});
			});
			return ret;
		})
}


//////////////////////////////
// INVESTOR FUNCTIONS
//////////////////////////////

utils.prototype.fund_investor = function(investor, currency, amount) {
	return this.funcs.make_basic_payment("Bank", investor, currency, amount);
}

utils.prototype.access_project = function(investor, code) {
	return this.funcs.create_trustline(investor, "Platform", code, 100, 0, false);
}

utils.prototype.get_project_purchase = function(investor, code, currency, amount) {
	return this.funcs.get_paths_source(investor, currency, investor, code, amount)
		.then((paths) => {
			return parseFloat(paths[0].destination.minAmount.value);
		})
}

utils.prototype.get_project_price = function(investor, code, currency, amount) {
	return this.funcs.get_paths_dest(investor, currency, investor, code, amount)
		.then((paths) => {
			var ret = [];
			paths.forEach((path) => {
				ret.push({currency : path.source.maxAmount.currency, amount : path.source.maxAmount.value})
			})
			return ret;
		})
}

utils.prototype.purchase_project_source = function(investor, code, currency, amount, minAmount) {
	return this.funcs.make_payment_source(investor, currency, "Bank", amount, investor, code, "Platform", minAmount);
}

utils.prototype.purchase_project_dest = function(investor, code, amount, currency, maxAmount) {
	return this.funcs.make_payment_dest(investor, currency, "Bank", maxAmount, investor, code, "Platform", amount);
}



module.exports = utils;