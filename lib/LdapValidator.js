var ldap = require('ldapjs');
var LdapLookup = require('./LdapLookup');

ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_D;

var LdapValidator = module.exports = function(options){
  this._options = options;
  this._lookup = new LdapLookup(options);
};

LdapValidator.prototype.validate = function (username, password, callback) {
  //lookup by username
  this._lookup.search(username, function (err, up) {
    if(err) return callback(err);
    if(!up) return callback();
    var client = ldap.createClient({ url: this._options.url });
    // AD will bind and delay an error till later if no password is given
    if(password == '') return callback();
    //try bind by password
    client.bind(up.dn, password, function(err) {
      if(err) return callback();
      callback(null, up);
    }.bind(this));
  }.bind(this));
};
