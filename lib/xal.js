'use strict';

var core = require('./core');
var log = require('./log.js');
var _ = require('underscore');
var bunyan = require('bunyan');
var assert = require('assert');
var uuid = require('node-uuid');

/**
 * Stores agent state
 * @type {object}
 * @property {string} id UUID of the agent
 * @property {string} name Name of the agent
 */
var agent = {};

/**
 * Array of objects
 * @type {Array}
 * @property {string} eventListeners[].event eventId
 * @property {function} eventListeners[].cb callback
 */
var eventListeners = [];

/**
 * Maps eventIds to the internal state and if processing is going on
 * @type {object}
 * @property {string} <eventIds>
 * @property {boolean} eventId.processing Is the event being processed
 * @property {state} eventId.internalState Last processed internal state
 * @property {state} eventId.newState Latset state sent from core
 */
var eventHash = {};

/**
 * @callback IdCallback
 * @param {Object} err
 * @param {string} Id of agent
 */

/**
 * @param {Object} data
 * @param {string} data.name Name of agent
 * @param {string} data.url Url of agent
 * @param {IdCallback} cb
 */
function register(data, cb) {
    core.register(data, function(err, agentId) {
        if (err) {
            cb(err);
            return;
        }
        agent.id = agentId;
        log.info('Registered with xi-core');
        log.debug('Received uuid ', agent.id);
        cb(null, agent.id);
    });
}

/**
 * @param {Object} data
 * @param {string} data.name Name of agent
 * @param {string} data.id   Id of agent*
 * @param {IdCallback} cb
 */
