'use strict';

describe('Document creation', function() {

  it('should let user create a new document', function() {
    register('user2', 'user2@example.com');
    login('user2');

    expect($('[ng-show=isMakingDocument]').isDisplayed()).toBeFalsy();
    expect($('[ng-hide=isMakingDocument]').isDisplayed()).toBeTruthy();

    var newDocButton = element(by.id('new-document'));
    var docTitle = element(by.model('docTitle'));
    var docBody = element(by.model('docBody'));

  	newDocButton.click();
    
    docTitle.sendKeys('My document');
    docBody.sendKeys('hello world');
    
    element(by.id('save-button')).click().then(function() {
      expect(element(by.id('document-title')).getText()).toEqual('My document');
      expect(element(by.id('document-body')).getText()).toEqual('hello world');
    }); 
  });
});



function register(name, email) {
  browser.get('#/register');

  var userName = element(by.model('userName')),
    userEmail = element(by.model('userEmail')),
    userPassword = element(by.model('userPassword')),
    passwordConfirmation = element(by.model('passwordConfirmation')),
    createUserButton = element(by.id('save-user'));

    userName.sendKeys(name);
    userEmail.sendKeys(email);
    userPassword.sendKeys('secret');
    passwordConfirmation.sendKeys('secret');
    createUserButton.click();
}

function login(username) {
  element(by.model('credentials.userName')).sendKeys(username);
  element(by.model('credentials.userPassword')).sendKeys('secret');
  element(by.id('login')).click();
}
