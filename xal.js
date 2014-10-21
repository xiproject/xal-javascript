var restify = require('restify');
var config = require('./config.json');
var bunyan = require('bunyan');
var log = require('./log.js');

var xiClient = restify.createJsonClient({
    url: config['xi-core'].url,
    version: '*',
    log: log
});

/* XAL State */
var id;
var name;
var eventListeners = {};

/* Register with xi-core */
function register(data, cb) {
    xiClient.post('/register', data, function(err, request, response, body) {
        if (err) {
            log.error(err);
            if(cb)
                cb(err);
            return;
        }
        id = body.id;
        log.info('Registered with xi-core');
        log.info("Received uuid ", id);
        if(cb)
            cb(null, body.id);
    });
}

/* Subscribe events with xi-core 
   Agent has to be registered with xi-core before subscribing
   data = { id: id , events: [] }
*/

function subscribe(data, cb){
    xiClient.post('/subscribe', data, function(err, request, response, body){
        if(err){
            log.error(err);
            if(cb)
                cb(err);
            return;
        }
        log.info("Subscribed successfully");
        if(cb)
            cb(null,body.id);
    });
}

function ping(cb) {
    xiClient.get('/ping', function(err, request, response, body) {
        if (err) {
            log.error(err);
            if(cb)
                cb(err);
            return;
        }
        log.debug({response: response});
        if(cb)
            cb();
    });
}

function on(event, cb) {
    if (eventListeners.hasOwnProperty(event)) {
        eventListeners[event].push(cb);
    } else {
        eventListeners[event] = [];
        eventListeners[event].push(cb);
    }
    log.debug("Registered new callback for event: " + event);
}


function setName(data){
    name = data;
}

function start(err, cb){
    log.info("Registering agent with name ", name);
    register({ name: name},
             function(err){
                 if(err){
                     log.error(err);
                     if(cb)
                         cb(err);
                     return;
                 }
                 else{
                     var keys = [];
                     for(var k in eventListeners){
                         if(eventListeners.hasOwnProperty(k))
                             keys.push(k);
                     }
                     var data = { id: id , events: keys};
                     log.info("Subscribing using", data);
                     subscribe( data);
                 }                     
             });
}

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


module.exports.on = on;
module.exports.setName = setName;
module.exports.start = start;
module.exports.messageHandler = messageHandler;
