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

  annyang.start();
})();
