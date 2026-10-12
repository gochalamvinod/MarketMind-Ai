const express = require('express');
const router = express.Router();
const {
  getMarketPrices,
  getLatestPrices,
  getPriceHistory,
  addManualPrice,
  fetchNow,
  getApiStatus
} = require('../controllers/marketPriceController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getMarketPrices);
router.get('/latest', getLatestPrices);
router.get('/status', getApiStatus);
router.get('/history/:productId', getPriceHistory);
router.post('/manual', addManualPrice);
router.post('/fetch-now', fetchNow);
router.post('/fetch', fetchNow);

module.exports = router;
