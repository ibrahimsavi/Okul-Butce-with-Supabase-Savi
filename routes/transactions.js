const express = require('express');
const { supabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Transactions API çalışıyor', timestamp: new Date().toISOString() });
});

// İşlemleri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      type, 
      start_date, 
      end_date, 
      limit = 50, 
      offset = 0,
      search 
    } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        id, islem_turu, tutar, aciklama, islem_tarihi, olusturma_tarihi, guncelleme_tarihi,
        kategori_id,
        categories!transactions_kategori_id_fkey(id, kategori_adi, tur)
      `, { count: 'exact' });

    // Filtreler
    if (category_id) {
      query = query.eq('kategori_id', category_id);
    }

    if (type && ['gelir', 'gider'].includes(type)) {
      query = query.eq('islem_turu', type);
    }

    if (start_date) {
      query = query.gte('islem_tarihi', start_date);
    }

    if (end_date) {
      query = query.lte('islem_tarihi', end_date);
    }

    if (search) {
      query = query.ilike('aciklama', `%${search}%`);
    }

    // Sıralama ve sayfalama
    query = query
      .order('islem_tarihi', { ascending: false })
      .order('olusturma_tarihi', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // API uyumluluğu için field isimlerini dönüştür
    const transactions = data.map(row => ({
      id: row.id,
      type: row.islem_turu,
      amount: row.tutar,
      description: row.aciklama,
      transaction_date: row.islem_tarihi,
      created_at: row.olusturma_tarihi,
      updated_at: row.guncelleme_tarihi,
      category_id: row.kategori_id,
      category_name: row.categories?.kategori_adi || null,
      category_type: row.categories?.tur || null
    }));

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < count
      }
    });

  } catch (error) {
    console.error('İşlemler listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlemler listelenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Yeni işlem oluştur (POST /)
router.post('/', async (req, res) => {
  try {
    const { type, amount, description, category_id, transaction_date } = req.body;

    // Validasyon
    if (!type || !['gelir', 'gider'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem türü belirtmelisiniz (gelir/gider)'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar belirtmelisiniz (pozitif sayı)'
      });
    }

    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Açıklama en az 2 karakter olmalıdır'
      });
    }

    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori seçmelisiniz'
      });
    }

    // Kategori varlık kontrolü
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, kategori_adi, tur')
      .eq('id', category_id)
      .maybeSingle();
    
    if (catError || !category) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    if (category.tur !== type) {
      return res.status(400).json({
        success: false,
        message: `Seçilen kategori "${category.kategori_adi}" ${category.tur} türündedir, ${type} işlemi için uygun değil`
      });
    }

    // Tarih kontrolü
    let finalDate = transaction_date || new Date().toISOString().split('T')[0];

    // İşlem ekleme
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        islem_turu: type,
        tutar: parseFloat(amount),
        aciklama: description.trim(),
        kategori_id: parseInt(category_id),
        islem_tarihi: finalDate
      })
      .select(`
        id, islem_turu, tutar, aciklama, islem_tarihi, olusturma_tarihi,
        kategori_id,
        categories!transactions_kategori_id_fkey(id, kategori_adi, tur)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'İşlem başarıyla oluşturuldu',
      data: {
        id: data.id,
        type: data.islem_turu,
        amount: data.tutar,
        description: data.aciklama,
        transaction_date: data.islem_tarihi,
        created_at: data.olusturma_tarihi,
        category_id: data.kategori_id,
        category_name: data.categories?.kategori_adi,
        category_type: data.categories?.tur
      }
    });

  } catch (error) {
    console.error('İşlem oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Tekil işlem getir (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, islem_turu, tutar, aciklama, islem_tarihi, olusturma_tarihi, guncelleme_tarihi,
        kategori_id,
        categories!transactions_kategori_id_fkey(id, kategori_adi, tur)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        type: data.islem_turu,
        amount: data.tutar,
        description: data.aciklama,
        transaction_date: data.islem_tarihi,
        created_at: data.olusturma_tarihi,
        updated_at: data.guncelleme_tarihi,
        category_id: data.kategori_id,
        category_name: data.categories?.kategori_adi,
        category_type: data.categories?.tur
      }
    });

  } catch (error) {
    console.error('İşlem getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem getirilirken bir hata oluştu',
      error: error.message
    });
  }
});

