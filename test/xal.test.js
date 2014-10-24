'use strict';

var xal = require('../lib/xal');
var xi = require('../lib/xi');
var sinon = require('sinon');

describe('Xal', function() {
    describe('#register', function() {
        before(function() {
            sinon.stub(xi, 'post')
                .callsArgWith(2, null, null, null, {
                    id: 'foobar'
                });
        });
        it('should register successfully', function(done) {
            xal.register(null, done);
        });
        after(function() {
            xi.post.restore();
        });
    });
});
