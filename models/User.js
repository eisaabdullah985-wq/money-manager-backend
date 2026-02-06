const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please add a name'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Please add an email'], 
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please add a valid email']
    },
    password: { 
        type: String, 
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    profileImage: { 
        type: String, 
        default: 'https://ui-avatars.com/api/?name=User&background=random' 
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// --- Middleware: Password Hashing ---
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// --- Method: Compare Password for Login ---
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- Method: Generate Reset Token for Brevo Email ---
userSchema.methods.getResetPasswordToken = function() {
    // Generate raw token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash it and set to schema field (to compare when user clicks link)
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expiration (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);