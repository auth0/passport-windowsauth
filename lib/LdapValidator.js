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
    if(!password) return callback();

    var client = this._options.binder || ldap.createClient({
      url:             this._options.url,
      maxConnections:  this._options.maxConnections || 10,
      bindDN:          this._options.bindDN,
      bindCredentials: this._options.bindCredentials,
      tlsOptions:      this._options.tlsOptions,
      reconnect:       this._options.reconnect,
      timeout:         this._options.timeout,
      connectTimeout:  this._options.connectTimeout,
      idleTimeout:     this._options.idleTimeout
    });

    client.on('error', function(e){
        console.log("Error in LdapValidator", e);
    });

    //try bind by password
    client.bind(up.dn, password, function(err) {
      if (!this._options.binder) client.destroy();
      if(err) return callback();
      callback(null, up);
    }.bind(this));
  }.bind(this));
};
