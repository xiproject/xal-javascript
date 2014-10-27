'use strict';

var xal = require('./lib/xal');
var server = require('./lib/server');

module.exports = xal;

var xalStart = xal.start;

module.exports.start = function(data, cb) {
    server.start(function() {
        xalStart(data, cb);
    });
};
