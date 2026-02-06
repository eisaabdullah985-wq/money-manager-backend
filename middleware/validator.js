const { body, validationResult } = require('express-validator');

// Helper to catch errors and send response
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(422).json({
        success: false,
        errors: extractedErrors,
    });
};

// Rules for creating/updating transactions
const transactionValidationRules = () => {
    return [
        body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
        body('amount').isNumeric().withMessage('Amount must be a number').custom(val => val > 0).withMessage('Amount must be greater than 0'),
        body('account').isMongoId().withMessage('Invalid source account ID'),
        body('category').notEmpty().trim().withMessage('Category is required'),
        body('division').notEmpty().trim().withMessage('Division is required'),
        // Conditional validation: if type is transfer, transferToAccount is required
        body('transferToAccount').if(body('type').equals('transfer')).isMongoId().withMessage('Destination account is required for transfers'),
        body('date').optional().isISO8601().withMessage('Invalid date format')
    ];
};

module.exports = {
    transactionValidationRules,
    validate
};