'use strict';

describe('User registration', function() {

  it('should let a new user register', function() {
    browser.get('#/register');

  	var userName = element(by.model('userName')),
  	userEmail = element(by.model('userEmail')),
    userPassword = element(by.model('userPassword')),
    passwordConfirmation = element(by.model('passwordConfirmation')),
  	createUserButton = element(by.id('save-user'));
  	
  	userName.sendKeys('New User');
  	userEmail.sendKeys('mark.philosophe@gmail.com');
    userPassword.sendKeys('secret');
    passwordConfirmation.sendKeys('secret');
  	createUserButton.click();
    expect(element(by.id('registration-confirmation')).getText()).toEqual("Welcome, New User! Go ahead and login!");
  });
});
