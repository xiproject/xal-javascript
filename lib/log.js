var bunyan = require('bunyan');

var log = bunyan.createLogger({
    name: 'xal-javascript',
    streams: [{
        stream: process.stdout,
        level: 'debug'
    }],
    serializers: bunyan.stdSerializers
});

if (process.env.NODE_ENV === 'test') {
    log.streams = [];
}

module.exports = log;
