'use strict';

describe('User registration', function() {

  beforeEach(function() {
    browser.get('#/register');
  });

  it('should let a new user register', function() {

    var userName = element(by.model('userName')),
    userEmail = element(by.model('userEmail')),
    userPassword = element(by.model('userPassword')),
    passwordConfirmation = element(by.model('passwordConfirmation')),
    createUserButton = element(by.id('save-user'));

  	userName.sendKeys('New User');
  	userEmail.sendKeys('user@example.com');
    userPassword.sendKeys('secret');
    passwordConfirmation.sendKeys('secret');
  	createUserButton.click();

    expect(element(by.id('user-message')).getText()).toEqual("Welcome, New User! Go ahead and login!");
  });

  it('should not allow a user to register with mismatching passwords', function() {
    
    var userName = element(by.model('userName')),
    userEmail = element(by.model('userEmail')),
    userPassword = element(by.model('userPassword')),
    passwordConfirmation = element(by.model('passwordConfirmation')),
    createUserButton = element(by.id('save-user'));

    userName.sendKeys('Another User');
    userEmail.sendKeys('user2@example.com');
    userPassword.sendKeys('secret');
    userPassword.sendKeys('whoops');
    createUserButton.click();

    expect(element(by.id('error-message')).getText()).toEqual("Password and password confirmation don't match.");
  });
});
