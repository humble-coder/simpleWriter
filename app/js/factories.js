'use strict';

/* Services */

angular.module('myApp.factories', []).factory('socket', function($rootScope) {
	var socket = io.connect();
	return {
		on: function(eventName, callback, namespace) {
			if (namespace) {
				socket = io.connect(namespace);
			}
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback, namespace) {
			if (namespace) {
				socket = io.connect(namespace);
			}
			socket.emit(eventName, data, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			});
		}
	};
});
