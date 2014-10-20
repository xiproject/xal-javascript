var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: 'xal-javascript',
  streams: [
    {
      stream: process.stdout,
      level: 'debug'
    },
  ],
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res
  }
});

module.exports = log;
