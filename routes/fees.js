const express = require('express');
const { getDatabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Fees API çalışıyor', timestamp: new Date().toISOString() });
});

// Aidatları listele (GET /)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { 
      student_id, 
      class_name, 
      status, 
      due_date_start, 
      due_date_end,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        sf.id,
        sf.description,
        sf.amount,
        sf.due_date,
        sf.status,
        sf.created_at,
        sf.updated_at,
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN payments p ON sf.id = p.fee_id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtreler
    if (student_id) {
      query += ` AND sf.student_id = ?`;
      params.push(student_id);
    }

    if (class_name) {
      query += ` AND s.class_name LIKE ?`;
      params.push(`%${class_name}%`);
    }

    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      query += ` AND sf.status = ?`;
      params.push(status);
    }

    if (due_date_start) {
      query += ` AND DATE(sf.due_date) >= DATE(?)`;
      params.push(due_date_start);
    }

    if (due_date_end) {
      query += ` AND DATE(sf.due_date) <= DATE(?)`;
      params.push(due_date_end);
    }

    // Gruplama ve sayfalama
    query += ` GROUP BY sf.id, s.id`;
    query += ` ORDER BY sf.due_date DESC, s.class_name, s.first_name`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const fees = db.prepare(query).all(...params);

    // Toplam sayı için ayrı sorgu
    let countQuery = `
      SELECT COUNT(DISTINCT sf.id) as total
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // limit ve offset hariç

    if (student_id) countQuery += ` AND sf.student_id = ?`;
    if (class_name) countQuery += ` AND s.class_name LIKE ?`;
    if (status && ['pending', 'paid', 'overdue'].includes(status)) countQuery += ` AND sf.status = ?`;
    if (due_date_start) countQuery += ` AND DATE(sf.due_date) >= DATE(?)`;
    if (due_date_end) countQuery += ` AND DATE(sf.due_date) <= DATE(?)`;

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: fees,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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
    const db = getDatabase();
    const { student_id, description, amount, due_date } = req.body;

    // Validasyon
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

    if (description.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Aidat açıklaması en fazla 200 karakter olabilir'
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

    // Tarih kontrolü
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(due_date)) {
      return res.status(400).json({
        success: false,
        message: 'Tarih YYYY-MM-DD formatında olmalıdır'
      });
    }

    // Öğrenci varlık kontrolü
    const student = db.prepare('SELECT id, first_name, last_name FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen öğrenci bulunamadı'
      });
    }

    // Aidat ekleme
    const stmt = db.prepare(`
      INSERT INTO student_fees (student_id, description, amount, due_date, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(
      parseInt(student_id),
      description.trim(),
      parseFloat(amount),
      due_date
    );

    // Eklenen aidatı getir
    const newFee = db.prepare(`
      SELECT 
        sf.*,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      WHERE sf.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Aidat başarıyla oluşturuldu',
      data: newFee
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

// Toplu aidat oluştur (POST /bulk)
router.post('/bulk', async (req, res) => {
  try {
    const db = getDatabase();
    const { student_ids, class_names, description, amount, due_date } = req.body;

    // Validasyon
    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Aidat açıklaması en az 2 karakter olmalıdır'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar belirtmelisiniz'
      });
    }

    if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir son ödeme tarihi belirtmelisiniz (YYYY-MM-DD)'
      });
    }

    // Hedef öğrencileri belirle
    let targetStudents = [];

    if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
      // Seçili öğrenciler
      const placeholders = student_ids.map(() => '?').join(',');
      targetStudents = db.prepare(`SELECT id FROM students WHERE id IN (${placeholders})`).all(...student_ids);
    } else if (class_names && Array.isArray(class_names) && class_names.length > 0) {
      // Seçili sınıflar
      const placeholders = class_names.map(() => '?').join(',');
      targetStudents = db.prepare(`SELECT id FROM students WHERE class_name IN (${placeholders})`).all(...class_names);
    } else {
      // Tüm öğrenciler
      targetStudents = db.prepare('SELECT id FROM students').all();
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aidat atanacak öğrenci bulunamadı'
      });
    }

    // Transaction başlat
    const insertStmt = db.prepare(`
      INSERT INTO student_fees (student_id, description, amount, due_date, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    const insertMany = db.transaction((students) => {
      for (const student of students) {
        insertStmt.run(student.id, description.trim(), parseFloat(amount), due_date);
      }
    });

    insertMany(targetStudents);

    res.status(201).json({
      success: true,
      message: `${targetStudents.length} öğrenciye aidat başarıyla atandı`,
      data: {
        affected_students: targetStudents.length,
        description: description.trim(),
        amount: parseFloat(amount),
        due_date: due_date
      }
    });

  } catch (error) {
    console.error('Toplu aidat oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu aidat oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
});

// Tekil aidat getir (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    const fee = db.prepare(`
      SELECT 
        sf.*,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section,
        s.parent_name,
        s.parent_phone,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN payments p ON sf.id = p.fee_id
      WHERE sf.id = ?
      GROUP BY sf.id
    `).get(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Aidat bulunamadı'
      });
    }

    // İlgili ödemeleri de getir
    const payments = db.prepare(`
      SELECT 
        p.*,
        t.id as transaction_id,
        t.description as transaction_description
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.fee_id = ?
      ORDER BY p.created_at DESC
    `).all(id);

    res.json({
      success: true,
      data: {
        ...fee,
        payments: payments
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
    const db = getDatabase();
    const { id } = req.params;
    const { description, amount, due_date, status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    // Mevcut aidat kontrolü
    const existingFee = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id);
    if (!existingFee) {
      return res.status(404).json({
        success: false,
        message: 'Güncellenecek aidat bulunamadı'
      });
    }

    // Validasyon
    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Aidat açıklaması en az 2 karakter olmalıdır'
      });
    }

    if (description.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Aidat açıklaması en fazla 200 karakter olabilir'
      });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar belirtmelisiniz'
      });
    }

    if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir son ödeme tarihi belirtmelisiniz'
      });
    }

    if (status && !['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir durum belirtmelisiniz (pending/paid/overdue)'
      });
    }

    // Güncelleme
    const stmt = db.prepare(`
      UPDATE student_fees 
      SET description = ?, amount = ?, due_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      description.trim(),
      parseFloat(amount),
      due_date,
      status || existingFee.status,
      id
    );

    // Güncellenmiş aidatı getir
    const updatedFee = db.prepare(`
      SELECT 
        sf.*,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      WHERE sf.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'Aidat başarıyla güncellendi',
      data: updatedFee
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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    // Mevcut aidat kontrolü
    const existingFee = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id);
    if (!existingFee) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek aidat bulunamadı'
      });
    }

    // İlişkili ödemeleri kontrol et
    const relatedPayments = db.prepare('SELECT COUNT(*) as count FROM payments WHERE fee_id = ?').get(id);
    if (relatedPayments.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu aidatın ödemeleri bulunmaktadır. Önce ödemeleri siliniz.'
      });
    }

    // Aidat silme
    const stmt = db.prepare('DELETE FROM student_fees WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aidat silinemedi'
      });
    }

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

// Aidat istatistikleri
router.get('/stats/summary', async (req, res) => {
  try {
    const db = getDatabase();
    const { class_name, month } = req.query;

    let whereClause = '';
    const params = [];

    if (class_name) {
      whereClause += ' AND s.class_name = ?';
      params.push(class_name);
    }

    if (month) {
      whereClause += ' AND strftime("%Y-%m", sf.due_date) = ?';
      params.push(month);
    }

    const stats = db.prepare(`
      SELECT 
        sf.status,
        COUNT(*) as count,
        ROUND(SUM(sf.amount), 2) as total_amount,
        ROUND(SUM(COALESCE(total_paid.paid_amount, 0)), 2) as paid_amount
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN (
        SELECT fee_id, SUM(amount) as paid_amount
        FROM payments
        GROUP BY fee_id
      ) total_paid ON sf.id = total_paid.fee_id
      WHERE 1=1 ${whereClause}
      GROUP BY sf.status
    `).all(...params);

    const summary = {
      pending: { count: 0, total_amount: 0, paid_amount: 0 },
      paid: { count: 0, total_amount: 0, paid_amount: 0 },
      overdue: { count: 0, total_amount: 0, paid_amount: 0 }
    };

    stats.forEach(stat => {
      summary[stat.status] = stat;
    });

    // Toplam hesaplama
    const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalAmount = stats.reduce((sum, stat) => sum + stat.total_amount, 0);
    const totalPaid = stats.reduce((sum, stat) => sum + stat.paid_amount, 0);

    res.json({
      success: true,
      data: {
        ...summary,
        totals: {
          count: totalCount,
          total_amount: Math.round(totalAmount * 100) / 100,
          paid_amount: Math.round(totalPaid * 100) / 100,
          remaining_amount: Math.round((totalAmount - totalPaid) * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Aidat istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat istatistikleri hesaplanırken bir hata oluştu',
      error: error.message
    });
  }
});

// Geciken aidatları otomatik güncelle
router.post('/update-overdue', async (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      UPDATE student_fees 
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' AND DATE(due_date) < DATE(?)
    `);

    const result = stmt.run(today);

    res.json({
      success: true,
      message: 'Geciken aidatlar güncellendi',
      data: { updated_count: result.changes }
    });

  } catch (error) {
    console.error('Geciken aidat güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Geciken aidatlar güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;