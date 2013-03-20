var ldap = require('ldapjs');
ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_D;

var LdapLookup = module.exports = function(options){
  this._options = options;
  this._client = ldap.createClient({
    url:            options.url,
    maxConnections: 10,
    bindDN:         options.bindDN,
    credentials:    options.bindCredentials  
  });

  this._client.on('error', function(e){
    console.log('LDAP connection error:', e);
  });

  this._queue = [];

  var self = this;
  this._client.bind(options.bindDN, options.bindCredentials, function(err) {
    if(err){
      return console.log("error in BIND to LDAP", err);
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
      filter: '(&(objectclass=user)(|(sAMAccountName=' + username + ')(name=' +  username + ')))' 
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