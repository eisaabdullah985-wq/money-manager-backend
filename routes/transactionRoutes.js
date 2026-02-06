const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getTransactions, 
    updateTransaction, 
    deleteTransaction,
    getDashboardStats, 
    getCategorySummary,
    getDashboardData 
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

router.route('/')
    .get(getTransactions)
    .post(createTransaction);

router.route('/:id')
    .put(updateTransaction)
    .delete(deleteTransaction);

router.get('/dashboard', protect, getDashboardData);
router.get('/master', getDashboardData);
router.get('/category-summary', getCategorySummary);
router.get('/stats', getDashboardStats);

module.exports = router;