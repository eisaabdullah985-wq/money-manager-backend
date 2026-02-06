const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'transfer'],
        required: [true, 'Transaction type is required']
    },
    division: {
        type: String,
        enum: ['office', 'personal'],
        required: [true, 'Division is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['fuel', 'movie', 'food', 'loan', 'medical', 'salary', 'rent', 'shopping', 'transfer', 'other'],
        default: 'other'
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now,
        index: true 
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    transferToAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: function() { return this.type === 'transfer'; }
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'upi', 'wallet', 'other'],
        default: 'cash'
    },
    isRecurring: { type: Boolean, default: false },
    attachments: [{ url: String, fileName: String }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

transactionSchema.virtual('isEditable').get(function() {
    if (!this.createdAt) return true; 
    const hoursElapsed = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    return hoursElapsed < 12;
});

module.exports = mongoose.model('Transaction', transactionSchema);