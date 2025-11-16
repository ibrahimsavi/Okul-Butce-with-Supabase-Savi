const express = require('express');
const { supabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Fees API çalışıyor', timestamp: new Date().toISOString() });
});

// Aidatları listele (GET /)
router.get('/', async (req, res) => {
  try {
    const { student_id, class_name, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('student_fees')
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi, guncelleme_tarihi,
        ogrenci_id,
        students!student_fees_ogrenci_id_fkey(id, ad, soyad, ogrenci_numarasi, sinif, sube)
      `, { count: 'exact' });

    if (student_id) {
      query = query.eq('ogrenci_id', student_id);
    }

    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      query = query.eq('durum', status);
    }

    query = query
      .order('son_odeme_tarihi', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const fees = data.map(row => ({
      id: row.id,
      description: row.aciklama,
      amount: row.tutar,
      due_date: row.son_odeme_tarihi,
      status: row.durum,
      created_at: row.olusturma_tarihi,
      updated_at: row.guncelleme_tarihi,
      student_id: row.ogrenci_id,
      first_name: row.students?.ad,
      last_name: row.students?.soyad,
      student_number: row.students?.ogrenci_numarasi,
      class_name: row.students?.sinif,
      section: row.students?.sube,
      paid_amount: 0 // TODO: Calculate from payments
    }));

    res.json({
      success: true,
      data: fees,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < count
      }
    });

  } catch (error) {
    console.error('Aidatlar listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidatlar listelenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Yeni aidat oluştur (POST /)
router.post('/', async (req, res) => {
  try {
    const { student_id, description, amount, due_date } = req.body;

    if (!student_id || isNaN(student_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci seçmelisiniz'
      });
    }

    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Aidat açıklaması en az 2 karakter olmalıdır'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar belirtmelisiniz (pozitif sayı)'
      });
    }

    if (!due_date) {
      return res.status(400).json({
        success: false,
        message: 'Son ödeme tarihi belirtmelisiniz'
      });
    }

    // Öğrenci varlık kontrolü
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, ad, soyad')
      .eq('id', student_id)
      .maybeSingle();
    
    if (studentError || !student) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen öğrenci bulunamadı'
      });
    }

    // Aidat ekleme
    const { data, error } = await supabase
      .from('student_fees')
      .insert({
        ogrenci_id: parseInt(student_id),
        aciklama: description.trim(),
        tutar: parseFloat(amount),
        son_odeme_tarihi: due_date,
        durum: 'pending'
      })
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi,
        ogrenci_id,
        students!student_fees_ogrenci_id_fkey(id, ad, soyad, ogrenci_numarasi, sinif, sube)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Aidat başarıyla oluşturuldu',
      data: {
        id: data.id,
        description: data.aciklama,
        amount: data.tutar,
        due_date: data.son_odeme_tarihi,
        status: data.durum,
        created_at: data.olusturma_tarihi,
        student_id: data.ogrenci_id,
        first_name: data.students?.ad,
        last_name: data.students?.soyad
      }
    });

  } catch (error) {
    console.error('Aidat oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Tekil aidat getir (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    const { data, error } = await supabase
      .from('student_fees')
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi, guncelleme_tarihi,
        ogrenci_id,
        students!student_fees_ogrenci_id_fkey(id, ad, soyad, ogrenci_numarasi, sinif, sube, veli_adi, veli_telefonu)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Aidat bulunamadı'
      });
    }

    // Get payments for this fee
    const { data: payments } = await supabase
      .from('payments')
      .select('id, tutar, odeme_tarihi, odeme_yontemi, makbuz_numarasi, olusturma_tarihi')
      .eq('aidat_id', id)
      .order('olusturma_tarihi', { ascending: false });

    const paidAmount = payments?.reduce((sum, p) => sum + parseFloat(p.tutar), 0) || 0;

    res.json({
      success: true,
      data: {
        id: data.id,
        description: data.aciklama,
        amount: data.tutar,
        due_date: data.son_odeme_tarihi,
        status: data.durum,
        created_at: data.olusturma_tarihi,
        updated_at: data.guncelleme_tarihi,
        student_id: data.ogrenci_id,
        first_name: data.students?.ad,
        last_name: data.students?.soyad,
        student_number: data.students?.ogrenci_numarasi,
        class_name: data.students?.sinif,
        section: data.students?.sube,
        parent_name: data.students?.veli_adi,
        parent_phone: data.students?.veli_telefonu,
        paid_amount: paidAmount,
        payments: payments?.map(p => ({
          id: p.id,
          amount: p.tutar,
          payment_date: p.odeme_tarihi,
          payment_method: p.odeme_yontemi,
          receipt_number: p.makbuz_numarasi,
          created_at: p.olusturma_tarihi
        })) || []
      }
    });

  } catch (error) {
    console.error('Aidat getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat getirilirken bir hata oluştu',
      error: error.message
    });
  }
});

// Aidat güncelle (PUT /:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, due_date, status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    const updateData = { guncelleme_tarihi: new Date().toISOString() };
    
    if (description) updateData.aciklama = description.trim();
    if (amount) updateData.tutar = parseFloat(amount);
    if (due_date) updateData.son_odeme_tarihi = due_date;
    if (status && ['pending', 'paid', 'overdue'].includes(status)) updateData.durum = status;

    const { data, error } = await supabase
      .from('student_fees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Güncellenecek aidat bulunamadı'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Aidat başarıyla güncellendi',
      data: {
        id: data.id,
        description: data.aciklama,
        amount: data.tutar,
        due_date: data.son_odeme_tarihi,
        status: data.durum,
        updated_at: data.guncelleme_tarihi
      }
    });

  } catch (error) {
    console.error('Aidat güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Aidat sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    // Check for related payments
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('aidat_id', id);

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu aidatla ilişkili ödeme kayıtları var. Önce ödemeleri siliniz.'
      });
    }

    const { error } = await supabase
      .from('student_fees')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Aidat başarıyla silindi',
      data: { deletedId: parseInt(id) }
    });

  } catch (error) {
    console.error('Aidat silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat silinirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
