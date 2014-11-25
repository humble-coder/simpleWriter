'use strict';

/* Controllers */

angular.module('simpleWriter.controllers', [])
.controller('appCtrl', ['$scope', 'authService', '$window', 'Session', '$location', function($scope, authService, $window, Session, $location) {

  $scope.currentUser = false,
  $scope.userMessage = angular.element('#user-message'),
  $scope.loginLink = angular.element('#login-link'),
  $scope.registerLink = angular.element('#register-link'),
  $scope.profileLink = angular.element('#profile-link'),
  $scope.logoutLink = angular.element('#logout-link');


  if ($window.sessionStorage.token && $window.sessionStorage.user) {
    var sessionData = {user: JSON.parse($window.sessionStorage.user), token: $window.sessionStorage.token};
    authService.recoverSession(sessionData).then(function(sessionOK) {
      if (sessionOK) {
        $scope.currentUser = sessionData.user;
        $scope.showUserTabs();
      }
    });
  }

  $scope.showGuestTabs = function() {
    $scope.registerLink.removeClass('hide');
    $scope.loginLink.removeClass('hide');
    $scope.profileLink.addClass('hide');
    $scope.logoutLink.addClass('hide');
  }

  $scope.showUserTabs = function() {
    $scope.profileLink.removeClass('hide');
    $scope.logoutLink.removeClass('hide');
    $scope.registerLink.addClass('hide');
    $scope.loginLink.addClass('hide');
  }

  $scope.logout = function() {
    var sessionData = {user: $scope.currentUser, token: Session.id};
    authService.logout(sessionData).then(function(sessionDestroyed) {
      if (sessionDestroyed) {
        $scope.currentUser = null;
        $scope.showGuestTabs();
        $scope.userMessage.text("You have successfully logged out.");
        $location.path('/');
      }
    });
  }

  $scope.searchUsers = function(userQuery) {
    $location.path('/search/users/' + userQuery);
  }

  $scope.$on('auth-login-success', function(event, user) {
    if (authService.isAuthenticated()) {
      $scope.currentUser = user;
      $scope.showUserTabs();
      $scope.userMessage.text("");
    }
  });

  $scope.$on('auth-login-failed', function(event, response) {
    $scope.userMessage.text(response.error);
  });

  $scope.$on('registration-success', function(event, response) {
    $scope.userMessage.text("Welcome, " + response.userName + "! Go ahead and login!");
  });

  $scope.$on('registration-failed', function(event, response) {
    $scope.userMessage.text(response.error);
  });

}])
  .controller('mainCtrl', ['$scope', '$location', 'docInfo', 'socket', 'Session', function($scope, $location, docInfo, socket, Session) {
  }])
  .controller('registrationCtrl', ['$scope', 'registrationService', '$location', 'AUTH_EVENTS', 'authService', function($scope, registrationService, $location, AUTH_EVENTS, authService) {
    $scope.errorMessage = angular.element('#error-message');
    $scope.userMessage.text("");

    if (authService.isAuthenticated())
      $location.path('/' + $scope.currentUser.name);

    $scope.saveUser = function() {
      var userData = { userName: $scope.userName, userEmail: $scope.userEmail, userPassword: $scope.userPassword, userPasswordConfirmation: $scope.passwordConfirmation };
      if ($scope.userPassword === $scope.passwordConfirmation) {
        $scope.errorMessage.text("");
        registrationService.createUser(userData).then(function(response) {
          if (response.error)
            $scope.$emit(AUTH_EVENTS.registrationFailed, response);
          else {
            $scope.$emit(AUTH_EVENTS.registrationSuccess, response);
            $location.path('/login');
          }
        });
      }
      else
        $scope.errorMessage.text("Password and password confirmation don't match.");
    }
  }])
  .controller('loginCtrl', ['$scope', 'AUTH_EVENTS', 'authService', '$location', 'Session', function($scope, AUTH_EVENTS, authService, $location, Session) {
    $scope.credentials = {};
    $scope.userMessage.text("");

    if (authService.isAuthenticated())
      $location.path('/' + $scope.currentUser.name);

    $scope.login = function(credentials) {
      authService.login(credentials).then(function(response) {
        if (response.name) {
          $scope.$emit(AUTH_EVENTS.loginSuccess, response);
          $location.path('/' + response.name);
        }
        else
          $scope.$emit(AUTH_EVENTS.loginFailed, response);
      });
    }
  }])
  .controller('newDocCtrl', ['$scope', '$location', 'docInfo', 'socket', 'authService', 'Session', function($scope, $location, docInfo, socket, authService, Session) {
    if (!authService.isAuthenticated())
      $location.path('/login');
    else {
      $scope.isDuplicate = false;

      $scope.docExists = function(title) {
        if (title) {
          socket.emit('getDocument', { owner: $scope.currentUser.name, docId: title.replace(/\s+/g, '') }, function(doc) {
            if (doc) {
              $scope.isDuplicate = true,
              $scope.linkToDuplicate = $scope.currentUser.name + '/' + $scope.docTitle.replace(/\s+/g, '');
            }
            else {
              if ($scope.isDuplicate && $scope.linkToDuplicate.length) {
                $scope.isDuplicate = false,
                $scope.linkToDuplicate = "";
              }
            }
          });
        }
      }

      $scope.$watch('docTitle', function(newValue, oldValue) { $scope.docExists(newValue) }, true);

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
    }
  }])
  .controller('userCtrl', ['$scope', '$routeParams', 'socket', function($scope, $routeParams, socket) {
    $scope.newUserMessage = angular.element('#new-user-message'),
    $scope.documents = [],
    $scope.sets = [],
    $scope.user = $routeParams.username,
    $scope.ownsProfile = false;

    if ($scope.currentUser && ($scope.currentUser.name === $routeParams.username))
      $scope.ownsProfile = true;

    var documentTitle, documentId, set, numSets, setNum, start, nextSet;
    var setLength = 5;

    socket.emit('getDocuments', { user: $routeParams.username }, function(documents) {
      if (documents.length) {
        numSets = Math.ceil((documents.length)/setLength);
        setNum = 1, start = 0;
        for (var j = 0; j < numSets; j++) {
          set = {};
          set.index = j + 1,
          set.documents = [];
          for (var k = start; k < setNum * setLength; k++) {
            if (documents[k]) {
              documentTitle = documents[k],
              documentId = documentTitle.replace(/\s+/g, '');
              set.documents.push({ title: documents[k], id: documentId });
            }
            else
              break;
          }
          $scope.sets.push(set);
          start += setLength;
          setNum++;
        }
        $scope.sets[0].isCurrent = "current",
        $scope.currentSet = $scope.sets[0];
        $scope.documents = $scope.sets[0].documents;
      }
      else
        $scope.newUserMessage.text("No documents yet - click 'New Document' to get started!");
    });

    $scope.displaySet = function(set) {
      $scope.documents = set.documents,
      $scope.currentSet.isCurrent = "",
      set.isCurrent = "current",
      $scope.currentSet = set;
    }

    $scope.back = function(set) {
      nextSet = $scope.sets[set.index - 2];
      $scope.displaySet(nextSet);
    }

    $scope.forward = function(set) {
      nextSet = $scope.sets[set.index];
      $scope.displaySet(nextSet);
    }
  }])
  .controller('documentCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', 'Session', '$location', function($scope, $routeParams, docInfo, socket, Session, $location) {

    $scope.fillPage = function() {
      $scope.docFound = true,
      $scope.docTitle = docInfo.title,
      $scope.docBody = docInfo.body,
      $scope.docId = $routeParams.docId,
      $scope.collaborators = docInfo.collaborators || [],
      $scope.hasCollaborators = $scope.collaborators.length > 0,
      $scope.docOwner = docInfo.owner,
      $scope.userHasAccess = $scope.currentUser ? ((docInfo.owner === $scope.currentUser.name) || ($scope.collaborators.indexOf($scope.currentUser.name) > -1)) : false;
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

    socket.on('collaboratorAdded', function(data) {
      var index = $scope.users.indexOf(data.user);
      if (!$scope.hasCollaborators)
        $scope.hasCollaborators = true;
      $scope.collaborators.push(data.user);
      $scope.users.splice(index, 1);
    });

    socket.on('displayCollaborators', function(results) {
      if (results.length)
        $scope.users = results;
      else
        $scope.noResultsMessage = "No users named '" + $scope.query + "' were found.";
    });

    $scope.addCollaborator = function(user) {
      socket.emit('addCollaborator', { user: user, docId: $routeParams.docId, owner: $scope.docOwner, sessionId: Session.id });
    }

    $scope.searchUsers = function() {
      socket.emit('searchCollaborators', { query: $scope.query, user: $scope.currentUser.name, docId: $routeParams.docId, owner: $scope.docOwner, collaborators: $scope.collaborators, sessionId: Session.id });
    }

  }]).controller('editDocCtrl', ['$scope', '$routeParams', 'docInfo', 'socket', 'Session', '$location', function($scope, $routeParams, docInfo, socket, Session, $location) {

    $scope.userHasAccess = function(docInfo) {
      if ($scope.currentUser)
        return ((docInfo.owner === $scope.currentUser.name) || (docInfo.collaborators.indexOf($scope.currentUser.name) > -1));
      else
        return false;
    }

    $scope.setupPage = function(docInfo) {
      if (!$scope.userHasAccess(docInfo))
        $location.path('/' + $routeParams.username + '/' + $routeParams.docId);
      else {
        $scope.docOwner = docInfo.owner,
        $scope.isOwner = $scope.docOwner === $scope.currentUser.name,
        $scope.docTitleArea = angular.element('#doc-title'),
        $scope.docBodyArea = angular.element('#doc-body'),
        $scope.docTitleDisplay = angular.element('#doc-title-display'),
        $scope.alertBox = angular.element('#alert'),
        $scope.docTitleDisplay.text(docInfo.title),
        $scope.docTitleArea.val(docInfo.title),
        $scope.docBodyArea.val(docInfo.body),
        $scope.docBodyArea.on('keyup', $scope.updateDocument),
        $scope.docTitleArea.on('keyup', $scope.updateDocument),
        $scope.lastMessageTime = 0,
        $scope.messages = docInfo.messages || [];
      }
    }

    $scope.updateDocument = function() {
      socket.emit('updateDocument', { owner: $scope.docOwner, user: $scope.currentUser.name, docId: $routeParams.docId, body: $scope.docBodyArea.val(), title: $scope.docTitleArea.val(), sessionId: Session.id });
    }

    $scope.closeWarning = function() {
      $scope.alertBox.remove();
    }

    if (!docInfo.id || (docInfo.id !== $routeParams.docId)) {
      socket.emit('getDocument', { owner: $routeParams.username, docId: $routeParams.docId }, function(doc) {
        if (doc) {
          $scope.docFound = true,
          docInfo = doc,
          $scope.setupPage(docInfo);
        }
        else {
          $scope.docFound = false,
          $scope.notFoundMessage = $routeParams.username + " does not have a document entitled '" + $routeParams.docId + "'.";
        }
      });
    }

    socket.on('documentChanged', function(data) {
      docInfo = data,
      $scope.docId = data.docId;
      if ($scope.docId != $routeParams.docId)
        $location.path('/' + data.owner + '/' + $scope.docId);
      else {
        if (docInfo.user != $scope.currentUser.name)
          $scope.docBodyArea.val(docInfo.body);
      }
    });

     socket.on('messageAdded', function(message) {
        $scope.messages.push(message);
        if ($scope.messages.length > 9)
          $scope.messages = $scope.messages.splice(1);
     });

    $scope.sendMessage = function() {
      var date = new Date();
      if (date.getTime() - $scope.lastMessageTime >= 1000) {
        socket.emit('newMessage', { message: $scope.currentUser.name + ": " + $scope.chatMessage + " [" + date.toUTCString() + "]", docId: $routeParams.docId, owner: $scope.docOwner }, function() {
          $scope.lastMessageTime = date.getTime(),
          $scope.chatMessage = "";
        });
      }
    }
  }]).controller('searchUsersCtrl', ['$scope', '$routeParams', 'socket', function($scope, $routeParams, socket) {

    $scope.users = [],
    $scope.results = [],
    $scope.sets = [],
    $scope.query = $routeParams.query,
    $scope.noResultsMessage = angular.element('#no-results-message');

    $scope.displayResults = function(users) {
      var set, numSets, setNum, start, nextSet;
      var setLength = 10;
      if (users.length) {
        numSets = Math.ceil((users.length)/setLength);
        setNum = 1, start = 0;
        for (var j = 0; j < numSets; j++) {
          set = {};
          set.index = j + 1,
          set.results = [];
          for (var k = start; k < setNum * setLength; k++) {
            if (users[k])
              set.results.push(users[k]);
            else
              break;
          }
          $scope.sets.push(set);
          start += setLength;
          setNum++;
        }
        $scope.sets[0].isCurrent = "current",
        $scope.currentSet = $scope.sets[0],
        $scope.results = $scope.currentSet.results;
      }
    }

    socket.emit('searchUsers', { query: $scope.query }, function(response) {
      if (response.done) {
        $scope.users.push(response.value);
        $scope.displayResults($scope.users);
      }
      else if (response.value === "No Results")
        $scope.noResultsMessage.text(response.value);
      else
        $scope.users.push(response);
    });

    $scope.displaySet = function(set) {
      $scope.results = set.results,
      $scope.currentSet.isCurrent = "",
      set.isCurrent = "current",
      $scope.currentSet = set;
    }

    $scope.back = function(set) {
      nextSet = $scope.sets[set.index - 2];
      $scope.displaySet(nextSet);
    }

    $scope.forward = function(set) {
      nextSet = $scope.sets[set.index];
      $scope.displaySet(nextSet);
    }
}]);
