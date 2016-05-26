"use strict";

var util_entities = require("./util_entities.js");
var util_funcs = require("./util_funcs.js");
var ripple_data = require("./ripple_data.js");

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
// Entity Domains
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

//////////////////////////////
// Create Research Project
//////////////////////////////

utils.prototype.create_project = function(addr, code, description, site) {
	var memos = [
		{
			"type": "description",
      		"format": "plain/text",
      		"data": description
      	},
		{
			"type": "information",
      		"format": "plain/text",
      		"data": site
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
							if(memo.type == "information") ret[ccy].project_site = memo.data;
						});
						ret[ccy].researcher_pkey = transactions[i].specification.destination.address;
					}
				}
				i++;
			}
			return ret;
		});		
}

module.exports = utils;