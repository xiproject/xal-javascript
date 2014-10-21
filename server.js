var restify = require('restify');
var log = require('./log.js');
var uuid = require('node-uuid');
var xal = require('./xal.js');
var server = restify.createServer({
  name: 'xal-javascript',
  log: log
});

server.pre(restify.pre.userAgentConnection());

server.use(restify.requestLogger());
server.use(restify.bodyParser());
server.on('uncaughtException', function( req, res ,route , err){
    res.send(500);
    res.log.error(err);
});

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


/*
function message(req, res, next) {
  res.send(200);
  next();
}
*/

server.get('/ping', ping);
console.log(xal);
server.post('/event', xal.eventHandler);

server.listen(2015, function() {
  log.info('%s listening at %s', server.name, server.url);
});




