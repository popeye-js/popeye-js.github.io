/* global annyang */

(function() {
  var hash = (function(a) {
    if (a === '') {
      return {};
    }
    var b = {};
    for (var i = 0; i < a.length; ++i) {
      var p = a[i].split('=', 2);
      b[p[0]] = p.length === 1 ? '' : window.decodeURIComponent(p[1].replace(/\+/g, ' '));
    }
    return b;
  })(window.location.hash.substr(1).split('&'));

  function xhr(opts) {
    if (typeof opts === 'string') {
      opts = {
        url: opts
      };
    }
    opts = opts || {};
    opts.method = opts.method || 'get';
    if (typeof opts.data === 'object') {
      var formData = new FormData();
      for (var prop in opts.data) {
        formData.append(prop, opts.data[prop]);
      };
      opts.data = formData;
    }
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(opts.method, opts.url, 'true');
      xhr.addEventListener('load', function() {
        resolve(xhr.responseText);
      });
      xhr.addEventListener('error', reject);
      xhr.send(opts.data);
    });
  }

  var commandLogs = document.querySelector('#command-logs');

  function logCommand(cmd) {
    console.log(cmd);
    var li = document.createElement('li');
    li.textContent = cmd;
    commandLogs.appendChild(li);
  }

  var IS_PROD = !window.location.port && window.location.protocol === 'https:';

  // Generate the URL for the user to log in to Put.io and get redirected back to this page.
  var redirectUri = encodeURIComponent(window.location.href);
  var nextUri = encodeURIComponent(`https://api.put.io/v2/oauth2/authenticate?client_id=2801&response_type=token&redirect_uri=$redirectUri}`);
  var putIOLoginUri = `https://api.put.io/v2/oauth2/login?next=${nextUri}`;

  var urls = {
    putIO: {
      filesList: 'https://api.put.io/v2/files/list?parent_id=0&oauth_token=' + hash.access_token,
      transfersAdd: 'https://api.put.io/v2/transfers/add?oauth_token=' + hash.access_token,
      login: putIOLoginUri
    }
  };


  var logInBtn = document.querySelector('#log-in-btn');
  if (logInBtn) {
    logInBtn.setAttribute('href', urls.putIO.login);
  }

  xhr({
    method: 'get',
    url: urls.putIO.filesList
  }).then(function(data) {
    JSON.parse(data).files.forEach(function(file) {
      logCommand(file.name);
    });
  });

  // Test to create a transfer on put.io. Status: working code
  xhr({
    method: 'POST',
    url: urls.putIO.transfersAdd,
    data: {
      url: 'magnet:?xt=urn:btih:17e730a85fba4531b0163f53a3813826d27baa21&dn=' +
        'Little.Women.LA.S06E02.Tough.Crowd.HDTV.x264-%5BNY2%5D+-&tr=udp%3A%2F%2' +
        'Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&t' +
        'r=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fpublic.' +
        'popcorn-tracker.org%3A6969'
    }
  }).then(function(data) {
    logCommand(urls.putIO.transfersAdd);
    logCommand("source data of downloaded file: " + data);
  });

  if (!annyang) {
    throw new Error('Could not find `annyang` library');
  }

  var speechCommands = {
    'download *type': function(type) {
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

  annyang.addCommands(speechCommands);

  annyang.start();
})();
