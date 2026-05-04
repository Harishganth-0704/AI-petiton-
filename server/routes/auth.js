import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { emailService } from '../services/emailService.js';
import { smsService } from '../services/smsService.js';
import { requireAuth } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            department_id: user.department_id,
            points: user.points || 0,
            language_pref: user.language_pref || 'en',
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
}

// POST /api/register
router.post('/register', otpLimiter, async (req, res) => {
    try {
        const { fullName, email, password, languagePref, phone } = req.body;

        if (!fullName || !password || (!email && !phone)) {
            return res.status(400).json({ message: 'Full name, password, and at least one contact method (email or phone) are required' });
        }

        const identifier = email || phone;
        const userExistResult = await query(
            'SELECT * FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [email || null, phone || null]
        );

        let newUser;

        if (userExistResult.rows.length > 0) {
            const existingUser = userExistResult.rows[0];

            // If user is already verified, block registration
            if (existingUser.is_verified) {
                return res.status(409).json({ message: 'User already exists with this email' });
            }

            // If user exists but is NOT verified, update their details (name, new password, language) and resend OTP
            const hashedPassword = await bcrypt.hash(password, 10);
            const updateResult = await query(
                `UPDATE users 
                 SET name = $1, password = $2, language_pref = $3 
                 WHERE id = $4 
                 RETURNING id, name, email, phone, role, department_id, language_pref`,
                [fullName, hashedPassword, languagePref || 'en', existingUser.id]
            );
            newUser = updateResult.rows[0];

            // Clear any old OTPs for this unverified user before generating a new one
            await query('DELETE FROM user_otps WHERE user_id = $1', [newUser.id]);
        } else {
            // Completely new user registration
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertResult = await query(
                'INSERT INTO users (name, email, phone, password, language_pref, is_verified, role) VALUES ($1, $2, $3, $4, $5, false, \'citizen\') RETURNING id, name, email, phone, role, department_id, language_pref',
                [fullName, email || null, phone || null, hashedPassword, languagePref || 'en']
            );
            newUser = insertResult.rows[0];
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 3-minute expiry
        await query('INSERT INTO user_otps (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'3 minutes\')', [newUser.id, otp]);

        console.log('-------------------------------------------');
        console.log(`[DEVELOPMENT] NEW OTP FOR ${identifier}: ${otp}`);
        console.log('-------------------------------------------');

        // Send OTP via email
        const subject = 'Verify your Civic Harmony Account';
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">Civic Harmony</h2>
                <p>Welcome, <strong>${newUser.name}</strong>!</p>
                <p>To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #004a99; padding: 10px 20px; border: 2px dashed #004a99; border-radius: 5px;">${otp}</span>
                </div>
                <p>This OTP is valid for 3 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">This is an automated message, please do not reply.</small>
            </div>
        `;

        // ✅ Send response IMMEDIATELY — don't block on email/SMS
        res.status(201).json({
            message: `User registered successfully. Please verify your ${email ? 'email' : 'phone'}.`,
            user: { id: newUser.id, email: newUser.email, phone: newUser.phone },
        });

        // 🔥 Fire email & SMS in background (non-blocking)
        if (email) {
            emailService.sendMail(email, subject, html).catch(err =>
                console.error('Registration email error (background):', err.message)
            );
        }
        if (phone) {
            const smsBody = `Civic Harmony: Your OTP for registration is ${otp}. Valid for 3 minutes.`;
            smsService.sendSms(phone, smsBody).catch(err =>
                console.error('Registration SMS error (background):', err.message)
            );
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// POST /api/resend-registration-otp
router.post('/resend-registration-otp', otpLimiter, async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ message: 'Email or Phone is required' });

        const cleanIdentifier = identifier.toLowerCase().trim();
        const userResult = await query(
            'SELECT * FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [cleanIdentifier, cleanIdentifier]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = userResult.rows[0];
        if (user.is_verified) return res.status(400).json({ message: 'Account is already verified' });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete old OTPs and Store new OTP with 3-minute expiry
        await query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);
        await query('INSERT INTO user_otps (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'3 minutes\')', [user.id, otp]);

        // Send OTP via email
        const subject = 'Verify your Civic Harmony Account';
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">Civic Harmony</h2>
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>Here is your new One-Time Password (OTP) to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #004a99; padding: 10px 20px; border: 2px dashed #004a99; border-radius: 5px;">${otp}</span>
                </div>
                <p>This OTP is valid for 3 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">This is an automated message, please do not reply.</small>
            </div>
        `;

        // ✅ Send response IMMEDIATELY
        res.json({ message: `A new OTP has been sent to your ${user.email && user.phone ? 'email and phone' : user.email ? 'email' : 'phone'}.` });

        // 🔥 Fire email & SMS in background (non-blocking)
        if (user.email) {
            emailService.sendMail(user.email, subject, html).catch(err =>
                console.error('Resend OTP email error (background):', err.message)
            );
        }
        if (user.phone) {
            const smsBody = `Civic Harmony: Your new OTP for registration is ${otp}. Valid for 3 minutes.`;
            smsService.sendSms(user.phone, smsBody).catch(err =>
                console.error('Resend OTP SMS error (background):', err.message)
            );
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

// POST /api/verify-registration
router.post('/verify-registration', async (req, res) => {
    try {
        const { email, phone, otp } = req.body;
        if ((!email && !phone) || !otp) return res.status(400).json({ message: 'Identifier (email/phone) and OTP are required' });

        const userResult = await query(
            'SELECT * FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [email ? email.toLowerCase().trim() : null, phone || null]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = userResult.rows[0];
        if (user.is_verified) return res.status(400).json({ message: 'Account is already verified' });

        // Firebase-verified phone users skip the OTP database check
        if (otp !== 'firebase_verified') {
            const otpResult = await query('SELECT * FROM user_otps WHERE user_id = $1', [user.id]);
            
            if (otpResult.rows.length === 0) {
                return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
            }

            const otpData = otpResult.rows[0];

            // 1. Check if blocked due to attempts
            if (otpData.attempts >= 3) {
                await query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);
                return res.status(403).json({ message: 'Too many failed attempts. Please request a new OTP.' });
            }

            // 2. Check Expiry
            if (new Date(otpData.expires_at) < new Date()) {
                await query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);
                return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
            }

            // 3. Check Match
            if (otpData.otp !== otp) {
                await query('UPDATE user_otps SET attempts = attempts + 1 WHERE user_id = $1', [user.id]);
                const remaining = 3 - (otpData.attempts + 1);
                return res.status(400).json({ 
                    message: `Invalid OTP. ${remaining} attempts remaining.`,
                    attemptsRemaining: remaining 
                });
            }

            // Success: Delete used OTP
            await query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);
        }

        // Verify user
        await query('UPDATE users SET is_verified = true WHERE id = $1', [user.id]);

        const token = signToken(user);
        const { password: _, ...safeUser } = user;
        safeUser.is_verified = true;

        res.json({
            message: 'Account verified successfully',
            token,
            user: safeUser
        });

        // Async welcome email
        if (user.email) {
            emailService.sendWelcomeEmail(user);
        }
    } catch (error) {
        console.error('Verify registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        if ((!email && !phone) || !password) {
            return res.status(400).json({ message: 'Email/Phone and password are required' });
        }

        // If only one identifier is provided (from old frontend), use it for both email and phone checks
        const identifier = email || phone;
        const userResult = await query(
            'SELECT * FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [identifier ? identifier.toLowerCase().trim() : null, identifier ? identifier.trim() : null]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Account not found. Please register first.' });
        }

        const user = userResult.rows[0];

        if (!user.is_verified) {
            return res.status(403).json({
                message: 'Please verify your account to login.',
                requiresVerification: true
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        const token = signToken(user);
        const { password: _, ...safeUser } = user;

        res.status(200).json({
            message: 'Login successful',
            token,
            user: safeUser,
        });

        // Async login notification
        if (user.email) {
            emailService.sendLoginNotification(user);
        }
        if (user.phone) {
            smsService.sendLoginNotificationSMS(user);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await query('SELECT id, name, email, role, department_id, points, language_pref FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// POST /api/forgot-password
router.post('/forgot-password', otpLimiter, async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ message: 'Email or Phone is required' });

        const cleanIdentifier = identifier.toLowerCase().trim();
        const userResult = await query(
            'SELECT id, name, email, phone FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [cleanIdentifier, cleanIdentifier]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'No account found with this email or phone number' });
        }

        const user = userResult.rows[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing OTPs for this user
        await query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);

        // Store new OTP with 3-minute expiry
        await query('INSERT INTO user_otps (user_id, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'3 minutes\')', [user.id, otp]);

        console.log('-------------------------------------------');
        console.log(`[DEVELOPMENT] PASSWORD RESET OTP FOR ${identifier}: ${otp}`);
        console.log('-------------------------------------------');

        // ✅ Send response IMMEDIATELY — don't block on email/SMS
        res.json({ message: `OTP sent to your ${user.email && user.phone ? 'email and phone' : user.email ? 'email' : 'phone'}` });

        // 🔥 Fire email & SMS in background (non-blocking)
        if (user.email) {
            const subject = 'Your Password Reset OTP';
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #004a99;">Civic Harmony</h2>
                    <p>Dear <strong>${user.name}</strong>,</p>
                    <p>You requested a password reset. Please use the following One-Time Password (OTP) to proceed:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #004a99; padding: 10px 20px; border: 2px dashed #004a99; border-radius: 5px;">${otp}</span>
                    </div>
                    <p>This OTP is valid for 3 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <small style="color: #888;">This is an automated message, please do not reply.</small>
                </div>
            `;
            emailService.sendMail(user.email, subject, html).catch(err =>
                console.error('Forgot password email error (background):', err.message)
            );
        }
        if (user.phone) {
            const smsBody = `Civic Harmony: Your OTP for password reset is ${otp}. Valid for 3 minutes.`;
            smsService.sendSms(user.phone, smsBody).catch(err =>
                console.error('Forgot password SMS error (background):', err.message)
            );
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

// POST /api/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        if (!identifier || !otp) return res.status(400).json({ message: 'Email/Phone and OTP are required' });

        const cleanIdentifier = identifier.toLowerCase().trim();
        const userResult = await query(
            'SELECT id FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [cleanIdentifier, cleanIdentifier]
        );

        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const userId = userResult.rows[0].id;
        const otpResult = await query('SELECT * FROM user_otps WHERE user_id = $1', [userId]);

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }

        const otpData = otpResult.rows[0];

        // 1. Check if blocked due to attempts
        if (otpData.attempts >= 3) {
            await query('DELETE FROM user_otps WHERE user_id = $1', [userId]);
            return res.status(403).json({ message: 'Too many failed attempts. Please request a new OTP.' });
        }

        // 2. Check Expiry
        if (new Date(otpData.expires_at) < new Date()) {
            await query('DELETE FROM user_otps WHERE user_id = $1', [userId]);
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // 3. Check Match
        if (otpData.otp !== otp) {
            await query('UPDATE user_otps SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
            const remaining = 3 - (otpData.attempts + 1);
            return res.status(400).json({ 
                message: `Invalid OTP. ${remaining} attempts remaining.`,
                attemptsRemaining: remaining 
            });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        if (!identifier || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required' });

        const cleanIdentifier = identifier.toLowerCase().trim();
        const userResult = await query(
            'SELECT id FROM users WHERE (email IS NOT NULL AND email = $1) OR (phone IS NOT NULL AND phone = $2)',
            [cleanIdentifier, cleanIdentifier]
        );

        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const userId = userResult.rows[0].id;

        // Firebase-verified phone users skip database OTP check
        if (otp !== 'firebase_verified') {
            const otpResult = await query('SELECT * FROM user_otps WHERE user_id = $1', [userId]);
            
            if (otpResult.rows.length === 0) {
                return res.status(400).json({ message: 'No OTP found or session expired.' });
            }

            const otpData = otpResult.rows[0];

            // Blocked after 3 attempts
            if (otpData.attempts >= 3) {
                await query('DELETE FROM user_otps WHERE user_id = $1', [userId]);
                return res.status(403).json({ message: 'Too many failed attempts. Please request a new OTP.' });
            }

            // Expiry Check
            if (new Date(otpData.expires_at) < new Date()) {
                await query('DELETE FROM user_otps WHERE user_id = $1', [userId]);
                return res.status(400).json({ message: 'OTP has expired.' });
            }

            // Match Check
            if (otpData.otp !== otp) {
                await query('UPDATE user_otps SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            // Delete used OTP
            await query('DELETE FROM user_otps WHERE user_id = $1', [userId]);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        // Send confirmation notification
        const fetchUser = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (fetchUser.rows.length > 0) {
            const user = fetchUser.rows[0];
            if (user.email) emailService.sendPasswordChangeNotification(user);
            if (user.phone) smsService.sendPasswordChangeNotificationSMS(user);
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
