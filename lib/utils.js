'use strict';
var assert = require('assert');


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


/*
Creates an event to be coming from another agent
The eventid is not set
This doesn't have putValues, which createEvent in xal.js requires
*/

function createEvent(agentId){
    var augmentStateWithMethods = function (state) {

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
                    source: agentId,
                    value: data.value,
                    certainty: data.certainty
                };
            } else {
                assert(typeof data === 'string' ||
                       typeof data === 'number' ||
                       typeof data === 'boolean',
                       'value must be number or string');
                tuple = {
                    source: agentId,
                    value: data,
                    certainty: 1
                };
            }
            this.inflate(xiKey, []);

            var probArray = this.get(xiKey);

            for (var i = 0; i < probArray.length; ++i) {
                if (probArray[i].source === agentId) {
                    probArray.splice(i, 1);
                    break;
                }
            }

            probArray.push(tuple);
        };
        return state;
    };

    var state = {};
    augmentStateWithMethods(state);
    return state;
}

exports.getValue = getValue;
exports.createEvent = createEvent;
