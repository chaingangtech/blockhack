"use strict";

var util = require("util");
var Promise = require("bluebird");
var RippleAPI = require("ripple-lib").RippleAPI;
var util_entities = require("./util_entities.js");

var util_funcs = function(sAddr, sSet) {
	this.entities = new util_entities(sSet);
	this.api = new RippleAPI({server: sAddr});
	this.lastValidatedLedger = 0;
	this.initiated = false;
	this.logs = {};
	this.submitted_trxns = {};
	this.expiry_trxns = {};

	this.config = {default_instructions : {maxLedgerVersionOffset : 10, maxFee : "0.1"}, default_limit : 10000000.00, default_min_balance : 100000.00, default_max_balance : 2000000.00, default_order_base : 1000000.00, default_order_spread : 0.5, default_USDXRP_rate : 1.0};

	// Contains a registry of the accounts that are being monitored and the transaction/balance functions
	this.registry = {};

	// Contains the registry of accounts

	this.api.on('error', function(errorCode, errorMessage) {
	  this.log("Ledger Narration","Error",util.format("Ripple Network error %s: %s", errorCode, errorMessage));
	}.bind(this));

	this.api.on('ledger', function(ledger) {
		if(this.initiated) {
	  		this.lastValidatedLedger = ledger.ledgerVersion;
			this.log("Ledger Narration","Info",util.format("Processing Ledger %d", ledger.ledgerVersion));
			this.processLedger(ledger.ledgerVersion).then(() => null);
		} else this.log("Ledger Narration","Info",util.format("Ledger %d skipped", ledger.ledgerVersion));
	}.bind(this));

}

util_funcs.prototype.addlog = function(log_type, log_func) {
  if(this.logs[log_type] == null) this.logs[log_type] = [];
  this.logs[log_type].push(log_func);
}

util_funcs.prototype.log = function(log_type, level, msg) {
  if(this.logs[log_type] != null)
  {
    this.logs[log_type].forEach((f) => {
    	f(level, msg);
    });
  }
}

util_funcs.prototype.init = function(firstLedger) {
	var api = this.api;
	var connect = new Promise(function(resolve,reject) {
	    api.connect().then(() => null);
	    api.on('connected', function() {
	      resolve();
	    })
	  });

	if(firstLedger == null) {this.initiated = true; return connect;}

	return connect
	.then(() => {
		return this.api.getLedgerVersion();
	}.bind(this))
	.then(function(ledgerVersion) {
		this.initiated = true;
		var promises = [];
		if(firstLedger == 0) firstLedger = ledgerVersion;
		else this.log("Ledger Narration", "Info", util.format("Initiating Catchup %d => %d (%d ledgers)", firstLedger, ledgerVersion, ledgerVersion - firstLedger));
		promises.push(this.processLedger(firstLedger, true));
		firstLedger = firstLedger + 1;
		while(firstLedger <= ledgerVersion) {
			promises.push(this.processLedger(firstLedger));
			firstLedger = firstLedger + 1;
		}
		return Promise.map(promises, () => null, {concurrency : 20});
	}.bind(this));
}

util_funcs.prototype.close = function() {
	return this.api.disconnect();
}

util_funcs.prototype.processLedger = function(ledgerVersion, bForceBalance) {
	var ret = [];
	if(bForceBalance == null) bForceBalance = false;
	Object.keys(this.registry).forEach(entity => {
		ret.push(
			this.api.getTransactions(entity, {minLedgerVersion : ledgerVersion, maxLedgerVersion : ledgerVersion}).then(transactions => {
				transactions.forEach(transaction => {
					this.registry[entity].fTransactions.forEach(func => {func(ledgerVersion, entity, transaction)});
				});
				if((transactions.length > 0 || bForceBalance) && this.registry[entity].fBalances.length > 0) {
					this.api.getBalances(entity, {ledgerVersion : ledgerVersion}).then(balances => {
						balances.forEach(balance => {
							this.registry[entity].fBalances.forEach(func => {func(ledgerVersion, entity, balance)});
						});
					});
				}
			})
			.catch((err) => this.log("Ledger Narration", "Error", err))
		)
	});
	Object.keys(this.submitted_trxns).forEach(function(id) {
		if(this.submitted_trxns[id].lastLedgerSequence == ledgerVersion + 1) {
			this.submitted_trxns[id].fReject(this.submitted_trxns[id].sDescription + " not validated by RCL in required ledger versions");
			delete this.submitted_trxns[id];
		}
	}.bind(this));
	return Promise.map(ret, () => null);
}


