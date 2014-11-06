'use strict';

var xal = require('../lib/xal');
var xi = require('../lib/xi');
var sinon = require('sinon');
var server = require('../lib/server');
var utils = require('../lib/utils');
var should = require('should');
var _ = require('lodash');



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

function stubPut() {
    return function(url, data, cb) {
        cb(null, null, null, null);
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

    describe('event', function() {

        describe('#forEach', function() {
            before(function(done) {
                sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
                xal.start({
                    name: 'testAgent'
                }, done);
            });

            it('should iterate over all values', function(done) {

                xal.createEvent('xi.event.input.text', function(state, next) {

                    var xiKeys = {
                        'xi.event.input.text': 'Hello World',
                        'xi.event.output.text': 'Goodbye World',
                        'xi.event.presence.get': 'true'
                    };

                    for (var key in xiKeys) {
                        if (xiKeys.hasOwnProperty(key)) {
                            state.put(key, xiKeys[key]);
                        }
                    }

                    var testLeaf = [{
                        value: 'Hello Again',
                        source: 'fake1',
                        certainty: 1
                    }, {
                        value: 'Hello Again',
                        source: 'fake2',
                        certainty: 1
                    }];
                    state.put('xi.event.different.test', testLeaf[0]);
                    state.put('xi.event.different.test', testLeaf[1]);

                    state.forEach(function(key, val) {
                        if (key === 'xi.event.different.test') {
                            for (var i = 0; i < val; ++i) {
                                testLeaf.should.have(val[i]);
                            }

                        } else {

                            xiKeys.should.have.property(key, val[0].value);
                        }
                        delete xiKeys[key];
                    });

                    xiKeys.should.eql({});

                    next(state);
                    done();
                });

            });
            after(function(done) {
                xi.post.restore();
                xal.stop(done);
            });



        });
        describe('#put', function() {
            beforeEach(function(done) {
                sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
                xal.start({
                    name: 'testAgent'
                }, done);
            });

            it('leaf should have timestamp', function(done) {
                xal.createEvent('xi.event.input.text', function(state, next) {
                    state.put('xi.event.input.text', 'Hello world');
                    state.get('xi.event.input.text')[0].should.have.property('timestamp');
                    next(state);
                    done();
                });
            });

            it('should overwrite leafs with the same source', function(done) {
                xal.createEvent('xi.event.input.text', function(state, next) {
                    var val1 = {
                        value: 'Hello world',
                        source: 'source',
                        certainty: 1
                    };
                    var val2 = {
                        value: 'Hello world2',
                        source: 'source',
                        certainty: 1
                    };
                    state.put('xi.event.input.text', val1);
                    var get1 = state.get('xi.event.input.text')[0];
                    delete get1.timestamp;
                    get1.should.eql(val1);
                    state.put('xi.event.input.text', val2);
                    state.get('xi.event.input.text').length.should.equal(1);
                    var get2 = state.get('xi.event.input.text')[0];
                    delete get2.timestamp;
                    get2.should.eql(val2);

                    done();
                });

            });
            afterEach(function(done) {
                xi.post.restore();
                xal.stop(done);
            });

        });
    });

    describe('eventHandlers', function() {

        beforeEach(function(done) {
            sinon.stub(xi, 'post', stubPost('foobar3', 'someEventId'));
            sinon.stub(xi, 'put', stubPut);
            xal.start({
                name: 'testAgent'
            }, done);
        });

        it('should call handler when event matches', function(done) {
            xal.on('xi.event.input.text', function(state, next) {
                state.get('xi.event.input.text').should.equal('Hello World again');
                next(state);
                done();
            });
            var event = {
                input: {
                    text: 'Hello World again'
                },
                id: 'fakeid'
            };
            xal.event(mockRequest({
                xi: {
                    event: event
                }
            }), mockResponse(), function() {});
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
                },
                id: 'fakeid'
            };
            xal.event(mockRequest({
                xi: {
                    event: event
                }
            }), mockResponse(), function() {});

        });

        it('should send state if it is changed', function(done) {
            sinon.spy(xal.putEvent);
            xal.on('xi.event.input.text', function(state, next) {
                state.put('xi.event.output.text', 'output');
                next(state);
                xal.putEvent.called.should.be(true);
                done();
            });

            var event = {
                id: 'fakeid'
            };

            xal.event(mockRequest({
                xi: {
                    event: event
                }
            }), mockResponse(), function() {});
            done();

        });

        it('should not send state if it is unchanged', function(done) {
            sinon.spy(xal.putEvent);
            xal.on('xi.event.input.text', function(state, next) {
                next(state);
                xal.putEvent.called.should.be(false);
                done();
            });
            var event = {
                id: 'fakeid'
            };
            xal.event(mockRequest({
                xi: {
                    event: event
                }
            }), mockResponse(), function() {});
            done();
        });

        /* TODO: This test should be made better */

        it('should queue event when handler is processing', function(done) {
            var handler = sinon.spy(function(state, next) {
                var event = utils.createEvent('alienAgent');
                event.put('xi.event.input.text', 'hello world2');
                event.get('xi.event').id = 'fakeid';
                if (handler.callCount === 1) {
                    xal.event(mockRequest(
                        event
                    ), mockResponse(), function() {});
                    setImmediate(function() {
                        handler.callCount.should.equal(1);
                        next(state);
                    });
                } else if (handler.callCount === 2) {
                    next(state);
                    done();
                } else {
                    handler.callCount.should.equal(2, 'How many roads must a man walk down?');
                }
            });
            xal.on('xi.event.input.text', handler);

            var event = utils.createEvent('alienAgent');
            event.put('xi.event.input.text', 'hello world1');
            event.get('xi.event').id = 'fakeid';
            xal.event(mockRequest(event), mockResponse(), function() {});
        });

        it('should not call handlers for unchanged state', function(done) {
            var handler1 = sinon.spy(function(state, next) {
                handler1.calledOnce.should.be.ok;
                next(state);
            });

            var handler2 = sinon.spy(function(state, next) {
                var event = _.cloneDeep(state);
                (event !== state).should.be.ok;
                event.put('xi.event.input.text2', {
                    value: 'newVal',
                    source: 'alientAgent',
                    certainty: 1
                });
                handler1.calledOnce.should.be.ok;
                if (handler2.callCount === 1) {
                    xal.event(mockRequest(
                        event
                    ), mockResponse(), function() {});

                    next(state);
                } else if (handler2.callCount === 2) {
                    next(state);
                    done();
                } else {
                    handler2.callCount.should.equal(2, 'How many roads must a man walk down?');
                }
            });

            xal.on('xi.event.input.text1', handler1);
            xal.on('xi.event.input.text2', handler2);

            xal.createEvent('xi.event.input.text1', function(event, next) {
                event.put('xi.event.input.text1', {
                    value: 'oldVal1',
                    source: 'alientAgent',
                    certainty: 1
                });
                event.put('xi.event.input.text2', {
                    value: 'oldVal2',
                    source: 'alientAgent',
                    certainty: 1
                });
                event.get('xi.event').id = 'fakeid';
                xal.event(mockRequest(event), mockResponse(), function() {});
            });

        });

        afterEach(function(done) {
            xi.put.restore();
            xi.post.restore();
            xal.stop(done);
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

        describe('when agent does not exist', function() {

            before(function() {
                sinon.stub(xi, 'get', function(url, cb) {
                    cb({}, null, {
                        statusCode: 404
                    }, null);
                });
            });
            it('should return null', function(done) {
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
