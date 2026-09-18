require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database');
const { validPassword } = require('../middleware/security');
(async () => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || username.length > 50 || !validPassword(password)) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (12+ characters, at most 72 UTF-8 bytes).');
  const { data: role, error } = await supabase.from('roles').select('id').eq('rol_adi', 'admin').single();
  if (error) throw error;
  const { error: insertError } = await supabase.from('users').insert({
    kullanici_adi: username, sifre_hash: await bcrypt.hash(password, 12),
    tam_ad: process.env.ADMIN_FULL_NAME || 'Sistem Yöneticisi', rol_id: role.id, aktif: true
  });
  if (insertError) throw insertError;
  console.log('Administrator created. Remove ADMIN_PASSWORD from the environment.');
})().catch(error => { console.error('Administrator creation failed:', error.message); process.exitCode = 1; });
