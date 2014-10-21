var restify = require('restify');
var config = require('./config.json');
var bunyan = require('bunyan');
var log = require('./log.js');
var _ = require('underscore');
var xiClient = restify.createJsonClient({
    url: config['xi-core'].url,
    version: '*',
    log: log
});


/* XAL State */
var id;
var name;
var eventListeners = [];

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
function subscribe(data, cb)
{
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


/* Update state */
//TODO: enter eventId correctly
function postEvent(data, cb)
{
    xiClient.post('/event', data, function(err, request, response, body){
        if(err){
            log.error(err);
            if(cb)
                cb(err);
            return;
        }
        log.info("Posted event successfully");
        log.info( body);
        log.info( {res: response});
        if(cb)
            cb(null,body.id);
    });
}

function updateEvent(data, cb)
{
    xiClient.put('/event', data, function(err, request, response, body){
        if(err){
            log.error(err);
            if(cb)
                cb(err);
            return;
        }
        log.info("Updating event");
        log.info("The event is");
        log.info(data);
        log.info("Updated event successfully");
        log.info("The response is");
        log.info({res: response});
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
    eventListeners.push( {event: event, callback: cb});
    log.debug("Registered new callback for event: " + event);
}


function setName(data){
    name = data;
}

function start(err, cb){
    log.info("Registering agent with name ", name);
    register({ name: name, url: "http://10.139.13.147:2015"},
             function(err){
                 if(err){
                     log.error(err);
                     if(cb)
                         cb(err);
                     return;
                 }
                 else{
                     var keys = [];
                     for(var i =0; i<  eventListeners.length ;i++){
                         keys.push(eventListeners[i].event);
                     }
                     var data = { id: id , events: keys};
                     log.info("Subscribing using", data);
                     subscribe( data);
                     cb();
                 }                     
             });
}



// Maps eventIds to the internal state and if processing is going on

var eventHash = {};

function generateEventList(intialState, updatedState){
    eventList = [];
    for( var i =0 ; i < eventListeners.length ; i++){
        if( !_.isEqual(getValue(intialState , eventListeners[i].event),getValue(updatedState , eventListeners[i].event) )){

            eventList.push( eventListeners[i]);
        }
    }
    return eventList;
}

function getValue(obj, name) {
    if(obj===null)
        return null;
    if (obj.hasOwnProperty( name))
        return obj[name];
    var keys = name.split('.');
    for (var i = 0; i < keys.length; ++i) {
        var key = keys.slice(0, i+1).join('.');
        if (obj.hasOwnProperty(key))
            return getValue(obj[key], keys.slice(i+1, keys.length).join('.'));
    }
    return null;
}




function runEventHandlers( eventId){
    newState = eventHash[eventId].newState;
    eventHash[eventId].newState = null;
    eventHash[eventId].processing = true; 
    eventList = generateEventList( eventHash[eventId].internalState, newState);
    log.info( "Matched events ", eventList);
    var i=0;
    var callback = function(updatedState){
        i = i+1;
        eventHash[eventId].internalState = updatedState;
        if( eventList.length == i ){
            //send updated state
            updateEvent( eventHash[eventId].internalState );
            //If new state exists in queue, run handlers again
            if( eventHash[eventId].newState){
                runEventHandlers(eventId);
            }
            else{
                eventHash[eventId].processing = false; 
            }
            return;
        }
        conversationState = updatedState;
        runEventListener(i, callback);
    };
    var runEventListener =  function(cb ){
        for( var j =0 ; j< eventList.length; j++){
            eventList[i].callback( null , newState, eventHash[eventId].internalState , cb);
        }
    };
    runEventListener(callback );
}


/*
  key:
xi.event
  */
function eventHandler(req , res ,next){
    log.info("Received an event");
    log.debug(req.params);
    var state = req.params;
    var eventId =  req.params['xi.event'].id;

    //processing -> if handlers are currently being executed
    if(!eventHash[eventId]){
        eventHash[eventId] = {
            processing: false,
            internalState: {},
        };
    }
    eventHash[eventId].newState = state;
    if(!eventHash[eventId].processing){
        runEventHandlers( eventId);
    }
    res.send(200);
    next();
}


module.exports.on = on;
module.exports.setName = setName;
module.exports.start = start;
module.exports.eventHandler = eventHandler;
module.exports.postEvent = postEvent;
module.exports.updateEvent = updateEvent;
