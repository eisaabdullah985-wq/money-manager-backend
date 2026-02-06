const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc    Create new account
exports.createAccount = async (req, res) => {
    try {
        const { name, type, balance, color, currency } = req.body;

        // Check if account name already exists for this user
        const existingAccount = await Account.findOne({ user: req.user._id, name });
        if (existingAccount) {
            return res.status(400).json({ success: false, error: 'Account with this name already exists' });
        }

        const account = await Account.create({
            user: req.user._id,
            name,
            type,
            balance: balance || 0,
            color,
            currency
        });

        res.status(201).json({ success: true, data: account });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get all user accounts
exports.getAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ user: req.user._id, isActive: true }).sort('-createdAt');
        
        res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update account details (Name/Color/Type)
exports.updateAccount = async (req, res) => {
    try {
        const accountId = req.params.id;
        const userId = req.user._id;

        // Check if account exists and belongs to user
        let account = await Account.findOne({ _id: accountId, user: userId });

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Use $set to only update the fields provided in req.body
        // This prevents overwriting existing fields with 'undefined'
        account = await Account.findByIdAndUpdate(
            accountId, 
            { $set: req.body }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: account });
    } catch (error) {
        // Log the actual error to your terminal to see which field failed
        console.error("Update Error:", error.message);
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Dashboard Summary (Total Balance)
exports.getDashboardSummary = async (req, res) => {
    try {
        const stats = await Account.aggregate([
            { $match: { user: req.user._id, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalNetWorth: { $sum: "$balance" },
                    accountCount: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: stats[0] || { totalNetWorth: 0, accountCount: 0 }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Soft delete account
exports.deleteAccount = async (req, res) => {
    try {
        // We soft delete (isActive: false) to preserve transaction history
        const account = await Account.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isActive: false },
            { new: true }
        );

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        res.status(200).json({ success: true, message: 'Account deactivated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};