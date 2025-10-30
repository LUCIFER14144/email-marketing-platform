const express = require('express');
const router = express.Router();
const { users, pendingSubscriptions, subscriptionPlans } = require('./data');

// Admin dashboard - View all users
router.get('/users', requireAdmin, (req, res) => {
    const userList = Object.entries(users).map(([username, userData]) => ({
        username,
        email: userData.email,
        verified: userData.verified,
        subscription: userData.subscription,
        emailsSent: userData.emailsSent,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
    }));

    res.json({
        success: true,
        users: userList
    });
});

// Admin - Approve subscription
router.post('/subscription/approve', requireAdmin, (req, res) => {
    const { requestId, planType } = req.body;
    
    if (!pendingSubscriptions[requestId]) {
        return res.status(404).json({ 
            success: false, 
            error: 'Subscription request not found' 
        });
    }

    const username = pendingSubscriptions[requestId].username;
    const plan = subscriptionPlans[planType];

    if (!plan) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid plan type' 
        });
    }

    // Update user subscription
    users[username].subscription = {
        type: planType,
        emailsSent: 0,
        emailLimit: plan.emailLimit,
        activatedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        features: plan.features
    };

    delete pendingSubscriptions[requestId];

    res.json({
        success: true,
        message: 'Subscription approved successfully',
        subscription: users[username].subscription
    });
});

// Admin - View pending subscriptions
router.get('/subscription/pending', requireAdmin, (req, res) => {
    const pendingList = Object.entries(pendingSubscriptions).map(([requestId, data]) => ({
        requestId,
        username: data.username,
        requestedAt: data.requestedAt,
        planType: data.planType
    }));

    res.json({
        success: true,
        pendingSubscriptions: pendingList
    });
});

// Admin - View user details
router.get('/user/:username', requireAdmin, (req, res) => {
    const { username } = req.params;
    const userData = users[username];

    if (!userData) {
        return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });
    }

    res.json({
        success: true,
        user: {
            username,
            email: userData.email,
            verified: userData.verified,
            subscription: userData.subscription,
            emailStats: {
                sent: userData.emailsSent,
                remaining: userData.subscription.emailLimit - userData.emailsSent
            },
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin
        }
    });
});

module.exports = router;