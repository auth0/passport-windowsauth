Windows Authentication strategy for Passport.js.

## Install

    npm install passport-windowsauth

## Introduction

This module authenticate user with a LDAP directory. It works in two modes **Integrated Authentication** (often refer as NTLM) or **Form Authentication**.

## Integrated Authentication (IIS)

In this mode, this strategy reads an special server variable from IIS (more info about this [here](https://github.com/tjanczuk/iisnode/issues/87)) and then generate a profile. You can **optionally** pass LDAP credentials to fetch the profile from Active Directory.

**In your IIS application authentication settings, disable Anonymous and enable Windows Authentication.**

Configure iisnode to pass the special variable ```LOGON_USER``` from IIS to node

~~~xml
<configuration>
  <system.webServer>
    <!-- ... -->
    <iisnode promoteServerVars="LOGON_USER" />
  </system.webServer>
</configuration>
~~~

If you want to use it with LDAP:

~~~javascript
var passport = require('passport');
var WindowsStrategy = require('passport-windowsauth');

passport.use(new WindowsStrategy({
  ldap: {
    url:             'ldap://wellscordoba.wellscordobabank.com/DC=wellscordobabank,DC=com',
    base:            'DC=wellscordobabank,DC=com',
    bindDN:          'someAccount',
    bindCredentials: 'andItsPass'
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
});
~~~

NOTE: in this case profile only has ```displayName``` and ```id```, both containing just the logon name.

Then use the strategy in a route as follows:

~~~javascript
app.get('/express-passport',
  passport.authenticate('WindowsAuthentication'),
  function (req, res){
    res.json(req.user);
  });
~~~

## Integrated Authentication with Apache and mod_auth_kerb

You can take advantage of [mod_auth_kerb](http://modauthkerb.sourceforge.net/) in linux by using apache as a reverse proxy to your node application. The configuration is not a _walk in the park_ but after you have everything configured it just works.

####1-Generate a keytab in windows

~~~
ktpass
-princ service/server.CONTOSO.COM@CONTOSO.COM
-mapuser user@CONTOSO.COM
-crypto RC4-HMAC-NT
-ptype KRB5_NT_PRINCIPAL
-pass passssswwword
-out FILE.keytab
~~~

####2-Check your /etc/krb5.conf

~~~
kinit user@CONTOSO.COM
~~~

You should be able to login from the linux machine.

####3-Check your keytab is okay

~~~
kinit -V -kt FILE.keytab service/server.CONTOSO.COM@CONTOSO.COM
~~~

####4-Install apache with the modules

The modules you need are `mod-auth-kerb`, `proxy`, `proxy_http`, `headers`, `rewrite`.

####5-Configure your apache

~~~
<VirtualHost *:8001>
  ServerAdmin webmaster@localhost

  ProxyPassInterpolateEnv On
  ProxyPass / http://localhost:3000/          # this is the node.js app
  ProxyPassReverse / http://localhost:3000/   # this is the node.js app
  RewriteEngine On
  RewriteCond %{LA-U:REMOTE_USER} (.+)
  RewriteRule . - [E=RU:%1]
  RequestHeader set X-Forwarded-User %{RU}e

  <Proxy *>
      Order deny,allow
      Allow from all
  </Proxy>

  <Location />
      AuthName "Kerberos Login"
      AuthType Kerberos
      Krb5Keytab /path/to/your/FILE.keytab    # VERY IMPORTANT
      KrbAuthRealm CONTOSO.COM
      KrbMethodNegotiate on
      KrbSaveCredentials off
      KrbVerifyKDC off
      KrbServiceName SERVICE/server.CONTOSO.COM
      Require valid-user
  </Location>

  ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/
  <Directory "/usr/lib/cgi-bin">
    AllowOverride None
    Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
    Order allow,deny
    Allow from all
  </Directory>

  ErrorLog ${APACHE_LOG_DIR}/error.log

  CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
~~~

####6-Configure Passport.js

~~~javascript
var passport = require('passport');
var WindowsStrategy = require('passport-windowsauth');

passport.use(new WindowsStrategy({
  ldap: {
    url:             'ldap://wellscordoba.wellscordobabank.com/DC=wellscordobabank,DC=com',
    base:            'DC=wellscordobabank,DC=com',
    bindDN:          'someAccount',
    bindCredentials: 'andItsPass'
  },
  getUserNameFromHeader: function (req) {
    //in the above apache config we set the x-forwarded-user header.
    //mod_auth_kerb uses user@domain
    return req.headers['x-forwarded-user'].split('@')[0];
  }
}, function(profile, done){
  User.findOrCreate({ waId: profile.id }, function (err, user) {
    done(err, user);
  });
}));
~~~


## Non-integrated authentication

You can use this module to authenticate users against a LDAP server without integrated authentication.
You will prompt the user for his username and password in a form like this:

~~~html
<form action="/login" method="post">
    <div>
        <label>Username:</label>
        <input type="text" name="username"/>
    </div>
    <div>
        <label>Password:</label>
        <input type="password" name="password"/>
    </div>
    <div>
        <input type="submit" value="Log In"/>
    </div>
</form>
~~~

and then have a route like this:

~~~javascript
app.post('/login',
  passport.authenticate('WindowsAuthentication', {
                                  successRedirect: '/',
                                  failureRedirect: '/login',
                                  failureFlash:    true })
);
~~~

The same configuration as explained above is required with the ```integrated``` option in false:

~~~javascript
var passport = require('passport');
var WindowsStrategy = require('passport-windowsauth');

passport.use(new WindowsStrategy({
  ldap: {
    url:             'ldap://wellscordoba.wellscordobabank.com/DC=wellscordobabank,DC=com',
    base:            'DC=wellscordobabank,DC=com',
    bindDN:          'someAccount',
    bindCredentials: 'andItsPass'
  },
  integrated:      false
}, function(profile, done){
  User.findOrCreate({ waId: profile.id }, function (err, user) {
    done(err, user);
  });
}));
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
    "title": "cantante desafinado - programador",
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

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