util_funcs.prototype.add_registration = function(entity, func, bBalance) {
	if(bBalance == null) bBalance = false;   // transaction by default
	var arr = [];
	if(entity == null) arr = this.entities.get_entities() // default - get all the entities of the current set
	else if(Array.isArray(entity)) arr = entity;
	else arr = [entity];
	
	arr.forEach(function (ent) {
		var entityKey = this.entities.resolve(ent);
		if(this.registry[entityKey] == null) this.registry[entityKey] = {fTransactions : [], fBalances : []};
		if(bBalance) this.registry[entityKey].fBalances.push(func);
		else this.registry[entityKey].fTransactions.push(func);
	}.bind(this));
	
}

util_funcs.prototype.prepare_registration = function(entity) {
	var arr = this.entity_param(entity);
	var promises = [];
	
	arr.forEach(function (ent) {
		var entityKey = this.entities.resolve(ent);
		if(this.registry[entityKey] == null) this.registry[entityKey] = {fTransactions : [], fBalances : [], sequence : null, rippling : null};
		promises.push(Promise.join(this.api.getAccountInfo(entityKey), this.api.getSettings(entityKey))
			.then(function(info) {
				this.registry[entityKey].sequence = info[0].sequence;
				this.registry[entityKey].rippling = info[1].defaultRipple;
				this.registry[entityKey].requireAuthorization = info[1].requireAuthorization;
				if(this.registry[entityKey].rippling == null) this.registry[entityKey].rippling = false;
				this.registry[entityKey].fTransactions.push(function(ledger, entity, transaction) {
					var trxn = this.submitted_trxns[transaction.id];
					if(trxn != null) {
						this.log("Trxn Narration","Info",util.format("%s confirmed in ledger %d", trxn.sDescription, ledger))
						trxn.fResolve(transaction);
						delete this.submitted_trxns[transaction.id];
					}
				}.bind(this))
			}.bind(this)));
	}.bind(this));

	return Promise.all(promises);
	
}


util_funcs.prototype.entity_param = function(entity) {
	var arr = [];
	if(entity == null) arr = this.entities.get_entities() // default - get all the entities of the current set
	else if(Array.isArray(entity)) arr = entity;
	else arr = [entity];
	return arr;
}

util_funcs.prototype.get_trxn_instructions = function(pkey) {
	var ret = Object.assign({}, this.config.default_instructions);
	if(this.registry[pkey] == null || this.registry[pkey].sequence == null) throw Error(util.format("Attempt to process active transaction for address %s which has not been actively registered.", pkey));
	else ret.sequence = this.registry[pkey].sequence++;
	return ret;
}

util_funcs.prototype.sign_submit_trxn = function(prepared_txn, private_key, sDescription) {
	if(sDescription == null || sDescription == "") sDescription = "Anonymous Transaction"
	return new Promise(function(resolve, reject) {
		var signed = this.api.sign(prepared_txn.txJSON, private_key);
		this.log("Trxn Narration", "Info", util.format("%s signed (ID=%s)", sDescription, signed.id));
		this.api.submit(signed.signedTransaction)
			.then(function(result) {
				if (result.resultCode == 'tesSUCCESS') {
		          this.log("Trxn Narration", "Info", util.format("%s submitted (ID=%s)", sDescription, signed.id))
		          this.submitted_trxns[signed.id] = {fResolve : resolve, fReject : reject, sDescription : sDescription, lastLedgerSequence : JSON.parse(prepared_txn.txJSON).LastLedgerSequence};
		        }
		        else if (result.resultCode == 'terQUEUED') {
		          this.log("Trxn Narration", "Info", util.format("%s queued (ID=%s)", sDescription, signed.id))
		          this.submitted_trxns[signed.id] = {fResolve : resolve, fReject : reject, sDescription : sDescription, lastLedgerSequence : JSON.parse(prepared_txn.txJSON).LastLedgerSequence};
		        } else {
		          reject(util.format("Failed transaction submission (%s) - %s : %s", sDescription, result.resultCode, result.resultMessage));
		        }
			}.bind(this));
	}.bind(this))
}


////////////////////////////////////////////////////////////////////////////////
// Core Functions - Read / Reporting
////////////////////////////////////////////////////////////////////////////////

