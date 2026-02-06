const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
        maxlength: [50, 'Account name cannot exceed 50 characters']
    },
    type: {
        type: String,
        enum: ['cash', 'bank', 'credit_card', 'digital_wallet', 'investment', 'savings'],
        required: [true, 'Account type is required'],
        default: 'bank'
    },
    balance: {
        type: Number,
        required: [true, 'Initial balance is required'],
        default: 0
    },
    color: {
        type: String,
        default: '#3B82F6', 
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format']
    },
    currency: {
        type: String,
        default: 'INR',
        uppercase: true,
        maxlength: 3
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

accountSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema);