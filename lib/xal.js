'use strict';

var xi = require('./xi');
var log = require('./log.js');
var _ = require('underscore');
var bunyan = require('bunyan');
var assert = require('assert');
var querystring = require('querystring');
var urljoin = require('url-join');
// var server = require('./server');

/*
  Stores agent state
  { id: agent uuid, name: agent name}
*/
var agent = {};

/*
  Array of objects { event: eventString , callback: cb}
*/
var eventListeners = [];

/* Maps eventIds to the internal state and if processing is going on
   Is a map of { eventId: {
   processing: Boolean if the eventHandlers for this event are being processing,
   internalState: Last processed internal state,
   newState: Latest state sent from xi core

   }}
*/
var eventHash = {};

//get at /register

function getAgent(obj, cb) {
    lookupRegistry(obj, function(err, agent) {
        if (err) {
            log.error(err);
            cb(err);
            return;
        }
        cb(null, agent);
    });
}

function reinitialize() {
    eventHash = {};
    eventListeners = [];
    agent = [];
}

function getId() {
    return agent.id;
}

function setUrl(url) {
    agent.url = url;
}

function generateQuery(url, data){
    return urljoin(url, '?'+querystring.stringify(data));
}

/*
  Get id for given name from xi-core registry
  data = {name: name, id: id}
*/
function lookupRegistry(data, cb) {
    xi.get( generateQuery('/register', data), function(err, request, response, body) {
        if (err) {
            if (response.statusCode === 404) {
                if (cb) {
                    cb(null, null);
                }
            } else {
                log.error(err);
                if (cb) {
                    cb(err);
                }
            }
            return;
        }
        log.debug('Received agent', body.agent);
        if (cb) {
            cb(null, body.agent);
        }
    });
}

function updateEvent(eventId, xiKey, obj, cb){
    eventHash[eventId].put(xiKey, obj);
    putEvent(eventHash[eventId], cb);
}

/* Register with xi-core
   {
   name: name
   }
*/

function register(data, cb) {
    xi.post('/register', data, function(err, request, response, body) {
        if (err) {
            log.error(err);
            if (cb) {
                cb(err);
            }
            return;
        }
        agent.id = body.id;
        log.info('Registered with xi-core');
        log.debug('Received uuid ', agent.id);
        if (cb) {
            cb(null, body.id);
        }
    });
}

/* Subscribe events with xi-core
   Agent has to be registered with xi-core before subscribing
   data = { id: id , events: [xiKeys] }
*/
function subscribe(data, cb) {
    xi.post('/subscribe', data, function(err, request, response, body) {
        if (err) {
            log.error(err);
            if (cb) {
                cb(err);
            }
            return;
        }
        log.info('Subscribed successfully');
        if (cb) {
            cb(null, body.id);
        }
    });
}


/* Update state */
//TODO: enter eventId correctly
function createEvent(xiKey, cb) {
    var postState = function(state, cb) {
        assert(state, 'State must be passed to callback in createEvent()');
        xi.post('/event', state, function(err, request, response, body) {
            if (err) {
                log.error(err);
                cb(err);
                return;
            }
            log.info('Posted event successfully');
            log.debug(body);
            augmentStateWithMethods(body);
            cb(null, body);
        });
    };
    var state = inflate(xiKey);
    augmentStateWithMethods(state);
    cb(state, postState);
}

/*
  Updates event with xicore
*/
function putEvent(data, cb) {
    xi.put('/event', data, function(err, request, response, body) {
        if (err) {
            log.error(err);
            if (cb) {
                cb(err);
            }
            return;
        }
        log.info('Updating event');
        log.info('The event is');
        log.info(data);
        log.info('Updated event successfully');
        log.info('The response is');
        log.info({
            res: response
        });
        if (cb) {
            cb(null);
        }
    });
}

function ping(cb) {
    /*jshint unused: false */
    xi.get('/ping', function(err, request, response, body) {
        if (err) {
            log.error(err);
            if (cb) {
                cb(err);
            }
            return;
        }
        log.debug({
            response: response
        });
        if (cb) {
            cb();
        }
    });
    /*jshint unused: true */
}

/*

 */
function on(xiKey, cb) {
    eventListeners.push({
        event: xiKey,
        callback: cb
    });
    log.debug('Registered new callback for event: ' + xiKey);
}



//Deprecated
function setName(data) {
    agent.name = data;
    agentLog = bunyan.createLogger({
        name: agent.name
    });
}

//Deprecated
function getName() {
    return agent.name;
}

var start = function(data, cb) {
    assert(data && data.name, 'Agent name must be passed into start');
    agent.name = data.name;

    module.exports.log = bunyan.createLogger({
        name: agent.name
    });

    log.info('Registering agent with name ', agent.name);
    register({
            name: agent.name,
            url: agent.url
        },
        function(err) {
            if (err) {
                log.error(err);
                if (cb) {
                    cb(err);
                }
                return;
            } else {
                var keys = [];
                for (var i = 0; i < eventListeners.length; i++) {
                    keys.push(eventListeners[i].event);
                }
                var data = {
                    id: agent.id,
                    events: keys
                };
                log.info('Subscribing using', data);
                subscribe(data);
                if (cb) {
                    cb();
                }
            }
        });
    // TODO: Refactor xal.js so that handler code is separated
    // from XAL API.
    // Right now, server.start, server.stop needs to be called manually
    // That should be a part of the XAL API.
};

