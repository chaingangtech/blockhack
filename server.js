'use strict';

const path = require('path')
const Hapi = require('hapi');
const Vision = require('vision')
const Inert = require('inert')
const utils = require('./utils.js')
const ripple = new utils()

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: 'localhost',
    port: 8000
});

server.register([{
  register: Vision  // add template rendering support in hapi
}, {
  register: Inert  // handle static files and directories in hapi
}
], function (err) {
  if (err) {
    throw err
  }
  server.views({
    engines: { html: require('handlebars') },
    path: path.join(__dirname, '/templates'),
    layout: true,
    partialsPath: path.join(__dirname, '/templates/partials'),
    helpersPath: path.join(__dirname, '/templates/helpers'),
    compileMode: 'sync',
    isCached: 'false' // set to true in production
  });
});

server.route({
  path: '/static/{path*}',
  method: 'GET',
  handler: {
    directory: {
      path: [path.join(__dirname, '/node_modules/bootstrap/dist'), path.join(__dirname, '/node_modules/font-awesome'), path.join(__dirname, '/templates/static')],
      listing: false,
      index: false
    }
  }
});

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('index', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});


server.route({
  method: 'GET',
  path: '/main',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('main', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});

server.route({
  method: 'GET',
  path: '/search',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('search', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});

server.route({
  method: 'GET',
  path: '/invest',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('invest', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});


server.route({
  method: 'GET',
  path: '/research',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('research', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});

server.route({
  method: 'GET',
  path: '/project',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('cancerResearch', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});

server.route({
  method: 'GET',
  path: '/investor',
  handler: function (request, reply) {
    ripple.get_investor_balances('Inv1')
      .then((balances) => {
        var i1fb = balances.funds[0].balance
        var i1fh = balances.investments[0].holding
        var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
        reply.view('investor', { title: 'The Invested Researcher | BlockHack 2016',
        path: path, balances: balances, i1fb: i1fb, i1fh: i1fh })
      });
  }
});

server.route({
  method: 'GET',
  path: '/lcr',
  handler: function (request, reply) {
    var account_id = 'rsrTVFtfuS9BAbUYknHAtM399bg8bPpwzt'
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    Ripple.getBalances(account_id).then(function (balances) {
      reply.view('lcr', { title: 'The Invested Researcher | BlockHack 2016',
      path: path, balances: (balances) })
    })
  }
});

server.route({
  method: 'GET',
  path: '/signup',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('signup', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});

server.route({
  method: 'GET',
  path: '/login',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('login', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});


// Start the server
ripple.init()
.then(() => {
  server.start((err) => {

      if (err) {
          throw err;
      }
      console.log('Server running at:', server.info.uri);
  });
})


// ripple.init()
// .then(() => {
//   ripple.get_investor_balances('Inv1').then(function (balances) {
//     // console.log(balances)
//     console.log(balances)
//     console.log(balances)
//     var i1fb = balances.funds[0].balance
//     var i1fh = balances.investments[0].holding
//     console.log(i1fb)
//     console.log(i1fh)
//   })
// })
// .then(() => {
//   ripple.get_investor_balances('Inv2').then(function (balances) {
//     // console.log(balances)
//     console.log(balances)
//     console.log(balances)
//     var i2fb = balances.funds[0].balance
//     console.log(i2fb)
//   })
// })
// .then(() => {
//   ripple.get_investor_balances('Inv3').then(function (balances) {
//     // console.log(balances)
//     console.log(balances)
//     console.log(balances)
//     var i3fb = balances.funds[0].balance
//     console.log(i3fb)
//   })
// })
// .then(() => {
//   ripple.get_project_balances('Res1').then(function (balances) {
//     console.log(balances)
//     console.log(balances.funds)
//   })
// })
// .then(() => {
//   ripple.get_project_balances('Res2').then(function (balances) {
//     console.log(balances)
//     console.log(balances.funds)
//   })
// })
// .then(() => {
//   ripple.get_project_balances('Res3').then(function (balances) {
//     console.log(balances)
//     console.log(balances.funds)
//   })
// })
