/* TinyMCE inline editor wiring
   Uses CDN TinyMCE. Persists edited HTML per [data-block-id] to /api/copy.
*/

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

function setStatus(msg) {
  const s = document.getElementById('saveStatus');
  if (s) s.textContent = msg || '';
}

const saveSoon = debounce(async () => {
  const blocks = {};
  document.querySelectorAll('[data-block-id]').forEach(el => {
    blocks[el.dataset.blockId] = el.innerHTML;
  });
  await apiSaveBlocks(blocks);
  setStatus('Saved');
  setTimeout(() => setStatus(''), 1200);
}, 700);

async function main() {
  const data = await apiGetCopy();
  const blocks = (data && data.blocks) || {};

  // hydrate stored edits first
  document.querySelectorAll('[data-block-id]').forEach(el => {
    const id = el.dataset.blockId;
    if (blocks[id] != null) el.innerHTML = blocks[id];
  });

  // TinyMCE inline works best when each editable element has an id.
  // Ensure stable ids derived from data-block-id.
  document.querySelectorAll('[data-block-id]').forEach((el) => {
    if (!el.id) {
      const raw = el.dataset.blockId || 'block';
      const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, '-');
      el.id = `blk-${safe}`;
    }
  });

  // init TinyMCE inline for every block
  // NOTE: requires <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js"> in HTML
  try {
    await tinymce.init({
      selector: '[data-block-id]',
      inline: true,
      menubar: false,
      branding: false,
      statusbar: false,
      plugins: 'link lists',
      toolbar: 'bold italic | bullist numlist | link | removeformat | undo redo',
      // Make the UI visible on dark backgrounds
      skin: 'oxide-dark',
      // Keep toolbar in a fixed, obvious place
      fixed_toolbar_container: '#tmcebar',
      toolbar_mode: 'sliding',
      // keep it light and safe-ish
      valid_elements: 'a[href|target=_blank|rel],strong/b,em/i,ul,ol,li,p,br,span',
      setup: (editor) => {
        editor.on('focus', () => setStatus(''));
        editor.on('input change undo redo', () => {
          setStatus('Saving…');
          saveSoon();
        });
        editor.on('keydown', (e) => {
          // Cmd/Ctrl+Enter: save+blur
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            editor.getElement().blur();
          }
        });
        editor.on('blur', () => {
          setStatus('Saving…');
          saveSoon();
        });
      }
    });
  } catch (e) {
    console.error('TinyMCE init failed', e);
    setStatus('TinyMCE init failed');
  }
}

main();
