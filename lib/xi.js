var restify = require('restify');
var config = require('../config');
var log = require('./log');

var xi = restify.createJsonClient({
    url: config['xi-core'].url,
    version: '*',
    log: log
});

module.exports = xi;
