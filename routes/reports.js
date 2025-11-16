const express = require('express');
const { supabase } = require('../database');
const ExcelJS = require('exceljs');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Reports API çalışıyor', timestamp: new Date().toISOString() });
});

// Mali rapor Excel'e aktar (GET /financial)
router.get('/financial', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Kategoriler
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('kategori_adi');

    if (catError) throw catError;

    // İşlemler
    let transactionQuery = supabase
      .from('transactions')
      .select(`
        id, islem_turu, tutar, aciklama, islem_tarihi, olusturma_tarihi,
        kategori_id,
        categories!transactions_kategori_id_fkey(kategori_adi, tur)
      `)
      .order('islem_tarihi', { ascending: false });

    if (start_date) {
      transactionQuery = transactionQuery.gte('islem_tarihi', start_date);
    }
    if (end_date) {
      transactionQuery = transactionQuery.lte('islem_tarihi', end_date);
    }

    const { data: transactions, error: trxError } = await transactionQuery;
    if (trxError) throw trxError;

    // Aidatlar
    const { data: fees, error: feeError } = await supabase
      .from('student_fees')
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi,
        ogrenci_id,
        students!student_fees_ogrenci_id_fkey(ad, soyad, ogrenci_numarasi, sinif, sube)
      `)
      .order('olusturma_tarihi', { ascending: false });

    if (feeError) throw feeError;

    // Excel oluştur
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAVI Budget System';
    workbook.created = new Date();

    // Kategoriler sayfası
    const catSheet = workbook.addWorksheet('Kategoriler');
    catSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Kategori Adı', key: 'name', width: 25 },
      { header: 'Tür', key: 'type', width: 15 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    categories.forEach(cat => {
      catSheet.addRow({
        id: cat.id,
        name: cat.kategori_adi,
        type: cat.tur === 'gelir' ? 'Gelir' : 'Gider',
        description: cat.aciklama || ''
      });
    });

    // İşlemler sayfası
    const trxSheet = workbook.addWorksheet('İşlemler');
    trxSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tarih', key: 'date', width: 15 },
      { header: 'Tür', key: 'type', width: 12 },
      { header: 'Kategori', key: 'category', width: 25 },
      { header: 'Tutar', key: 'amount', width: 15 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    transactions.forEach(trx => {
      trxSheet.addRow({
        id: trx.id,
        date: trx.islem_tarihi,
        type: trx.islem_turu === 'gelir' ? 'Gelir' : 'Gider',
        category: trx.categories?.kategori_adi || '',
        amount: trx.tutar,
        description: trx.aciklama || ''
      });
    });

    // Aidatlar sayfası
    const feeSheet = workbook.addWorksheet('Aidatlar');
    feeSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Öğrenci No', key: 'studentNumber', width: 15 },
      { header: 'Ad Soyad', key: 'studentName', width: 25 },
      { header: 'Sınıf', key: 'class', width: 12 },
      { header: 'Açıklama', key: 'description', width: 30 },
      { header: 'Tutar', key: 'amount', width: 15 },
      { header: 'Son Ödeme Tarihi', key: 'dueDate', width: 18 },
      { header: 'Durum', key: 'status', width: 12 }
    ];
    fees.forEach(fee => {
      feeSheet.addRow({
        id: fee.id,
        studentNumber: fee.students?.ogrenci_numarasi || '',
        studentName: `${fee.students?.ad || ''} ${fee.students?.soyad || ''}`.trim(),
        class: `${fee.students?.sinif || ''} ${fee.students?.sube || ''}`.trim(),
        description: fee.aciklama || '',
        amount: fee.tutar,
        dueDate: fee.son_odeme_tarihi,
        status: fee.durum === 'paid' ? 'Ödendi' : 'Beklemede'
      });
    });

    // Buffer'a yaz
    const buffer = await workbook.xlsx.writeBuffer();

    // Response headers
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=mali-rapor-${dateStr}.xlsx`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Mali rapor oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mali rapor oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Öğrenciler Excel'e aktar (GET /students)
router.get('/students', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('sinif')
      .order('sube')
      .order('ad');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAVI Budget System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Öğrenciler');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Öğrenci No', key: 'studentNumber', width: 15 },
      { header: 'Ad', key: 'firstName', width: 20 },
      { header: 'Soyad', key: 'lastName', width: 20 },
      { header: 'Sınıf', key: 'class', width: 10 },
      { header: 'Şube', key: 'section', width: 10 },
      { header: 'Veli Adı', key: 'parentName', width: 25 },
      { header: 'Veli Telefon', key: 'parentPhone', width: 18 }
    ];

    students.forEach(student => {
      sheet.addRow({
        id: student.id,
        studentNumber: student.ogrenci_numarasi,
        firstName: student.ad,
        lastName: student.soyad,
        class: student.sinif,
        section: student.sube,
        parentName: student.veli_adi || '',
        parentPhone: student.veli_telefonu || ''
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ogrenciler-${dateStr}.xlsx`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Öğrenci raporu oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci raporu oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Aidatlar Excel'e aktar (GET /fees)
router.get('/fees', async (req, res) => {
  try {
    const { data: fees, error } = await supabase
      .from('student_fees')
      .select(`
        id, aciklama, tutar, son_odeme_tarihi, durum, olusturma_tarihi,
        ogrenci_id,
        students!student_fees_ogrenci_id_fkey(ad, soyad, ogrenci_numarasi, sinif, sube)
      `)
      .order('son_odeme_tarihi', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAVI Budget System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Aidatlar');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Öğrenci No', key: 'studentNumber', width: 15 },
      { header: 'Ad Soyad', key: 'studentName', width: 30 },
      { header: 'Sınıf', key: 'class', width: 12 },
      { header: 'Açıklama', key: 'description', width: 35 },
      { header: 'Tutar', key: 'amount', width: 15 },
      { header: 'Son Ödeme Tarihi', key: 'dueDate', width: 18 },
      { header: 'Durum', key: 'status', width: 12 }
    ];

    fees.forEach(fee => {
      sheet.addRow({
        id: fee.id,
        studentNumber: fee.students?.ogrenci_numarasi || '',
        studentName: `${fee.students?.ad || ''} ${fee.students?.soyad || ''}`.trim(),
        class: `${fee.students?.sinif || ''} ${fee.students?.sube || ''}`.trim(),
        description: fee.aciklama || '',
        amount: fee.tutar,
        dueDate: fee.son_odeme_tarihi,
        status: fee.durum === 'paid' ? 'Ödendi' : 'Beklemede'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=aidatlar-${dateStr}.xlsx`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Aidat raporu oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat raporu oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
