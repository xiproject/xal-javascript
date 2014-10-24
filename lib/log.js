var bunyan = require('bunyan');

var log = bunyan.createLogger({
    name: 'xal-javascript',
    streams: [{
        stream: process.stderr,
        level: 'debug'
    }],
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
    }
});

if (process.env.NODE_ENV === 'test') {
    log.streams = [];
}

module.exports = log;
