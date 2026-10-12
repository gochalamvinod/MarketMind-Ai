const express = require('express');
const router = express.Router();
const { getSales, createSale } = require('../controllers/salesController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getSales);
router.post('/', createSale);

module.exports = router;
