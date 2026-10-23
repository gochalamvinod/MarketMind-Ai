const express = require('express');
const router = express.Router();
const {
  inventoryReport,
  purchaseReport,
  salesReport,
  profitReport,
  priceHistoryReport,
  exportCsv
} = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/inventory', inventoryReport);
router.get('/purchases', purchaseReport);
router.get('/sales', salesReport);
router.get('/profit', profitReport);
router.get('/price-history', priceHistoryReport);
router.get('/export/:type', exportCsv);

module.exports = router;
