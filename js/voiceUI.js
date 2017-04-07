var voiceUI = (function() {
  var dropletEl = document.querySelector('#droplet');
  var resultsEl = document.querySelector('#results');
  var microphoneShadowEl = document.querySelector('#google-microphone-shadow');
  var resultsTermEl = resultsEl.querySelector('#results-term');
  var resultsListEl = resultsEl.querySelector('#results-list');
  var resultsCloseEl = resultsEl.querySelector('#results-close');
  var results = [];

  function dropletShow() {
    dropletEl.setAttribute('aria-hidden', 'false');
  }

  function dropletHide() {
    dropletEl.setAttribute('aria-hidden', 'true');
  }

  function resultsShow() {
    resultsEl.setAttribute('aria-hidden', 'false');
  }

  function resultsHide() {
    resultsEl.setAttribute('aria-hidden', 'true');
  }

  function listenStart() {
    microphoneShadowEl.classList.add('listening');
  }

  function listenStop() {
    microphoneShadowEl.classList.remove('listening');
  }

  function resultsUpdate(newResults) {
    results = newResults || [];
    var newItemHTML = '';
    newResults.map(function(itemObject, itemListIndex) {
      newItemHTML += resultsItemHTML(itemObject, itemListIndex);
    });
    resultsListEl.innerHTML = newItemHTML;
    return newItemHTML;
  }

  function resultsClear() {
    var newResults = [];
    resultsUpdate(newResults);
  }

  function resultsItemHTML(value) {
    return `
      <li id="result-${value.id}">
        <a href="${value.url}">${value.name}</a>
      </li>
    `;
  }

  function resultsInsert(newItem) {
    results = [];
    var newItemHTML = resultsItemHTML(newItem);
    resultsListEl.innerHTML = newItemHTML;
    return newItemHTML;
  }

  function getSearchResults(searchTerm) {
    // TODO: This should return an array of objects from an XHR call to a JSON API endpoint, or the results matched by a voice-recognition command), etc.
    return [{
        id: 1,
        name: 'Result one',
        url: 'http://example.com/?id=1'
      },
      {
        id: 2,
        name: 'Result two',
        url: 'http://example.com/?id=2'
      },
      {
        id: 3,
        name: 'Result one',
        url: 'http://example.com/?id=1'
      },
    ];
  }

  // dropletEl.addEventListener('click', function() {
  //   dropletHide();
  // });

  var searchTerm = 'penguins'; // TODO: This should come from the query-string parameter in the URL, for example.

  function updateSearchBox(voiceQuery, results) {
    resultsTermEl.textContent = voiceQuery;
    resultsUpdate(newResults);
  };

  if (dropletEl && resultsEl && resultsListEl) {
    dropletEl.addEventListener('click', function(evt) {
      evt.preventDefault();
      var newResults = getSearchResults(searchTerm);
      resultsTermEl.textContent = searchTerm;
      resultsUpdate(newResults);
      resultsShow();
    });

    dropletShow();

    resultsCloseEl.addEventListener('click', function(evt) {
      resultsHide();
      dropletShow();
    });

    window.addEventListener('keyup', function(evt) {
      if (evt.target === document.body && evt.keyCode === 27) {
        // The `Esc` key was pressed.
      }

      resultsHide();
      dropletShow();
    });
  };

  function addEpInfo(epInfo) {
    resultsTermEl.textContent = epInfo['voiceCommand'];
    var newItemHTML = '';

    var poster = `<li>
      <img src="${epInfo.poster}">
    </li>`;

    var title = `<li> ${epInfo.title} </li>`;
    var epMeta = `<li> ${epInfo.first_aired}, S${epInfo.season}E${epInfo.episode}, ${epInfo.runtime}  </li>`;
    var epTitle = `<li> ${epInfo.ep_title} </li>`;
    var epDescription = `<li> ${epInfo.overview} </li>`;

    resultsListEl.innerHTML = poster + title + epMeta + epTitle + epDescription;
    resultsShow();
  }
  
  function addMovieInfo(info) {
    resultsTermEl.textContent = info['voiceCommand'];

    var poster = `<li>
      <img src="${info.poster}">
    </li>`;

    var title = `<li> ${info.title} </li>`;
    var meta = `<li> Year: ${info.year}, Runtime: ${info.runtime}  </li>`;
    var plot = `<li> ${info.plot} </li>`;

    resultsListEl.innerHTML = poster + title + meta + plot;
    resultsShow();
  }

  return {
    dropletShow: dropletShow,
    dropletHide: dropletHide,
    resultsShow: resultsShow,
    resultsHide: resultsHide,
    resultsUpdate: resultsUpdate,
    resultsClear: resultsClear,
    addEpInfo: addEpInfo,
    addMovieInfo: addMovieInfo,
    listenStop: listenStop,
    listenStart: listenStart
  };
}());

var isPaused = true;
var microphoneEl = document.querySelector('#google-microphone');
microphoneEl.addEventListener('click', function () {
  if (isPaused) {
    annyang.resume();
    voiceUI.listenStart();
    isPaused = false;
  } else {
    annyang.pause();
    voiceUI.listenStop();
    voiceUI.resultsHide();
    isPaused = true;
  }
});
