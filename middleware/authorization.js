// Authorization Middleware
// Rol ve izin bazlı erişim kontrolü

const { supabase } = require('../database');

// Kullanıcının izinlerini kontrol et
async function checkPermission(req, res, next, requiredPermission) {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
        }

        // Kullanıcının rolünü al
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('rol_id, roles!users_rol_id_fkey(rol_adi)')
            .eq('id', req.session.userId)
            .eq('aktif', true)
            .single();

        if (userError || !user) {
            return res.status(403).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        // Admin her şeyi yapabilir
        if (user.roles && user.roles.rol_adi === 'admin') {
            return next();
        }

        // Kullanıcının iznini kontrol et
        const { data: hasPermission, error: permError } = await supabase
            .from('role_permissions')
            .select(`
                id,
                permissions!role_permissions_izin_id_fkey(izin_adi)
            `)
            .eq('rol_id', user.rol_id)
            .limit(1000);

        if (permError) {
            console.error('İzin kontrolü hatası:', permError);
            return res.status(500).json({ success: false, message: 'Yetki kontrolü başarısız' });
        }

        const userPermissions = hasPermission.map(rp => rp.permissions.izin_adi);
        
        if (userPermissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: 'Bu işlem için yetkiniz yok',
            required: requiredPermission
        });

    } catch (error) {
        console.error('Yetki kontrolü hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
}

// Rol kontrolü
async function requireRole(req, res, next, allowedRoles) {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('roles!users_rol_id_fkey(rol_adi)')
            .eq('id', req.session.userId)
            .eq('aktif', true)
            .single();

        if (error || !user || !user.roles) {
            return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
        }

        if (allowedRoles.includes(user.roles.rol_adi)) {
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: 'Bu sayfaya erişim yetkiniz yok' 
        });

    } catch (error) {
        console.error('Rol kontrolü hatası:', error);
        return res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
}

// Middleware wrapper'ları
const requirePermission = (permission) => {
    return (req, res, next) => checkPermission(req, res, next, permission);
};

const requireRoles = (roles) => {
    return (req, res, next) => requireRole(req, res, next, roles);
};

// Sadece admin
const requireAdmin = requireRoles(['admin']);

// Admin veya President (Başkan)
const requireAdminOrPresident = requireRoles(['admin', 'president']);

// Herkes (login yeterli)
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
};

module.exports = {
    requirePermission,
    requireRoles,
    requireAdmin,
    requireAdminOrPresident,
    requireAuth,
    checkPermission,
    requireRole
};
