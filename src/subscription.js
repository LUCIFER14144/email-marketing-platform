const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Get subscription status
router.get('/status', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }

    const user = users[req.session.userId];
    res.json({
        success: true,
        subscription: {
            ...user.subscription,
            emailsRemaining: user.subscription.emailLimit - user.subscription.emailsSent
        }
    });
});

// Request subscription upgrade
router.post('/request', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }

    const { planType } = req.body;
    const requestId = uuidv4();

    if (!subscriptionPlans[planType]) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid plan type' 
        });
    }

    pendingSubscriptions[requestId] = {
        username: req.session.userId,
        planType,
        requestedAt: new Date()
    };

    res.json({
        success: true,
        message: 'Subscription request submitted successfully',
        requestId,
        instructions: `Please contact ${process.env.ADMIN_EMAIL || 'admin@yourdomain.com'} with your Request ID: ${requestId}`
    });
});

// Check request status
router.get('/request/:requestId', (req, res) => {
    const { requestId } = req.params;
    const request = pendingSubscriptions[requestId];

    if (!request) {
        return res.status(404).json({ 
            success: false, 
            error: 'Request not found' 
        });
    }

    if (request.username !== req.session.userId) {
        return res.status(403).json({ 
            success: false, 
            error: 'Access denied' 
        });
    }

    res.json({
        success: true,
        request: {
            requestId,
            status: 'pending',
            planType: request.planType,
            requestedAt: request.requestedAt
        }
    });
});

// Email limit middleware
const checkEmailLimit = async (req, res, next) => {
    const username = req.session.userId;
    const user = users[username];

    if (user.subscription.emailsSent >= user.subscription.emailLimit) {
        return res.status(403).json({
            success: false,
            error: 'Email limit reached',
            subscription: {
                current: user.subscription.type,
                sent: user.subscription.emailsSent,
                limit: user.subscription.emailLimit
            },
            upgrade: {
                available: user.subscription.type !== 'premium',
                next: subscriptionPlans[
                    user.subscription.type === 'free' ? 'basic' : 'premium'
                ]
            }
        });
    }

    next();
};

module.exports = { router, checkEmailLimit };