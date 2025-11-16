// Authentication Middleware

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    
    // If it's an API request, send JSON response
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Oturum açmanız gerekiyor'
        });
    }
    
    // Otherwise redirect to login
    res.redirect('/login.html');
}

function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    next();
}

module.exports = {
    requireAuth,
    redirectIfAuthenticated
};
