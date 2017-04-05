/* global annyang, videojs, voiceUI */

(function () {
  var hash = (function (a) {
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

  if (!('localStorage' in window)) {
    console.error('`localStorage` is required');
  }

  if (hash && hash.access_token) {
    localStorage.putioAccessToken = hash.access_token;
    window.location.href = window.location.pathname + window.location.search;  // Redirect to the same URL but without the hash this time.
    return;
  }

  var ACCESS_TOKEN = localStorage.putioAccessToken;
  var IS_LOGGED_IN = !!ACCESS_TOKEN;

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
      Object.keys(opts.data).forEach(function (prop) {
        formData.append(prop, opts.data[prop]);
      });
      opts.data = formData;
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

  function logCommand(cmd) {
    console.log(cmd);
    var li = document.createElement('li');
    li.textContent = cmd;
    commandLogs.appendChild(li);
  }

  var IS_PROD = !window.location.port && window.location.protocol === 'https:';

  var URLS = {
    client: {
    },
    server: {
      base: IS_PROD ? 'https://popeye-api.herokuapp.com' : 'http://localhost:7001'
    },
    putio: {
      base: 'https://api.put.io/v2'
    }
  };

  URLS.server.latestEpisode = function (id) { return URLS.server.base + `/latestEpisode?show=${id}`; };
  // login redirect is based on the URI where the login btn exists
  URLS.putio.login = `${URLS.putio.base}/oauth2/login?next=${encodeURIComponent(`${URLS.putio.base}/oauth2/authenticate?client_id=2801&response_type=token&redirect_uri=${encodeURIComponent(window.location.href)}`)}`;
  URLS.putio.redirect = `${URLS.server.base}/putio/authenticate/redirect`;
  URLS.putio.oauthBase = `${URLS.putio.base}/oauth2`;
  URLS.putio.transfersAdd = `${URLS.putio.base}/transfers/add?oauth_token=${ACCESS_TOKEN}`;
  URLS.putio.transfersGet = function (id) { return `${URLS.putio.base}/transfers/${id}?oauth_token=${ACCESS_TOKEN}`; };
  URLS.putio.filesGet = function (fileId) { return `${URLS.putio.base}/files/${fileId}?oauth_token=${ACCESS_TOKEN}`; };
  URLS.putio.filesGetStream = function (fileId) { return `${URLS.putio.base}/files/${fileId}/stream?oauth_token=${ACCESS_TOKEN}`; };
  // URLS.putio.filesGetStream = function (fileId) { return `${URLS.putio.base}/files/${fileId}/mp4/download?oauth_token=${ACCESS_TOKEN}`; };
  URLS.putio.accountInfo = `${URLS.putio.base}/account/info?oauth_token=${ACCESS_TOKEN}`;

  var logInBtn = document.querySelector('#log-in-btn');
  if (logInBtn) {
    logInBtn.setAttribute('href', URLS.putio.login);
  }

  var currUser = document.querySelector('#currUser');
  if (IS_LOGGED_IN) {
    var showUser = function () {
      logInBtn.style.display = 'none';
      currUser.style.display = '';
      currUser.innerHTML = 'Logged in as: ' + localStorage.putioUsername;
    };

    if (!!localStorage.putioUsername) {
      showUser();
    }
    else {
      xhr({
        method: 'get',
        url: URLS.putio.accountInfo
      }).then(function (data) {
        data = JSON.parse(data);
        localStorage.putioUsername = data.info.username
        showUser();
      });
    }
  }

  if (!annyang) {
    throw new Error('Could not find `annyang` library');
  }

  annyang.addCallback('soundstart', function () {
    console.log('sound detected');
  });

  annyang.addCallback('result', function () {
    console.log('sound stopped');
  });

  var speechCommands = {
    'upload (the) movie *movie': function (movie) {
      console.log(`download ${movie}`);
    },
    'upload the latest episode of *show': function (show) {
      logCommand('Latest show: ' + show);

      show = encodeURI(show);

      var fetchEp = function () {
        return xhr({
          method: 'get',
          url: URLS.server.latestEpisode(show)
        }).then(function (data) {
          data = JSON.parse(data);
          return data;
        });
      };

      var displayEp = function (data) {
        return new Promise(function (resolve, reject) {
          data.voiceCommand = 'upload the latest episode of ' + decodeURI(show);
          voiceUI.addEpInfo(data);
          voiceUI.resultsShow();
          resolve(data);
        });
      };

      var addTransfer = function (data) {
        return xhr({
          method: 'POST',
          url: URLS.putio.transfersAdd,
          data: {
            url: data.magnetLink
          }
        }).then(function (data) {
          data = JSON.parse(data);
          return data.transfer.id;
        });
      };

      var getTransfer = function (id) {
        return xhr({
          method: 'get',
          url: URLS.putio.transfersGet(id)
        }).then(function (data) {
          data = JSON.parse(data);
          return data.transfer.file_id;
        });
      };

      var getFile = function (fileId) {
        return xhr({
          method: 'get',
          url: URLS.putio.filesGet(fileId)
        }).then(function (data) {
          data = JSON.parse(data);
          var player = document.querySelector('#results-player');
          var source = document.createElement('source');
          source.setAttribute('type', 'video/mp4')

          if (data.file.file_type === 'VIDEO') {
            // player.poster(data.file.screenshot);
            source.setAttribute('src', URLS.putio.filesGetStream(fileId));
          }
          // TEMP fix, often times the video file's id in a folder is incremented by 1
          // ideally we need to get the folder contents but api does not clarify. 
          else if (data.file.file_type === 'FOLDER') {
            fileId = parseInt(fileId) + 1;
            source.setAttribute('src', URLS.putio.filesGetStream(fileId));
            // player.poster(data.file.screenshot); screenshot does not exist on folder
            // need to make a request on the video file to get screenshot
          }
          player.appendChild(source);
          return data.file.file_type;
        });
      };

      var handleErrors = function (err) {
        console.error(err);
      };

      fetchEp()
        .then(displayEp)
        .then(addTransfer)
        .then(getTransfer)
        .then(getFile)
        .catch(handleErrors);
    }
  };

  annyang.addCommands(speechCommands);

  annyang.start();
  annyang.pause();
})();
