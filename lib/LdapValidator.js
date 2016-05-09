var ldap = require('ldapjs');
var LdapLookup = require('./LdapLookup');

var LdapValidator = module.exports = function(options){
  this._options = options;
  this._lookup = new LdapLookup(options);
};

LdapValidator.prototype.validate = function (username, password, callback) {
  if (!username) {
    return callback();
  }

  //lookup by username
  this._lookup.search(username, function (err, up) {
    if(err) return callback(err);
    if(!up) return callback();

    // AD will bind and delay an error till later if no password is given
    if(password === '') return callback();

    var client = this._options.binder || ldap.createClient({ url: this._options.url, tlsOptions: this._options.tlsOptions });

    client.on('error', function(e){
        console.log("Error in LdapValidator", e);
    })
    //try bind by password
    client.bind(up.dn, password, function(err) {
      if(err) return callback();
      else {
        client.unbind(); // unbind client to remove process
        callback(null, up);
      }
    }.bind(this));
  }.bind(this));
};
