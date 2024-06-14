var expect = require('chai').expect;

var Strategy = require('../lib/strategy');
const { assert } = require('chai');

describe('strategy', function () {
  it('should fail if integrated is false and ldap is null', function () {
    expect(function () {
      new Strategy({
        integrated: false
      }, function () { });
    }).to.throw(/ldap url should be provided in order to validate user and passwords/);
  });

  it('should return downLevelLogonName', function () {

    const domain = 'test-domain';
    const logonName = 'test-logon';
    const downLevelLogonName = `${domain}\\${logonName}`;
    
    const verify = (up) => {
      expect(up).to.deep.equal({
        name: downLevelLogonName,
        id: downLevelLogonName
      });
    }

    const strategy = new Strategy({
      integrated: true,
      downLevelLogonName: true,
    }, verify);

    strategy.authenticate({
      headers: {
        'x-iisnode-logon_user': downLevelLogonName
      }
    });
  });

  it('should return logon name if downLevelLogonName is false', function () {

    const domain = 'test-domain';
    const logonName = 'test-logon';
    const downLevelLogonName = `${domain}\\${logonName}`;
    
    const verify = (up) => {
      expect(up).to.deep.equal({
        name: logonName,
        id: logonName
      });
    }

    const strategy = new Strategy({
      integrated: true,
      downLevelLogonName: false,
    }, verify);


    strategy.authenticate({
      headers: {
        'x-iisnode-logon_user': downLevelLogonName
      }
    });
  });

  it('should return logon name if downLevelLogonName is undefined', function () {

    const domain = 'test-domain';
    const logonName = 'test-logon';
    const downLevelLogonName = `${domain}\\${logonName}`;
    
    const verify = (up) => {
      expect(up).to.deep.equal({
        name: logonName,
        id: logonName
      });
    }

    const strategy = new Strategy({
      integrated: true
    }, verify);


    strategy.authenticate({
      headers: {
        'x-iisnode-logon_user': downLevelLogonName
      }
    });
  });
});