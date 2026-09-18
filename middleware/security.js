const crypto = require('node:crypto');

function validPassword(value) {
  return typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value) <= 72;
}

function sessionOptions(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || /your_|savi-butce-secret/i.test(env.SESSION_SECRET)) {
    throw new Error('SESSION_SECRET must be a random secret of at least 32 characters');
  }
  const secure = env.SESSION_COOKIE_SECURE !== undefined ? env.SESSION_COOKIE_SECURE === 'true' : env.NODE_ENV === 'production';
  if (env.NODE_ENV === 'production' && !secure) throw new Error('Production requires secure session cookies');
  return { secret: env.SESSION_SECRET, resave: false, saveUninitialized: false,
    cookie: { secure, httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 } };
}

function requestSecurity(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  res.setHeader('Cache-Control', 'no-store');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Browser mutations must originate from this application, including login/logout.
  // JSON-only requests without browser origin metadata remain usable by API clients.
  const origin = req.get('origin');
  const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`;
  if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expected) ||
      (!origin && !req.is('application/json'))) {
    return res.status(403).json({ success: false, message: 'İsteğin kaynağı doğrulanamadı' });
  }
  next();
}

function createLoginLimiter({ max = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of attempts) if (value.reset <= time) attempts.delete(key);
    // Hash the key to avoid retaining IP addresses in the limiter map.
    const key = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
    let entry = attempts.get(key);
    if (!entry) {
      if (attempts.size >= 10000) return res.status(429).json({ message: 'Lütfen daha sonra tekrar deneyin' });
      entry = { count: 0, reset: time + windowMs };
      attempts.set(key, entry);
    }
    if (++entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - time) / 1000)));
      return res.status(429).json({ success: false, message: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' });
    }
    next();
  };
}

function validateInput(req, res, next) {
  const fail = () => res.status(400).json({ success: false, message: 'Geçersiz alan, tutar, tarih veya sayfalama değeri' });
  const integer = value => /^(0|[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value));
  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value !== 'string' || value.length > 250) return fail();
    if (key === 'limit' && (!integer(value) || +value < 1 || +value > 1000)) return fail();
    if (key === 'offset' && (!integer(value) || +value > 1000000)) return fail();
    if (key.endsWith('_id') && (!integer(value) || +value < 1)) return fail();
  }
  const body = req.body;
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && body === undefined) return fail();
  if (body !== undefined && (body === null || typeof body !== 'object' || Array.isArray(body))) return fail();
  for (const [key, value] of Object.entries(body || {})) {
    if (value == null) continue;
    if (key === 'aktif') { if (typeof value !== 'boolean') return fail(); continue; }
    if (['student_ids', 'class_names'].includes(key)) {
      if (!Array.isArray(value) || value.length > 500 || value.some(v => key === 'student_ids' ? !integer(v) || +v < 1 : typeof v !== 'string' || v.length > 100)) return fail();
      continue;
    }
    if (!['string', 'number', 'boolean'].includes(typeof value)) return fail();
    if (typeof value === 'string' && value.length > 5000) return fail();
    if (key === 'amount' && (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(value)) || !Number.isFinite(+value) || +value <= 0 || +value > 9999999999.99)) return fail();
    if (key.endsWith('_id') && value !== '' && (!integer(value) || +value < 1)) return fail();
    if (['name','description','first_name','last_name','class_name','section','student_number','parent_name','parent_phone','parent_email','address','notes','receipt_number','kullanici_adi','tam_ad','eposta'].includes(key) && typeof value !== 'string') return fail();
  }
  for (const [key, value] of Object.entries({ ...req.query, ...body })) {
    if ((key.endsWith('_date') || ['due_date_start', 'due_date_end'].includes(key)) && value && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return fail();
  }
  next();
}

module.exports = { validPassword, sessionOptions, requestSecurity, validateInput, createLoginLimiter, loginLimiter: createLoginLimiter() };
