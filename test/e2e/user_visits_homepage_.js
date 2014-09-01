'use strict';

describe('simpleWriter homepage', function() {
  browser.get('#/');

  it('should have a title', function() {
    expect(browser.getTitle()).toEqual('SimpleWriter');
  });

});
