'use strict';

var xal = require('../lib/xal');
var xi = require('../lib/xi');
var sinon = require('sinon');
var ip = require('ip');

require('should');

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
            xal.setName('testAgent');
            xal.start(done);
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
                    url: 'http://' + ip.address() + ':2015'
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
            xal.setName('testAgent');
            xal.start(done);
        });
        it('should create an event', function(done) {
            xal.createEvent({
                'xi.event': {
                    input: {
                        text: 'Hello World'
                    }
                }
            }, function(err, body) {
                (err === null).should.equal(true);
                body['xi.event'].id.should.equal('someEventId');
                // TODO: Add test to retrieve event from XAL
                done();
            });
        });
        after(function(done) {
            xi.post.restore();
            xal.stop(done);
        });
    });

});
