'use strict';

describe('User registration', function() {
  browser.get('#/register');

  it('should let a new user register', function() {
  	var userName = element(by.model('userName')),
  	userEmail = element(by.model('userEmail')),
  	createUserButton = element(by.id("#create-user"));
  	
  	userName.sendKeys('New User');
  	userEmail.sendKeys('mark.philosophe@gmail.com');
  	createUserButton.click();

  	

    expect(browser.getTitle()).toEqual('SimpleWriter');
  });

});
