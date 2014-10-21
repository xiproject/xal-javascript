var xal = require('./xal.js');
var log = require('./log');


xal.setName('Mihir Agent');

xal.on( 'xi.input.speech', function( err, state, next){
    if(state)
        log.debug(state);
    log.info("Gott event xi.input.speech from");
    var updatedState = state;
    next(updatedState);
});

xal.start();
