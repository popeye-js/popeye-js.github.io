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

  var API_DEV = 'http://localhost:7001/';
  var API_PROD = 'https://popeye-api.herokuapp.com/';
  var API = IS_PROD ? API_PROD : API_DEV;

  var urls = {
    putIO: {
      base: 'https://api.put.io/v2'
    },
    popeyeAPI: {
      latestEpisode: API_DEV + 'latestEpisode?show='
    }
  };

  // Generate the URL for the user to log in to Put.io and get redirected back to this page.
  var redirectUri = encodeURIComponent(window.location.href);
  var nextUri = encodeURIComponent(`${urls.putIO.base}/oauth2/authenticate?client_id=2801&response_type=token&redirect_uri=${redirectUri}`);
  urls.putIO.login = `${urls.putIO.base}/oauth2/login?next=${nextUri}`;

  // urls.putIO.filesList = `${urls.putIO.base}/files/list?parent_id=0&oauth_token=${hash.access_token}`;
  urls.putIO.transfersAdd = `${urls.putIO.base}/transfers/add?oauth_token=${hash.access_token}`;

  var logInBtn = document.querySelector('#log-in-btn');
  if (logInBtn) {
    logInBtn.setAttribute('href', urls.putIO.login);
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
      show = encodeURI(show);
      logCommand('Latest show: ' + show);

      var fetchEp = function () {
        return xhr({
          method: 'get',
          url: urls.popeyeAPI.latestEpisode + show
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
          url: urls.putIO.transfersAdd,
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
          url: `${urls.putIO.base}/transfers/${id}?oauth_token=${hash.access_token}`
        }).then(function (data) {
          data = JSON.parse(data);
          return data.transfer.file_id;
        });
      }

      var getFile = function (fileId) {
        return xhr({
          method: 'get',
          url: `${urls.putIO.base}/files/${fileId}?oauth_token=${hash.access_token}`
        }).then(function (data) {
          data = JSON.parse(data);
          var player = videojs('results-video');
          if (data.file.file_type == "VIDEO") {
            player.src(`${urls.putIO.base}/files/${fileId}/mp4/download?oauth_token=${hash.access_token}`);
            player.poster(data.file.screenshot);
          } 
          // TEMP fix, often times the video file's id in a folder is incremented by 1
          // ideally we need to get the folder contents but api does not clarify. 
          else if(data.file.file_type == "FOLDER"){
              fileId = parseInt(fileId) + 1;
              player.src(`${urls.putIO.base}/files/${fileId}/mp4/download?oauth_token=${hash.access_token}`);
              player.poster(data.file.screenshot);
          }

          return data;
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
