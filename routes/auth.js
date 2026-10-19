const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database');
const { redirectIfAuthenticated, requireAuth } = require('../middleware/auth');
const { loginLimiter, validPassword, validateInput } = require('../middleware/security');
// Logout has no payload; other authentication operations require a valid body.
router.use((req, res, next) => req.method === 'POST' && req.path === '/logout'
    ? next() : validateInput(req, res, next));

// Login endpoint
router.post('/login', loginLimiter, redirectIfAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (typeof username !== 'string' || !username.trim() || username.length > 50 || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı adı ve şifre gereklidir'
            });
        }

        // Get user from database with role
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                *,
                roles!users_rol_id_fkey(id, rol_adi, aciklama)
            `)
            .eq('kullanici_adi', username)
            .eq('aktif', true)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.sifre_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı'
            });
        }

        // Update last login
        await supabase
            .from('users')
            .update({ son_giris: new Date().toISOString() })
            .eq('id', user.id);

        // Regenerate to prevent session fixation after authentication.
        await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
        // Create session
        req.session.userId = user.id;
        req.session.authVersion = user.guncelleme_tarihi;
        req.session.username = user.kullanici_adi;
        req.session.fullName = user.tam_ad;
        req.session.role = user.roles ? user.roles.rol_adi : null;
        req.session.roleId = user.rol_id;

        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Oturum kaydedilemedi'
                });
            }

            res.json({
                success: true,
                message: 'Giriş başarılı',
                redirect: '/', // Frontend'e yönlendirme için
                user: {
                    id: user.id,
                    username: user.kullanici_adi,
                    fullName: user.tam_ad,
                    role: user.roles ? user.roles.rol_adi : null,
                    roleDescription: user.roles ? user.roles.aciklama : null
                }
            });
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Giriş işlemi sırasında bir hata oluştu'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Çıkış yapılırken bir hata oluştu'
            });
        }
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Çıkış başarılı'
        });
    });
});

// Check session endpoint
router.get('/session', requireAuth, (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            success: true,
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                fullName: req.session.fullName,
                role: req.session.role,
                roleId: req.session.roleId
            }
        });
    } else {
        res.json({
            success: true,
            authenticated: false
        });
    }
});

// Change password endpoint
router.post('/change-password', requireAuth, loginLimiter, async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor'
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (typeof currentPassword !== 'string' || !currentPassword || Buffer.byteLength(currentPassword) > 72 || typeof newPassword !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Mevcut şifre ve yeni şifre gereklidir'
            });
        }

        if (!validPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az 12 karakter ve en fazla 72 bayt olmalıdır'
            });
        }

        // Get current user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.session.userId)
            .eq('aktif', true)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.sifre_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Mevcut şifre hatalı'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                sifre_hash: newPasswordHash,
                guncelleme_tarihi: new Date().toISOString()
            })
            .eq('id', req.session.userId);

        if (updateError) {
            throw updateError;
        }

        await new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Şifreniz değiştirildi. Lütfen yeniden giriş yapın.'
        });
    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Şifre değiştirme sırasında bir hata oluştu'
        });
    }
});

module.exports = router;

