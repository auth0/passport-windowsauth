var ldap = require('ldapjs');
var LdapLookup = require('./LdapLookup');

ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_D;

var LdapValidator = module.exports = function(options){
  this._options = options;
  this._lookup = new LdapLookup(options);
};

LdapValidator.prototype.validate = function (username, password, callback) {
  var client = ldap.createClient({ url: this._options.url });
  client.bind(username, password, function(err) {
    if(err) return callback(null, false);
    this._lookup.search(username, callback);
  }.bind(this));
};