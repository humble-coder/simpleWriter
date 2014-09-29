'use strict';

describe('Collaborator adding', function() {

  it('should let user add collaborator to document', function() {
    register('user4', 'user4@example.com');
    register('user5', 'user5@example.com');
    login('user4');

    var newDocButton = element(by.id('new-document')),
    docTitle = element(by.model('docTitle')),
    docBody = element(by.model('docBody'));

    newDocButton.click();
    docTitle.sendKeys('Collaborated document');
    docBody.sendKeys('Some content');

    element(by.id('save-button')).click();

    var searchButton = element(by.id('search-button')),
    query = element(by.model('query'));

    query.sendKeys('user5');
    searchButton.click();

    var resultsList = element.all(by.repeater('user in users'));

    expect(resultsList.count()).toEqual(1);
    expect(resultsList.get(0).getText()).toEqual('user5');

    var collaboratorList = element.all(by.repeater('collaborator in collaborators')),
    addCollaboratorButton = element(by.id('user5'));

    addCollaboratorButton.click();

    expect(collaboratorList.count()).toEqual(1);
    expect(collaboratorList.get(0).getText()).toEqual('user5');
    expect(resultsList.count()).toEqual(0);
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