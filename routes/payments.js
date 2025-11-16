const express = require('express');
const { supabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Payments API çalışıyor', timestamp: new Date().toISOString() });
});

// Ödemeleri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const { fee_id, student_id, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        id, tutar, odeme_tarihi, odeme_yontemi, makbuz_numarasi, notlar, olusturma_tarihi,
        aidat_id,
        student_fees!payments_aidat_id_fkey(
          id, aciklama, tutar, son_odeme_tarihi, durum,
          ogrenci_id,
          students!student_fees_ogrenci_id_fkey(id, ad, soyad, ogrenci_numarasi, sinif, sube)
        )
      `, { count: 'exact' });

    if (fee_id) {
      query = query.eq('aidat_id', fee_id);
    }

    query = query
      .order('odeme_tarihi', { ascending: false })
      .order('olusturma_tarihi', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const payments = data.map(row => ({
      id: row.id,
      amount: row.tutar,
      payment_date: row.odeme_tarihi,
      payment_method: row.odeme_yontemi,
      receipt_number: row.makbuz_numarasi,
      notes: row.notlar,
      created_at: row.olusturma_tarihi,
      fee_id: row.aidat_id,
      fee_description: row.student_fees?.aciklama,
      fee_amount: row.student_fees?.tutar,
      fee_due_date: row.student_fees?.son_odeme_tarihi,
      student_id: row.student_fees?.ogrenci_id,
      first_name: row.student_fees?.students?.ad,
      last_name: row.student_fees?.students?.soyad,
      student_number: row.student_fees?.students?.ogrenci_numarasi,
      class_name: row.student_fees?.students?.sinif
    }));

    res.json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < count
      }
    });

  } catch (error) {
    console.error('Ödemeler listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödemeler listelenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Yeni ödeme oluştur (POST /)
router.post('/', async (req, res) => {
  try {
    const { 
      fee_id, 
      amount, 
      payment_date, 
      payment_method, 
      receipt_number, 
      notes
    } = req.body;

    if (!fee_id || isNaN(fee_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme tutarı belirtmelisiniz (pozitif sayı)'
      });
    }

    if (!payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Ödeme tarihini belirtmelisiniz'
      });
    }

    if (!payment_method || !['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme yöntemi seçmelisiniz (cash/bank_transfer/credit_card/check)'
      });
    }

    // Aidat kontrolü
    const { data: fee, error: feeError } = await supabase
      .from('student_fees')
      .select('id, tutar, durum')
      .eq('id', fee_id)
      .maybeSingle();
    
    if (feeError || !fee) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen aidat bulunamadı'
      });
    }

    // Önceki ödemeler
    const { data: prevPayments } = await supabase
      .from('payments')
      .select('tutar')
      .eq('aidat_id', fee_id);
    
    const paidAmount = prevPayments?.reduce((sum, p) => sum + parseFloat(p.tutar), 0) || 0;
    const remainingAmount = parseFloat(fee.tutar) - paidAmount;

    if (parseFloat(amount) > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Ödeme tutarı kalan borcu aşamaz. Kalan borç: ${remainingAmount} TL`
      });
    }

    // Ödeme kaydı oluştur
    const { data, error } = await supabase
      .from('payments')
      .insert({
        aidat_id: parseInt(fee_id),
        tutar: parseFloat(amount),
        odeme_tarihi: payment_date,
        odeme_yontemi: payment_method,
        makbuz_numarasi: receipt_number || null,
        notlar: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    // Aidat durumunu güncelle
    const newPaidAmount = paidAmount + parseFloat(amount);
    const newStatus = newPaidAmount >= parseFloat(fee.tutar) ? 'paid' : 'pending';
    
    await supabase
      .from('student_fees')
      .update({ 
        durum: newStatus,
        guncelleme_tarihi: new Date().toISOString()
      })
      .eq('id', fee_id);

    res.status(201).json({
      success: true,
      message: 'Ödeme başarıyla kaydedildi',
      data: {
        id: data.id,
        amount: data.tutar,
        payment_date: data.odeme_tarihi,
        payment_method: data.odeme_yontemi,
        receipt_number: data.makbuz_numarasi,
        notes: data.notlar,
        created_at: data.olusturma_tarihi,
        fee_status: newStatus,
        total_paid: newPaidAmount
      }
    });

  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme kaydedilirken bir hata oluştu',
      error: error.message
    });
  }
});

// Tekil ödeme getir (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme ID belirtmelisiniz'
      });
    }

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, tutar, odeme_tarihi, odeme_yontemi, makbuz_numarasi, notlar, olusturma_tarihi, guncelleme_tarihi,
        aidat_id,
        student_fees!payments_aidat_id_fkey(
          id, aciklama, tutar, son_odeme_tarihi, durum,
          ogrenci_id,
          students!student_fees_ogrenci_id_fkey(id, ad, soyad, ogrenci_numarasi, sinif, sube)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        amount: data.tutar,
        payment_date: data.odeme_tarihi,
        payment_method: data.odeme_yontemi,
        receipt_number: data.makbuz_numarasi,
        notes: data.notlar,
        created_at: data.olusturma_tarihi,
        updated_at: data.guncelleme_tarihi,
        fee_id: data.aidat_id,
        fee_description: data.student_fees?.aciklama,
        fee_amount: data.student_fees?.tutar,
        fee_due_date: data.student_fees?.son_odeme_tarihi,
        fee_status: data.student_fees?.durum,
        student_id: data.student_fees?.ogrenci_id,
        first_name: data.student_fees?.students?.ad,
        last_name: data.student_fees?.students?.soyad,
        student_number: data.student_fees?.students?.ogrenci_numarasi,
        class_name: data.student_fees?.students?.sinif,
        section: data.student_fees?.students?.sube
      }
    });

  } catch (error) {
    console.error('Ödeme getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme getirilirken bir hata oluştu',
      error: error.message
    });
  }
});

// Ödeme sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme ID belirtmelisiniz'
      });
    }

    // Get payment details before deletion
    const { data: payment } = await supabase
      .from('payments')
      .select('aidat_id, tutar')
      .eq('id', id)
      .maybeSingle();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek ödeme bulunamadı'
      });
    }

    // Delete payment
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update fee status
    const { data: remainingPayments } = await supabase
      .from('payments')
      .select('tutar')
      .eq('aidat_id', payment.aidat_id);
    
    const { data: fee } = await supabase
      .from('student_fees')
      .select('tutar')
      .eq('id', payment.aidat_id)
      .single();

    const totalPaid = remainingPayments?.reduce((sum, p) => sum + parseFloat(p.tutar), 0) || 0;
    const newStatus = totalPaid >= parseFloat(fee.tutar) ? 'paid' : 'pending';

    await supabase
      .from('student_fees')
      .update({ 
        durum: newStatus,
        guncelleme_tarihi: new Date().toISOString()
      })
      .eq('id', payment.aidat_id);

    res.json({
      success: true,
      message: 'Ödeme başarıyla silindi',
      data: { deletedId: parseInt(id) }
    });

  } catch (error) {
    console.error('Ödeme silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme silinirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
