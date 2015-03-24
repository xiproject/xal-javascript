'use strict';

var config = require('../config');
var log = require('./log');
var querystring = require('querystring');
var urljoin = require('url-join');

var xi = require('./request-client')(config['xi-core'].url);


function generateQuery(url, data) {
    return urljoin(url, '?' + querystring.stringify(data));
}

/*
  Get id for given name from xi-core registry
  data = {name: name, id: id}
*/
function lookupRegistry(data, cb) {
    xi.get(generateQuery('/register', data), function(err, response, body) {
        if (err) {
            if (cb) {
                cb(err);
            }
            return;
        }

        if (response.statusCode && response.statusCode === 404) {
                if (cb) {
                    cb(null, null);
                }
            return;
        }
        log.debug('Received agent', body.agent);
        if (cb) {
            cb(null, body.agent);
        }
    });
}


/* Register with xi-core
   {
   name: name
   }
   cb (err, agentId)
*/


function register(data, cb) {
    xi.post('/register', data, function(err, response, body) {
        if (err) {
            if (cb) {
                cb(err);
            }
            return;
        }

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

    xi.post('/subscribe', data, function(err, response, body) {
        if (err) {
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

function createEvent(state, cb) {
    xi.post('/event', state, function(err, response, body) {
        if (err) {
            if (cb) {
                cb(err);
            }
            return;
        }
        if (cb) {
            cb(null, body);
        }
    });
}

function updateEvent(data, cb) {
    xi.put('/event', data, function(err, response) {
        if (err) {
            if (cb) {
                cb(err);
            }
            return;
        }
        log.info('Updating event');
        log.debug('The event is');
        log.debug(data);
        log.debug('Updated event successfully');
        log.debug('The response is');
        log.debug({
            res: response
        });
        if (cb) {
            cb(null);
        }
    });
}

function ping(cb) {
    /*jshint unused: false */
    xi.get('/ping', function(err, response, body) {
        if (err) {
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
  xi-core exposes register and lookupRegistry to the agent
*/
module.exports = {
    lookupRegistry: lookupRegistry,
    register: register,
    subscribe: subscribe,
    createEvent: createEvent,
    updateEvent: updateEvent,
    ping: ping
};
