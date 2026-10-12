const express = require('express');
const router = express.Router();
const {
  getInsights,
  getProductAnalysis,
  getForecast,
  getRecommendations
} = require('../controllers/aiController');
const { handleChat } = require('../controllers/chatbotController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/chat', handleChat);
router.get('/insights', getInsights);
router.get('/product/:productId', getProductAnalysis);
router.get('/analysis/:productId', getProductAnalysis);
router.get('/forecast/:productId', getForecast);
router.get('/recommendations', getRecommendations);

module.exports = router;
