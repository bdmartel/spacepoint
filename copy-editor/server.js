import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3333;
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'copy.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ blocks: {} }, null, 2));
}

function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { blocks: {} };
  }
}

function writeData(obj) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

// Serve static assets (images, client JS, etc.)
app.use('/assets', express.static(path.join(ROOT, 'assets')));
app.use('/images', express.static(path.join(ROOT, 'images')));
// TinyMCE (self-hosted from npm)
app.use('/vendor/tinymce', express.static(path.join(ROOT, 'node_modules', 'tinymce')));

// API
app.get('/api/copy', (_req, res) => {
  res.json(readData());
});

app.post('/api/copy', (req, res) => {
  const { blocks } = req.body || {};
  if (!blocks || typeof blocks !== 'object') {
    return res.status(400).json({ error: 'Expected JSON body: { blocks: { [id]: htmlString } }' });
  }

  const existing = readData();
  // merge (last write wins)
  existing.blocks = { ...(existing.blocks || {}), ...blocks };
  writeData(existing);
  res.json({ ok: true });
});

// Pages
app.get('/', (_req, res) => {
  res.type('html').send(fs.readFileSync(path.join(ROOT, 'editable.html'), 'utf8'));
});

app.get('/simple', (_req, res) => {
  res.type('html').send(fs.readFileSync(path.join(ROOT, 'editable-v2.html'), 'utf8'));
});

app.get('/tinymce', (_req, res) => {
  res.type('html').send(fs.readFileSync(path.join(ROOT, 'editable-tinymce.html'), 'utf8'));
});

app.get('/linebreaks', (_req, res) => {
  res.type('html').send(fs.readFileSync(path.join(ROOT, 'editable-linebreaks.html'), 'utf8'));
});

app.listen(PORT, () => {
  console.log(`Copy editor running: http://127.0.0.1:${PORT}`);
});
