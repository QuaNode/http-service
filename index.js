/*jslint node: true*/
'use strict';

var backend = require('beamjs').backend();
var service = backend.service();
var protocols = {

  http: require('http'),
  https: require('https')
};

module.exports = function (options) {

  if (!options) options = {};
  return {

    http: service(options.baseURI || 'http', function (request, callback) {

      var {
        baseURL,
        serialize,
        deserialize,
        content_type
      } = request.context;
      if (!baseURL) baseURL = options.baseURI;
      if (typeof baseURL !== 'string' || baseURL.length < 10) {

        return callback(null, new Error('Invalid base url'));
      }
      if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {

        return callback(null, new Error('Invalid base url'));
      }
      var scheme = baseURL.startsWith('http://') ? 'http' : 'https';
      var { [scheme]: protocol } = protocols;
      if (!serialize && request.body) {

        request.body = JSON.stringify(request.body);
      }
      protocol.request({

        hostname: (baseURL.split(scheme + '://')[1] || '').split(':')[0],
        port: (baseURL.split(scheme + '://')[1] || '').split(':')[1],
        path: request.path,
        method: request.method,
        headers: Object.assign(request.body ? {

          'Content-Type': content_type || options.content_type || 'application/json',
          'Content-Length': Buffer.byteLength(request.body),
        } : {}, request.headers || {})
      }, function (res) {

        if (res.statusCode != 200) {

          let error = new Error(res.statusMessage);
          error.code = res.statusCode;
          return callback(null, error);
        }
        var response = '';
        res.setEncoding('utf8');
        res.on('data', function (data) {

          response += data;
        });
        res.on('end', function () {

          if (!deserialize && response) try {

            response = JSON.parse(response);
          } catch (e) {

            return callback(null, e);
          }
          callback(response);
        });
        res.on('error', function (e) {

          callback(null, e);
        });
      }).on('error', function (e) {

        callback(null, e);
      }).end(request.body);
    })
  };
};