function getAgent(data, cb) {
    core.lookupRegistry(data, function(err, agent) {
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


function getName() {
    return agent.name;
}


function setUrl(url) {
    agent.url = url;
}

function updateEvent(eventId, xiKey, obj, cb) {
    eventHash[eventId].internalState.put(xiKey, obj);
    core.updateEvent(eventHash[eventId].internalState, cb);
}


//merge state2 into state1
function ensureConsistentState(state1, state2) {
    var newState = _.clone(state2);
    state1.forEach(function(key, val1) {
        var val2 = state2.get(key);
        for (var i = 0; i < val1.length; i++) {
            var val = val1[i];
            for (var j = 0; j < val2.length; j++) {
                if (val2[j].source === val.source && val2[j].timestamp > val.timestamp) {
                    val = val2[j];
                }
            }
            newState.put(key, val);
        }
    });
    return newState;
}

/**
 * Subscribe events with xi-core
 * Agent has to be registered with xi-core before subscribing
 * @param {object} data
 * @param {string} data.id  ID of agent
 * @param {string[]} data.events xiKeys
 */
function subscribe(data, cb) {
    core.subscribe(data, cb);
}

/* Update state */
function createEvent(xiKey, cb) {

    var localId = 'local ' + uuid.v4();
    var postState = function(state, cb) {
        assert(state, 'State must be passed to callback in createEvent()');
        core.createEvent(state, function(err, body) {
            if (err) {
                log.error(err);
                if (cb) {
                    cb(err);
                }
                return;
            }
            log.info('Posted event successfully');
            log.debug(body);
            augmentStateWithMethods(body);
            var eventId = body.get('xi.event.id');
            eventHash[eventId] = eventHash[localId];
            delete eventHash[localId];
            if (cb) {
                cb(null, body);
            }
        });
    };
    var state = {};
    augmentStateWithMethods(state);
    state.inflate(xiKey);
    eventHash[localId] = {
        internalState: state,
        processing: false,
        putValues: {}
    };
    state.get('xi.event').id = localId;
    cb(state, postState);
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

/**
 * Starts the agent
 * @param {object} data
 * @param {string} data.name Name of the agent
 * @param {function} cb
 */
function start(data, cb) {
    assert(data && data.name, 'Agent name must be passed into start');
    agent.name = data.name;

    module.exports.log = log.child({
        agentName: agent.name
    });

    log.info('Registering agent with name ', agent.name);
    register({
        name: agent.name,
        url: agent.url
    },
             function(err) {
                 if (err) {
                     log.error(new Error(err));
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
                     //FIXME: This is async
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

    // TODO: Start event loop only after registration
}

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

function augmentStateWithMethods(state) {

    // Ensure that the given xiKey exists in the state
    state.inflate = function(xiKey, defaultLeafValue) {
        var keys = xiKey.split('.');
        var currObj = this;
        for (var i = 0; i < keys.length; ++i) {
            if (!currObj.hasOwnProperty(keys[i])) {
                if (i === keys.length - 1) {
                    currObj[keys[i]] = defaultLeafValue || null;
                } else {
                    currObj[keys[i]] = {};
                }
            } else if (i === keys.length - 1 && !currObj[keys[i]]) {
                currObj[keys[i]] = defaultLeafValue || null;
            } else if (!currObj[keys[i]]) {
                // key exists, but its value is null; set it to empty object
                // to continue iterating
                currObj[keys[i]] = {};
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
            assert(data.hasOwnProperty('value') &&
                   data.hasOwnProperty('certainty'),
                   'value and certainty must be provided to put()');
            tuple = {
                value: data.value,
                certainty: data.certainty
            };
            tuple.timestamp = data.timestamp || Date.now();
            tuple.source = data.source || getId();
        } else {
            assert(typeof data === 'string' ||
                   typeof data === 'number' ||
                   typeof data === 'boolean',
                   'value must be number or string');
            tuple = {
                source: getId(),
                value: data,
                certainty: 1,
                timestamp: Date.now()
            };
        }
        this.inflate(xiKey, []);

        var probArray = this.get(xiKey);

        for (var i = 0; i < probArray.length; ++i) {
            if (probArray[i].source === tuple.source) {
                probArray.splice(i, 1);
                break;
            }
        }

        probArray.push(tuple);
    };

    state.forEach = function(cb) {

        var forEach = function(obj, str) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {

                    if (obj[key] instanceof Array) {
                        cb(str + '.' + key, obj[key]);
                    } else if (typeof obj[key] === 'string') {

                    } else {
                        forEach(obj[key], str + '.' + key);
                    }
                }
            }
        };

        forEach(this.xi, 'xi');

    };

    return state;
}

/*
  Runs pending handlers for eventId
*/
function runEventHandlers(eventId) {
    var newState = eventHash[eventId].newState;
    eventHash[eventId].sentState = eventHash[eventId].internalState;
    eventHash[eventId].newState = null;

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
            //If new state exists in queue, run handlers again
            if (eventHash[eventId].newState) {
                eventHash[eventId].newState = ensureConsistentState(eventHash[eventId].internalState, eventHash[eventId].newState);
                setImmediate(function() {
                    runEventHandlers(eventId);
                });
            } else {
                eventHash[eventId].processing = false;
                //send updated state
                if (!_.isEqual(eventHash[eventId].sentState, eventHash[eventId].internalState)) {
                    core.updateEvent(eventHash[eventId].internalState);
                }


            }
            return;
        }
        runEventListener();
    };
    var runEventListener = function() {
        eventList[i].callback(newState, next);
    };
    if (eventList.length > 0) {
        eventHash[eventId].processing = true;
        runEventListener();
    }
}

/**
 * Entry-point for event
 * key:
 * @property {state} state state sent by core
 */
function event(state) {
    var eventId = getValue(state, 'xi.event').id;
    augmentStateWithMethods(state);

    //processing -> if handlers are currently being executed
    if (!eventHash[eventId]) {
        eventHash[eventId] = {
            processing: false,
            internalState: augmentStateWithMethods({}),
            putValues: {}
        };
    }
    eventHash[eventId].newState = ensureConsistentState(eventHash[eventId].internalState, state);
    if (!eventHash[eventId].processing) {
        runEventHandlers(eventId);
    }
}

module.exports = {
    on: on,
    register: register,
    getName: getName,
    getId: getId,
    start: start,
    stop: stop,
    event: event,
    ping: core.ping,
    createEvent: createEvent,
    updateEvent: updateEvent,
    eventHash: eventHash,
    runEventHandlers: runEventHandlers,
    setUrl: setUrl,
    getAgent: getAgent,
    log: log
};
