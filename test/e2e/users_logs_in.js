'use strict';

describe('User logs in', function() {

  it('should let a registered user login', function() {

    browser.get('#/register');

    var userName = element(by.model('userName')),
    userEmail = element(by.model('userEmail')),
    userPassword = element(by.model('userPassword')),
    passwordConfirmation = element(by.model('passwordConfirmation')),
    createUserButton = element(by.id('save-user'));

  	userName.sendKeys('Some User');
  	userEmail.sendKeys('some_user@example.com');
    userPassword.sendKeys('secret');
    passwordConfirmation.sendKeys('secret');
  	createUserButton.click();

    element(by.id('username')).sendKeys('Some User');
    element(by.id('password')).sendKeys('secret');
    element(by.id('login')).click();

    expect(element(by.id('user-email-link')).getText()).toEqual('some_user@example.com');
  });

  it('should not allow a user to login with bad credentials', function() {

    browser.get('#/login');

    element(by.id('username')).sendKeys('unknownUser');
    element(by.id('password')).sendKeys('secret');
    element(by.id('login')).click();

    expect(element(by.id('error-message')).getText()).toEqual("Password and password confirmation don't match.");
  });
});