const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

// Ping endpoint - bağlantı testi
router.get('/ping', (req, res) => {
  res.json({ message: 'Categories API çalışıyor', timestamp: new Date().toISOString() });
});

// Kategorileri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, kategori_adi, tur, aciklama, olusturma_tarihi, guncelleme_tarihi')
      .order('tur')
      .order('kategori_adi');
    
    if (error) throw error;
    
    // API uyumluluğu için field isimlerini dönüştür
    const rows = data.map(row => ({
      id: row.id,
      name: row.kategori_adi,
      type: row.tur,
      description: row.aciklama,
      created_at: row.olusturma_tarihi,
      updated_at: row.guncelleme_tarihi
    }));
    
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('❌ Kategoriler listeleme hatası:', err.message);
    res.status(500).json({ error: 'Kategoriler listelenemedi', message: err.message });
  }
});

// Yeni kategori oluştur (POST /)
router.post('/', async (req, res) => {
  const { name, type, description } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Kategori adı ve tipi zorunludur', required: ['name', 'type'] });
  }
  if (!['gelir', 'gider'].includes(type)) {
    return res.status(400).json({ error: 'Kategori tipi sadece gelir veya gider olabilir' });
  }
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        kategori_adi: name.trim(),
        tur: type,
        aciklama: description || null
      })
      .select('id, kategori_adi, tur, aciklama')
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Bu kategori adı zaten mevcut' });
      }
      throw error;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Kategori başarıyla oluşturuldu', 
      data: { 
        id: data.id, 
        name: data.kategori_adi, 
        type: data.tur,
        description: data.aciklama
      } 
    });
  } catch (err) {
    console.error('❌ Kategori oluşturma hatası:', err.message);
    res.status(500).json({ error: 'Kategori oluşturulamadı', message: err.message });
  }
});

// Kategori güncelle (PUT /:id)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, description } = req.body;
  if (!id || isNaN(parseInt(id))) { return res.status(400).json({ error: 'Geçersiz kategori ID' }); }
  if (!name || !type) { return res.status(400).json({ error: 'Kategori adı ve tipi zorunludur', required: ['name','type'] }); }
  if (!['gelir','gider'].includes(type)) { return res.status(400).json({ error: 'Kategori tipi geçersiz (gelir/gider)' }); }
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        kategori_adi: name.trim(),
        tur: type,
        aciklama: description || null,
        guncelleme_tarihi: new Date().toISOString()
      })
      .eq('id', parseInt(id))
      .select('id, kategori_adi, tur, aciklama')
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Bu kategori adı zaten mevcut' });
      }
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Kategori bulunamadı' });
      }
      throw error;
    }
    
    res.json({ 
      success: true, 
      message: 'Kategori başarıyla güncellendi', 
      data: { 
        id: data.id, 
        name: data.kategori_adi, 
        type: data.tur,
        description: data.aciklama
      } 
    });
  } catch (err) {
    console.error('❌ Kategori güncelleme hatası:', err.message);
    res.status(500).json({ error: 'Kategori güncellenemedi', message: err.message });
  }
});

// Kategori sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) { return res.status(400).json({ error: 'Geçersiz kategori ID' }); }
  try {
    // Kategori var mı kontrol et
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('id, kategori_adi')
      .eq('id', parseInt(id))
      .single();
    
    if (fetchError || !category) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    
    // İlişkili işlem var mı kontrol et
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('kategori_id', parseInt(id));
    
    if (countError) throw countError;
    
    if (count > 0) {
      return res.status(409).json({ 
        error: 'Bu kategoriye ait işlemler mevcut, kategori silinemez', 
        relatedTransactions: count 
      });
    }
    
    // Kategoriyi sil
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', parseInt(id));
    
    if (deleteError) throw deleteError;
    
    res.json({ 
      success: true, 
      message: 'Kategori başarıyla silindi', 
      deletedCategory: { id: parseInt(id), name: category.kategori_adi } 
    });
  } catch (err) {
    console.error('❌ Kategori silme hatası:', err.message);
    res.status(500).json({ error: 'Kategori silinemedi', message: err.message });
  }
});

module.exports = router;