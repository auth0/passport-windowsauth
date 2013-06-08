var expect = require('chai').expect;
var Strategy = require('../lib/strategy');

describe('strategy', function () {
  it('should fail if integrated is false and ldap is null', function(){
    expect(function() {
      new Strategy({
        integrated: false
      }, function(){});
    }).to.throw(/ldap url should be provided in order to validate user and passwords/);
  });
});