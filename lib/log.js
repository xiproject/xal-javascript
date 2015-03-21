'use strict';

var bunyan = require('bunyan');
var argv = require('minimist')(process.argv.slice(2));
var logFile = argv.l || argv.logfile || '-';

var fullLogStream = {
  level: 'debug'
};
if (logFile === '-') {
  fullLogStream.stream = process.stdout;
} else {
  fullLogStream.path = logFile;
}

var log = bunyan.createLogger({
  name: 'xal-javascript',
  streams: [fullLogStream, {
    stream: process.stderr,
    level: 'warn'
  }],
  serializers: bunyan.stdSerializers
});

if (process.env.NODE_ENV === 'test') {
  log.streams = [];
}

module.exports = log;
