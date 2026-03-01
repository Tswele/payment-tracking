import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = path.join(__dirname, 'data');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const EXPECTED_FILE = path.join(DATA_DIR, 'expected.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DEFAULT_MEMBERS = [
  'Zenzele', 'Zethembe', 'Seni', 'Tswele', 'Ntuthuko', 'Njabulo', 'Nduna', 'Mandi', 'Tuswa', 'Nhlanhla',
  'Ankel Sakhile', 'Miste', 'Ankel Zwile', 'Mlu', 'Ankel Mase', 'Ankel Manana', "Ankel S'fiso", 'Mzala Kalabo',
  'Menzi', "S'phe", 'Phelele', 'Ankel Meluswa', 'Lindani', 'Malume Mzo', 'Sphetho', 'Celumusa', 'Mzala Maplay',
  'Mhlengi', 'Ankel Sbu', "S'bo", 'Bhuti Sibongiseni', 'Mbuso', 'Nduduzo',
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function readPayments() {
  return readJson(PAYMENTS_FILE, []);
}

function writePayments(payments) {
  writeJson(PAYMENTS_FILE, payments);
}

function readMembers() {
  const data = readJson(MEMBERS_FILE, []);
  if (data.length === 0) {
    const members = DEFAULT_MEMBERS.map((name, i) => ({ id: String(i + 1), name }));
    writeJson(MEMBERS_FILE, members);
    return members;
  }
  return data;
}

function readExpected() {
  return readJson(EXPECTED_FILE, {});
}

function writeExpected(expected) {
  writeJson(EXPECTED_FILE, expected);
}

function getExpectedForMonth(monthKey) {
  const expected = readExpected();
  if (expected[monthKey] != null) return Number(expected[monthKey]);
  return 2550;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(file.originalname);
    if (allowed) cb(null, true);
    else cb(new Error('Only images and PDFs are allowed'));
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ——— Members ———
app.get('/api/members', (req, res) => {
  res.json(readMembers());
});

app.post('/api/members', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const members = readMembers();
  const newMember = { id: uuidv4(), name: String(name).trim() };
  members.push(newMember);
  writeJson(MEMBERS_FILE, members);
  res.status(201).json(newMember);
});

// ——— Expected per month (for Totals / Outstanding) ———
app.get('/api/expected', (req, res) => {
  res.json(readExpected());
});

app.put('/api/expected', (req, res) => {
  const body = req.body || {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Expected body: object of month keys (YYYY-MM) to amount' });
  }
  const expected = {};
  for (const [key, value] of Object.entries(body)) {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 0) expected[key] = n;
  }
  writeExpected(expected);
  res.json(readExpected());
});

// ——— Payments (one per member + month; upload updates that cell) ———
app.get('/api/payments', (req, res) => {
  res.json(readPayments());
});

app.post('/api/payments', upload.single('proof'), (req, res) => {
  try {
    const { name, month, amount, winner } = req.body || {};
    if (!req.file) {
      return res.status(400).json({ error: 'Proof of payment file is required' });
    }
    const memberName = name ? String(name).trim() : '';
    const monthKey = month ? String(month).trim() : '';
    if (!memberName || !monthKey) {
      return res.status(400).json({ error: 'Name and Month are required' });
    }
    const members = readMembers();
    const memberNameLower = memberName.toLowerCase();
    const exists = members.some((m) => m && typeof m.name === 'string' && m.name.toLowerCase() === memberNameLower);
    if (!exists) {
      return res.status(400).json({ error: `"${memberName}" is not in the members list` });
    }
    const amountNum = amount !== '' && amount != null ? parseFloat(String(amount).replace(/[^0-9.-]/g, '')) : 0;
    const isWinner = winner === 'true' || winner === true;

    const payments = readPayments();
    const idx = payments.findIndex(
      (p) => p && typeof p.memberName === 'string' && p.memberName.toLowerCase() === memberNameLower && p.month === monthKey
    );
    const record = {
      id: idx >= 0 ? payments[idx].id : uuidv4(),
      memberName,
      month: monthKey,
      amount: Number.isNaN(amountNum) ? 0 : amountNum,
      winner: !!isWinner,
      proofFilename: req.file.filename,
      proofOriginalName: req.file.originalname,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      payments[idx] = record;
    } else {
      payments.push(record);
    }
    writePayments(payments);
    res.status(idx >= 0 ? 200 : 201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save payment' });
  }
});

// ——— Production: serve built frontend so one URL serves app + API ———
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Payment tracking API running at http://localhost:${PORT}`);
});
