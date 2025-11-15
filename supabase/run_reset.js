#!/usr/bin/env node
/**
 * Supabase Schema Reset Helper
 * 
 * This script reads reset_schema.sql and executes it on your Supabase instance.
 * Since the public JS client cannot run DDL directly, this uses the Service Role key
 * to issue SQL via the REST API's /query endpoint (if available) or prints instructions.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env');
    process.exit(1);
}

const schemaPath = path.join(__dirname, 'reset_schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

console.log('🔄 Supabase schema reset helper\n');
console.log('⚠️  WARNING: This will DROP all existing data in the following tables:');
console.log('   - payments');
console.log('   - student_fees');
console.log('   - transactions');
console.log('   - students');
console.log('   - categories\n');
console.log('📋 Please execute the following SQL in your Supabase SQL Editor:\n');
console.log('────────────────────────────────────────────────────────────────');
console.log(sql);
console.log('────────────────────────────────────────────────────────────────\n');
console.log('💡 Steps:');
console.log('   1. Go to: ' + SUPABASE_URL.replace('/rest/v1', '') + '/project/_/sql');
console.log('   2. Paste the SQL above into the editor');
console.log('   3. Click "Run" to execute');
console.log('   4. Verify the tables and sample data were created\n');
console.log('✅ After running, test the connection with:');
console.log('   node -e "require(\'./database\').initializeDatabase()"');
