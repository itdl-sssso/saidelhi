'use strict'
// v3/v5 export the matcher function itself with helpers attached; v11 only has named exports.
const m = require('minimatch-v11')

function minimatch(path, pattern, options) {
  return m.minimatch(path, pattern, options)
}
Object.assign(minimatch, m)
minimatch.minimatch = minimatch
minimatch.default = minimatch

module.exports = minimatch
