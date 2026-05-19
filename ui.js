const elements = {
  checkboxes: () => Array.from(document.querySelectorAll('input[type="checkbox"][data-id]')),
  weekCounters: () => document.querySelectorAll('[data-week-count]'),
  globalProgress: () => document.getElementById('global-progress'),
  resetButton: () => document.getElementById('reset'),
  authButton: () => document.getElementById('auth-btn'),
  authStatus: () => document.getElementById('auth-status')
};

function updateCounters() {
  const checkboxes = elements.checkboxes();
  elements.weekCounters().forEach(counter => {
    const week = counter.getAttribute('data-week-count');
    const weekBoxes = checkboxes.filter(box => box.dataset.id.startsWith('w' + week));
    const checkedCount = weekBoxes.filter(box => box.checked).length;
    counter.textContent = `${checkedCount} / ${weekBoxes.length}`;
  });

  const totalChecked = checkboxes.filter(box => box.checked).length;
  elements.globalProgress().textContent = `${totalChecked} / ${checkboxes.length} séances complétées au total.`;
}

function applyCheckedState(checkedSet) {
  elements.checkboxes().forEach(box => {
    box.checked = checkedSet.has(box.dataset.id);
  });
  updateCounters();
}

function clearAllCheckboxes() {
  elements.checkboxes().forEach(box => {
    box.checked = false;
  });
  updateCounters();
}

function setAuthStatus(message) {
  elements.authStatus().textContent = message;
}

function setAuthButtonLabel(label) {
  elements.authButton().textContent = label;
}

export { elements, updateCounters, applyCheckedState, clearAllCheckboxes, setAuthStatus, setAuthButtonLabel };
