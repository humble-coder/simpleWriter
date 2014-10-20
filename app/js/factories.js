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
}).factory('authService', function($http, $window, Session) {
	var authService = {};

	authService.login = function(credentials) {
		return $http.post('/login', { data: credentials }).then(function(res) {
			if (res.data.user) {
				var user = res.data.user,
				token = res.data.id;

				Session.create(token, user.id);

				$window.sessionStorage.token = Session.id,
				$window.sessionStorage.user = JSON.stringify(user);

				return res.data.user;
			}
			else
				return res.data;
		});
	}

	authService.logout = function(sessionData) {
		return $http.post('/logout', { data: sessionData }).then(function(res) {
			if (res.data.sessionDestroyed) {
				Session.destroy();

				$window.sessionStorage = {};

				return true;
			}
		});
	}

	authService.isAuthenticated = function() {
		return !!Session.userId;
	}

	authService.recoverSession = function(sessionData) {
		return $http.post('/recover-session', { data: sessionData }).then(function(res) {
			if (res.data.sessionOK) {
				Session.create(sessionData.token, sessionData.user.id);
				return true;
			}
		});
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
});
