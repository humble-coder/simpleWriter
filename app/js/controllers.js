'use strict';


/* Controllers */

angular.module('myApp.controllers', [])
  .controller('mainCtrl', ['$scope', '$location', 'docInfo', function($scope, $location, docInfo) {
    $scope.isMakingDocument = false;

    $scope.newDocument = function() {
      $scope.isMakingDocument = true;
    }

    $scope.saveDocument = function() {
      docInfo.title = $scope.docTitle,
      docInfo.body = $scope.docBody;

      $location.path('/' + docInfo.title.replace(/\s+/g, ''));
    }
  }])
  .controller('documentCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', function($scope, $routeParams, docInfo, socket) {

    $scope.isEditingDocument = false;

    if (docInfo.title && docInfo.body) {
      // If document is new, then...
      $scope.docTitle = docInfo.title;
      $scope.docBody = docInfo.body;
      socket.emit('saveDocument', { title: docInfo.title, body: docInfo.body });
    }
    else {
      socket.emit('getDocument', { name: $routeParams.name }, function(data) {
        $scope.docTitle = data.title;
        $scope.docBody = data.body;
      });
    }

    socket.on('documentChanged', function(data) {
      if (data.name === $routeParams.name) {
        $scope.docBody = data.body;
      }
    });

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { name: $routeParams.name, body: $scope.docBody });
      $scope.isEditingDocument = false;
    }

    $scope.editDocument = function() {
      $scope.isEditingDocument = true;
    }
  }]);
