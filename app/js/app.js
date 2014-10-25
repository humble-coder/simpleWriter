'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers',
  'myApp.factories',
  'myApp.constants'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {templateUrl: './partials/main.html', controller: 'mainCtrl'});
  $routeProvider.when('/register', {templateUrl: './partials/registration.html', controller: 'registrationCtrl'});
  $routeProvider.when('/login', {templateUrl: './partials/login.html', controller: 'loginCtrl'});
  $routeProvider.when('/:username/:docId', {templateUrl: './partials/document.html', controller: 'documentCtrl'});
  $routeProvider.otherwise({redirectTo: '/'});
}]);
