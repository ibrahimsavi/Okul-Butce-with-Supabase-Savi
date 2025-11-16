const express = require('express');
const { supabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Students API çalışıyor', timestamp: new Date().toISOString() });
});

// Öğrencileri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const { 
      class_name, 
      section, 
      search, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' });

    // Filtreler
    if (class_name) {
      query = query.ilike('sinif', `%${class_name}%`);
    }

    if (section) {
      query = query.ilike('sube', `%${section}%`);
    }

    if (search) {
      query = query.or(`ad.ilike.%${search}%,soyad.ilike.%${search}%,ogrenci_numarasi.ilike.%${search}%,veli_adi.ilike.%${search}%`);
    }

    // Sıralama ve sayfalama
    query = query
      .order('sinif')
      .order('sube')
      .order('ad')
      .order('soyad')
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // API uyumluluğu için field isimlerini dönüştür
    const students = data.map(row => ({
      id: row.id,
      first_name: row.ad,
      last_name: row.soyad,
      student_number: row.ogrenci_numarasi,
      class_name: row.sinif,
      section: row.sube,
      status: row.durum,
      parent_name: row.veli_adi,
      parent_phone: row.veli_telefonu,
      parent_email: row.veli_eposta,
      address: row.adres,
      created_at: row.olusturma_tarihi,
      updated_at: row.guncelleme_tarihi
    }));

    res.json({
      success: true,
      data: students,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < count
      }
    });

  } catch (error) {
    console.error('Öğrenciler listeleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenciler listelenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Yeni öğrenci oluştur (POST /)
router.post('/', async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      student_number, 
      class_name, 
      section, 
      parent_name, 
      parent_phone,
      parent_email,
      address
    } = req.body;

    // Validasyon
    if (!first_name || first_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci adı en az 2 karakter olmalıdır'
      });
    }

    if (!last_name || last_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci soyadı en az 2 karakter olmalıdır'
      });
    }

    if (!class_name || class_name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf bilgisi gereklidir'
      });
    }

    // Öğrenci numarası kontrolü (eğer verilmişse)
    if (student_number) {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('ogrenci_numarasi', student_number.trim())
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Bu öğrenci numarası zaten kayıtlı'
        });
      }
    }

    // Öğrenci ekleme
    const { data, error } = await supabase
      .from('students')
      .insert({
        ad: first_name.trim(),
        soyad: last_name.trim(),
        ogrenci_numarasi: student_number ? student_number.trim() : null,
        sinif: class_name.trim(),
        sube: section ? section.trim() : null,
        veli_adi: parent_name ? parent_name.trim() : null,
        veli_telefonu: parent_phone ? parent_phone.trim() : null,
        veli_eposta: parent_email ? parent_email.trim() : null,
        adres: address ? address.trim() : null
      })
      .select()
      .single();

    if (error) throw error;

    // Dönüşüm
    const newStudent = {
      id: data.id,
      first_name: data.ad,
      last_name: data.soyad,
      student_number: data.ogrenci_numarasi,
      class_name: data.sinif,
      section: data.sube,
      parent_name: data.veli_adi,
      parent_phone: data.veli_telefonu,
      parent_email: data.veli_eposta,
      address: data.adres,
      created_at: data.olusturma_tarihi
    };

    res.status(201).json({
      success: true,
      message: 'Öğrenci başarıyla oluşturuldu',
      data: newStudent
    });

  } catch (error) {
    console.error('Öğrenci oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Tekil öğrenci getir (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci bulunamadı'
      });
    }

    const student = {
      id: data.id,
      first_name: data.ad,
      last_name: data.soyad,
      student_number: data.ogrenci_numarasi,
      class_name: data.sinif,
      section: data.sube,
      status: data.durum,
      parent_name: data.veli_adi,
      parent_phone: data.veli_telefonu,
      parent_email: data.veli_eposta,
      address: data.adres,
      created_at: data.olusturma_tarihi,
      updated_at: data.guncelleme_tarihi
    };

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Öğrenci getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci getirilirken bir hata oluştu',
      error: error.message
    });
  }
});

