(function () {
  'use strict';
  var id = new URLSearchParams(location.search).get('id');
  var script = document.createElement('script');
  script.src = id && /^\d+$/.test(id) ? '../js/questionnaire-api.js' : '../js/questionnaire.js';
  document.body.appendChild(script);
})();