util_funcs.prototype.output_set_details = function(funcOut, entitySet) {
	var arrEnt = this.entities.get_entities(entitySet);
	var arr = [];
	arrEnt.forEach(function (entity) {
		if(entitySet != null) entity = entitySet + "." + entity
		var p = this.entities.resolve(entity);
		arr.push(this.api.getBalances(p));
		arr.push(this.api.getOrders(p));
	}, this);
	
	return Promise.all(arr).then((res) => {
		arrEnt.forEach((entity,index,arr) => {
			write_entity(funcOut, entitySet, entity, this.entities, res[index*2], res[index*2+1]);
		});
	})

}

util_funcs.prototype.get_trustlines = function(entitySet) {
	var arrEnt = this.entities.get_entities(entitySet);
	return Promise.map(arrEnt, function(ent) {
		if(entitySet != null) ent = entitySet + "." + ent;
		var p = this.entities.resolve(ent);
		return this.api.getTrustlines(p).then((trustlines) => {
			return {entity : ent, pkey : p, trustlines : trustlines};
		});
	}.bind(this));
}

util_funcs.prototype.get_transactions = function(entity, options) {
	var p = this.entities.resolve(entity);
	return this.api.getTransactions(p, options);
}



util_funcs.prototype.get_accountsettings = function(entitySet) {
	var arrEnt = this.entities.get_entities(entitySet);
	return Promise.map(arrEnt, function(ent) {
		var p = this.entities.resolve(ent);
		return this.api.getSettings(p).then((settings) => {
			return {entity : ent, pkey : p, settings : settings};
		});
	}.bind(this));
}



util_funcs.prototype.get_accountinfo = function(entitySet) {
	var arrEnt = this.entities.get_entities(entitySet);
	return Promise.map(arrEnt, function(ent) {
		var p = this.entities.resolve(ent);
		return this.api.getAccountInfo(p).then((info) => {
			return {entity : ent, pkey : p, info : info};
		});
	}.bind(this));
}


////////////////////////////////////////////////////////////////////////////////
// Core Functions - Write / Transaction Processing
////////////////////////////////////////////////////////////////////////////////


util_funcs.prototype.delete_allorders = function(entity, funcOverride) {
	if(funcOverride == null) funcOverride = function(order) {return false;};
	var arr = this.entity_param(entity);
	var promises = [];

	arr.forEach(function (ent) {
		var base = this.entities.resolveBase(ent);
		var pkey = base.public;
		promises.push(
			this.api.getOrders(pkey)
			.then((orders) => {
				var promises2 = [];
				orders.forEach(function(order) {
					var sDescription = util.format("address %s (%d)", ent,  order.properties.sequence)
					// TO DO - Improve output
					if(funcOverride(order)) {
						this.log("Trxn Narration", "Info", util.format("Skipping deletion of order for %s", sDescription));
					} else {
						this.log("Trxn Narration", "Info", util.format("Deleting order for %s", sDescription));
						var trxn = this.api.prepareOrderCancellation(pkey, {orderSequence: order.properties.sequence}, this.get_trxn_instructions(pkey))
							.then(function(prepared) {
								return this.sign_submit_trxn(prepared, base.secret, util.format("Order deletion for %s", sDescription));
							}.bind(this));
						promises2.push(trxn);
					}
				}.bind(this))
				return Promise.all(promises2);
			})
		);
	}.bind(this));

	return Promise.all(promises);
}