// Öğrenci güncelle (PUT /:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      first_name, 
      last_name, 
      student_number, 
      class_name, 
      section, 
      parent_name, 
      parent_phone,
      parent_email,
      address
    } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    // Validasyon
    if (!first_name || first_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci adı en az 2 karakter olmalıdır'
      });
    }

    if (!last_name || last_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci soyadı en az 2 karakter olmalıdır'
      });
    }

    if (!class_name || class_name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf bilgisi gereklidir'
      });
    }

    // Güncelleme
    const { data, error } = await supabase
      .from('students')
      .update({
        ad: first_name.trim(),
        soyad: last_name.trim(),
        ogrenci_numarasi: student_number ? student_number.trim() : null,
        sinif: class_name.trim(),
        sube: section ? section.trim() : null,
        veli_adi: parent_name ? parent_name.trim() : null,
        veli_telefonu: parent_phone ? parent_phone.trim() : null,
        veli_eposta: parent_email ? parent_email.trim() : null,
        adres: address ? address.trim() : null,
        guncelleme_tarihi: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Güncellenecek öğrenci bulunamadı'
        });
      }
      throw error;
    }

    const updatedStudent = {
      id: data.id,
      first_name: data.ad,
      last_name: data.soyad,
      student_number: data.ogrenci_numarasi,
      class_name: data.sinif,
      section: data.sube,
      parent_name: data.veli_adi,
      parent_phone: data.veli_telefonu,
      parent_email: data.veli_eposta,
      address: data.adres,
      updated_at: data.guncelleme_tarihi
    };

    res.json({
      success: true,
      message: 'Öğrenci başarıyla güncellendi',
      data: updatedStudent
    });

  } catch (error) {
    console.error('Öğrenci güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Öğrenci sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    // Mevcut öğrenci kontrolü
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek öğrenci bulunamadı'
      });
    }

    // İlişkili kayıtları kontrol et
    const { count: feeCount } = await supabase
      .from('student_fees')
      .select('*', { count: 'exact', head: true })
      .eq('ogrenci_id', id);

    if (feeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu öğrenciye ait aidat kayıtları bulunmaktadır. Önce aidat kayıtlarını siliniz.'
      });
    }

    // Öğrenci silme
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Öğrenci başarıyla silindi',
      data: { deletedId: parseInt(id) }
    });

  } catch (error) {
    console.error('Öğrenci silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// Sınıf/şube istatistikleri
router.get('/stats/classes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('sinif, sube')
      .order('sinif')
      .order('sube');

    if (error) throw error;

    // Grup sayımı
    const classBreakdown = {};
    data.forEach(student => {
      const key = `${student.sinif}-${student.sube || 'N/A'}`;
      classBreakdown[key] = (classBreakdown[key] || 0) + 1;
    });

    const classStats = Object.entries(classBreakdown).map(([key, count]) => {
      const [className, section] = key.split('-');
      return {
        class_name: className,
        section: section === 'N/A' ? null : section,
        student_count: count
      };
    });

    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: {
        class_breakdown: classStats,
        total_students: totalStudents,
        total_classes: classStats.length
      }
    });

  } catch (error) {
    console.error('Sınıf istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf istatistikleri hesaplanırken bir hata oluştu',
      error: error.message
    });
  }
});

// Sınıf listesini getir (dropdown için)
router.get('/meta/classes', async (req, res) => {
  try {
    const { data: classes } = await supabase
      .from('students')
      .select('sinif')
      .order('sinif');

    const { data: sections } = await supabase
      .from('students')
      .select('sube')
      .not('sube', 'is', null)
      .order('sube');

    const uniqueClasses = [...new Set(classes.map(c => c.sinif))];
    const uniqueSections = [...new Set(sections.map(s => s.sube))];

    res.json({
      success: true,
      data: {
        classes: uniqueClasses,
        sections: uniqueSections
      }
    });

  } catch (error) {
    console.error('Sınıf meta verisi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf verileri alınırken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
