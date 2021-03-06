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
    $location.path('/search-users/' + userQuery);
  }

  $scope.searchDocs = function(docQuery) {
    docQuery = docQuery.replace(/\s+/g, '').toLowerCase();
    $location.path('/search-documents/' + docQuery);
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
      $location.path('/users/' + $scope.currentUser.name);

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
      $location.path('/users' + $scope.currentUser.name);

    $scope.login = function(credentials) {
      authService.login(credentials).then(function(response) {
        if (response.name) {
          $scope.$emit(AUTH_EVENTS.loginSuccess, response);
          $location.path('/users/' + response.name);
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
      $scope.isDuplicate = false,
      $scope.isValid = false,
      $scope.instance = new Date().toUTCString(),
      $scope.docTitleElement = angular.element('#doc-title'),
      $scope.docBodyElement = angular.element('#doc-body');

      socket.emit('recoverDoc', { owner: $scope.currentUser.name, sessionId: Session.id }, function(doc) {
        if (doc && doc.title) {
          $scope.docTitleElement.val(doc.title),
          $scope.docBodyElement.val(doc.body),
          $scope.docTitle = doc.title,
          $scope.docBody = doc.body,
          $scope.isValid = true;
        }
      });

      $scope.docExists = function(title) {
        if (title && title.length) {
          socket.emit('getDocument', { owner: $scope.currentUser.name, docId: title.replace(/\s+/g, '') }, function(doc) {
            if (doc) {
              $scope.isDuplicate = true,
              $scope.isValid = false,
              $scope.linkToDuplicate = '/users/' + $scope.currentUser.name + '/docs/' + $scope.docTitle.replace(/\s+/g, '');
            }
            else {
              if ($scope.isDuplicate && $scope.linkToDuplicate.length) {
                $scope.isDuplicate = false,
                $scope.linkToDuplicate = "";
              }
              $scope.isValid = true;
            }
          });
        }
        else
          $scope.isValid = false;
      }

      $scope.$watch('docTitle', function(newValue, oldValue) { $scope.docExists(newValue) }, true);
      $scope.$watch('docBody', function(newValue, oldValue) { $scope.protectDocument(newValue) }, true);

      $scope.newDocument = function() {
        $scope.isMakingDocument = true;
      }

      $scope.saveDocument = function() {
        if ($scope.isValid) {
          docInfo.title = $scope.docTitle,
          docInfo.body = $scope.docBody || "",
          docInfo.owner = $scope.currentUser.name,
          docInfo.id = docInfo.title.replace(/\s+/g, '');

          socket.emit('saveDocument', { title: docInfo.title, body: docInfo.body, owner: docInfo.owner, sessionId: Session.id }, function() {
            $location.path('/docs/' + docInfo.owner + '/' + docInfo.id);
          }); 
        }
      }

      $scope.protectDocument = function(docBody) {
        if ($scope.isValid)
          socket.emit('protectDocument', { title: $scope.docTitle, body: $scope.docBody, sessionId: Session.id, instance: $scope.instance, owner: $scope.currentUser.name });
      }
    }
  }])
  .controller('userCtrl', ['$scope', '$routeParams', 'socket', function($scope, $routeParams, socket) {
    $scope.newUserMessage = angular.element('#new-user-message'),
    $scope.newImageButton = angular.element('#new-image-button'),
    $scope.clearImageButton = angular.element('#clear-image-button'),
    $scope.userImage = angular.element('#user-image'),
    $scope.documents = [],
    $scope.sets = [],
    $scope.user = $routeParams.username,
    $scope.ownsProfile = false;

    if ($scope.currentUser && ($scope.currentUser.name === $routeParams.username)) {
      $scope.ownsProfile = true,
      $scope.newImageButton.removeClass("hide");
    }

    var documentTitle, documentId, set, numSets, setNum, start, nextSet;
    var setLength = 5;

    socket.emit('getDocuments', { owner: $routeParams.username, user: $scope.currentUser.name }, function(response) {
      if (response && response.documents.length) {
        var documents = response.documents;
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
        $scope.currentSet = $scope.sets[0],
        $scope.documents = $scope.sets[0].documents;
      }
      else
        $scope.newUserMessage.text("No documents yet - click 'New Document' to get started!");
    });

    socket.emit('getImage', { user: $routeParams.username }, function(image) {
      if (image){
        $scope.userImage.attr("src", image);
        $scope.hasPic = true;
      }
    });

    $scope.displaySet = function(set) {
      $scope.documents = set.documents,
      $scope.currentSet.isCurrent = "",
      set.isCurrent = "current",
      $scope.currentSet = set;
    }

    $scope.back = function(set) {
      if (set.index >= 2) {
        nextSet = $scope.sets[set.index - 2];
        $scope.displaySet(nextSet);
      }
    }

    $scope.forward = function(set) {
      if (set.index < $scope.sets.length) {
        nextSet = $scope.sets[set.index];
        $scope.displaySet(nextSet);
      }
    }

    $scope.clearImage = function() {
      if ($scope.ownsProfile) {
        socket.emit('removeImage', { user: $routeParams.username }, function(response) {
          if (response) {
            $scope.userImage.attr("src", ""),
            $scope.newImageButton.val(""),
            $scope.clearImageButton.addClass("hide");
          }
        });
      }
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
      $scope.userIsOwner = $scope.currentUser ? (docInfo.owner === $scope.currentUser.name) : false,
      $scope.userHasAccess = $scope.currentUser ? $scope.userIsOwner || ($scope.collaborators.indexOf($scope.currentUser.name) > -1) : false;
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

    $scope.searchForCollaborators = function() {
      socket.emit('searchForCollaborators', { query: $scope.query, user: $scope.currentUser.name, docId: $routeParams.docId, owner: $scope.docOwner, collaborators: $scope.collaborators, sessionId: Session.id });
    }

    $scope.deleteDocument = function() {
      if (confirm("Are you sure you want to delete the document entitled, '" + $scope.docTitle + "'?"))
        socket.emit('deleteDocument', { docId: $routeParams.docId, owner: $scope.docOwner, title: $scope.docTitle, sessionId: Session.id }, function() {
          $location.path('/users/' + $scope.docOwner);
        });
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
        $location.path('/docs/' + $routeParams.username + '/' + $routeParams.docId);
      else {
        $scope.docOwner = docInfo.owner,
        $scope.docId = docInfo.id,
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
  
    socket.on('documentChanged', function(data) {
      docInfo = data,
      $scope.docId = data.docId;
      if ($scope.docId != $routeParams.docId)
        $location.path('/docs/' + data.owner + '/' + $scope.docId);
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
}]).controller('searchDocsCtrl', ['$scope', '$routeParams', 'socket', function($scope, $routeParams, socket) {

    $scope.docs = [],
    $scope.results = [],
    $scope.sets = [],
    $scope.query = $routeParams.query,
    $scope.noResultsMessage = angular.element('#no-results-message');

    $scope.displayResults = function(docs) {
      var set, numSets, setNum, start, nextSet;
      var setLength = 10;
      if (docs.length) {
        numSets = Math.ceil((docs.length)/setLength);
        setNum = 1, start = 0;
        for (var j = 0; j < numSets; j++) {
          set = {};
          set.index = j + 1,
          set.results = [];
          for (var k = start; k < setNum * setLength; k++) {
            if (docs[k])
              set.results.push(docs[k]);
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

    socket.emit('searchDocs', { query: $scope.query }, function(response) {
      if (response && response.done) {
        $scope.docs.push(response);
        $scope.displayResults($scope.docs);
      }
      else if (response && response.title)
        $scope.docs.push(response);
      else
        $scope.noResultsMessage.text("No Results");
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
}]).controller('messagesCtrl', ['$scope', '$location', 'socket', 'Session', 'replyInfo', function($scope, $location, socket, Session, replyInfo) {

  $scope.messages = [];

  if ($scope.currentUser.name) {
    socket.emit('getMessages', { user: $scope.currentUser.name, sessionId: Session.id }, function(response) {
      if (response) {
        var sortedResponse = response.sort(function(a, b) {
          return Date.parse(b.sent) - Date.parse(a.sent);
        });
        $scope.messages = sortedResponse;
      }
    });
  }
  else
    $location.path('/');

  $scope.showMessage = function(message) {
    angular.element('#message-' + message.id).toggleClass('closed');
    var buttonMessage = angular.element('#show-message-' + message.id);
    buttonMessage.text() === "Show Message" ? buttonMessage.text("Hide Message") : buttonMessage.text("Show Message");
    $scope.buttonMessage = $scope.buttonMessage === "Hide Message" ? "Show Message" : "Hide Message";
  }

  $scope.reply = function(message) {
    replyInfo.sender = message.sender,
    replyInfo.subject = message.subject;
  }

}]).controller('newMessageCtrl', ['$scope', '$location', 'socket', 'replyInfo', function($scope, $location, socket, replyInfo) {

    if ($scope.currentUser.name) {
      $scope.$watch('messageReceiver', function(newValue, oldValue) {
        if ((newValue && newValue.length > 0) && (newValue != oldValue))
          $scope.checkReceiver(newValue);
        else {
          $scope.noReceiver = true,
          $scope.isValid = false;
        }
      }, true);

      $scope.$watch('messageSubject', function(newValue, oldValue) {
        if ((newValue && newValue.length > 0)) {
          if ($scope.noSubject === true) {
            $scope.noSubject = false;
            if ($scope.showNoSubjectWarning)
              $scope.showNoSubjectWarning = false;
          }
        }
        else {
          $scope.noSubject = true,
          $scope.isValid = false;
        }
      }, true);

      $scope.$watch('messageBody', function(newValue, oldValue) {
        if ((newValue && newValue.length > 0)) {
          if ($scope.noBody) {
            $scope.noBody = false;
            if ($scope.showNoBodyWarning)
              $scope.showNoBodyWarning = false;
          }
        }
        else {
          $scope.noBody = true,
          $scope.isValid = false;
        }
      }, true);

      $scope.messageSentAlert = angular.element('#alert-five');

      $scope.checkReceiver = function(messageReceiver) {
        socket.emit('searchUsers', { query: messageReceiver, justChecking: true }, function(response) {
          if (response.userNotFound) {
            $scope.noReceiverFound = true,
            $scope.noReceiver = false,
            $scope.isValid = false;
          }
          else
            $scope.noReceiver = $scope.noReceiverFound = $scope.showNoReceiverFoundWarning = $scope.showNoReceiverWarning = false;
        });
      }

      $scope.checkForm = function() {
        $scope.showNoSubjectWarning = $scope.noSubject,
        $scope.showNoBodyWarning = $scope.noBody,
        $scope.showNoReceiverFoundWarning = $scope.noReceiverFound,
        $scope.showNoReceiverWarning = $scope.noReceiver;

        if ($scope.noReceiverFound)
          $scope.tempVal = $scope.messageReceiver;

        if (!$scope.noSubject && !$scope.noBody && !$scope.noReceiverFound && !$scope.noReceiver)
          $scope.isValid = true;
      }

      $scope.sendMessage = function() {
        $scope.checkForm();
        if ($scope.isValid) {
          socket.emit('sendMessage', { sender: $scope.currentUser.name, receiver: $scope.messageReceiver, subject: $scope.messageSubject, body: $scope.messageBody, sent: new Date().toUTCString() }, function() {
            $scope.messageSent = true,
            $scope.messageReceiver = "",
            $scope.messageBody = "",
            $scope.messageSubject = "";
          });
        }
      }

      $scope.closeMessageSentAlert = function() {
        $scope.messageSentAlert.hide();
      }

       if (replyInfo.sender) {
        $scope.messageReceiver = replyInfo.sender,
        $scope.messageSubject = replyInfo.subject;
        $scope.checkReceiver($scope.messageReceiver);
      }
    }
    else
      $location.path('/');
}]);
