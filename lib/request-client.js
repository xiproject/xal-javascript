'use strict';
var urljoin = require('url-join');

function requestClient(serverUrl) {
    var request = require('request').defaults({
        json: true
    });
    return {
        get: function(path, cb) {
            request(urljoin(serverUrl, path), cb);

        },
        post: function(path, data, cb) {
            request({
                url: urljoin(serverUrl, path),
                body: data,
                method: 'POST'
            }, cb);
        },
        put: function(path, data, cb) {
            request({
                url: urljoin(serverUrl, path),
                body: data,
                method: 'PUT'
            }, cb);
        }
    };

}

module.exports = requestClient;
