'use strict';

var restify = require('restify');
var log = require('./log');
var xal = require('./xal.js');
var ip = require('ip');

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
server.post('/event', function(req, res, next) {
    log.info('Received an event');
    log.debug(req.params);
    res.send(200);
    next();
    xal.event(req.params);
});

var port = 2015;
var url;

function start(cb) {
    var onServerStart = function() {
        log.info('%s listening at %s', server.name, server.url);
        url = 'http://' + ip.address() + ':' + server.url.split(':')[2];
        xal.setUrl(url);
        if (cb) {
            cb();
        }
    };

    server.on('listening', function() {
        onServerStart();
    });

    server.listen(port);
}

server.on('error', function(e) {
    if (e.code === 'EADDRINUSE') {
        log.info('port ' + port + ' in use, retrying...');
        port += 1;
        server.listen(port);
    }
});

function stop(cb) {
    server.stop(cb);
}

function getUrl() {
    return url;
}

module.exports.start = start;
module.exports.stop = stop;
module.exports.getUrl = getUrl;