// İşlem güncelle (PUT /:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, category_id, transaction_date } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    // Validasyon (POST ile aynı)
    if (!type || !['gelir', 'gider'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem türü belirtmelisiniz (gelir/gider)'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar belirtmelisiniz (pozitif sayı)'
      });
    }

    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Açıklama en az 2 karakter olmalıdır'
      });
    }

    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori seçmelisiniz'
      });
    }

    // Kategori kontrolü
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, kategori_adi, tur')
      .eq('id', category_id)
      .maybeSingle();
    
    if (catError || !category) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    if (category.tur !== type) {
      return res.status(400).json({
        success: false,
        message: `Seçilen kategori "${category.kategori_adi}" ${category.tur} türündedir, ${type} işlemi için uygun değil`
      });
    }

    // Güncelleme
    const { data, error } = await supabase
      .from('transactions')
      .update({
        islem_turu: type,
        tutar: parseFloat(amount),
        aciklama: description.trim(),
        kategori_id: parseInt(category_id),
        islem_tarihi: transaction_date || new Date().toISOString().split('T')[0],
        guncelleme_tarihi: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, islem_turu, tutar, aciklama, islem_tarihi, olusturma_tarihi, guncelleme_tarihi,
        kategori_id,
        categories!transactions_kategori_id_fkey(id, kategori_adi, tur)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Güncellenecek işlem bulunamadı'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'İşlem başarıyla güncellendi',
      data: {
        id: data.id,
        type: data.islem_turu,
        amount: data.tutar,
        description: data.aciklama,
        transaction_date: data.islem_tarihi,
        created_at: data.olusturma_tarihi,
        updated_at: data.guncelleme_tarihi,
        category_id: data.kategori_id,
        category_name: data.categories?.kategori_adi,
        category_type: data.categories?.tur
      }
    });

  } catch (error) {
    console.error('İşlem güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// İşlem sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    // İşlem silme
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'İşlem başarıyla silindi',
      data: { deletedId: parseInt(id) }
    });

  } catch (error) {
    console.error('İşlem silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// İstatistikler endpoint
router.get('/stats/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('transactions')
      .select('islem_turu, tutar');

    if (start_date && end_date) {
      query = query.gte('islem_tarihi', start_date).lte('islem_tarihi', end_date);
    } else if (start_date) {
      query = query.gte('islem_tarihi', start_date);
    } else if (end_date) {
      query = query.lte('islem_tarihi', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Manuel hesaplama
    const totals = {
      gelir: { transaction_count: 0, total_amount: 0, average_amount: 0 },
      gider: { transaction_count: 0, total_amount: 0, average_amount: 0 }
    };

    data.forEach(item => {
      totals[item.islem_turu].transaction_count++;
      totals[item.islem_turu].total_amount += parseFloat(item.tutar);
    });

    totals.gelir.average_amount = totals.gelir.transaction_count > 0 
      ? totals.gelir.total_amount / totals.gelir.transaction_count 
      : 0;
    
    totals.gider.average_amount = totals.gider.transaction_count > 0 
      ? totals.gider.total_amount / totals.gider.transaction_count 
      : 0;

    // Yuvarla
    totals.gelir.total_amount = Math.round(totals.gelir.total_amount * 100) / 100;
    totals.gider.total_amount = Math.round(totals.gider.total_amount * 100) / 100;
    totals.gelir.average_amount = Math.round(totals.gelir.average_amount * 100) / 100;
    totals.gider.average_amount = Math.round(totals.gider.average_amount * 100) / 100;

    const netBalance = totals.gelir.total_amount - totals.gider.total_amount;

    res.json({
      success: true,
      data: {
        ...totals,
        net_balance: Math.round(netBalance * 100) / 100,
        period: { start_date: start_date || null, end_date: end_date || null }
      }
    });

  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler hesaplanırken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
