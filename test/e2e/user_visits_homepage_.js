'use strict';

describe('Freestyle Chat homepage', function() {
  browser.get('#/');

  it('should have a title', function() {
    expect(browser.getTitle()).toEqual('SimpleWriter');
  });

});
