const { supabase } = require('../database');

async function requireAuth(req, res, next) {
  const deny = () => req.path.startsWith('/api/') || req.baseUrl?.startsWith('/api/')
    ? res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' })
    : res.redirect('/login.html');
  if (!req.session?.userId) return deny();
  try {
    const { data: user, error } = await supabase.from('users')
      .select('id, aktif, guncelleme_tarihi').eq('id', req.session.userId).single();
    if (error) return res.status(503).json({ success: false, message: 'Oturum doğrulanamadı' });
    if (!user?.aktif || req.session.authVersion !== user.guncelleme_tarihi) {
      return req.session.destroy(() => { res.clearCookie('connect.sid'); deny(); });
    }
    next();
  } catch (error) { next(error); }
}
function redirectIfAuthenticated(req, res, next) {
  // Reauthentication is allowed and always rotates the session ID.
  next();
}
module.exports = { requireAuth, redirectIfAuthenticated };
