const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { users, subscriptionPlans } = require('./data');

// Email configuration for verification emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, password, and email are required' 
            });
        }
        
        if (users[username]) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username already exists' 
            });
        }
        
        // Check if email is already registered
        const emailExists = Object.values(users).some(user => user.email === email);
        if (emailExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email already registered' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();

        // Create user with initial subscription
        users[username] = {
            email,
            password: hashedPassword,
            verified: false,
            verificationToken,
            createdAt: new Date(),
            lastLogin: null,
            subscription: {
                type: 'free',
                emailsSent: 0,
                emailLimit: subscriptionPlans.free.emailLimit,
                features: subscriptionPlans.free.features,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
            }
        };

        // Send verification email
        const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify/${username}/${verificationToken}`;
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Verify your email address',
            html: `
                <h2>Welcome to Email Marketing Platform!</h2>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
                <p>This link will expire in 24 hours.</p>
            `
        });

        res.json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            username
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed' 
        });
    }
});

// Email verification
router.get('/verify/:username/:token', (req, res) => {
    const { username, token } = req.params;
    const user = users[username];

    if (!user || user.verificationToken !== token) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid verification link' 
        });
    }

    if (user.verified) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email already verified' 
        });
    }

    user.verified = true;
    user.verificationToken = null; // Clear the token after verification

    res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
    });
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }

        const user = users[username];
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        if (!user.verified) {
            return res.status(403).json({ 
                success: false, 
                error: 'Please verify your email before logging in' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        req.session.userId = username;

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                username,
                email: user.email,
                subscription: user.subscription
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed' 
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

module.exports = router;