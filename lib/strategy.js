/**
 * Module dependencies.
 */
var passport = require('passport');
var util = require('util');
var LdapLookup = require('./LdapLookup');
var LdapValidator = require('./LdapValidator');

/**
 * `Strategy` constructor.
 *
 * The Windows Authentication Strategy authenticate requests based on a IIS Server Variable.
 * IIS node puts this variable in a request header.
 *
 * Applications might supply credentials for an Active Directory and the strategy will fetch
 * the profile from there.
 *
 * Options:
 *   - `usernameField`  field name where the username is found, defaults to _username_
 *   - `passwordField`  field name where the password is found, defaults to _password_
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Examples:
 *
 *     passport.use(new WindowsAuthentication({
 *      ldap: {
 *        url:         'ldap://mydomain.com/',
 *        base:        'DC=wellscordobabank,DC=com',
 *        bindDN:          'AppUser',
 *        bindCredentials: 'APassword'
 *      }
 *        }, function(profile, done) {
 *         User.findOrCreate({ waId: profile.id }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  if (!verify) throw new Error('windows authentication strategy requires a verify function');

  if (typeof options.integrated === 'undefined') {
    options.integrated = true;
  }

  if(!options.integrated && (!options.ldap || !options.ldap.url)) {
    throw new Error('ldap url should be provided in order to validate user and passwords');
  }
  
  passport.Strategy.call(this);

  this.name = 'WindowsAuthentication';
  this._verify = verify;

  this._integrated = options.integrated;
  this._getUserNameFromHeader = options.getUserNameFromHeader || function (req) {
    if (!req.headers['x-iisnode-logon_user']) return null;
    return req.headers['x-iisnode-logon_user'].split('\\')[1];
  };

  if (options.ldap) {
    if (options.integrated) {
      this._ldapLookup = new LdapLookup(options.ldap);
    } else {
      this._ldapValidator = new LdapValidator(options.ldap);
    }
  }
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);


/**
 * maps the user profile.
 */
Strategy.prototype.userProfile = function (i) {
  var result = {
    id:          i.objectGUID,
    displayName: i.displayName,
    name: {
      familyName: i.sn,
      givenName: i.givenName
    },
    emails: (i.mail ? [{value: i.mail }] : undefined),
    _json: i
  };
  return result;
};

/**
 * Authenticate request based on the contents of the x-iisnode-logon_user header
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var self = this;
  var userName, password;

  if (this._integrated) {
    userName = this._getUserNameFromHeader(req);
    if(!userName){
      return self.fail();
    }
  } else {
    userName = req.body.username;
    password = req.body.password;
  }

  function verified(err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info); }
    self.success(user, info);
  }

  if(this._ldapValidator){
    this._ldapValidator.validate(userName, password, function(err, userProfile){
      if (err) return self.error(err);
      userProfile = userProfile ? self.userProfile(userProfile) : null;
      if (self._passReqToCallback) {
        self._verify(req, userProfile, verified);
      } else {
        self._verify(userProfile, verified);
      }
    });
  } else if(this._ldapLookup){
    this._ldapLookup.search(userName, function(err, userProfile){
      if (err) { return self.error(err); }
      userProfile = self.userProfile(userProfile);
      if (self._passReqToCallback) {
        self._verify(req, userProfile, verified);
      } else {
        self._verify(userProfile, verified);
      }
    });
  } else {
    var up = {name: userName, id: userName};
    if (self._passReqToCallback) {
      this._verify(req, up, verified);
    } else {
      this._verify(up, verified);
    }
  }
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;