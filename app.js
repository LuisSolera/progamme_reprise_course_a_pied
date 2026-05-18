(function () {
  const STORAGE_PREFIX = 'fractionne-i-checklist:';
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-id]'));
  const weekCounters = document.querySelectorAll('[data-week-count]');
  const globalProgressEl = document.getElementById('global-progress');
  const resetBtn = document.getElementById('reset');

  checkboxes.forEach(cb => {
    const key = STORAGE_PREFIX + cb.dataset.id;
    if (localStorage.getItem(key) === '1') {
      cb.checked = true;
    }
    cb.addEventListener('change', () => {
      if (cb.checked) {
        localStorage.setItem(key, '1');
      } else {
        localStorage.removeItem(key);
      }
      updateCounters();
    });
  });

  function updateCounters() {
    weekCounters.forEach(span => {
      const week = span.getAttribute('data-week-count');
      const weekBoxes = checkboxes.filter(cb => cb.dataset.id.startsWith('w' + week));
      const done = weekBoxes.filter(cb => cb.checked).length;
      span.textContent = done + ' / ' + weekBoxes.length;
    });
    const doneGlobal = checkboxes.filter(cb => cb.checked).length;
    globalProgressEl.textContent = doneGlobal + ' / ' + checkboxes.length + ' séances complétées au total.';
  }

  resetBtn.addEventListener('click', () => {
    if (!confirm('Effacer toutes les coches du programme ?')) return;
    checkboxes.forEach(cb => {
      cb.checked = false;
      localStorage.removeItem(STORAGE_PREFIX + cb.dataset.id);
    });
    updateCounters();
  });

  updateCounters();
})();
