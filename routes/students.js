const express = require('express');
const { getDatabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Students API çalışıyor', timestamp: new Date().toISOString() });
});

// Öğrencileri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { 
      class_name, 
      section, 
      search, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        id,
        first_name,
        last_name,
        student_number,
        class_name,
        section,
        parent_name,
        parent_phone,
        created_at,
        updated_at
      FROM students
      WHERE 1=1
    `;
    
    const params = [];

    // Filtreler
    if (class_name) {
      query += ` AND class_name LIKE ?`;
      params.push(`%${class_name}%`);
    }

    if (section) {
      query += ` AND section LIKE ?`;
      params.push(`%${section}%`);
    }

    if (search) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? OR parent_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Sıralama ve sayfalama
    query += ` ORDER BY class_name, section, first_name, last_name`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const students = db.prepare(query).all(...params);

    // Toplam sayı için ayrı sorgu
    let countQuery = `
      SELECT COUNT(*) as total
      FROM students
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // limit ve offset hariç

    if (class_name) countQuery += ` AND class_name LIKE ?`;
    if (section) countQuery += ` AND section LIKE ?`;
    if (search) countQuery += ` AND (first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? OR parent_name LIKE ?)`;

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: students,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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
    const db = getDatabase();
    const { 
      first_name, 
      last_name, 
      student_number, 
      class_name, 
      section, 
      parent_name, 
      parent_phone 
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

    // Ad ve soyad uzunluk kontrolü
    if (first_name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci adı en fazla 50 karakter olabilir'
      });
    }

    if (last_name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci soyadı en fazla 50 karakter olabilir'
      });
    }

    if (class_name.trim().length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf bilgisi en fazla 20 karakter olabilir'
      });
    }

    // Öğrenci numarası kontrolü (eğer verilmişse)
    if (student_number) {
      if (student_number.trim().length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Öğrenci numarası en fazla 20 karakter olabilir'
        });
      }

      // Aynı öğrenci numarası kontrolü
      const existingStudent = db.prepare('SELECT id FROM students WHERE student_number = ?').get(student_number.trim());
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Bu öğrenci numarası zaten kayıtlı'
        });
      }
    }

    // Veli telefonu formatı kontrolü (eğer verilmişse)
    if (parent_phone && parent_phone.trim()) {
      const phoneRegex = /^[0-9+\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(parent_phone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir telefon numarası giriniz'
        });
      }
    }

    // Öğrenci ekleme
    const stmt = db.prepare(`
      INSERT INTO students (first_name, last_name, student_number, class_name, section, parent_name, parent_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      first_name.trim(),
      last_name.trim(),
      student_number ? student_number.trim() : null,
      class_name.trim(),
      section ? section.trim() : null,
      parent_name ? parent_name.trim() : null,
      parent_phone ? parent_phone.trim() : null
    );

    // Eklenen öğrenciyi getir
    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);

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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci bulunamadı'
      });
    }

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
    const db = getDatabase();
    const { id } = req.params;
    const { 
      first_name, 
      last_name, 
      student_number, 
      class_name, 
      section, 
      parent_name, 
      parent_phone 
    } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    // Mevcut öğrenci kontrolü
    const existingStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Güncellenecek öğrenci bulunamadı'
      });
    }

    // Validasyon (POST ile aynı)
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

    if (first_name.trim().length > 50 || last_name.trim().length > 50 || class_name.trim().length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Alan uzunlukları sınırları aşıyor'
      });
    }

    // Öğrenci numarası kontrolü (sadece değiştirildiyse)
    if (student_number && student_number.trim() !== existingStudent.student_number) {
      if (student_number.trim().length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Öğrenci numarası en fazla 20 karakter olabilir'
        });
      }

      const duplicateStudent = db.prepare('SELECT id FROM students WHERE student_number = ? AND id != ?')
        .get(student_number.trim(), id);
      if (duplicateStudent) {
        return res.status(400).json({
          success: false,
          message: 'Bu öğrenci numarası zaten kayıtlı'
        });
      }
    }

    // Veli telefonu formatı kontrolü
    if (parent_phone && parent_phone.trim()) {
      const phoneRegex = /^[0-9+\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(parent_phone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir telefon numarası giriniz'
        });
      }
    }

    // Güncelleme
    const stmt = db.prepare(`
      UPDATE students 
      SET first_name = ?, last_name = ?, student_number = ?, class_name = ?, 
          section = ?, parent_name = ?, parent_phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      first_name.trim(),
      last_name.trim(),
      student_number ? student_number.trim() : null,
      class_name.trim(),
      section ? section.trim() : null,
      parent_name ? parent_name.trim() : null,
      parent_phone ? parent_phone.trim() : null,
      id
    );

    // Güncellenmiş öğrenciyi getir
    const updatedStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir öğrenci ID belirtmelisiniz'
      });
    }

    // Mevcut öğrenci kontrolü
    const existingStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek öğrenci bulunamadı'
      });
    }

    // İlişkili kayıtları kontrol et
    const relatedFees = db.prepare('SELECT COUNT(*) as count FROM student_fees WHERE student_id = ?').get(id);
    if (relatedFees.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu öğrenciye ait aidat kayıtları bulunmaktadır. Önce aidat kayıtlarını siliniz.'
      });
    }

    const relatedPayments = db.prepare(`
      SELECT COUNT(p.id) as count 
      FROM payments p 
      INNER JOIN student_fees sf ON p.fee_id = sf.id 
      WHERE sf.student_id = ?
    `).get(id);
    if (relatedPayments.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu öğrenciye ait ödeme kayıtları bulunmaktadır. Önce ödeme kayıtlarını siliniz.'
      });
    }

    // Öğrenci silme
    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci silinemedi'
      });
    }

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
    const db = getDatabase();
    
    const classStats = db.prepare(`
      SELECT 
        class_name,
        section,
        COUNT(*) as student_count
      FROM students 
      GROUP BY class_name, section
      ORDER BY class_name, section
    `).all();

    const totalStudents = db.prepare('SELECT COUNT(*) as total FROM students').get().total;

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
    const db = getDatabase();
    
    const classes = db.prepare(`
      SELECT DISTINCT class_name
      FROM students 
      ORDER BY class_name
    `).all();

    const sections = db.prepare(`
      SELECT DISTINCT section
      FROM students 
      WHERE section IS NOT NULL AND section != ''
      ORDER BY section
    `).all();

    res.json({
      success: true,
      data: {
        classes: classes.map(c => c.class_name),
        sections: sections.map(s => s.section)
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