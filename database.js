const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase bilgileri bulunamadı!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const schemaSQLPath = path.join(__dirname, 'supabase', 'reset_schema.sql');

function loadSchemaSQL() {
    try {
        return fs.readFileSync(schemaSQLPath, 'utf8');
    } catch (error) {
        console.error('❌ Supabase şema dosyası okunamadı:', error.message);
        return null;
    }
}

async function initializeDatabase() {
    try {
        console.log('🔄 Supabase bağlantısı test ediliyor...');
        
        const { data, error } = await supabase
            .from('categories')
            .select('count', { count: 'exact', head: true });
        
        if (error && error.code === '42P01') {
            console.log('❌ Tablolar bulunamadı.');
            console.log('📋 SQL komutlarını Supabase Dashboard\'da çalıştırın.\n');
            printSQL();
            return false;
        } else if (error) {
            console.error('❌ Hata:', error.message);
            return false;
        }
        
        console.log('✅ Supabase bağlantısı başarılı!');
        return true;
    } catch (error) {
        console.error('❌ Bağlantı hatası:', error.message);
        return false;
    }
}

function printSQL() {
    const sql = loadSchemaSQL();
    if (!sql) {
        console.log('⚠️ Şema SQL içeriği bulunamadı.');
        return;
    }
    console.log(sql);
}

const categorySelect = 'id, kategori_adi:name, tur:type, aciklama:description, olusturma_tarihi:created_at, guncelleme_tarihi:updated_at';
const studentSelect = `id,
    ogrenci_numarasi:student_number,
    ad:first_name,
    soyad:last_name,
    sinif:class_name,
    sube:section,
    durum:status,
    veli_adi:parent_name,
    veli_telefonu:parent_phone,
    veli_eposta:parent_email,
    adres:address,
    olusturma_tarihi:created_at,
    guncelleme_tarihi:updated_at`;
const transactionSelect = `id,
    islem_turu:type,
    tutar:amount,
    aciklama:description,
    kategori_id,
    ogrenci_id,
    islem_tarihi:transaction_date,
    notlar:notes,
    olusturma_tarihi:created_at,
    guncelleme_tarihi:updated_at`;

const db = {
    async getAllCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select(categorySelect)
            .order('kategori_adi');
        if (error) throw error;
        return data;
    },
    
    async createCategory(category) {
        const payload = {
            kategori_adi: category.name,
            tur: category.type,
            aciklama: category.description ?? null
        };
        const { data, error } = await supabase
            .from('categories')
            .insert(payload)
            .select(categorySelect)
            .single();
        if (error) throw error;
        return data;
    },
    
    async getAllStudents() {
        const { data, error } = await supabase
            .from('students')
            .select(studentSelect)
            .order('ad');
        if (error) throw error;
        return data;
    },
    
    async createStudent(student) {
        const payload = {
            ogrenci_numarasi: student.student_number ?? null,
            ad: student.first_name,
            soyad: student.last_name,
            sinif: student.class_name,
            sube: student.section ?? null,
            veli_adi: student.parent_name ?? null,
            veli_telefonu: student.parent_phone ?? null,
            veli_eposta: student.parent_email ?? null,
            adres: student.address ?? null
        };
        const { data, error } = await supabase
            .from('students')
            .insert(payload)
            .select(studentSelect)
            .single();
        if (error) throw error;
        return data;
    },
    
    async getAllTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select(`${transactionSelect}, categories!transactions_kategori_id_fkey(${categorySelect}), students!transactions_ogrenci_id_fkey(${studentSelect})`)
            .order('islem_tarihi', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    async createTransaction(transaction) {
        const payload = {
            islem_turu: transaction.type,
            tutar: transaction.amount,
            aciklama: transaction.description,
            kategori_id: transaction.category_id ?? null,
            ogrenci_id: transaction.student_id ?? null,
            islem_tarihi: transaction.transaction_date,
            notlar: transaction.notes ?? null
        };
        const { data, error } = await supabase
            .from('transactions')
            .insert(payload)
            .select(transactionSelect)
            .single();
        if (error) throw error;
        return data;
    }
};
module.exports = { initializeDatabase, db, supabase, loadSchemaSQL };
