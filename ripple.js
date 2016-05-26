/* jshint node:true */
'use strict'

const RippleAPI = require('ripple-lib').RippleAPI
const Promise = require('bluebird')
const retry = require('retry-bluebird')

const api = new RippleAPI({
  server: 'wss://s1.ripple.com', // Public rippled server hosted by Ripple, Inc.
  timeout: 10000, // Timeout in milliseconds before considering a request to have failed.
  trace: false // If true, log rippled requests and responses to stdout.
})

var ledgerCount = 0

api.on('connected', () => {
  console.info('[ripple] connected')
})

api.on('ledger', (ledger) => {
  if (ledgerCount === 100) {
    console.log('[ripple] ledgerVersion \'' + JSON.stringify(ledger.ledgerVersion, null, 2) + '\' ledgerCount \'' + ledgerCount + '\'')
    api.disconnect()
  } else {
    ledgerCount++
  }
})

api.on('error', (errorCode, errorMessage, data) => {
  console.error('[ripple] error' + errorCode + ': ' + errorMessage)
})

api.on('disconnected', (code) => {
  if (code !== 1000) {
    console.info('[ripple] disconnected due to error', code)
  } else {
    console.info('[ripple] disconnected normally', code)
  }
})

function getBalances (account_id) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, 5000)
    let connected = api.isConnected()
    ledgerCount = 0
    if (connected === false) {
      api.connect()
    }
    return retry({max: 5}, function () {
      return api.getBalances(account_id)
    }).then((balances) => {
      resolve(balances)
    }).catch(function (error) {
      console.log('[ripple]', error)
      reject(error)
    })
  })
}

function getTransactions (account_id, options) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, 5000)
    let connected = api.isConnected()
    ledgerCount = 0
    if (connected === false) {
      api.connect()
    }
    return retry({max: 5}, function () {
      return api.getTransactions(account_id, options)
    }).then((transactions) => {
      resolve(transactions)
    }).catch(function (error) {
      console.log('[ripple]', error)
      reject(error)
    })
  })
}

module.exports.api = api
module.exports.getBalances = getBalances
module.exports.getTransactions = getTransactions
