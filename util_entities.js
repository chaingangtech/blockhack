"use strict";

var fs = require("fs");
var util = require("util");

var util_entities = function(sSet) {
	if(sSet == null) sSet = "";
	try {
		this.config = JSON.parse(fs.readFileSync('./entities.json', "ascii"));
	} catch (ex) {
		this.config = {};
	}
	this.sSet = sSet;

}

util_entities.prototype.resolveBase = function(sName) {
	var s = sName.split(".");
	var sError = "", sSetTmp = "", sEntity = "";
	if(s.length == 1) {
		if(s[0].length == 34 && s[0][0] == "r") return s[0];
		else if(this.sSet == null) sError = util.format("Error: could not resolve entity [%s] as entity set has not been defined", sName);
		else {
			sSetTmp = this.sSet;
			sEntity = sName;
		}
	} else if(s.length == 2) {
		sSetTmp = s[0];
		sEntity = s[1];
	} else sError = util.format("Error: could not resolve entity [%s] as it is not in the expected format", sName);;
	
	if(sError == "") {
		if(this.config[sSetTmp] == null) sError = util.format("Error: could not resolve entity set [%s]", sSetTmp);
		else {
			if(this.config[sSetTmp][sEntity] != null) return this.config[sSetTmp][sEntity];
			else sError = util.format("Error: could not resolve entity [%s.%s]", sSetTmp, sEntity);
		}
	} else throw new Error(sError);
}

util_entities.prototype.resolve = function(sName) {
	return this.resolveBase(sName).public;
}

util_entities.prototype.resolveName = function(sName) {
	return this.resolveBase(sName).name;
}

util_entities.prototype.lookup = function(sKey, sSet) {
	if(sSet == null) sSet = this.sSet;
	var ret = sKey;
	if(this.config[sSet] != null)  {
		Object.keys(this.config[sSet]).forEach(function(entity) {
			if(this.config[sSet][entity].public == sKey) ret = entity;
		}, this);
	}
	return ret;
}

util_entities.prototype.lookupEntity = function(sKey, sSet) {
	var lookup = this.lookup(sKey, sSet);
	if(lookup == null) return null;
	else return this.resolveBase(lookup);
}

util_entities.prototype.lookupName = function(sKey, sSet) {
	var lookup = this.lookup(sKey, sSet);
	if(lookup == null) return sKey;
	else return this.resolveBase(lookup).name;
}

util_entities.prototype.get_entities = function(sSet) {
	if(sSet == null) sSet = this.sSet;
	return Object.keys(this.config[sSet]);
}




module.exports = util_entities;