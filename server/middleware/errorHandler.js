/**
 * Global centralized error handling middleware
 * Handles Mongoose validation errors, duplicate key errors, cast errors, and unhandled exceptions
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Log error stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Details]:', err);
  } else {
    console.error(`[Error]: ${err.message}`);
  }

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error.message = message;
    statusCode = 404;
  }

  // Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    error.message = message;
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error.message = message;
    statusCode = 400;
  }

  // JsonWebTokenError / TokenExpiredError
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid authentication token';
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    error.message = 'Authentication token has expired';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
