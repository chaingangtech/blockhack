
var util = require("util");
var util_obj = require("./utils.js");
var utils = new util_obj();

var stdin = process.stdin;
var stdout = process.stdout;
var stderr = process.stderr;

utils.init()
	

	// TEST - CREATE PROJECT
	//.then(() => {
	//	return utils.create_project("Res1", "ZK1", "Zika Virus Investigation", "http://www.awesomeresearcher.com/Zika");
	//})
	.then(() => {
		return utils.get_project_details();
	})
	.then((details) => {
		console.log(JSON.stringify(details));
		return;
	})

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
