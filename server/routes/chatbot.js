const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatbotController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', handleChat);
router.post('/message', handleChat);

module.exports = router;