util_funcs.prototype.delete_alltrustlines = function(entity, funcOverride) {
	if(funcOverride == null) funcOverride = function(trustline) {return false;};
	var arr = this.entity_param(entity);
	var promises = [];

	arr.forEach(function (ent) {
		var base = this.entities.resolveBase(ent);
		var pkey = base.public;
		promises.push(
			this.api.getTrustlines(pkey)
			.then((trustlines) => {
				var promises2 = [];
				trustlines.forEach(function(trustline) {
					var sDescription = util.format("address %s (counterparty=%s, currency=%s, limit=%s, balance=%s)", pkey, trustline.specification.counterparty, trustline.specification.currency, trustline.specification.limit, trustline.state.balance);
					if(funcOverride(pkey, trustline)) {
						this.log("Trxn Narration", "Info", util.format("Skipping deletion of trustline for %s", sDescription));
					} else {
						// balance
						if(trustline.state.balance > 0) {
							this.log("Trxn Narration", "Info", "Removing trustline balance for " + sDescription);
							var payment = {
							  source: {
							    address: pkey,
							    maxAmount: {
							      value: trustline.state.balance,
							      currency: trustline.specification.currency,
							      counterparty: trustline.specification.counterparty
							    }
							  },
							  destination: {
							    address: trustline.specification.counterparty,
							    amount: {
							      value: trustline.state.balance,
							      currency: trustline.specification.currency,
							      counterparty: trustline.specification.counterparty
							    }
							  }
							};
							var trxn = this.api.preparePayment(pkey, payment, this.get_trxn_instructions(pkey))
								.then(function(prepared) {
									var signed = this.sign_submit_trxn(prepared, base.secret, util.format("Trustline balance removal for %s", sDescription));
									return signed;
								}.bind(this));
							promises2.push(trxn);
						}
						// limit
						// TO DO : this produces a sequence number error when authorization is not needed.... not too sure
						if(trustline.specification.limit > 0 || trustline.state.balance >= 0) {
							var t_delete = trustline.specification;
							t_delete["limit"] = "0";
							t_delete.ripplingDisabled = !(this.registry[pkey].rippling);
							t_delete.frozen = false;
							this.log("Trxn Narration", "Info", "Deleting trustline for " + sDescription);
							var trxn = this.api.prepareTrustline(pkey, t_delete, this.get_trxn_instructions(pkey))
								.then(function(prepared) {
									var signed = this.sign_submit_trxn(prepared, base.secret, util.format("Trustline deletion for %s", sDescription));
									return signed;
								}.bind(this))
								.catch((e) => {
									if(e.indexOf("tecNO_LINE_REDUNDANT") >= 0) this.log("Trxn Narration", "Warn", util.format("Non-existence error raised (and ignored) for deletion of trustline for %s", sDescription));
									else throw e;
								});
							promises2.push(trxn);
						} else this.log("Trxn Narration", "Info", util.format("Skipping deletion (implicit - negative balance) of zero-limit trustline for %s", sDescription));

					}
				}.bind(this))
				return Promise.all(promises2);
			})
		);
	}.bind(this));

	return Promise.all(promises);
}


util_funcs.prototype.create_trustline = function(fromEntity, toEntity, currency, limit, balance, bReverse, memos) {
	if(limit == null) limit = this.config.default_limit;
	if(balance == null) balance = this.config.default_max_balance;
	var fromBase = this.entities.resolveBase(fromEntity);
	var toBase = this.entities.resolveBase(toEntity);
	var sDescription = util.format("address %s (counterparty=%s, currency=%s, limit=%d, balance=%d)", fromBase.public, toBase.public, currency, limit, balance);
	var t = {limit : limit.toString(), currency : currency, counterparty : toBase.public};
	if(this.registry[toBase.public].requireAuthorization && bReverse) t.authorized = true;
	var trustline = this.api.prepareTrustline(fromBase.public,t,this.get_trxn_instructions(fromBase.public))
		.then(function(prepared) {
			return this.sign_submit_trxn(prepared, fromBase.secret, util.format("Trustline creation for %s", sDescription));
		}.bind(this));

	if(this.registry[toBase.public].requireAuthorization && !bReverse) {
		var t2 = {limit : "0.0", currency : currency, counterparty : fromBase.public, authorized : true};
		trustline = trustline
			.then(function(res) {
				return this.api.prepareTrustline(toBase.public,t2,this.get_trxn_instructions(toBase.public));
			}.bind(this))
			.then(function(prepared) {
				return this.sign_submit_trxn(prepared, toBase.secret, util.format("Trustline authorization for %s", sDescription));
			}.bind(this));
	}

	if(balance == 0) return trustline;
	else return trustline
		.then(function(res) {
			var payment = {
			  source: {
			    address: toBase.public,
			    maxAmount: {
			      value: balance.toString(),
			      currency: currency,
			      counterparty: toBase.public
			    }
			  },
			  destination: {
			    address: fromBase.public,
			    amount: {
			      value: balance.toString(),
			      currency: currency,
			      counterparty: toBase.public
			    }
			  }
			};
			if(memos != null) payment.memos = memos;
			return this.api.preparePayment(toBase.public, payment, this.get_trxn_instructions(toBase.public));
		}.bind(this))
		.then(function(prepared) {
			return this.sign_submit_trxn(prepared, toBase.secret, util.format("Establishing balance for %s", sDescription));
		}.bind(this))
}



