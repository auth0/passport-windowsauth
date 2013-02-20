Windows Authentication strategy for Passport.js.

**NOTE:** this only works in iisnode.

## Install

    npm install passport-windowsauth

## Introduction

This strategy reads an special server variable from IIS (more info about this [here](https://github.com/tjanczuk/iisnode/issues/87)) and then generate a profile. You can **optionally** pass some LDAP credentials to fetch the profile from Active Directory. 

This module only works in **WINDOWS** and it only works when running inside of **IIS** whit [IISNode](https://github.com/tjanczuk/iisnode).

The hard part about making this multiplatform is the NTLM support, this means to not prompt the user for his credentials and use the credentials from the Windows Session. Although I have found some implementations for Apache so it doesn't seem impossible.

## Usage

**In your IIS application authentication settings, disable Anonymous and enable Windows Authentication.**

If you want to use it with LDAP:

~~~javascript
var passport = require('passport');
var WindowsStrategy = require('passport-windowsauth');

passport.use(new WindowsStrategy({ 
  ldap: {
    url:             'ldap://wellscordoba.wellscordobabank.com/DC=wellscordobabank,DC=com',
    base:            'DC=wellscordobabank,DC=com',
    bindDN:          'app1',
    bindCredentials: 'Passw0rd!'
  }
}, function(profile, done){
  User.findOrCreate({ waId: profile.id }, function (err, user) {
    done(err, user);
  });
}));
~~~

If you want to use without LDAP:

~~~javascript
var passport = require('passport');
var WindowsStrategy = require('passport-windowsauth');

passport.use(function(profile, done){
  User.findOrCreate({ waId: profile.id }, function (err, user) {
    done(err, user);
  });
}));
~~~

NOTE: in this case profile only has ```displayName``` and ```id```, and the two variables with the same value.

Then use the strategy in a route as follows:

~~~javascript
app.get('/express-passport', 
  passport.authenticate('WindowsAuthentication'),
  function (req, res){
    res.json(req.user);
  });
~~~


## Example profile from LDAP

When you use the LDAP integration the profile follows the [Passport.js user profile convention](http://passportjs.org/guide/profile/) and you have also a _json property with all the profile.

Example:

~~~json
{
  "id": "fe59e96-4d82-431e-816a-5a688e4ab547",
  "displayName": "Jose Romaniello",
  "name": {
    "familyName": "Romaniello",
    "givenName": "Jose"
  },
  "emails": [
    {
      "value": "jromaniello@wellscordoba.com"
    }
  ],
  "_json": {
    "dn": "CN=Jose Romaniello,CN=Users,DC=wellscordobabank,DC=com",
    "controls": [],
    "objectClass": [
      "top",
      "person",
      "organizationalPerson",
      "user"
    ],
    "cn": "Jose Romaniello",
    "sn": "Romaniello",
    "title": "cantante desafinado - programador experto",
    "physicalDeliveryOfficeName": "Chief Architect",
    "telephoneNumber": "+543519998822",
    "givenName": "Jose",
    "distinguishedName": "CN=Jose Romaniello,CN=Users,DC=wellscordobabank,DC=com",
    "instanceType": "4",
    "whenCreated": "20130220172116.0Z",
    "whenChanged": "20130220183149.0Z",
    "displayName": "Jose Romaniello",
    "uSNCreated": "12717",
    "uSNChanged": "12792",
    "company": "Wells Cordoba Bank",
    "name": "Jose Romaniello",
    "objectGUID": "fe59e96-4d82-431e-816a-5a688e4ab547",
    "userAccountControl": "66048",
    "badPwdCount": "0",
    "codePage": "0",
    "countryCode": "0",
    "badPasswordTime": "0",
    "lastLogoff": "0",
    "lastLogon": "0",
    "pwdLastSet": "130058544776047558",
    "primaryGroupID": "513",
    "objectSid": "\u0001\u0005\u0000\u0000\u0000\u0000\u0000\u0005\u0015\u0000\u0000\u0000��=��\u001d��uQ��O\u0004\u0000\u0000",
    "accountExpires": "9223372036854775807",
    "logonCount": "0",
    "sAMAccountName": "jromaniello",
    "sAMAccountType": "805306368",
    "userPrincipalName": "jromaniello@wellscordobabank.com",
    "objectCategory": "CN=Person,CN=Schema,CN=Configuration,DC=wellscordobabank,DC=com",
    "dSCorePropagationData": [
      "20130220172118.0Z",
      "16010101000000.0Z"
    ],
    "lastLogonTimestamp": "130058572786126285",
    "mail": "jromaniello@wellscordobabank.com"
  }
}
~~~ 

## License

MIT 2013!