'use strict';

var restify = require('restify');
var log = require('./log.js');
var xal = require('../');

var server = restify.createServer({
    name: 'xal-javascript',
    log: log
});

server.pre(restify.pre.userAgentConnection());

server.use(restify.requestLogger());
server.use(restify.bodyParser());

server.on('uncaughtException', function(req, res, route, err) {
    res.send(500);
    res.log.error(err);
});

server.pre(function(req, res, next) {
    req.log.debug({
        req: req
    });
    next();
});

/*jshint unused: false */
server.on('after', function(req, res, route) {
    req.log.debug({
        res: res
    });
});
/*jshint unused: true */

function ping(req, res, next) {
    res.send({
        ping: 'pong'
    });
    next();
}

server.get('/ping', ping);
server.post('/event', xal.event);

function start() {
    server.listen(2015, function() {
        log.info('%s listening at %s', server.name, server.url);
    });
}

exports.start = start;
