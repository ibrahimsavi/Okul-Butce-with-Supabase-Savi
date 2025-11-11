const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Data klasörünü oluştur
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Veritabanı dosyası yolu
const dbPath = path.join(dataDir, 'okul.db');

// SQLite bağlantısını oluştur
let db;
try {
  db = new Database(dbPath);
  console.log('✅ SQLite (better-sqlite3) veritabanına bağlandı:', dbPath);
} catch (err) {
  console.error('❌ Veritabanı bağlantı hatası:', err.message);
}

// Ortak yardımcı: tabloya eksik sütun ekle (varsa atla)
function ensureColumns(tableName, columns) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const existing = rows.map(r => r.name);
  const toAdd = columns.filter(c => !existing.includes(c.name));
  toAdd.forEach(col => {
    try {
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.def}`).run();
    } catch (e) {
      console.warn(`⚠️ ${tableName}.${col.name} eklenemedi: ${e.message}`);
    }
  });
}

// Veritabanı şemasını başlat / migrate et
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Yeni hedef şema (UI + router beklentileriyle uyumlu)
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('gelir','gider')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`;

    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('gelir','gider')),
        amount REAL NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        transaction_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      )`;

    const createStudentsTable = `
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        student_number TEXT UNIQUE,
        class_name TEXT NOT NULL,
        section TEXT,
        parent_name TEXT,
        parent_phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`;

    const createStudentFeesTable = `
      CREATE TABLE IF NOT EXISTS student_fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
      )`;

    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_id INTEGER NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','bank_transfer','credit_card','check')),
        receipt_number TEXT,
        notes TEXT,
        transaction_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (fee_id) REFERENCES student_fees (id) ON DELETE CASCADE,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE SET NULL
      )`;

    try {
      db.pragma('foreign_keys = ON');
      db.prepare(createCategoriesTable).run();
      db.prepare(createTransactionsTable).run();
      db.prepare(createStudentsTable).run();
      db.prepare(createStudentFeesTable).run();
      db.prepare(createPaymentsTable).run();

      // Eski şemadan gelen tabloları migrate et (eksik kolonları ekle)
      ensureColumns('categories', [
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', def: "TEXT DEFAULT (datetime('now'))" }
      ]);
      ensureColumns('transactions', [
        { name: 'transaction_date', def: 'TEXT' },
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', def: "TEXT DEFAULT (datetime('now'))" }
      ]);
      ensureColumns('students', [
        { name: 'class_name', def: 'TEXT' },
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', def: "TEXT DEFAULT (datetime('now'))" }
      ]);
      ensureColumns('student_fees', [
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', def: "TEXT DEFAULT (datetime('now'))" }
      ]);
      ensureColumns('payments', [
        { name: 'payment_method', def: 'TEXT' },
        { name: 'receipt_number', def: 'TEXT' },
        { name: 'notes', def: 'TEXT' },
        { name: 'transaction_id', def: 'INTEGER' },
        { name: 'created_at', def: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', def: "TEXT DEFAULT (datetime('now'))" }
      ]);

      insertDefaultCategories();
      console.log('📊 Şema oluşturma / migration tamamlandı');
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

// Varsayılan kategoriler ekle (Türkçe tür isimleriyle)
function insertDefaultCategories() {
  const defaults = [
    { name: 'Maaş', type: 'gelir' },
    { name: 'Aidat Geliri', type: 'gelir' },
    { name: 'Kantin Satışları', type: 'gelir' },
    { name: 'Market Alışverişi', type: 'gider' },
    { name: 'Faturalar', type: 'gider' },
    { name: 'Kırtasiye', type: 'gider' }
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)');
  const trx = db.transaction((rows) => {
    rows.forEach(d => stmt.run(d.name, d.type));
  });
  trx(defaults);
}

function getDatabase() { return db; }

module.exports = { db, getDatabase, initializeDatabase };