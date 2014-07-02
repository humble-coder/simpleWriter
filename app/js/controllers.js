'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('MyCtrl1', ['$scope', function($scope) {
  	$scope.step = 1;
  	$scope.field = {};
  	

  }])
  .controller('MyCtrl2', ['$scope', function($scope) {

  }]);
