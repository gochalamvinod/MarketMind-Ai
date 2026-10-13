const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to verify JWT in Authorization header
 * Header format: Authorization: Bearer <token>
 * Attaches decoded user payload { id, ... } to req.user
 */
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route, no token provided'
      });
    }

    const JWT_SECRET = 'marketmind_ai_super_secret_jwt_key_telangana_2026';
    const secret = process.env.JWT_SECRET || JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // Attach user payload (id, email, role, etc.)
    req.user = {
      id: decoded.id || decoded._id,
      ...decoded
    };

    // If role is missing from token, populate from database
    if (!req.user.role && req.user.id) {
      try {
        const dbUser = await User.findById(req.user.id).select('role email name businessName');
        if (dbUser) {
          req.user.role = dbUser.role || 'user';
          req.user.email = dbUser.email;
        }
      } catch (dbErr) {
        // Continue with decoded user if db lookup fails
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token verification failed',
      error: error.message
    });
  }
};

module.exports = auth;
module.exports.protect = auth;
