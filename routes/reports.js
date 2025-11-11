const express = require('express');
const XLSX = require('xlsx');
const multer = require('multer');
const { getDatabase } = require('../database');
const router = express.Router();

// Multer configuration for file uploads
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Sadece Excel dosyaları (.xlsx, .xls) kabul edilir.'), false);
        }
    }
});

// Mali rapor Excel export
router.get('/financial', async (req, res) => {
    try {
        const db = getDatabase();
        const { start_date, end_date } = req.query;

        let whereClause = '';
        const params = [];

        if (start_date && end_date) {
            whereClause = 'WHERE DATE(t.transaction_date) BETWEEN DATE(?) AND DATE(?)';
            params.push(start_date, end_date);
        }

        const data = db.prepare(`
            SELECT 
                c.name as kategori_adi,
                c.type as tur,
                COUNT(t.id) as islem_sayisi,
                ROUND(SUM(t.amount), 2) as toplam_tutar,
                ROUND(AVG(t.amount), 2) as ortalama_tutar
            FROM categories c
            LEFT JOIN transactions t ON c.id = t.category_id ${whereClause}
            GROUP BY c.id, c.name, c.type
            HAVING COUNT(t.id) > 0
            ORDER BY toplam_tutar DESC
        `).all(...params);

        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(data, {
            header: ['kategori_adi', 'tur', 'islem_sayisi', 'toplam_tutar', 'ortalama_tutar']
        });

        // Sütun başlıkları
        XLSX.utils.sheet_add_aoa(ws, [['Kategori Adı', 'Tür', 'İşlem Sayısı', 'Toplam Tutar (₺)', 'Ortalama Tutar (₺)']], { origin: 'A1' });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mali Rapor');

        // Buffer olarak export et
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const filename = `mali_rapor_${start_date || 'tum'}_${end_date || 'tarih'}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Mali rapor export hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mali rapor export edilirken hata oluştu',
            error: error.message
        });
    }
});

// Öğrenci raporu Excel export
router.get('/students', async (req, res) => {
    try {
        const db = getDatabase();

        const students = db.prepare(`
            SELECT 
                s.id,
                s.first_name as ad,
                s.last_name as soyad,
                s.class_name as sinif,
                s.section as sube,
                s.phone_number as telefon,
                COUNT(f.id) as toplam_aidat,
                COUNT(CASE WHEN f.status = 'paid' THEN 1 END) as odenen_aidat,
                COUNT(CASE WHEN f.status = 'pending' THEN 1 END) as bekleyen_aidat,
                COUNT(CASE WHEN f.status = 'overdue' THEN 1 END) as geciken_aidat,
                ROUND(COALESCE(SUM(CASE WHEN f.status = 'paid' THEN f.amount ELSE 0 END), 0), 2) as odenen_tutar,
                ROUND(COALESCE(SUM(CASE WHEN f.status != 'paid' THEN f.amount ELSE 0 END), 0), 2) as borc_tutari
            FROM students s
            LEFT JOIN student_fees f ON s.id = f.student_id
            GROUP BY s.id
            ORDER BY s.last_name, s.first_name
        `).all();

        const ws = XLSX.utils.json_to_sheet(students, {
            header: ['id', 'ad', 'soyad', 'sinif', 'sube', 'telefon', 'toplam_aidat', 'odenen_aidat', 'bekleyen_aidat', 'geciken_aidat', 'odenen_tutar', 'borc_tutari']
        });

        XLSX.utils.sheet_add_aoa(ws, [['ID', 'Ad', 'Soyad', 'Sınıf', 'Şube', 'Telefon', 'Toplam Aidat', 'Ödenen', 'Bekleyen', 'Geciken', 'Ödenen Tutar (₺)', 'Borç Tutarı (₺)']], { origin: 'A1' });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Öğrenci Raporu');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `ogrenci_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Öğrenci rapor export hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Öğrenci raporu export edilirken hata oluştu',
            error: error.message
        });
    }
});

