var ldap = require('ldapjs');

var LdapLookup = module.exports = function(options){
  this._options = options;

  this._search_query = options.search_query ||
    '(&(objectclass=user)(|(sAMAccountName={0})(UserPrincipalName={0})))';

  this._client = options.client ? options.client : ldap.createClient({
    url:             options.url,
    maxConnections:  options.maxConnections || 10,
    bindDN:          options.bindDN,
    bindCredentials: options.bindCredentials,
    tlsOptions:      options.tlsOptions,
    reconnect:       options.reconnect,
    timeout:         options.timeout,
    connectTimeout:  options.connectTimeout,
    idleTimeout:     options.idleTimeout
  });

  this._client.on('error', function(e){
    // Suppress logging of ECONNRESET if ldapjs's Client will automatically reconnect.
    if (e.errno === 'ECONNRESET' && self._client.reconnect) return;

    console.log('LDAP connection error:', e);
  });

  if (options.client) {
    this.clientConnected = true;
    return;
  }

  this._queue = [];
  var self = this;
  this._client.bind(options.bindDN, options.bindCredentials, function(err) {
    if(err){
        return console.log("Error binding to LDAP", 'dn: ' + err.dn + '\n code: ' + err.code + '\n message: ' + err.message);
    }
    self.clientConnected = true;
    self._queue.forEach(function (cb) { cb(); });
  });
};

LdapLookup.prototype.search = function (username, callback) {
  var self = this;
  function exec(){
    var opts = {
      scope: 'sub',
      filter: self._search_query.replace(/\{0\}/ig, username)
    };
    self._client.search(self._options.base, opts, function(err, res){
      var entries = [];
      res.on('searchEntry', function(entry) {
        entries.push(entry);
      });
      res.on('error', function(err) {
        callback(err);
      });
      res.on('end', function() {
        if(entries.length === 0) return callback(null, null);
        callback(null, entries[0].object);
      });
    });
  }

  if(this.clientConnected){
    exec();
  } else {
    this._queue.push(exec);
  }
};
