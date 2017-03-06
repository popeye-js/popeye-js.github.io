/* global annyang */

(function () {
  function xhr (opts) {
    if (typeof opts === 'string') {
      opts = {url: opts};
    }
    opts = opts || {};
    opts.method = opts.method || 'get';
    if (typeof opts.data === 'object') {
      opts.data = JSON.stringify(opts.data);
    }
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(opts.method, opts.url, 'true');
      xhr.addEventListener('load', function () {
        resolve(xhr.responseText);
      });
      xhr.addEventListener('error', reject);
      xhr.send(opts.data);
    });
  }

  var commandLogs = document.querySelector('#command-logs');

  function logCommand (cmd) {
    console.log(cmd);
    var li = document.createElement('li');
    li.textContent = cmd;
    commandLogs.appendChild(li);
  }

  if (!annyang) {
    throw new Error('Could not find `annyang` library');
  }

  var commands = {
    'download *type': function (type) {
      logCommand(`download ${type}`);
      // var url = `http://api.flickr.com/services/rest/?tags=${type}`;
      // xhr({
      //   method: 'get',
      //   url: url
      // }).then(function (download) {
      //   console.log('download', download);
      //   logCommand(download);
      // });
    }
  };

  annyang.addCommands(commands);

  // var oauthURL = 'https://api.put.io/v2/oauth2/authenticate' +
  //   '?client_id=2801' +
  //   '&response_type=token' +
  //   '&redirect_uri=http://localhost:7000/';
  //

  var hash = (function(a) {
      if (a == "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i)
      {
          var p=a[i].split('=', 2);
          if (p.length == 1)
              b[p[0]] = "";
          else
              b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
  })(window.location.hash.substr(1).split('&'));

    xhr({url: 'https://api.put.io/v2/files/list?parent_id=0&oauth_token=' + hash.access_token , method: 'get'}).then(function (data) {
      JSON.parse(data).files.forEach(function(file){
        logCommand(file.name);
      });
    });

  annyang.start();
})();
