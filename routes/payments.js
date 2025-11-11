const express = require('express');
const { getDatabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Payments API çalışıyor', timestamp: new Date().toISOString() });
});

// Ödemeleri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { 
      fee_id, 
      student_id, 
      class_name,
      date_start, 
      date_end,
      payment_method,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.receipt_number,
        p.notes,
        p.created_at,
        p.updated_at,
        sf.id as fee_id,
        sf.description as fee_description,
        sf.amount as fee_amount,
        sf.due_date as fee_due_date,
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section,
        t.id as transaction_id,
        t.description as transaction_description
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtreler
    if (fee_id) {
      query += ` AND p.fee_id = ?`;
      params.push(fee_id);
    }

    if (student_id) {
      query += ` AND s.id = ?`;
      params.push(student_id);
    }

    if (class_name) {
      query += ` AND s.class_name LIKE ?`;
      params.push(`%${class_name}%`);
    }

    if (date_start) {
      query += ` AND DATE(p.payment_date) >= DATE(?)`;
      params.push(date_start);
    }

    if (date_end) {
      query += ` AND DATE(p.payment_date) <= DATE(?)`;
      params.push(date_end);
    }

    if (payment_method && ['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) {
      query += ` AND p.payment_method = ?`;
      params.push(payment_method);
    }

    // Sıralama ve sayfalama
    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const payments = db.prepare(query).all(...params);

    // Toplam sayı için ayrı sorgu
    let countQuery = `
      SELECT COUNT(p.id) as total
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // limit ve offset hariç

    if (fee_id) countQuery += ` AND p.fee_id = ?`;
    if (student_id) countQuery += ` AND s.id = ?`;
    if (class_name) countQuery += ` AND s.class_name LIKE ?`;
    if (date_start) countQuery += ` AND DATE(p.payment_date) >= DATE(?)`;
    if (date_end) countQuery += ` AND DATE(p.payment_date) <= DATE(?)`;
    if (payment_method && ['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) countQuery += ` AND p.payment_method = ?`;

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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
    const db = getDatabase();
    const { 
      fee_id, 
      amount, 
      payment_date, 
      payment_method, 
      receipt_number, 
      notes,
      create_transaction = true 
    } = req.body;

    // Validasyon
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

    // Tarih kontrolü
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payment_date)) {
      return res.status(400).json({
        success: false,
        message: 'Ödeme tarihi YYYY-MM-DD formatında olmalıdır'
      });
    }

    if (!payment_method || !['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme yöntemi seçmelisiniz (cash/bank_transfer/credit_card/check)'
      });
    }

    // Aidat varlık ve tutar kontrolü
    const fee = db.prepare(`
      SELECT 
        sf.*,
        s.first_name,
        s.last_name,
        s.class_name,
        s.section,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM student_fees sf
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN payments p ON sf.id = p.fee_id
      WHERE sf.id = ?
      GROUP BY sf.id
    `).get(fee_id);

    if (!fee) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen aidat bulunamadı'
      });
    }

    const remainingAmount = fee.amount - fee.paid_amount;
    if (parseFloat(amount) > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Ödeme tutarı kalan borcu aşamaz. Kalan borç: ${remainingAmount} TL`
      });
    }

    // Transaction başlat
    const transaction = db.transaction((paymentData) => {
      let transactionId = null;

      // İsteniyorsa transaction oluştur
      if (create_transaction) {
        const transactionStmt = db.prepare(`
          INSERT INTO transactions (description, amount, type, category_id, transaction_date)
          VALUES (?, ?, 'gelir', ?, ?)
        `);

        // Varsayılan gelir kategorisi al
        const defaultCategory = db.prepare("SELECT id FROM categories WHERE type = 'gelir' LIMIT 1").get();
        
        if (defaultCategory) {
          const transactionResult = transactionStmt.run(
            `Aidat Ödemesi - ${fee.first_name} ${fee.last_name} - ${fee.description}`,
            parseFloat(amount),
            defaultCategory.id,
            payment_date
          );
          transactionId = transactionResult.lastInsertRowid;
        }
      }

      // Ödeme kaydını oluştur
      const paymentStmt = db.prepare(`
        INSERT INTO payments (fee_id, amount, payment_date, payment_method, receipt_number, notes, transaction_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const paymentResult = paymentStmt.run(
        parseInt(fee_id),
        parseFloat(amount),
        payment_date,
        payment_method,
        receipt_number || null,
        notes || null,
        transactionId
      );

      // Aidat durumunu güncelle
      const newPaidAmount = fee.paid_amount + parseFloat(amount);
      const newStatus = newPaidAmount >= fee.amount ? 'paid' : 'pending';
      
      db.prepare(`
        UPDATE student_fees 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newStatus, fee_id);

      return {
        paymentId: paymentResult.lastInsertRowid,
        transactionId,
        newStatus,
        totalPaid: newPaidAmount
      };
    });

    const result = transaction({ fee_id, amount, payment_date, payment_method, receipt_number, notes });

    // Oluşturulan ödemeyi getir
    const newPayment = db.prepare(`
      SELECT 
        p.*,
        sf.description as fee_description,
        sf.amount as fee_amount,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      WHERE p.id = ?
    `).get(result.paymentId);

    res.status(201).json({
      success: true,
      message: 'Ödeme başarıyla kaydedildi',
      data: {
        ...newPayment,
        fee_status: result.newStatus,
        total_paid: result.totalPaid,
        transaction_created: !!result.transactionId
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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme ID belirtmelisiniz'
      });
    }

    const payment = db.prepare(`
      SELECT 
        p.*,
        sf.id as fee_id,
        sf.description as fee_description,
        sf.amount as fee_amount,
        sf.due_date as fee_due_date,
        sf.status as fee_status,
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name,
        s.section,
        t.id as transaction_id,
        t.description as transaction_description
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.id = ?
    `).get(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    res.json({
      success: true,
      data: payment
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

// Ödeme güncelle (PUT /:id)
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { amount, payment_date, payment_method, receipt_number, notes } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme ID belirtmelisiniz'
      });
    }

    // Mevcut ödeme kontrolü
    const existingPayment = db.prepare(`
      SELECT 
        p.*,
        sf.amount as fee_amount,
        COALESCE(SUM(other_p.amount), 0) as other_payments
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      LEFT JOIN payments other_p ON sf.id = other_p.fee_id AND other_p.id != p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id);

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Güncellenecek ödeme bulunamadı'
      });
    }

    // Validasyon
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme tutarı belirtmelisiniz'
      });
    }

    if (!payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme tarihi belirtmelisiniz (YYYY-MM-DD)'
      });
    }

    if (!payment_method || !['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme yöntemi seçmelisiniz'
      });
    }

    // Tutar kontrolü (diğer ödemeler + yeni tutar <= aidat tutarı)
    const totalPayments = existingPayment.other_payments + parseFloat(amount);
    if (totalPayments > existingPayment.fee_amount) {
      return res.status(400).json({
        success: false,
        message: `Toplam ödeme aidat tutarını aşamaz. Maksimum: ${existingPayment.fee_amount - existingPayment.other_payments} TL`
      });
    }

    // Transaction başlat
    const transaction = db.transaction(() => {
      // Ödemeyi güncelle
      const updateStmt = db.prepare(`
        UPDATE payments 
        SET amount = ?, payment_date = ?, payment_method = ?, receipt_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateStmt.run(
        parseFloat(amount),
        payment_date,
        payment_method,
        receipt_number || null,
        notes || null,
        id
      );

      // İlişkili transaction'ı güncelle (eğer varsa)
      if (existingPayment.transaction_id) {
        db.prepare(`
          UPDATE transactions 
          SET amount = ?, transaction_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(parseFloat(amount), payment_date, existingPayment.transaction_id);
      }

      // Aidat durumunu güncelle
      const newStatus = totalPayments >= existingPayment.fee_amount ? 'paid' : 'pending';
      db.prepare(`
        UPDATE student_fees 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newStatus, existingPayment.fee_id);

      return { newStatus, totalPaid: totalPayments };
    });

    const result = transaction();

    // Güncellenmiş ödemeyi getir
    const updatedPayment = db.prepare(`
      SELECT 
        p.*,
        sf.description as fee_description,
        s.first_name,
        s.last_name,
        s.student_number,
        s.class_name
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      WHERE p.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'Ödeme başarıyla güncellendi',
      data: {
        ...updatedPayment,
        fee_status: result.newStatus,
        total_paid: result.totalPaid
      }
    });

  } catch (error) {
    console.error('Ödeme güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Ödeme sil (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir ödeme ID belirtmelisiniz'
      });
    }

    // Mevcut ödeme kontrolü
    const existingPayment = db.prepare(`
      SELECT 
        p.*,
        sf.amount as fee_amount,
        COALESCE(SUM(other_p.amount), 0) as other_payments
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      LEFT JOIN payments other_p ON sf.id = other_p.fee_id AND other_p.id != p.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id);

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek ödeme bulunamadı'
      });
    }

    // Transaction başlat
    const transaction = db.transaction(() => {
      // İlişkili transaction'ı sil (eğer varsa)
      if (existingPayment.transaction_id) {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(existingPayment.transaction_id);
      }

      // Ödemeyi sil
      db.prepare('DELETE FROM payments WHERE id = ?').run(id);

      // Aidat durumunu güncelle
      const remainingAmount = existingPayment.other_payments;
      const newStatus = remainingAmount >= existingPayment.fee_amount ? 'paid' : 
                       remainingAmount > 0 ? 'pending' : 'pending';
      
      db.prepare(`
        UPDATE student_fees 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newStatus, existingPayment.fee_id);

      return { newStatus, remainingPaid: remainingAmount };
    });

    const result = transaction();

    res.json({
      success: true,
      message: 'Ödeme başarıyla silindi',
      data: {
        deletedId: parseInt(id),
        fee_id: existingPayment.fee_id,
        new_status: result.newStatus,
        remaining_paid: result.remainingPaid,
        transaction_deleted: !!existingPayment.transaction_id
      }
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

// Aidata göre ödeme özeti (GET /by-fee/:fee_id)
router.get('/by-fee/:fee_id', async (req, res) => {
  try {
    const db = getDatabase();
    const { fee_id } = req.params;

    if (isNaN(fee_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir aidat ID belirtmelisiniz'
      });
    }

    // Aidat bilgisi
    const fee = db.prepare(`
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
    `).get(fee_id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Aidat bulunamadı'
      });
    }

    // Ödemeler
    const payments = db.prepare(`
      SELECT 
        p.*,
        t.description as transaction_description
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.fee_id = ?
      ORDER BY p.payment_date DESC
    `).all(fee_id);

    // Özet hesaplama
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = fee.amount - totalPaid;
    const isFullyPaid = remainingAmount <= 0;

    res.json({
      success: true,
      data: {
        fee_info: fee,
        payments: payments,
        summary: {
          total_amount: fee.amount,
          total_paid: totalPaid,
          remaining_amount: remainingAmount,
          is_fully_paid: isFullyPaid,
          payment_count: payments.length
        }
      }
    });

  } catch (error) {
    console.error('Aidat ödeme özeti hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aidat ödeme özeti alınırken bir hata oluştu',
      error: error.message
    });
  }
});

// Ödeme istatistikleri (GET /stats/summary)
router.get('/stats/summary', async (req, res) => {
  try {
    const db = getDatabase();
    const { month, payment_method, class_name } = req.query;

    let whereClause = '';
    const params = [];

    if (month) {
      whereClause += ' AND strftime("%Y-%m", p.payment_date) = ?';
      params.push(month);
    }

    if (payment_method && ['cash', 'bank_transfer', 'credit_card', 'check'].includes(payment_method)) {
      whereClause += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (class_name) {
      whereClause += ' AND s.class_name = ?';
      params.push(class_name);
    }

    const stats = db.prepare(`
      SELECT 
        p.payment_method,
        COUNT(*) as payment_count,
        ROUND(SUM(p.amount), 2) as total_amount,
        ROUND(AVG(p.amount), 2) as average_amount,
        MIN(p.payment_date) as earliest_payment,
        MAX(p.payment_date) as latest_payment
      FROM payments p
      INNER JOIN student_fees sf ON p.fee_id = sf.id
      INNER JOIN students s ON sf.student_id = s.id
      WHERE 1=1 ${whereClause}
      GROUP BY p.payment_method
    `).all(...params);

    // Toplam hesaplama
    const totalPayments = stats.reduce((sum, stat) => sum + stat.payment_count, 0);
    const totalAmount = stats.reduce((sum, stat) => sum + stat.total_amount, 0);

    res.json({
      success: true,
      data: {
        by_method: stats,
        totals: {
          payment_count: totalPayments,
          total_amount: Math.round(totalAmount * 100) / 100,
          average_amount: totalPayments > 0 ? Math.round((totalAmount / totalPayments) * 100) / 100 : 0
        }
      }
    });

  } catch (error) {
    console.error('Ödeme istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme istatistikleri hesaplanırken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;