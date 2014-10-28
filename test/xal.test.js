'use strict';

var xal = require('../lib/xal');
var xi = require('../lib/xi');
var sinon = require('sinon');
var server = require('../lib/server');
require('should');



function mockRequest(params) {
    var request = {
        log: {
            error: function() {},
            warn: function() {},
            info: function() {},
            debug: function() {}
        }
    };
    request.params = params;
    return request;
}

function mockResponse(cb) {
    return {
        send: cb || function() {}
    };
}


function stubPost(agentId, eventId) {
    return function(url, data, cb) {
        if (url === '/register') {
            cb(null, null, null, {
                id: agentId
            });
        } else if (url === '/subscribe') {
            cb(null, null, null, {});
        } else if (url === '/event') {
            cb(null, null, null, {
                'xi.event': {
                    id: eventId
                }
            });
        }
    };
}

describe('Xal', function() {
    describe('#register', function() {
        before(function() {
            sinon.stub(xi, 'post', stubPost('foobar'));
        });
        it('should register successfully', function(done) {
            xal.register(null, done);
        });
        it('should be able to retrieve the id correctly', function() {
            var id = xal.getId();
            id.should.equal('foobar');
        });
        after(function() {
            xi.post.restore();
        });
    });

    describe('#start', function() {
        before(function(done) {
            sinon.stub(xi, 'post', stubPost('foobar2'));
            xal.start({
                name: 'testAgent'
            }, done);
        });
        it('should make two requests to xi-core', function() {
            xal.getId().should.equal('foobar2');
            xal.getName().should.equal('testAgent');
            xi.post.calledTwice.should.equal(true);
        });
        it('should register with the name and url', function() {
            xi.post
                .calledWith('/register', {
                    name: 'testAgent',
                    url: server.getUrl()
                })
                .should.equal(true);
        });
        it('should subscribe with the id and no events', function() {
            xi.post
                .calledWith('/subscribe', {
                    id: xal.getId(),
                    events: []
                })
                .should.equal(true);
        });
        after(function(done) {
            xi.post.restore();
            xal.stop(done);
        });
    });

    describe('#createEvent', function() {
        before(function(done) {
            sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
            xal.start({
                name: 'testAgent'
            }, done);
        });
        it('should create an event', function(done) {
            var oldDone = done;
            xal.createEvent('xi.event.input.text', function(state, done) {
                state.put('xi.event.input.text', 'Hello World');
                done(state, function(err, state) {
                    (err === null).should.equal(true);
                    state.get('xi.event.id').should.equal('someEventId');
                    oldDone();
                });
            });
        });
        after(function(done) {
            xi.post.restore();
            xal.stop(done);
        });
    });

    describe('#eventHandlers', function() {
        describe('handler registering', function() {
            before(function(done) {
                sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
                xal.start({
                    name: 'testAgent'
                }, done);
            });

            it('should register a handler', function(done) {
                xal.on('xi.event.input.text', function(state, next) {
                    state.get('xi.event.input.text').should.equal('Hello World again');
                    next(state);
                    done();
                });
                var event = {
                    input: {
                        text: 'Hello World again'
                    }
                };
                xal.event(mockRequest({
                    'xi.event': event
                }), mockResponse(), function() {});
            });

            after(function(done) {
                xi.post.restore();
                xal.stop(done);
            });

        });

        describe('handler ordering', function() {

            before(function(done) {
                sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
                xal.start({
                    name: 'testAgent'
                }, done);
            });

            it('should call handlers in order', function(done) {

                var firstCallback = sinon.spy(function(state, next) {
                    next(state);
                });

                var secondCallback = function(state, next) {
                    next(state);
                    firstCallback.called.should.be.equal(true);
                    done();
                };
                xal.on('xi.event.input.text', firstCallback);
                xal.on('xi.event.input', secondCallback);
                var event = {
                    input: {
                        text: 'Hello World'
                    }
                };
                xal.event(mockRequest({
                    'xi.event': event
                }), mockResponse(), function() {});

            });
            after(function(done) {
                xi.post.restore();
                xal.stop(done);
            });

        });
    });

    describe('#lookupRegistry', function() {
        describe('when agent exists', function() {
            before(function() {
                sinon.stub(xi, 'get', function(url, cb) {
                    cb(null, null, null, {
                        agent: {
                            name: 'testAgent',
                            id: '1234'
                        }
                    });
                });
            });
            it('should return agent for a given name', function(done) {
                xal.getAgent({
                    name: 'testAgent'
                }, function(err, agent) {
                    agent.id.should.be.equal('1234');
                    done();
                });

            });

            after(function() {
                xi.get.restore();
            });
        });

        describe('when does not exist', function() {

            before(function() {
                sinon.stub(xi, 'get', function(url, cb) {
                    cb({}, null, {
                        statusCode: 404
                    }, null);
                });
            });
            it('should return null if agent does not exist', function(done) {
                xal.getAgent({
                    name: 'testAgent'
                }, function(err, agent) {
                    (agent === null).should.be.equal(true);
                    done();
                });
            });

            after(function() {
                xi.get.restore();
            });
        });
    });
});
