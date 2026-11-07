const crypto = require('crypto');

let cachedRandomSecret = null;

/**
 * Retrieves the JWT secret from environment variables.
 * If missing, logs a loud error and returns a cached random per-process secret.
 * @returns {string} JWT secret
 */
const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (!cachedRandomSecret) {
    console.error(
      '********************************************************************************\n' +
      '[SECURITY WARNING] JWT_SECRET environment variable is not defined!\n' +
      'Using a randomly generated per-process secret.\n' +
      'Tokens will be invalidated when the server restarts.\n' +
      'Please set JWT_SECRET in your production environment variables.\n' +
      '********************************************************************************'
    );
    cachedRandomSecret = crypto.randomBytes(48).toString('hex');
  }

  return cachedRandomSecret;
};

module.exports = {
  getJwtSecret
};
