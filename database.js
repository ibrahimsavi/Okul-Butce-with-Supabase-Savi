const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase bilgileri bulunamadı!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log(`
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('gelir', 'gider')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50),
    status VARCHAR(20) DEFAULT 'aktif',
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('gelir', 'gider')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    student_id INTEGER REFERENCES students(id),
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'beklemede',
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO categories (name, type, description) VALUES 
('Öğrenci Aidatı', 'gelir', 'Öğrencilerden alınan aidatlar'),
('Kırtasiye Gideri', 'gider', 'Okul kırtasiye malzemeleri'),
('Elektrik Faturası', 'gider', 'Elektrik giderleri'),
('Temizlik Gideri', 'gider', 'Temizlik malzemeleri');
`);
}

const db = {
    async getAllCategories() {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) throw error;
        return data;
    },
    
    async createCategory(category) {
        const { data, error } = await supabase.from('categories').insert(category).select().single();
        if (error) throw error;
        return data;
    },
    
    async getAllStudents() {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        return data;
    },
    
    async createStudent(student) {
        const { data, error } = await supabase.from('students').insert(student).select().single();
        if (error) throw error;
        return data;
    },
    
    async getAllTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name), students(name)')
            .order('transaction_date', { ascending: false });
        if (error) throw error;
        return data;
    },
    
    async createTransaction(transaction) {
        const { data, error } = await supabase.from('transactions').insert(transaction).select().single();
        if (error) throw error;
        return data;
    }
};

module.exports = { initializeDatabase, db, supabase };
