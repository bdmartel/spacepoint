async function apiGetCopy() {
  const r = await fetch('/api/copy');
  return r.json();
}

async function apiSaveBlocks(blocks) {
  await fetch('/api/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks })
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function showToolbar(target) {
  const bar = document.getElementById('wbar');
  bar.hidden = false;
  const rect = target.getBoundingClientRect();
  bar.style.top = `${window.scrollY + rect.top - 42}px`;
  bar.style.left = `${window.scrollX + rect.left}px`;
}

function hideToolbar() {
  const bar = document.getElementById('wbar');
  bar.hidden = true;
}

function cmd(command) {
  document.execCommand(command, false, null);
}

const saveSoon = debounce(async () => {
  const blocks = {};
  document.querySelectorAll('[data-block-id]').forEach(el => {
    blocks[el.dataset.blockId] = el.innerHTML;
  });
  await apiSaveBlocks(blocks);
  const s = document.getElementById('saveStatus');
  s.textContent = 'Saved';
  setTimeout(() => (s.textContent = ''), 1200);
}, 500);

async function main() {
  const data = await apiGetCopy();
  const blocks = (data && data.blocks) || {};

  // hydrate stored edits
  document.querySelectorAll('[data-block-id]').forEach(el => {
    const id = el.dataset.blockId;
    if (blocks[id] != null) el.innerHTML = blocks[id];
  });

  // editing interactions
  document.querySelectorAll('[data-block-id]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('[data-block-id][contenteditable="true"]').forEach(x => x.setAttribute('contenteditable', 'false'));
      el.setAttribute('contenteditable', 'true');
      el.classList.add('editing');
      showToolbar(el);
      placeCaretAtEnd(el);
    });

    el.addEventListener('blur', () => {
      el.setAttribute('contenteditable', 'false');
      el.classList.remove('editing');
      hideToolbar();
      saveSoon();
    });

    el.addEventListener('keydown', (e) => {
      // Enter saves and exits (Shift+Enter inserts newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
    });

    el.addEventListener('input', () => {
      const s = document.getElementById('saveStatus');
      s.textContent = 'Saving…';
      saveSoon();
    });
  });

  // toolbar buttons
  document.getElementById('bBold').addEventListener('click', () => cmd('bold'));
  document.getElementById('bItalic').addEventListener('click', () => cmd('italic'));
  document.getElementById('bLink').addEventListener('click', () => {
    const url = prompt('Link URL:');
    if (url) document.execCommand('createLink', false, url);
  });
  document.getElementById('bClear').addEventListener('click', () => cmd('removeFormat'));

  // click outside to stop editing
  document.addEventListener('click', (e) => {
    const active = document.querySelector('[data-block-id][contenteditable="true"]');
    if (!active) return;
    if (active.contains(e.target)) return;
    const bar = document.getElementById('wbar');
    if (bar.contains(e.target)) return;
    active.blur();
  });
}

main();
