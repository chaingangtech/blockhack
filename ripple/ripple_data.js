
var http = require("http");
var Promise = require("bluebird");
var util = require("util");

var getTrustsetTransactions = function(address, sellCurrency) {
  
  return new Promise(function(resolve,reject) {
    var str = "";
    var err = false;
    
	var path = util.format("/v2/accounts/%s/transactions?type=TrustSet",address);
    var req = http.request({host : "data.ripple.com", path : path}, function(res) {
      if(res.statusCode != 200) {
        err = true;
        str = "Status Code "+res.statusCode+": ";
      }
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        str += chunk;
      });
      
      res.on('end', function () {
        if(err) {
          reject(str);
        } else {
          resolve(str);
        }
      });
    });

    req.end();

    req.on('error', function(e) {
      reject(e);
    });
  });
}

// TEST
//getRate("AUD","NZD")
//	.then((ret) => {
//		console.log(ret)
//	})

module.exports.getTrustsetTransactions = getTrustsetTransactions;