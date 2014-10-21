var restify = require('restify');
var config = require('./config.json');
var bunyan = require('bunyan');
var server = require('server');
var log = server.log;

var xiClient = restify.createJsonClient({
  url: config['xi-core'].url,
  version: '*',
  log: log
});

/* Register with xi-core */
function register(data, cb) {
  xiClient.post('/register', data, function(err, response, body) {
    if (err) {
      log.error(err);
      cb(err);
      return;
    }
    log.debug({response: response, body: body});
    log.info('Registered with xi-core');
    cb(null, body.id);
  });
}

function ping(cb) {
  xiClient.get('/ping', function(err, response, body) {
    if (err) {
      log.error(err);
      cb(err);
      return;
    }
    log.debug({response: response});
    cb();
  });
}

var messageListeners = {};

function onMessage(channel, cb) {
  if (messageListeners.hasOwnProperty(channel)) {
    messageListeners[channel].push(cb);
  } else {
    messageListeners[channel] = [];
    messageListeners[channel].push(cb);
  }
  log.debug("Registered new callback for channel: " + channel);
}

// Test

register({
  name: 'test',
  subscribe: 'xi.input.speech'
});
function messageHandler(req , res ,next){
    if(eventListeners[req.body.event]){
        for( var i =0; i < eventListeners[req.body.event].length ; i++){
            eventListeners[req.body.event][i]( null, req.body.state);
        }
    }
    log.debug( {req: req});
    res.send(200);
    next();
}
module.exports.messageHandler = messageHandler;
