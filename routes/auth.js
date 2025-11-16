const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Login endpoint
router.post('/login', redirectIfAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı adı ve şifre gereklidir'
            });
        }

        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
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

        // Create session
        req.session.userId = user.id;
        req.session.username = user.kullanici_adi;
        req.session.fullName = user.tam_ad;

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
                user: {
                    id: user.id,
                    username: user.kullanici_adi,
                    fullName: user.tam_ad
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
router.get('/session', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            success: true,
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                fullName: req.session.fullName
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
router.post('/change-password', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor'
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mevcut şifre ve yeni şifre gereklidir'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az 6 karakter olmalıdır'
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

        res.json({
            success: true,
            message: 'Şifreniz başarıyla değiştirildi'
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