function stop(cb) {
    log.info('Stopping agent');
    reinitialize();
    cb();
}


/*
  Given an old state and new state, returns an array of xiKeys
*/
function generateEventList(initialState, updatedState) {
    assert(initialState !== undefined, 'initial state should not be undefined');
    var eventList = [];
    for (var i = 0; i < eventListeners.length; i++) {
        if (!_.isEqual(
                getValue(initialState, eventListeners[i].event),
                getValue(updatedState, eventListeners[i].event))) {
            eventList.push(eventListeners[i]);
        }
    }
    return eventList;
}

function getValue(obj, name) {
    assert(obj !== undefined, 'object cannot be undefined');
    if (obj === null) {
        return null;
    }
    if (obj.hasOwnProperty(name)) {
        return obj[name];
    }
    var keys = name.split('.');
    for (var i = 0; i < keys.length; ++i) {
        var key = keys.slice(0, i + 1).join('.');
        if (obj.hasOwnProperty(key)) {
            return getValue(obj[key], keys.slice(i + 1, keys.length).join('.'));
        }
    }
    return null;
}

function inflate(xiKey) {
    var keyList = xiKey.split('.');
    var obj = {},
        currObj = obj;
    for (var i = 0; i < keyList.length - 1; ++i) {
        currObj[keyList[i]] = {};
        currObj = currObj[keyList[i]];
    }
    currObj[keyList[keyList.length - 1]] = null;
    return obj;
}

function augmentStateWithMethods(state) {

    // Ensure that the given xiKey exists in the state
    state.inflate = function(xiKey, defaultLeafValue) {
        var keys = xiKey.split('.');
        var currObj = this;
        for (var i = 0; i < keys.length; ++i) {
            if (!currObj.hasOwnProperty(keys[i])) {
                if (i === keys.length - 1) {
                    currObj[keys[i]] = defaultLeafValue || null;
                    log.info({
                        currObj: currObj[keys[i]]
                    });
                } else {
                    currObj[keys[i]] = {};
                }
            } else if (i === keys.length - 1 && !currObj[keys[i]]) {
                // leaf value is null, make it empty array
                currObj[keys[i]] = [];
            }
            currObj = currObj[keys[i]];
        }
    };

    state.get = function(xiKey) {
        // TODO: Add helper functions to navigate probability array
        var val = getValue(this, xiKey);
        if (val) {
            return val;
        } else {
            return null;
        }
    };

    state.put = function(xiKey, data) {
        var tuple;
        if (typeof data === 'object') {
            assert(data.value && data.certainty, 'value and certainty must be provided to put()');
            tuple = {
                source: getId(),
                value: data.value,
                certainty: data.certainty
            };
        } else {
            assert(typeof data === 'string' || typeof data === 'number', 'value must be number or string');
            tuple = {
                source: getId(),
                value: data,
                certainty: 1
            };
        }

        this.inflate(xiKey, []);

        var probArray = this.get(xiKey);

        for (var i = 0; i < probArray.length; ++i) {
            if (probArray[i].source === getId()) {
                probArray.splice(i);
                break;
            }
        }

        probArray.push(tuple);
    };

    return state;
}

/*
  Runs pending handlers for eventId
*/
function runEventHandlers(eventId) {
    var newState = eventHash[eventId].newState;
    eventHash[eventId].newState = null;
    eventHash[eventId].processing = true;
    assert(eventHash[eventId].internalState !== undefined, 'internal state can\'t be undefined');
    var eventList = generateEventList(eventHash[eventId].internalState, newState);
    log.info('Matched events ', eventList);
    var i = 0;
    var next = function(updatedState) {
        log.debug({
            i: i,
            updatedState: updatedState
        }, 'next called');
        i = i + 1;
        eventHash[eventId].internalState = updatedState;
        newState = updatedState;
        if (eventList.length === i) {
            //send updated state
            putEvent(eventHash[eventId].internalState);
            //If new state exists in queue, run handlers again
            if (eventHash[eventId].newState) {
                runEventHandlers(eventId);
            } else {
                eventHash[eventId].processing = false;
            }
            return;
        }
        runEventListener();
    };
    var runEventListener = function() {
        eventList[i].callback(newState, next);
    };
    if (eventList.length > 0) {
        runEventListener();
    }
}

/*
  key:
  xi.event
*/
function event(req, res, next) {
    log.info('Received an event');
    log.debug(req.params);
    res.send(200);
    next();

    var state = req.params;
    var eventId = getValue(req.params, 'xi.event').id;

    augmentStateWithMethods(state);

    //processing -> if handlers are currently being executed
    if (!eventHash[eventId]) {
        eventHash[eventId] = {
            processing: false,
            internalState: augmentStateWithMethods({})
        };
    }
    eventHash[eventId].newState = state;
    if (!eventHash[eventId].processing) {
        runEventHandlers(eventId);
    }
}

module.exports = {
    on: on,
    register: register,
    setName: setName,
    getName: getName,
    getId: getId,
    start: start,
    stop: stop,
    event: event,
    ping: ping,
    createEvent: createEvent,
    putEvent: putEvent,
    updateEvent: updateEvent,
    eventHash: eventHash,
    runEventHandlers: runEventHandlers,
    setUrl: setUrl,
    getAgent: getAgent
};