util_funcs.prototype.update_accountsettings = function(entity, funcSettings) {
	if(funcSettings == null) throw Error("Update Account Settings called with no update function")
	var arr = this.entity_param(entity);
	var promises = [];

	return Promise.map(arr, function(ent) {
		var base = this.entities.resolveBase(ent);
		var pkey = base.public;
		return this.api.getSettings(pkey)
			.then(function(info) {
				if(funcSettings(ent, pkey, info)) {
					this.log("Trxn Narration", "Info", util.format("Updating account settings for %s", pkey));
					var trxn = this.api.prepareSettings(pkey, info, this.get_trxn_instructions(pkey))
						.then(function(prepared) {
							return this.sign_submit_trxn(prepared, base.secret, util.format("Updating account settings for %s", pkey));
						}.bind(this));
					return trxn;
				}
				else 
				{
					this.log("Trxn Narration", "Info", util.format("Skipped updating account settings for %s", pkey));
					return Promise.resolve(0);
				}
			}.bind(this))
			.catch(function(err) {
				this.log("Trxn Narration", "Error", util.format("Error encountered updating account settings for %s\n%s", pkey,err));
			}.bind(this));
	}.bind(this));
}



////////////////////////////////////////////////////////////////////////////////
// SUPPORT FUNCTIONS - WRITING CONTENT TO CONSOLE
////////////////////////////////////////////////////////////////////////////////

function write_entity(funcOut, sSet, code, entities, bals, orders) {
  var pkey, sSet_val;
  if(sSet == null) sSet_val = "";
  else sSet_val = sSet + ".";

  pkey = entities.resolve(sSet_val+code);
  funcOut("--------------------------------------------------------------");
  funcOut(util.format("%s [%s]",entities.resolveName(code), pkey));
  funcOut("  Balances:")
  write_balances(funcOut, sSet, entities, bals);
  if(orders.length > 0) {
    funcOut("  Orders:")
    write_orders(funcOut, sSet, entities, orders);
  }
}

function write_balances(funcOut, sSet, entities, bals) {
  bals.forEach((bal) => {
    if(bal.value != 0 ) {
      var counterparty = bal.counterparty;
      if(counterparty == null) counterparty = "N/A";
      else counterparty = entities.lookup(counterparty, sSet); //entities.translate(entities.lookup(counterparty, sSet));
      funcOut(util.format("    %d %s (%s)", bal.value, bal.currency, counterparty));
    }
  });
}



function write_orders(funcOut, sSet, entities, orders) {
  orders.forEach((order) => {
    var counterparty1 = order.specification.quantity.counterparty;
    if(counterparty1 == null) counterparty1 = "N/A";
    else counterparty1 = entities.lookup(counterparty1, sSet); //entities.translate(entities.lookup(counterparty1, sSet));
    var counterparty2 = order.specification.totalPrice.counterparty;
    if(counterparty2 == null) counterparty2 = "N/A";
    else counterparty2 = entities.lookup(counterparty2, sSet); //entities.translate(entities.lookup(counterparty2, sSet));
    if(order.specification.direction == "buy") {
      funcOut(util.format("    SELL %d %s (%s) --> BUY %d %s (%s)   [%d]", order.specification.totalPrice.value, order.specification.totalPrice.currency, counterparty2, order.specification.quantity.value, order.specification.quantity.currency, counterparty1, 1.0/order.properties.makerExchangeRate));
    } else {
      funcOut(util.format("    SELL %d %s (%s) --> BUY %d %s (%s)    [%d]", order.specification.quantity.value, order.specification.quantity.currency, counterparty1, order.specification.totalPrice.value, order.specification.totalPrice.currency, counterparty2, order.properties.makerExchangeRate));
    }
  });
}

util_funcs.prototype.write_transaction = function(funcOut, transaction, entity) {
  
  var ret_base = "";
  var amnt = (Number(transaction.specification.destination.amount.value));
  ret_base = util.format("%s Transaction : %s,%s,%s -> %s (%d %s)",entity, transaction.id,transaction.outcome.timestamp,transaction.specification.source.address,transaction.specification.destination.address,amnt,transaction.specification.destination.amount.currency);
  var ret = "";
  
  transaction.outcome.balanceChanges[entity].forEach(function(balanceChange)
  { 
    if(balanceChange.currency != "XRP") {
      if(ret.length > 0) ret = ret+"\n";
      ret = ret + ret_base + util.format(",%d %s (%s)", balanceChange.value, balanceChange.currency, balanceChange.counterparty);
    }
  });
  funcOut(ret);
}

util_funcs.prototype.write_balance = function(funcOut, balance, entity) {
  funcOut(util.format("%s Balance : %d %s (%s)", entity, balance.value, balance.currency, balance.counterparty));
}

util_funcs.prototype.write_trustline = function(funcOut, trustline, entity) {
	funcOut(util.format("%s Trustline : counterparty=%s currency=%s limit=%d balance=%d", entity, this.entities.lookup(trustline.specification.counterparty), trustline.specification.currency, trustline.specification.limit, trustline.state.balance));
}

module.exports = util_funcs;
