'use strict';


/* Controllers */

angular.module('myApp.controllers', [])
.controller('appCtrl', ['$scope', 'authService', function($scope, authService) {

  $scope.$on('auth-login-success', function(event, user) {
    if (authService.isAuthenticated) {
      $scope.currentUser = user;
      $scope.newUserMessage = "";
    }
  });

  $scope.$on('registration-success', function(event, userName) {
    $scope.newUserMessage = "Welcome, " + userName + "! Go ahead and login!";
  });

}])
  .controller('mainCtrl', ['$scope', '$location', 'docInfo', function($scope, $location, docInfo) {
    $scope.isMakingDocument = false;

    $scope.newDocument = function() {
      $scope.isMakingDocument = true;
    }

    $scope.saveDocument = function() {
      docInfo.title = $scope.docTitle,
      docInfo.body = $scope.docBody;

      $location.path('/documents/' + docInfo.title.replace(/\s+/g, ''));
    }
  }])
  .controller('registrationCtrl', ['$scope', 'registrationService', '$location', 'AUTH_EVENTS', '$rootScope', function($scope, registrationService, $location, AUTH_EVENTS, $rootScope) {
    $scope.errorMessage = "";

    $scope.saveUser = function() {
      var userData = { userName: $scope.userName, userEmail: $scope.userEmail, userPassword: $scope.userPassword };
      if ($scope.userPassword === $scope.passwordConfirmation) {
        $scope.errorMessage = "";
        registrationService.createUser(userData).then(function(userName) {
          $rootScope.$broadcast(AUTH_EVENTS.registrationSuccess, userName);
          $location.path('/login');
        }, function(error) {
          $scope.errorMessage = error.message;
        });
      }
      else {
        $scope.errorMessage = "Password and password confirmation don't match.";
      }
    }
  }])
  .controller('loginCtrl', ['$scope', '$rootScope', 'AUTH_EVENTS', 'authService', '$location', function($scope, $rootScope, AUTH_EVENTS, authService, $location) {

    $scope.credentials = {};

    $scope.login = function(credentials) {
      authService.login(credentials).then(function(user) {
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess, user);
        $location.path('/');
      }, function() {
        $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
      });
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
      $scope.docBody = data.body;
    });

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { name: $routeParams.name, body: $scope.docBody });
      $scope.isEditingDocument = false;
    }

    $scope.editDocument = function() {
      $scope.isEditingDocument = true;
    }
  }]);
