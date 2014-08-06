'use strict';

describe('Document creation', function() {
  beforeEach(function() {
    browser.get('#/');
  });

  it('should display only new-document button', function() {
    expect($('[ng-show=isMakingDocument]').isDisplayed()).toBeFalsy();
    expect($('[ng-hide=isMakingDocument]').isDisplayed()).toBeTruthy();
  });

  
  it('should let user create a new document', function() {
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