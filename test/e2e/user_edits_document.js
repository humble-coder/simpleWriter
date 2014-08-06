'use strict';

describe('Document editing', function() {
  beforeEach(function() {
    browser.get('#/');
    var newDocButton = element(by.id('new-document'));
    var docTitle = element(by.model('docTitle'));
    var docBody = element(by.model('docBody'));

  	newDocButton.click();
    
    docTitle.sendKeys('New document');
    docBody.sendKeys('Some content');
    element(by.id('save-button')).click();
  });
  
  it('should let user edit document body and title', function() {
  	expect($('[ng-show=isEditingDocument]').isDisplayed()).toBeFalsy();
    expect($('[ng-hide=isEditingDocument]').isDisplayed()).toBeTruthy();

    element(by.id('edit-button')).click();
    element(by.model('docBody')).sendKeys('Updated content');

    element(by.id('update-button')).click().then(function() {
    	expect(element(by.id('document-body')).getText()).toEqual('Some contentUpdated content');
    });
  });
});