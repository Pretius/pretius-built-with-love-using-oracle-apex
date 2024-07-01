window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data.type
  ) {
    return;
  }

  var apexEnv = document.body.getAttribute('tmp_bwl');

  chrome.runtime.sendMessage({ type: event.data.type, payload: apexEnv });
});
