const express = require('express');
const router = express.Router();
const {
    createAccount,
    getAccounts,
    updateAccount,
    deleteAccount,
    getDashboardSummary
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

// All account routes require a logged-in user
router.use(protect);

// Main account endpoints
router.route('/')
    .get(getAccounts)
    .post(createAccount);

// Dashboard specific summary (Net worth)
router.get('/summary', getDashboardSummary);

// Specific account operations
router.route('/:id')
    .put(updateAccount)
    .delete(deleteAccount);

module.exports = router;