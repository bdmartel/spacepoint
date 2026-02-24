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

function activeEditable() {
  return document.querySelector('[data-block-id][contenteditable="true"]');
}

function setStatus(msg) {
  const s = document.getElementById('saveStatus');
  if (!s) return;
  s.textContent = msg || '';
}

function openEditor(el) {
  document.querySelectorAll('[data-block-id][contenteditable="true"]').forEach(x => {
    x.setAttribute('contenteditable', 'false');
    x.classList.remove('editing');
  });
  el.setAttribute('contenteditable', 'true');
  el.classList.add('editing');
  el.focus();
  showToolbar();
}

function closeEditor(el) {
  el.setAttribute('contenteditable', 'false');
  el.classList.remove('editing');
  hideToolbar();
}

function showToolbar() {
  const bar = document.getElementById('wbar');
  bar.hidden = false;
}

function hideToolbar() {
  const bar = document.getElementById('wbar');
  bar.hidden = true;
}

function cmd(command, value = null) {
  const el = activeEditable();
  if (!el) return;
  el.focus();
  try {
    document.execCommand(command, false, value);
  } catch {
    // ignore
  }
}

const saveSoon = debounce(async () => {
  const blocks = {};
  document.querySelectorAll('[data-block-id]').forEach(el => {
    blocks[el.dataset.blockId] = el.innerHTML;
  });
  await apiSaveBlocks(blocks);
  setStatus('Saved');
  setTimeout(() => setStatus(''), 1200);
}, 450);

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
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditor(el);
      setStatus('');
    });

    el.addEventListener('blur', () => {
      if (el.getAttribute('contenteditable') === 'true') {
        closeEditor(el);
        saveSoon();
      }
    });

    el.addEventListener('keydown', (e) => {
      // Enter saves and exits (Shift+Enter inserts newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
      // Cmd/Ctrl+B/I
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        cmd('bold');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        cmd('italic');
      }
    });

    el.addEventListener('input', () => {
      setStatus('Saving…');
      saveSoon();
    });
  });

  // toolbar buttons
  document.getElementById('bBold').addEventListener('click', () => cmd('bold'));
  document.getElementById('bItalic').addEventListener('click', () => cmd('italic'));
  document.getElementById('bLink').addEventListener('click', () => {
    const url = prompt('Link URL:');
    if (url) cmd('createLink', url);
  });
  document.getElementById('bClear').addEventListener('click', () => cmd('removeFormat'));
  document.getElementById('bDone').addEventListener('click', () => {
    const el = activeEditable();
    if (el) el.blur();
  });

  // click outside to stop editing
  document.addEventListener('click', (e) => {
    const el = activeEditable();
    if (!el) return;
    const bar = document.getElementById('wbar');
    if (el.contains(e.target)) return;
    if (bar.contains(e.target)) return;
    el.blur();
  });

  // Esc closes without losing (still saves because we store from DOM)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const el = activeEditable();
      if (el) el.blur();
    }
  });
}

main();
