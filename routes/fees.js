const express = require('express');
const { supabase } = require('../database');
const router = express.Router();
for (const name of ['id', 'roleId', 'permissionId']) router.param(name, (req, res, next, value) => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return res.status(400).json({ message: 'Geçersiz kayıt kimliği' });
  next();
});
const { requirePermission } = require('../middleware/authorization');
const { validateInput } = require('../middleware/security');
router.use(validateInput);

// Ping endpoint
router.get('/ping', requirePermission('view_fees'), (req, res) => {
  res.json({ message: 'Fees API çalışıyor', timestamp: new Date().toISOString() });
});

// Aidatları listele (GET /)
router.get('/', requirePermission('view_fees'), async (req, res) => {
  try {
    const { student_id, class_name, status, search, due_date_start, due_date_end, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('student_fees')
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi, guncelleme_tarihi,
        ogrenci_id, payments(tutar),
        students!student_fees_ogrenci_id_fkey!inner(id, ad, soyad, ogrenci_numarasi, sinif, sube)
      `, { count: 'exact' });

    if (class_name) query = query.eq('students.sinif', class_name);

    if (student_id) {
      query = query.eq('ogrenci_id', student_id);
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    if (search) query = query.ilike('aciklama', '%' + search.replace(/[%_]/g, '') + '%');
    if (due_date_start) query = query.gte('son_odeme_tarihi', due_date_start);
    if (due_date_end) query = query.lte('son_odeme_tarihi', due_date_end);
    if (status === 'paid') query = query.eq('durum', 'paid');
    if (status === 'pending') query = query.neq('durum', 'paid').gte('son_odeme_tarihi', today);
    if (status === 'overdue') query = query.neq('durum', 'paid').lt('son_odeme_tarihi', today);

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
      status: row.durum === 'paid' ? 'paid' : row.son_odeme_tarihi < today ? 'overdue' : 'pending',
      created_at: row.olusturma_tarihi,
      updated_at: row.guncelleme_tarihi,
      student_id: row.ogrenci_id,
      first_name: row.students?.ad,
      last_name: row.students?.soyad,
      student_number: row.students?.ogrenci_numarasi,
      class_name: row.students?.sinif,
      section: row.students?.sube,
      paid_amount: (row.payments || []).reduce((sum, payment) => sum + Number(payment.tutar), 0)
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
      error: 'İşlem tamamlanamadı'
    });
  }
});

// Yeni aidat oluştur (POST /)
router.post('/', requirePermission('create_fee'), async (req, res) => {
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
        ogrenci_id, payments(tutar),
        students!student_fees_ogrenci_id_fkey!inner(id, ad, soyad, ogrenci_numarasi, sinif, sube)
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
      error: 'İşlem tamamlanamadı'
    });
  }
});

// Tekil aidat getir (GET /:id)
// Summary is calculated from payments; overdue status follows the due date.
router.get('/stats/summary', requirePermission('view_fees'), async (req, res, next) => {
  try {
    const stats = Object.fromEntries(['pending','paid','overdue','totals'].map(key => [key, { count: 0, total_amount: 0 }]));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from('student_fees').select('id,tutar,son_odeme_tarihi,payments(tutar)').order('id').range(offset, offset + 999);
      if (error) throw error;
      for (const fee of data) {
        const paid = (fee.payments || []).reduce((sum, payment) => sum + Number(payment.tutar), 0);
        const remaining = Math.max(0, Number(fee.tutar) - paid);
        const status = remaining === 0 ? 'paid' : fee.son_odeme_tarihi < today ? 'overdue' : 'pending';
        stats[status].count++;
        stats[status].total_amount += status === 'paid' ? Number(fee.tutar) : remaining;
        stats.totals.count++;
        stats.totals.total_amount += Number(fee.tutar);
      }
      if (data.length < 1000) break;
    }
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
});

router.post('/bulk', requirePermission('create_fee'), async (req, res, next) => {
  try {
    const { description, amount, due_date, student_ids, class_names } = req.body;
    if (typeof description !== 'string' || description.trim().length < 2 || !amount || !due_date ||
        (student_ids && !student_ids.length) || (class_names && !class_names.length) || (student_ids && class_names)) {
      return res.status(400).json({ success: false, message: 'Açıklama, tutar, tarih ve geçerli bir seçim gereklidir' });
    }
    let query = supabase.from('students').select('id').order('id').limit(501);
    if (student_ids) query = query.in('id', student_ids);
    if (class_names) query = query.in('sinif', class_names);
    const { data: students, error } = await query;
    if (error) throw error;
    if (!students.length || students.length > 500 || (student_ids && students.length !== new Set(student_ids.map(Number)).size)) {
      return res.status(400).json({ success: false, message: 'Tek işlemde 1–500 mevcut öğrenci seçin' });
    }
    const { error: insertError } = await supabase.from('student_fees').insert(students.map(student => ({
      ogrenci_id: student.id, aciklama: description.trim(), tutar: Number(amount), son_odeme_tarihi: due_date, durum: 'pending'
    })));
    if (insertError) throw insertError;
    res.status(201).json({ success: true, message: students.length + ' öğrenciye aidat atandı', count: students.length });
  } catch (error) { next(error); }
});

router.get('/:id', requirePermission('view_fees'), async (req, res) => {
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
        ogrenci_id, payments(tutar),
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
      error: 'İşlem tamamlanamadı'
    });
  }
});

// Aidat güncelle (PUT /:id)
router.put('/:id', requirePermission('edit_fee'), async (req, res) => {
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
      if (error.code === '23514') return res.status(409).json({ success: false, message: 'Aidat tutarı ödenen tutardan az olamaz' });
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
      error: 'İşlem tamamlanamadı'
    });
  }
});

// Aidat sil (DELETE /:id)
router.delete('/:id', requirePermission('delete_fee'), async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    // Check for related payments
    const { count, error: countError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('aidat_id', id);

    if (countError) throw countError;
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
      error: 'İşlem tamamlanamadı'
    });
  }
});

module.exports = router;

