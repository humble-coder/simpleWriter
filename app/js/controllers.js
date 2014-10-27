'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
.controller('appCtrl', ['$scope', 'authService', '$window', 'Session', '$location', function($scope, authService, $window, Session, $location) {

  $scope.userMessage = "";

  if ($window.sessionStorage.token && $window.sessionStorage.user) {
    var sessionData = {user: JSON.parse($window.sessionStorage.user), token: $window.sessionStorage.token};
    authService.recoverSession(sessionData).then(function(sessionOK) {
      if (sessionOK)
        $scope.currentUser = sessionData.user;
    });
  }

  $scope.logout = function() {
    var sessionData = {user: $scope.currentUser, token: Session.id};
    authService.logout(sessionData).then(function(sessionDestroyed) {
      if (sessionDestroyed) {
        $scope.currentUser = null,
        $scope.userMessage = "You have successfully logged out.";
        $location.path('/');
      }
    });
  }

  $scope.$on('auth-login-success', function(event, user) {
    if (authService.isAuthenticated()) {
      $scope.currentUser = user,
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
  .controller('mainCtrl', ['$scope', '$location', 'docInfo', 'socket', 'Session', function($scope, $location, docInfo, socket, Session) {
    $scope.isMakingDocument = false;

    $scope.newDocument = function() {
      $scope.isMakingDocument = true;
    }

    $scope.saveDocument = function() {
      docInfo.title = $scope.docTitle,
      docInfo.body = $scope.docBody,
      docInfo.owner = $scope.currentUser.name;

      socket.emit('saveDocument', { title: docInfo.title, body: docInfo.body, owner: docInfo.owner, sessionId: Session.id }, function() {
        $location.path('/' + docInfo.owner + '/' + docInfo.title.replace(/\s+/g, ''));
      }); 
    }
  }])
  .controller('registrationCtrl', ['$scope', 'registrationService', '$location', 'AUTH_EVENTS', '$rootScope', function($scope, registrationService, $location, AUTH_EVENTS, $rootScope) {
    $scope.errorMessage = "";

    $scope.saveUser = function() {
      var userData = { userName: $scope.userName, userEmail: $scope.userEmail, userPassword: $scope.userPassword, userPasswordConfirmation: $scope.passwordConfirmation };
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
  .controller('loginCtrl', ['$scope', '$rootScope', 'AUTH_EVENTS', 'authService', '$location', 'Session', function($scope, $rootScope, AUTH_EVENTS, authService, $location, Session) {
    $scope.credentials = {};

    if (authService.isAuthenticated())
      $location.path('/');

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
  .controller('documentCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', 'Session', '$location', function($scope, $routeParams, docInfo, socket, Session, $location) {

    $scope.isEditingDocument = false;

    $scope.fillPage = function() {
      $scope.docTitle = docInfo.title,
      $scope.docBody = docInfo.body,
      $scope.collaborators = docInfo.collaborators || [],
      $scope.hasCollaborators = $scope.collaborators.length > 0,
      $scope.docOwner = docInfo.owner;
    }

    if (docInfo.title && docInfo.body && docInfo.owner) {
      $scope.fillPage();
    }
    else {
      socket.emit('getDocument', { user: $routeParams.username, docId: $routeParams.docId }, function(doc) {
        docInfo = doc;
        $scope.fillPage();
      });
    }

    socket.on('documentChanged', function(data) {
      docInfo = data;
      $location.path('/' + data.owner + '/' + data.title.replace(/\s+/g, ''));
    });

    socket.on('collaboratorAdded', function(data) {
      var index = $scope.users.indexOf(data.user);
      if (!$scope.hasCollaborators)
        $scope.hasCollaborators = true;
      $scope.collaborators.push(data.user);
      $scope.users.splice(index, 1);
    });

    socket.on('displaySearch', function(results) {
      $scope.users = results;
    });

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { owner: $routeParams.username, docId: $routeParams.docId, title: $scope.docTitle, body: $scope.docBody, sessionId: Session.id });
      $scope.isEditingDocument = false;
    }

    $scope.editDocument = function() {
      $scope.isEditingDocument = true;
    }

    $scope.addCollaborator = function(user) {
      socket.emit('addCollaborator', { user: user, document: $scope.docTitle, sessionId: Session.id });
    }

    $scope.searchUsers = function() {
      socket.emit('searchUsers', { query: $scope.query, user: $scope.currentUser, collaborators: $scope.collaborators, document: $scope.docTitle, sessionId: Session.id });
    }
  }]);
