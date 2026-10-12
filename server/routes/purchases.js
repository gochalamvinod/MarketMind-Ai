const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getPurchases);
router.post('/', createPurchase);

module.exports = router;
