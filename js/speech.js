/* global annyang */

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

  if (hash && hash.ACCESS_TOKEN) {
    localStorage.putioAccessToken = hash.ACCESS_TOKEN;
    window.location.href = '/';
    return;
  }

  var ACCESS_TOKEN = localStorage.putioAccessToken || hash.ACCESS_TOKEN;

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
  URLS.putio.login = `${URLS.putio.base}/oauth2/login?next=${encodeURIComponent(`${URLS.putio.base}/oauth2/authenticate?client_id=2801&response_type=token&redirect_uri=${encodeURIComponent(window.location.href)}`)}`;
  URLS.putio.redirect = `${URLS.server.base}/putio/authenticate/redirect`;
  URLS.putio.oauthBase = `${URLS.putio.base}/oauth2`;
  URLS.putio.transfersAdd = `${URLS.putio.base}/transfers/add?oauth_token=${ACCESS_TOKEN}`;
  URLs.putio.transfersGet = `${urls.putIO.base}/transfers/${id}?oauth_token=${ACCESS_TOKEN}`;

  var logInBtn = document.querySelector('#log-in-btn');
  if (logInBtn) {
    logInBtn.setAttribute('href', URLS.putio.login);
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
      }

      var getFile = function (fileId) {
        return xhr({
          method: 'get',
          url: `${urls.putIO.base}/files/${fileId}?oauth_token=${ACCESS_TOKEN}`
        }).then(function (data) {
          data = JSON.parse(data);

          var player = videojs('results-video');
          if (data.file.file_type === 'VIDEO') {
            player.src(`${urls.putIO.base}/files/${fileId}/stream?oauth_token=${ACCESS+TOKEN}`);
            player.poster(data.file.screenshot);
          }
          // TEMP fix, often times the video file's id in a folder is incremented by 1
          // ideally we need to get the folder contents but api does not clarify. 
          else if (data.file.file_type === 'FOLDER') {
            fileId = parseInt(fileId) + 1;
            player.src(`${urls.putIO.base}/files/${fileId}/stream?oauth_token=${ACCESS_TOKEN}`);
            // player.poster(data.file.screenshot); screenshot does not exist on folder
            // need to make a request on the video file to get screenshot
          }

          return data.file.file_type;
        });
      }

      var reportProblems = function (fault) {
        console.error(fault);
      };

      fetchEp().then(displayEp).then(addTransfer).then(getTransfer).then(getFile).catch(reportProblems);
    }
  };

  annyang.addCommands(speechCommands);

  annyang.start();
  annyang.pause();
})();
