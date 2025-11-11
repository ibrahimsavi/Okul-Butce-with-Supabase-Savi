const express = require('express');
const { getDatabase } = require('../database');
const router = express.Router();

// Ping endpoint
router.get('/ping', (req, res) => {
  res.json({ message: 'Transactions API çalışıyor', timestamp: new Date().toISOString() });
});

// İşlemleri listele (GET /)
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { 
      category_id, 
      type, 
      start_date, 
      end_date, 
      limit = 50, 
      offset = 0,
      search 
    } = req.query;

    let query = `
      SELECT 
        t.id,
        t.type,
  t.amount,
  t.description,
  t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtreler
    if (category_id) {
      query += ` AND t.category_id = ?`;
      params.push(category_id);
    }

    if (type && ['gelir', 'gider'].includes(type)) {
      query += ` AND t.type = ?`;
      params.push(type);
    }

    if (start_date) {
      query += ` AND DATE(t.transaction_date) >= DATE(?)`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(t.transaction_date) <= DATE(?)`;
      params.push(end_date);
    }

    if (search) {
      query += ` AND (t.description LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sıralama ve sayfalama
    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const transactions = db.prepare(query).all(...params);

    // Toplam sayı için ayrı sorgu
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // limit ve offset hariç

    if (category_id) countQuery += ` AND t.category_id = ?`;
    if (type && ['gelir', 'gider'].includes(type)) countQuery += ` AND t.type = ?`;
    if (start_date) countQuery += ` AND DATE(t.transaction_date) >= DATE(?)`;
    if (end_date) countQuery += ` AND DATE(t.transaction_date) <= DATE(?)`;
    if (search) countQuery += ` AND (t.description LIKE ? OR c.name LIKE ?)`;

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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
    const db = getDatabase();
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

    if (description.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Açıklama en fazla 500 karakter olabilir'
      });
    }

    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori seçmelisiniz'
      });
    }

    // Kategori varlık kontrolü
    const category = db.prepare('SELECT id, name, type FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    // Kategori türü ile işlem türü uyumlu mu?
    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: `Seçilen kategori "${category.name}" ${category.type} türündedir, ${type} işlemi için uygun değil`
      });
    }

    // Tarih kontrolü
    let finalDate = transaction_date;
    if (!finalDate) {
      finalDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(finalDate)) {
        return res.status(400).json({
          success: false,
          message: 'Tarih YYYY-MM-DD formatında olmalıdır'
        });
      }
    }

    // İşlem ekleme
    const stmt = db.prepare(`
  INSERT INTO transactions (type, amount, description, category_id, transaction_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      type,
      parseFloat(amount),
      description.trim(),
      parseInt(category_id),
      finalDate
    );

    // Eklenen işlemi getir
    const newTransaction = db.prepare(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.created_at,
        c.id as category_id,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'İşlem başarıyla oluşturuldu',
      data: newTransaction
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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    const transaction = db.prepare(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'İşlem bulunamadı'
      });
    }

    res.json({
      success: true,
      data: transaction
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
    const db = getDatabase();
    const { id } = req.params;
  const { type, amount, description, category_id, transaction_date } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    // Mevcut işlem kontrolü
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Güncellenecek işlem bulunamadı'
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

    if (description.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Açıklama en fazla 500 karakter olabilir'
      });
    }

    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori seçmelisiniz'
      });
    }

    // Kategori varlık kontrolü
    const category = db.prepare('SELECT id, name, type FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    if (category.type !== type) {
      return res.status(400).json({
        success: false,
        message: `Seçilen kategori "${category.name}" ${category.type} türündedir, ${type} işlemi için uygun değil`
      });
    }

    // Tarih kontrolü
    let finalDate = transaction_date || existingTransaction.transaction_date;
    if (transaction_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(finalDate)) {
        return res.status(400).json({
          success: false,
          message: 'Tarih YYYY-MM-DD formatında olmalıdır'
        });
      }
    }

    // Güncelleme
    const stmt = db.prepare(`
      UPDATE transactions 
      SET type = ?, amount = ?, description = ?, category_id = ?, transaction_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      type,
      parseFloat(amount),
      description.trim(),
      parseInt(category_id),
      finalDate,
      id
    );

    // Güncellenmiş işlemi getir
    const updatedTransaction = db.prepare(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'İşlem başarıyla güncellendi',
      data: updatedTransaction
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
    const db = getDatabase();
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir işlem ID belirtmelisiniz'
      });
    }

    // Mevcut işlem kontrolü
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Silinecek işlem bulunamadı'
      });
    }

    // İşlem silme
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'İşlem silinemedi'
      });
    }

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
    const db = getDatabase();
    const { start_date, end_date } = req.query;

    let dateCondition = '';
    const params = [];

    if (start_date && end_date) {
      dateCondition = 'WHERE DATE(transaction_date) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateCondition = 'WHERE DATE(transaction_date) >= DATE(?)';
      params.push(start_date);
    } else if (end_date) {
      dateCondition = 'WHERE DATE(transaction_date) <= DATE(?)';
      params.push(end_date);
    }

    const summary = db.prepare(`
      SELECT 
        type,
        COUNT(*) as transaction_count,
        ROUND(SUM(amount), 2) as total_amount,
        ROUND(AVG(amount), 2) as average_amount
      FROM transactions 
      ${dateCondition}
      GROUP BY type
    `).all(...params);

    const totals = {
      gelir: { transaction_count: 0, total_amount: 0, average_amount: 0 },
      gider: { transaction_count: 0, total_amount: 0, average_amount: 0 }
    };

    summary.forEach(item => {
      totals[item.type] = item;
    });

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