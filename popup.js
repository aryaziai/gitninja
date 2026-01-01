const noteEl = document.getElementById('note');
const saveBtn = document.getElementById('save');
const clearBtn = document.getElementById('clear');
const statusEl = document.getElementById('status');

function setStatus(msg, timeout = 1500) {
  statusEl.textContent = msg;
  setTimeout(() => (statusEl.textContent = 'Stored locally using chrome.storage'), timeout);
}

// Load saved note
chrome.storage.local.get(['quickNote'], (res) => {
  if (res.quickNote) noteEl.value = res.quickNote;
});

saveBtn.addEventListener('click', () => {
  chrome.storage.local.set({ quickNote: noteEl.value }, () => {
    setStatus('Saved ✅');
  });
});

clearBtn.addEventListener('click', () => {
  noteEl.value = '';
  chrome.storage.local.remove('quickNote', () => {
    setStatus('Cleared');
  });
});
