// Admin Panel Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { supabase } = require('../database');
const { requireAdmin } = require('../middleware/authorization');

// Tüm route'lar admin yetkisi gerektiriyor
router.use(requireAdmin);

// 1. Tüm kullanıcıları listele
router.get('/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                id,
                kullanici_adi,
                tam_ad,
                eposta,
                aktif,
                son_giris,
                olusturma_tarihi,
                roles!users_rol_id_fkey(id, rol_adi, aciklama)
            `)
            .order('olusturma_tarihi', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Kullanıcılar getirilemedi' });
    }
});

// 2. Yeni kullanıcı ekle
router.post('/users', async (req, res) => {
    try {
        const { kullanici_adi, sifre, tam_ad, eposta, rol_id, aktif = true } = req.body;

        // Validasyon
        if (!kullanici_adi || !sifre || !tam_ad || !rol_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanıcı adı, şifre, tam ad ve rol zorunludur' 
            });
        }

        // Kullanıcı adı kontrolü
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('kullanici_adi', kullanici_adi)
            .single();

        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor' 
            });
        }

        // Şifreyi hashle
        const sifre_hash = await bcrypt.hash(sifre, 10);

        // Kullanıcı ekle
        const { data, error } = await supabase
            .from('users')
            .insert({
                kullanici_adi,
                sifre_hash,
                tam_ad,
                eposta,
                rol_id,
                aktif
            })
            .select(`
                id,
                kullanici_adi,
                tam_ad,
                eposta,
                aktif,
                olusturma_tarihi,
                roles!users_rol_id_fkey(id, rol_adi, aciklama)
            `)
            .single();

        if (error) throw error;

        res.json({ success: true, message: 'Kullanıcı başarıyla eklendi', data });
    } catch (error) {
        console.error('Kullanıcı ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı eklenemedi' });
    }
});

// 3. Kullanıcı güncelle
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { kullanici_adi, tam_ad, eposta, rol_id, aktif } = req.body;

        // Kendi hesabını pasif edemez
        if (req.session.userId === parseInt(id) && aktif === false) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kendi hesabınızı pasif yapamazsınız' 
            });
        }

        const updateData = {};
        if (kullanici_adi) updateData.kullanici_adi = kullanici_adi;
        if (tam_ad) updateData.tam_ad = tam_ad;
        if (eposta !== undefined) updateData.eposta = eposta;
        if (rol_id) updateData.rol_id = rol_id;
        if (aktif !== undefined) updateData.aktif = aktif;
        updateData.guncelleme_tarihi = new Date().toISOString();

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select(`
                id,
                kullanici_adi,
                ad,
                soyad,
                eposta,
                aktif,
                olusturma_tarihi,
                roles!users_rol_id_fkey(id, rol_adi, aciklama)
            `)
            .single();

        if (error) throw error;

        res.json({ success: true, message: 'Kullanıcı başarıyla güncellendi', data });
    } catch (error) {
        console.error('Kullanıcı güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı güncellenemedi' });
    }
});

// 4. Kullanıcı şifresi değiştir
router.put('/users/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { yeni_sifre } = req.body;

        if (!yeni_sifre || yeni_sifre.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Şifre en az 6 karakter olmalıdır' 
            });
        }

        const sifre_hash = await bcrypt.hash(yeni_sifre, 10);

        const { error } = await supabase
            .from('users')
            .update({ 
                sifre_hash,
                guncelleme_tarihi: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({ success: false, message: 'Şifre değiştirilemedi' });
    }
});

// 5. Kullanıcı sil
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Kendi hesabını silemez
        if (req.session.userId === parseInt(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kendi hesabınızı silemezsiniz' 
            });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Kullanıcı başarıyla silindi' });
    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı silinemedi' });
    }
});

// 6. Tüm rolleri listele
router.get('/roles', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('rol_adi');

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Rol listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Roller getirilemedi' });
    }
});

// 7. Tüm izinleri listele
router.get('/permissions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .order('kategori, izin_adi');

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('İzin listesi hatası:', error);
        res.status(500).json({ success: false, message: 'İzinler getirilemedi' });
    }
});

// 8. Belirli bir rolün izinlerini getir
router.get('/roles/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('role_permissions')
            .select(`
                id,
                permissions!role_permissions_izin_id_fkey(id, izin_adi, kategori, aciklama)
            `)
            .eq('rol_id', id);

        if (error) throw error;

        const permissions = data.map(rp => rp.permissions);

        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('Rol izinleri hatası:', error);
        res.status(500).json({ success: false, message: 'Rol izinleri getirilemedi' });
    }
});

// 9. Role izin ekle
router.post('/roles/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { izin_id } = req.body;

        if (!izin_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'İzin ID gereklidir' 
            });
        }

        const { data, error } = await supabase
            .from('role_permissions')
            .insert({ rol_id: id, izin_id })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Duplicate key
                return res.status(400).json({ 
                    success: false, 
                    message: 'Bu izin zaten eklenmiş' 
                });
            }
            throw error;
        }

        res.json({ success: true, message: 'İzin başarıyla eklendi', data });
    } catch (error) {
        console.error('İzin ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'İzin eklenemedi' });
    }
});

// 10. Rolden izin kaldır
router.delete('/roles/:roleId/permissions/:permissionId', async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;

        const { error } = await supabase
            .from('role_permissions')
            .delete()
            .eq('rol_id', roleId)
            .eq('izin_id', permissionId);

        if (error) throw error;

        res.json({ success: true, message: 'İzin başarıyla kaldırıldı' });
    } catch (error) {
        console.error('İzin kaldırma hatası:', error);
        res.status(500).json({ success: false, message: 'İzin kaldırılamadı' });
    }
});

// 11. İstatistikler
router.get('/stats', async (req, res) => {
    try {
        const [users, roles, permissions] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('roles').select('id', { count: 'exact', head: true }),
            supabase.from('permissions').select('id', { count: 'exact', head: true })
        ]);

        res.json({ 
            success: true, 
            data: {
                total_users: users.count || 0,
                total_roles: roles.count || 0,
                total_permissions: permissions.count || 0
            }
        });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ success: false, message: 'İstatistikler alınamadı' });
    }
});

module.exports = router;
