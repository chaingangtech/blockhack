'use strict';

const path = require('path')
const Hapi = require('hapi');
const Vision = require('vision')
const Inert = require('inert')
const Ripple = require('ripple-lib')

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
    reply.view('main', { title: 'The Invested Researcher | BlockHack 2016',
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
  path: '/cancer',
  handler: function (request, reply) {
    var path = request.url.path.replace(/^\/|\/$/g, '') // remove leading and trailing slashes from the string
    reply.view('cancerResearch', { title: 'The Invested Researcher | BlockHack 2016',
    path: path })
  }
});


// Start the server
server.start((err) => {

    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});
