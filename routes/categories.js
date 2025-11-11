const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const db = getDatabase();

// Ping endpoint - bağlantı testi
router.get('/ping', (req, res) => {
  res.json({ message: 'Categories API çalışıyor', timestamp: new Date().toISOString() });
});

// Kategorileri listele (GET /)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('❌ Kategoriler listeleme hatası:', err.message);
    res.status(500).json({ error: 'Kategoriler listelenemedi', message: err.message });
  }
});

// Yeni kategori oluştur (POST /)
router.post('/', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Kategori adı ve tipi zorunludur', required: ['name', 'type'] });
  }
  if (!['gelir', 'gider'].includes(type)) {
    return res.status(400).json({ error: 'Kategori tipi sadece gelir (gelir) veya gider (gider) olabilir' });
  }
  try {
    const stmt = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    const info = stmt.run(name.trim(), type);
    res.status(201).json({ success: true, message: 'Kategori başarıyla oluşturuldu', data: { id: info.lastInsertRowid, name: name.trim(), type } });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bu kategori adı zaten mevcut' });
    }
    console.error('❌ Kategori oluşturma hatası:', err.message);
    res.status(500).json({ error: 'Kategori oluşturulamadı', message: err.message });
  }
});

// Kategori güncelle (PUT /:id)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  if (!id || isNaN(parseInt(id))) { return res.status(400).json({ error: 'Geçersiz kategori ID' }); }
  if (!name || !type) { return res.status(400).json({ error: 'Kategori adı ve tipi zorunludur', required: ['name','type'] }); }
  if (!['gelir','gider'].includes(type)) { return res.status(400).json({ error: 'Kategori tipi geçersiz (gelir/gider)' }); }
  try {
    const info = db.prepare('UPDATE categories SET name = ?, type = ?, updated_at = datetime("now") WHERE id = ?').run(name.trim(), type, parseInt(id));
    if (info.changes === 0) return res.status(404).json({ error: 'Kategori bulunamadı' });
    res.json({ success: true, message: 'Kategori başarıyla güncellendi', data: { id: parseInt(id), name: name.trim(), type } });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') { return res.status(409).json({ error: 'Bu kategori adı zaten mevcut' }); }
    console.error('❌ Kategori güncelleme hatası:', err.message);
    res.status(500).json({ error: 'Kategori güncellenemedi', message: err.message });
  }
});

// Kategori sil (DELETE /:id)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) { return res.status(400).json({ error: 'Geçersiz kategori ID' }); }
  try {
    const row = db.prepare('SELECT id,name FROM categories WHERE id = ?').get(parseInt(id));
    if (!row) return res.status(404).json({ error: 'Kategori bulunamadı' });
    const cnt = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(parseInt(id));
    if (cnt.count > 0) return res.status(409).json({ error: 'Bu kategoriye ait işlemler mevcut, kategori silinemez', relatedTransactions: cnt.count });
    db.prepare('DELETE FROM categories WHERE id = ?').run(parseInt(id));
    res.json({ success: true, message: 'Kategori başarıyla silindi', deletedCategory: { id: parseInt(id), name: row.name } });
  } catch (err) {
    console.error('❌ Kategori silme hatası:', err.message);
    res.status(500).json({ error: 'Kategori silinemedi', message: err.message });
  }
});

module.exports = router;