import { rateLimit } from 'express-rate-limit';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20, // Increased slightly to 20 for better UX
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Action limit reached. Please try again in an hour.' }
});

export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 3, // Each IP restricted to 3 OTP requests every 10 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many OTP requests. Please wait for 10 minutes before trying again.' }
});