// Aidat raporu Excel export
router.get('/fees', async (req, res) => {
    try {
        const db = getDatabase();

        const fees = db.prepare(`
            SELECT 
                s.first_name || ' ' || s.last_name as ogrenci_adi,
                s.class_name as sinif,
                s.section as sube,
                f.title as aidat_basligi,
                f.amount as tutar,
                f.due_date as son_odeme_tarihi,
                f.status as durum,
                CASE 
                    WHEN f.status = 'paid' THEN 'Ödendi'
                    WHEN f.status = 'pending' THEN 'Bekliyor'
                    WHEN f.status = 'overdue' THEN 'Gecikti'
                    ELSE f.status
                END as durum_tr,
                f.created_at as olusturma_tarihi,
                COALESCE(p.payment_date, '') as odeme_tarihi
            FROM student_fees f
            JOIN students s ON f.student_id = s.id
            LEFT JOIN payments p ON f.id = p.fee_id
            ORDER BY f.due_date DESC, s.last_name, s.first_name
        `).all();

        const ws = XLSX.utils.json_to_sheet(fees, {
            header: ['ogrenci_adi', 'sinif', 'sube', 'aidat_basligi', 'tutar', 'son_odeme_tarihi', 'durum_tr', 'olusturma_tarihi', 'odeme_tarihi']
        });

        XLSX.utils.sheet_add_aoa(ws, [['Öğrenci Adı', 'Sınıf', 'Şube', 'Aidat Başlığı', 'Tutar (₺)', 'Son Ödeme Tarihi', 'Durum', 'Oluşturma Tarihi', 'Ödeme Tarihi']], { origin: 'A1' });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Aidat Raporu');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `aidat_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Aidat rapor export hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Aidat raporu export edilirken hata oluştu',
            error: error.message
        });
    }
});

// Öğrenci bulk import
router.post('/import-students', upload.single('studentFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Excel dosyası yüklenmedi'
            });
        }

        const db = getDatabase();
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Excel'den JSON'a çevir
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satır başlık olduğu için atlıyoruz
        const studentData = data.slice(1).filter(row => row.length > 0 && row[0]);

        const insertStmt = db.prepare(`
            INSERT INTO students (first_name, last_name, class_name, section, phone_number)
            VALUES (?, ?, ?, ?, ?)
        `);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        db.transaction(() => {
            studentData.forEach((row, index) => {
                try {
                    const [first_name, last_name, class_name, section, phone_number] = row;
                    
                    if (!first_name || !last_name) {
                        throw new Error(`Satır ${index + 2}: Ad ve soyad zorunludur`);
                    }

                    insertStmt.run(
                        first_name.toString().trim(),
                        last_name.toString().trim(),
                        class_name ? class_name.toString().trim() : null,
                        section ? section.toString().trim() : null,
                        phone_number ? phone_number.toString().trim() : null
                    );
                    
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`Satır ${index + 2}: ${error.message}`);
                }
            });
        })();

        // Temp dosyayı sil
        const fs = require('fs');
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `${successCount} öğrenci başarıyla eklendi`,
            data: {
                successCount,
                errorCount,
                errors: errors.slice(0, 10) // İlk 10 hatayı göster
            }
        });

    } catch (error) {
        console.error('Öğrenci import hatası:', error);
        
        // Temp dosyayı sil
        if (req.file) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Temp dosya silinirken hata:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Öğrenci import edilirken hata oluştu',
            error: error.message
        });
    }
});

// Örnek Excel şablonu indir
router.get('/student-template', (req, res) => {
    try {
        const templateData = [
            ['Ad', 'Soyad', 'Sınıf', 'Şube', 'Telefon'],
            ['Ahmet', 'Yılmaz', '9A', 'A', '05551234567'],
            ['Ayşe', 'Kaya', '9B', 'B', '05559876543'],
            ['Mehmet', 'Özkan', '10A', 'A', '05556549876']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Öğrenciler');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="ogrenci_sablonu.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Şablon oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Şablon oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;