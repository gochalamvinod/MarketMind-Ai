const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getAdminSystemStatus,
  flushCache,
  purgeNonAdminData
} = require('../controllers/settingsController');
const auth = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

// Admin-Only Master Console Routes
router.get('/admin-system', getAdminSystemStatus);
router.post('/admin-system/flush-cache', flushCache);
router.post('/admin-system/purge-data', purgeNonAdminData);

module.exports = router;
