'use strict';

describe('Document editing', function() {
  
  it('should let user/creator edit document body and title', function() {
    browser.get('#/');

    var newDocButton = element(by.id('new-document')),
    docTitle = element(by.model('docTitle')),
    docBody = element(by.model('docBody'));

    newDocButton.click();
    docTitle.sendKeys('New document');
    docBody.sendKeys('Some content');

    element(by.id('save-button')).click();
  	expect($('[ng-show=isEditingDocument]').isDisplayed()).toBeFalsy();
    expect($('[ng-hide=isEditingDocument]').isDisplayed()).toBeTruthy();

    element(by.id('edit-button')).click();
    element(by.model('docBody')).sendKeys(' Updated content');

    element(by.id('update-button')).click().then(function() {
    	expect(element(by.id('document-body')).getText()).toEqual('Some content Updated content');
    });
  });

  it('should let another user/collaborator edit document body and title', function() {
    browser.get('#/documents/Newdocument');

    expect($('[ng-show=isEditingDocument]').isDisplayed()).toBeFalsy();
    expect($('[ng-hide=isEditingDocument]').isDisplayed()).toBeTruthy();

    element(by.id('edit-button')).click();
    element(by.model('docBody')).sendKeys(' Updated again');

    element(by.id('update-button')).click().then(function() {
      expect(element(by.id('document-body')).getText()).toEqual('Some content Updated content Updated again');
    });
  });
});