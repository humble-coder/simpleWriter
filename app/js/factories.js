'use strict';

/* Services */

angular.module('myApp.factories', []).factory('socket', function($rootScope) {
	var socket = io.connect();
	return {
		on: function(eventName, callback) {
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback) {
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
}).factory('authService', function($http, Session) {
	var authService = {};

	authService.login = function(credentials) {
		return $http.post('/login', { data: credentials }).then(function(res) {
			if (res.data.user) {
				Session.create(res.data.id, res.data.user.id)
				return res.data.user;
			}
			else
				return res.data;
		});
	}

	authService.isAuthenticated = function() {
		return !!Session.userId;
	}

	return authService;
}).factory('registrationService', function($http) {
	var registrationService = {};

	registrationService.createUser = function(userData) {
		return $http.post('/new-user', { data: userData }).then(function(res) {
			return res.data;
		});
	}
	return registrationService;
}).factory('sessionRecoveryService', function($http, Session) {
	var sessionRecoveryService = {};

	sessionRecoveryService.login = function(sessionData) {
		return $http.post('/recover-session', { data: sessionData }).then(function(res) {
			if (res.data.sessionOK) {
				Session.create(sessionData.user.id, sessionData.token);
				return true;
			}
		});
	}

	return sessionRecoveryService;
});
