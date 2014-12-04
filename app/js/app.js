'use strict';


// Declare app level module which depends on filters, and services
angular.module('simpleWriter', [
  'ngRoute',
  'simpleWriter.filters',
  'simpleWriter.services',
  'simpleWriter.directives',
  'simpleWriter.controllers',
  'simpleWriter.factories',
  'simpleWriter.constants'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {templateUrl: './partials/main.html', controller: 'mainCtrl'});
  $routeProvider.when('/register', {templateUrl: './partials/registration.html', controller: 'registrationCtrl'});
  $routeProvider.when('/login', {templateUrl: './partials/login.html', controller: 'loginCtrl'});
  $routeProvider.when('/new-document', {templateUrl: './partials/new_document.html', controller: 'newDocCtrl'});
  $routeProvider.when('/search/users/:query', {templateUrl: './partials/search-users.html', controller: 'searchUsersCtrl'});
  $routeProvider.when('/search/documents/:query', {templateUrl: './partials/search-docs.html', controller: 'searchDocsCtrl'});
  $routeProvider.when('/:username', {templateUrl: './partials/user.html', controller: 'userCtrl'});
  $routeProvider.when('/:username/documents/:docId', {templateUrl: './partials/document.html', controller: 'documentCtrl'});
  $routeProvider.when('/:username/documents/:docId/edit', {templateUrl: './partials/edit-document.html', controller: 'editDocCtrl'});
  $routeProvider.otherwise({redirectTo: '/'});
}]);
