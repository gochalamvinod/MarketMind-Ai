const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getProductDetails,
  seedUserDemoData
} = require('../controllers/productController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/seed-demo', seedUserDemoData);
router.get('/stats', getProductStats);
router.get('/:id/details', getProductDetails);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
