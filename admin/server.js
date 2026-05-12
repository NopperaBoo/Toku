const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(ROOT));

const PAGES = [
  { category: 'chakras', id: 'muladhara', label: 'მულადჰარა', type: 'chakra' },
  { category: 'chakras', id: 'svadshistana', label: 'სვადჰისტანა', type: 'chakra' },
  { category: 'chakras', id: 'manipura', label: 'მანიპურა', type: 'chakra' },
  { category: 'chakras', id: 'anahata', label: 'ანაჰატა', type: 'chakra' },
  { category: 'chakras', id: 'vishudha', label: 'ვიშუდჰა', type: 'chakra' },
  { category: 'chakras', id: 'ajna', label: 'აჯნა', type: 'chakra' },
  { category: 'chakras', id: 'sahasrara', label: 'საჰასრარა', type: 'chakra' },
  { category: 'zodiac', id: 'aries', label: 'ვერძი', type: 'zodiac' },
  { category: 'zodiac', id: 'taurus', label: 'კურო', type: 'zodiac' },
  { category: 'zodiac', id: 'gemini', label: 'ტყუპები', type: 'zodiac' },
  { category: 'zodiac', id: 'cancer', label: 'კირჩხიბი', type: 'zodiac' },
  { category: 'zodiac', id: 'leo', label: 'ლომი', type: 'zodiac' },
  { category: 'zodiac', id: 'virgo', label: 'ქალწული', type: 'zodiac' },
  { category: 'zodiac', id: 'libra', label: 'სასწორი', type: 'zodiac' },
  { category: 'zodiac', id: 'scorpio', label: 'მორიელი', type: 'zodiac' },
  { category: 'zodiac', id: 'sagittarius', label: 'მშვილდოსანი', type: 'zodiac' },
  { category: 'zodiac', id: 'capricorn', label: 'თხის რქა', type: 'zodiac', folder: 'capricornus' },
  { category: 'zodiac', id: 'aquarius', label: 'მერწყული', type: 'zodiac' },
  { category: 'zodiac', id: 'pisces', label: 'თევზები', type: 'zodiac' },
  { category: 'planets', id: 'sun', label: 'მზე', type: 'planet' },
  { category: 'planets', id: 'moon', label: 'მთვარე', type: 'planet' },
  { category: 'planets', id: 'mercury', label: 'მერკური', type: 'planet' },
  { category: 'planets', id: 'venus', label: 'ვენერა', type: 'planet' },
  { category: 'planets', id: 'mars', label: 'მარსი', type: 'planet' },
  { category: 'planets', id: 'jupiter', label: 'იუპიტერი', type: 'planet' },
  { category: 'planets', id: 'saturn', label: 'სატურნი', type: 'planet' },
  { category: 'planets', id: 'lilit', label: 'ლილიტი', type: 'planet' },
  { category: 'elements', id: 'earth', label: 'მიწა', type: 'element' },
  { category: 'elements', id: 'fire', label: 'ცეცხლი', type: 'element' },
  { category: 'elements', id: 'water', label: 'წყალი', type: 'element' },
  { category: 'elements', id: 'wind', label: 'ჰაერი', type: 'element' },
  { category: 'wishes', id: 'sikvaruli', label: 'სიყვარული', type: 'wish' },
  { category: 'wishes', id: 'janmrteloba', label: 'ჯანმრთელობა', type: 'wish' },
  { category: 'wishes', id: 'baraqa', label: 'ბარაქა', type: 'wish' },
  { category: 'wishes', id: 'dzala', label: 'ძალა', type: 'wish' },
  { category: 'wishes', id: 'mimzidveloba', label: 'მიმზიდველობა', type: 'wish' },
  { category: 'wishes', id: 'warmateba', label: 'წარმატება', type: 'wish' },
  { category: 'home', id: 'home', label: 'მთავარი გვერდი', type: 'home' },
  { category: 'global', id: 'global', label: 'გლობალური', type: 'global' },
  {
    category: 'categories',
    id: 'crystals',
    label: 'კრისტალები',
    type: 'items-page',
    imgDir: 'crystals',
  },
  {
    category: 'categories',
    id: 'aromas',
    label: 'არომათერაპია',
    type: 'items-page',
    imgDir: 'aromas',
  },
  {
    category: 'categories',
    id: 'accessories',
    label: 'აქსესუარები',
    type: 'items-page',
    imgDir: 'accessories',
  },
  { category: 'categories', id: 'tarots', label: 'ტარო', type: 'items-page', imgDir: 'tarots' },
];

function safeContentPath(category, id) {
  const filePath = path.resolve(CONTENT_DIR, category, `${id}.json`);
  if (
    !filePath.startsWith(CONTENT_DIR + path.sep) &&
    filePath !==
      path.resolve(CONTENT_DIR, 'global', 'global.json').replace('global\\global', 'global')
  ) {
    return null;
  }
  return filePath;
}

app.get('/api/pages', (req, res) => res.json(PAGES));

// List images in a folder
const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);
app.get('/api/images', (req, res) => {
  const dir = path.resolve(ROOT, 'img', (req.query.category || '').replace(/[^a-z0-9_-]/gi, ''));
  if (!dir.startsWith(path.join(ROOT, 'img'))) return res.status(403).json([]);
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).filter((f) => IMG_EXTS.has(path.extname(f).toLowerCase()));
  res.json(files);
});

app.get('/api/image-folders', (req, res) => {
  const imgDir = path.join(ROOT, 'img');
  if (!fs.existsSync(imgDir)) return res.json([]);
  const folders = fs
    .readdirSync(imgDir)
    .filter((f) => fs.statSync(path.join(imgDir, f)).isDirectory());
  res.json(folders);
});

app.get('/api/content/:category/:id', (req, res) => {
  const filePath = path.resolve(CONTENT_DIR, req.params.category, `${req.params.id}.json`);
  if (!filePath.startsWith(CONTENT_DIR)) return res.status(403).json({ error: 'Forbidden' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
});

app.post('/api/content/:category/:id', (req, res) => {
  const filePath = path.resolve(CONTENT_DIR, req.params.category, `${req.params.id}.json`);
  if (!filePath.startsWith(CONTENT_DIR)) return res.status(403).json({ error: 'Forbidden' });
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cat = (req.body.category || 'uploads').replace(/[^a-z]/g, '');
    const dir = path.join(ROOT, 'img', cat);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

app.post(
  '/api/upload',
  multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('image'),
  (req, res) => {
    const cat = (req.body.category || 'uploads').replace(/[^a-z]/g, '');
    res.json({ path: `/img/${cat}/${req.file.filename}` });
  }
);

app.listen(PORT, () => {
  console.log('\n  Toku Admin Panel\n');
  console.log(`  Admin: http://localhost:${PORT}/admin/`);
  console.log(`  Site:  http://localhost:${PORT}/\n`);
});
