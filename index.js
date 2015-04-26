'use strict';

var xal = require('./lib/xal');
var server = require('./lib/server');
var config = require('./config');
var io = require('socket.io-client');

module.exports = xal;

var xalStart = xal.start;

module.exports.start = function(data, cb) {
    server.start(function() {
        var socket = io.connect('http://0.0.0.0:9000');
        socket.emit('registration', data);
        xalStart(data, cb);
    });
};
