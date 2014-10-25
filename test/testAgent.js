'use strict';

var xal = require('../../xal-javascript');

xal.setName('Mihir Agent');

xal.on('xi.event.input.text', function(err, newState, oldState, next) {
    if (oldState) {
        xal.log.debug(oldState);
    }
    if (newState) {
        xal.log.debug(newState);
    }
    xal.log.info('Got event xi.input.speech from');
    xal.log.info('The event is ');
    xal.log.info(newState);

    newState['xi.event'].input.text = 'This should crash';
    if (next) {
        next(newState);
    }
});

xal.start(function() {
    xal.createEvent({
        'xi.event': {
            input: {
                text: 'Hello World'
            }
        }
    });
});
