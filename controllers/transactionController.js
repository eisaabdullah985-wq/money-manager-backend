const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const updateBalancesAtomic = async (type, amount, sourceId, destId, session, isReverting = false) => {
    const multiplier = isReverting ? -1 : 1;
    const value = parseFloat(amount) * multiplier;

    if (type === 'income') {
        await Account.findByIdAndUpdate(sourceId, { $inc: { balance: value } }, { session });
    } 
    else if (type === 'expense') {
        await Account.findByIdAndUpdate(sourceId, { $inc: { balance: -value } }, { session });
    } 
    else if (type === 'transfer') {
        await Account.findByIdAndUpdate(sourceId, { $inc: { balance: -value } }, { session });
        await Account.findByIdAndUpdate(destId, { $inc: { balance: value } }, { session });
    }
};

exports.createTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { type, division, category, amount, description, date, transferToAccount, paymentMethod, isRecurring, attachments } = req.body;
        let { account } = req.body;

        if (!type || !division || !category || !amount) {
            throw new Error('Missing required fields');
        }

        let sourceAccount;
        
        if (account) {
            sourceAccount = await Account.findOne({ _id: account, user: req.user._id, isActive: true }).session(session);
        } else {
            sourceAccount = await Account.findOne({ user: req.user._id, isActive: true }).session(session);
        }

        if (!sourceAccount) {
            sourceAccount = new Account({
                user: req.user._id,
                name: 'Main Wallet',
                type: 'cash',
                balance: 0,
                currency: 'INR'
            });
            await sourceAccount.save({ session });
        }

        account = sourceAccount._id;
    
        if (type === 'expense' || type === 'transfer') {
            if (sourceAccount.balance < amount) {
                throw new Error(`Insufficient funds in ${sourceAccount.name}`);
            }
        }

        let destId = null;
        if (type === 'transfer') {
            if (!transferToAccount || account.toString() === transferToAccount.toString()) throw new Error('Invalid destination account');
            const destAccount = await Account.findOne({ _id: transferToAccount, user: req.user._id, isActive: true }).session(session);
            if (!destAccount) throw new Error('Destination account not found');
            destId = destAccount._id;
        }

        const transaction = new Transaction({
            user: req.user._id,
            type, division, category,
            amount: parseFloat(amount),
            description: description?.trim(),
            date: date ? new Date(date) : new Date(),
            account,
            transferToAccount: destId,
            paymentMethod: paymentMethod || 'cash',
            isRecurring: isRecurring || false,
            attachments
        });

        await transaction.save({ session });

        await updateBalancesAtomic(type, amount, account, destId, session);

        await session.commitTransaction();

        const populated = await Transaction.findById(transaction._id)
            .populate('account', 'name balance currency')
            .populate('transferToAccount', 'name balance currency');

        res.status(201).json({ success: true, transaction: populated });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

exports.updateTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id }).session(session);
        if (!transaction) throw new Error('Transaction not found');
        if (!transaction.isEditable) throw new Error('Transaction is locked (12h limit)');

        await updateBalancesAtomic(transaction.type, transaction.amount, transaction.account, transaction.transferToAccount, session, true);

        const updates = req.body;
        const allowedUpdates = ['type', 'category', 'amount', 'description', 'date', 'account', 'transferToAccount', 'paymentMethod', 'division'];
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) transaction[field] = updates[field];
        });

        await transaction.save({ session });

        await updateBalancesAtomic(transaction.type, transaction.amount, transaction.account, transaction.transferToAccount, session);

        await session.commitTransaction();
        res.status(200).json({ success: true, transaction });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

exports.deleteTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id }).session(session);
        
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        await updateBalancesAtomic(
            transaction.type, 
            transaction.amount, 
            transaction.account, 
            transaction.transferToAccount, 
            session, 
            true
        );

        // Remove the record
        await Transaction.deleteOne({ _id: transaction._id }).session(session);

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Deleted successfully' });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const { type, page = 1, limit = 20, sortBy = '-date', search, division, category, startDate, endDate } = req.query;
        const filter = { user: req.user._id };

        if (type) filter.type = type;
        if (division) filter.division = division;
        if (category) filter.category = category;
        if (search) filter.description = { $regex: search, $options: 'i' };
        
        if (startDate && endDate) {
            filter.date = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate + 'T23:59:59') 
            };
        }

        const total = await Transaction.countDocuments(filter);
        const transactions = await Transaction.find(filter)
            .populate('account', 'name balance')
            .populate('transferToAccount', 'name balance')
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ success: true, total, transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { timeframe, division, allDivisions } = req.query; // Added allDivisions
        const filter = { user: req.user._id, type: { $in: ['income', 'expense'] } };

        // If specific division is requested, filter by it.
        // If allDivisions is true, we don't filter so we can group them all.
        if (division && allDivisions !== 'true') filter.division = division;

        let groupConfig = {};
        let sortConfig = { "_id.year": 1, "_id.month": 1, "_id.week": 1 };

        if (timeframe === 'weekly') {
            groupConfig = { week: { $week: "$date" }, year: { $year: "$date" } };
        } else if (timeframe === 'yearly') {
            groupConfig = { year: { $year: "$date" } };
            sortConfig = { "_id.year": 1 };
        } else {
            groupConfig = { month: { $month: "$date" }, year: { $year: "$date" } };
        }

        const stats = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { 
                        ...groupConfig, 
                        type: "$type",
                        category: "$category",
                        division: allDivisions === 'true' ? "$division" : null 
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: sortConfig }
        ]);

        res.status(200).json({ success: true, timeframe, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCategorySummary = async (req, res) => {
    try {
        const { division, startDate, endDate } = req.query;
        const filter = { user: req.user._id };

        if (division) filter.division = division;
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const summary = await Transaction.aggregate([
            { $match: filter },
            {
                $group: {
                    // UPDATED: Added division to the ID so frontend can filter specifically
                    _id: { 
                        category: "$category", 
                        type: "$type", 
                        division: "$division" 
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id;

        const [accounts, recentTransactions, stats] = await Promise.all([
            Account.find({ user: userId, isActive: true }),
            Transaction.find({ user: userId }).sort('-date').limit(20),
            Transaction.aggregate([
                { $match: { user: userId, type: { $in: ['income', 'expense'] } } },
                { $group: { _id: "$type", total: { $sum: "$amount" } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                accounts,
                recentTransactions,
                overallStats: stats,
                totalNetWorth: accounts.reduce((acc, curr) => acc + curr.balance, 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};