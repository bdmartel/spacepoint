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

function setStatus(_msg) {
  // status UI removed
}

function stripHtmlTags(s) {
  // Remove anything that looks like an HTML tag, e.g. <div>, </p>, <br/>
  return String(s).replace(/<\/?[^>]+>/g, '');
}

const saveSoon = debounce(async () => {
  const blocks = {};
  document.querySelectorAll('[data-block-id]').forEach(el => {
    // Store as plain text with \n preserved; also strip any pasted HTML tags.
    blocks[el.dataset.blockId] = stripHtmlTags(el.innerText);
  });
  await apiSaveBlocks(blocks);
  setStatus('Saved');
  setTimeout(() => setStatus(''), 1200);
}, 500);

async function main() {
  const data = await apiGetCopy();
  const blocks = (data && data.blocks) || {};

  // hydrate saved edits (plain text) while stripping any literal HTML tags
  document.querySelectorAll('[data-block-id]').forEach(el => {
    const id = el.dataset.blockId;
    if (blocks[id] != null) el.innerText = stripHtmlTags(String(blocks[id]));
  });

  // Make every block editable as plain text w/ line breaks
  document.querySelectorAll('[data-block-id]').forEach(el => {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');

    el.addEventListener('input', () => {
      setStatus('Saving…');
      saveSoon();
    });

    // No special Enter handling: Enter inserts line breaks.
    // Prevent rich paste (keep plain text)
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text);
    });

    el.addEventListener('blur', () => {
      setStatus('Saving…');
      saveSoon();
    });
  });

  setStatus('');
}

main();
