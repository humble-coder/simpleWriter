'use strict';


/* Controllers */

angular.module('myApp.controllers', [])
.controller('appCtrl', ['$scope', 'authService', function($scope, authService) {

  $scope.$on('auth-login-success', function(event, user) {
    if (authService.isAuthenticated) {
      $scope.currentUser = user;
      $scope.userMessage = "";
    }
  });

  $scope.$on('auth-login-failed', function(event, response) {
    $scope.userMessage = response.error;
  });

  $scope.$on('registration-success', function(event, response) {
    $scope.userMessage = "Welcome, " + response.userName + "! Go ahead and login!";
  });

  $scope.$on('registration-failed', function(event, response) {
    $scope.userMessage = response.error;
  });

}])
  .controller('mainCtrl', ['$scope', '$location', 'docInfo', function($scope, $location, docInfo) {
    $scope.isMakingDocument = false;

    $scope.newDocument = function() {
      $scope.isMakingDocument = true;
    }

    $scope.saveDocument = function() {
      docInfo.title = $scope.docTitle,
      docInfo.body = $scope.docBody,
      docInfo.owner = $scope.currentUser.name;

      $location.path('/documents/' + docInfo.title.replace(/\s+/g, ''));
    }
  }])
  .controller('registrationCtrl', ['$scope', 'registrationService', '$location', 'AUTH_EVENTS', '$rootScope', function($scope, registrationService, $location, AUTH_EVENTS, $rootScope) {
    $scope.errorMessage = "";

    $scope.saveUser = function() {
      var userData = { userName: $scope.userName, userEmail: $scope.userEmail, userPassword: $scope.userPassword };
      if ($scope.userPassword === $scope.passwordConfirmation) {
        $scope.errorMessage = "";
        registrationService.createUser(userData).then(function(response) {
          if (response.error) {
            $rootScope.$broadcast(AUTH_EVENTS.registrationFailed, response);
          }
          else {
            $rootScope.$broadcast(AUTH_EVENTS.registrationSuccess, response);
            $location.path('/login');
          }
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
      authService.login(credentials).then(function(response) {
        if (response.name) {
          $rootScope.$broadcast(AUTH_EVENTS.loginSuccess, response);
          $location.path('/');
        }
        else {
          $rootScope.$broadcast(AUTH_EVENTS.loginFailed, response);
        }
      });
    }
  }])
  .controller('documentCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', function($scope, $routeParams, docInfo, socket) {

    $scope.isEditingDocument = false;

    if (docInfo.title && docInfo.body) {
      // If document is new, then...
      $scope.docTitle = docInfo.title,
      $scope.docBody = docInfo.body,
      $scope.collaborators = [],
      $scope.docOwner = docInfo.owner;

      socket.emit('saveDocument', { title: docInfo.title, body: docInfo.body, owner: docInfo.owner });
    }
    else {
      socket.emit('getDocument', { name: $routeParams.name }, function(data) {
        $scope.docTitle = data.title,
        $scope.docBody = data.body,
        $scope.collaborators = data.collaborators || [];
      });
    }

    socket.on('documentChanged', function(data) {
      $scope.docBody = data.body;
    });

    socket.on('collaboratorAdded', function(data) {
      var index = $scope.users.indexOf(data.user);
      $scope.collaborators.push(data.user);
      $scope.users.splice(index, 1);
    });

    socket.on('displaySearch', function(results) {
      $scope.users = results;
    });

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { name: $routeParams.name, body: $scope.docBody });
      $scope.isEditingDocument = false;
    }

    $scope.editDocument = function() {
      $scope.isEditingDocument = true;
    }

    $scope.addCollaborator = function(user) {
      socket.emit('addCollaborator', { user: user, document: $scope.docTitle });
    }

    $scope.searchUsers = function() {
      socket.emit('searchUsers', { query: $scope.query, document: $scope.docTitle });
    }
  }]);
