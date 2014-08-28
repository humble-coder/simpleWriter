'use strict';

describe('User registration', function() {

  it('should let a new user register', function() {
    browser.get('#/register');

  	var userName = element(by.model('userName')),
  	userEmail = element(by.model('userEmail')),
  	createUserButton = element(by.id("save-button"));

  	
  	userName.sendKeys('New User');
  	userEmail.sendKeys('mark.philosophe@gmail.com');
  	createUserButton.click();
    expect(element(by.id("registration-confirmation")).getText()).toEqual("You have successfully registered!");
  });

});
