var restify = require('restify');
var bunyan = require('bunyan');
var uuid = require('node-uuid');

var log = bunyan.createLogger({
  name: 'xal-javascript',
  streams: [
    {
      stream: process.stdout,
      level: 'debug'
    },
  ],
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res
  }
});

var server = restify.createServer({
  name: 'xal-javascript',
  log: log
});

server.pre(restify.pre.userAgentConnection());

server.use(restify.requestLogger());

server.pre(function(req, res, next) {
  req.log.debug({req: req});
  next();
});

server.on('after', function(req, res, route) {
  req.log.debug({res: res});
});

function ping(req, res, next) {
  res.send({ping: 'pong'});
  next();
}

function message(req, res, next) {
  res.send(200);
  next();
}

server.get('/ping', ping);
server.post('/message', message);

server.listen(2015, function() {
  log.info('%s listening at %s', server.name, server.url);
});

module.exports.log = log;
