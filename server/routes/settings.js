const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const auth = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
