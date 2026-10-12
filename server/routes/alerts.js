const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAlert,
  createAlert,
  generateAiAlerts
} = require('../controllers/alertController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getAlerts);
router.post('/', createAlert);
router.post('/ai-generate', generateAiAlerts);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteAlert);

module.exports = router;
