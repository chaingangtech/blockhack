var SafeString = require('handlebars').SafeString

function isActive (context, options) {
  var active = ''
  if ((context.hash.id === context.data.root.path) || (context.hash.id === '' && context.data.root.path === undefined)) {
    active = ' class="active"'
  }
  return new SafeString(active)
}

module.exports = isActive
