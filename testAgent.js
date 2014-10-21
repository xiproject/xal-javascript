var xal = require('./xal.js');
var server = require('./server.js');
var log = require('./log');


xal.setName('Mihir Agent');

xal.on( 'xi.event.input.text', function( err, newState, oldState, next){
    if(oldState)
        log.debug(oldState);
    if(newState)
        log.debug(newState);
    log.info("Got event xi.input.speech from");
    log.info("The event is ");
    log.info(newState);

    newState['xi.event'].input.text = "This should crash" ;
    if(next)
        next(newState);
});

xal.start(null,function(){
    xal.postEvent( {'xi.event': {input: { text: "Hello World"}}});
});

