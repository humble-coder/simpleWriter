'use strict';

/* Controllers */

angular.module('simpleWriter.controllers', [])
.controller('appCtrl', ['$scope', 'authService', '$window', 'Session', '$location', function($scope, authService, $window, Session, $location) {

  $scope.currentUser = false,
  $scope.userMessage = false;

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
  }])
  .controller('registrationCtrl', ['$scope', 'registrationService', '$location', 'AUTH_EVENTS', '$rootScope', 'authService', function($scope, registrationService, $location, AUTH_EVENTS, $rootScope, authService) {
    $scope.errorMessage = "";

    if (authService.isAuthenticated())
      $location.path('/' + $scope.currentUser.name);

    $scope.saveUser = function() {
      var userData = { userName: $scope.userName, userEmail: $scope.userEmail, userPassword: $scope.userPassword, userPasswordConfirmation: $scope.passwordConfirmation };
      if ($scope.userPassword === $scope.passwordConfirmation) {
        $scope.errorMessage = "";
        registrationService.createUser(userData).then(function(response) {
          if (response.error)
            $rootScope.$broadcast(AUTH_EVENTS.registrationFailed, response);
          else {
            $rootScope.$broadcast(AUTH_EVENTS.registrationSuccess, response);
            $location.path('/login');
          }
        });
      }
      else
        $scope.errorMessage = "Password and password confirmation don't match.";
    }
  }])
  .controller('loginCtrl', ['$scope', '$rootScope', 'AUTH_EVENTS', 'authService', '$location', 'Session', function($scope, $rootScope, AUTH_EVENTS, authService, $location, Session) {
    $scope.credentials = {};

    if (authService.isAuthenticated())
      $location.path('/' + $scope.currentUser.name);

    $scope.login = function(credentials) {
      authService.login(credentials).then(function(response) {
        if (response.name) {
          $rootScope.$broadcast(AUTH_EVENTS.loginSuccess, response);
          $location.path('/' + response.name);
        }
        else
          $rootScope.$broadcast(AUTH_EVENTS.loginFailed, response);
      });
    }
  }])
  .controller('newDocCtrl', ['$scope', '$location', 'docInfo', 'socket', 'authService', 'Session', function($scope, $location, docInfo, socket, authService, Session) {

    if (!authService.isAuthenticated())
      $location.path('/login');
    
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
  .controller('userCtrl', ['$scope', '$routeParams', 'socket', function($scope, $routeParams, socket) {
    $scope.documents = [],
    $scope.user = $routeParams.username,
    $scope.ownsProfile = false;

    if ($scope.currentUser && ($scope.currentUser.name === $routeParams.username))
      $scope.ownsProfile = true;

    var documentTitle, documentId;

    socket.emit('getDocuments', { user: $routeParams.username }, function(documents) {
      for (var i = 0, arrayLength = documents.length; i < arrayLength; i++) {
        documentTitle = documents[i],
        documentId = documentTitle.replace(/\s+/g, '');
        $scope.documents.push({ title: documentTitle, id: documentId });
      }
    });
  }])
  .controller('documentCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', 'Session', '$location', function($scope, $routeParams, docInfo, socket, Session, $location) {

    $scope.isEditingDocument = false;

    $scope.fillPage = function() {
      $scope.docFound = true,
      $scope.docTitle = docInfo.title,
      $scope.docBody = docInfo.body,
      $scope.collaborators = docInfo.collaborators || [],
      $scope.hasCollaborators = $scope.collaborators.length > 0,
      $scope.docOwner = docInfo.owner,
      $scope.lastMessageTime = 0,
      $scope.userHasAccess = $scope.currentUser ? ((docInfo.owner === $scope.currentUser.name) || ($scope.collaborators.indexOf($scope.currentUser.name) > -1)) : false,
      $scope.messages = docInfo.messages || [];
    }

    socket.emit('getDocument', { owner: $routeParams.username, docId: $routeParams.docId }, function(doc) {
      if (doc) {
        docInfo = doc;
        $scope.fillPage();
      }
      else {
        $scope.docFound = false,
        $scope.notFoundMessage = $routeParams.username + " does not have a document entitled '" + $routeParams.docId + "'.";
      }
    });

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
      if (results.length)
        $scope.users = results;
      else
        $scope.noResultsMessage = "No users named '" + $scope.query + "' were found.";
    });

    socket.on('messageAdded', function(message) {
      $scope.messages.push(message);
      if ($scope.messages.length > 10)
        $scope.messages = $scope.messages.splice(1);
    });

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { owner: $routeParams.username, docId: $routeParams.docId, title: $scope.docTitle, body: $scope.docBody, sessionId: Session.id });
      $scope.isEditingDocument = false;
    }

    $scope.editDocument = function() {
      $scope.isEditingDocument = true;
    }

    $scope.addCollaborator = function(user) {
      socket.emit('addCollaborator', { user: user, docId: $routeParams.docId, owner: $scope.docOwner, sessionId: Session.id });
    }

    $scope.searchUsers = function() {
      console.log("Searching!");
      socket.emit('searchUsers', { query: $scope.query, user: $scope.currentUser.name, docId: $routeParams.docId, owner: $scope.docOwner, collaborators: $scope.collaborators, sessionId: Session.id });
    }

    $scope.sendMessage = function() {
      var date = new Date();
      if (date.getTime() - $scope.lastMessageTime >= 1000) {
        socket.emit('newMessage', { message: $scope.currentUser.name + ": " + $scope.chatMessage + " [" + date.toUTCString() + "]", docId: $routeParams.docId, owner: $scope.docOwner }, function() {
          $scope.lastMessageTime = date.getTime(),
          $scope.chatMessage = "";
        });
      }
    }
  }]);
