'use strict';

/* Constants */

angular.module('simpleWriter.constants', []).constant('AUTH_EVENTS', {
	loginSuccess: 'auth-login-success',
	loginFailed: 'auth-login-failed',
	logoutSuccess: 'auth-logout-success',
	registrationSuccess: 'registration-success',
	registrationFailed: 'registration-failed',
	sessionTimeout: 'auth-session-timeout',
	notAuthenticated: 'auth-not-authenticated',
	notAuthorized: 'auth-not-authorized'
});