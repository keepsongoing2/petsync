(function() {
  const ACTION_FETCH = 'fetch';
  const ACTION_CLOSE = 'close';
  let fetchBtn, closeBtn, statusEl;

  function init() {
    // I1: Verify existence of #ps-grid
    const gridEl = document.getElementById('ps-grid');
    if (!gridEl) console.warn('Missing #ps-grid element');

    // I2: Locate buttons by ID first, then fallback to data-ps-action
    fetchBtn = document.getElementById('ps-fetch-button') || document.querySelector('[data-ps-action="fetch"]');
    closeBtn = document.getElementById('ps-close-button') || document.querySelector('[data-ps-action="close"]');
    statusEl = document.querySelector('#ps-status');

    if (fetchBtn) {
      fetchBtn.addEventListener('click', handleFetchClick, { passive: true });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', handleCloseClick, { passive: true });
    }
  }

  function handleFetchClick() {
    disableFetchButton();
    clearStatus();
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onError)
      .fetchData();
  }

  function handleCloseClick() {
    google.script.host.close();
  }

  function disableFetchButton() {
    fetchBtn.disabled = true;
    fetchBtn.classList.add('ps-disabled', 'ps-loading');
    fetchBtn.setAttribute('aria-busy', 'true');
  }

  function enableFetchButton() {
    fetchBtn.disabled = false;
    fetchBtn.classList.remove('ps-disabled', 'ps-loading');
    fetchBtn.removeAttribute('aria-busy');
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('ps-success', 'ps-error');
    statusEl.removeAttribute('data-ps-state');
  }

  function onSuccess(result) {
    enableFetchButton();
    if (!statusEl) return;
    const message = result && result.message ? result.message : 'Data fetched successfully.';
    statusEl.textContent = message;
    statusEl.classList.add('ps-success');
    statusEl.setAttribute('data-ps-state', 'success');
  }

  function onError(error) {
    enableFetchButton();
    if (!statusEl) return;
    const message = error && error.message ? error.message : 'An error occurred.';
    statusEl.textContent = message;
    statusEl.classList.add('ps-error');
    statusEl.setAttribute('data-ps-state', 'error');
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();