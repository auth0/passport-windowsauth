/**
 * Module dependencies.
 */
var passport = require('passport');
var util = require('util');
var LdapLookup = require('./LdapLookup');

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
  
  passport.Strategy.call(this);
  this.name = 'WindowsAuthentication';
  this._verify = verify;

  if(options.ldap){
    this._ldapLookup = new LdapLookup(options.ldap);
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
    emails: [{value: i.mail }],
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
  
  if(!req.headers['x-iisnode-logon_user']){
    return self.fail();
  }

  var userName = req.headers['x-iisnode-logon_user'].split('\\')[1];

  function verified(err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info); }
    self.success(user, info);
  }
  
  if(this._ldapLookup){
    this._ldapLookup.search(userName, function(err, userProfile){
      if (err) { return self.error(err); }
      userProfile = self.userProfile(userProfile);
      if (self._passReqToCallback) {
        self._verify(req, userProfile, verified);
      } else {
        self._verify(userProfile, verified);
      }
    });
  }else{
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