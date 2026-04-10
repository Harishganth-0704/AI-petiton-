import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generalLimiter } from './middleware/rateLimit.js';

dotenv.config();

import authRoutes from './routes/auth.js';
import petitionRoutes from './routes/petitions.js';
import officerRoutes from './routes/officers.js';
import dashboardRoutes from './routes/dashboard.js';
import feedbackRoutes from './routes/feedbacks.js';
import chatbotRoutes from './routes/chatbot.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', generalLimiter); // Apply general rate limiting to all API routes

app.use('/api', authRoutes);                // POST /api/login, POST /api/register
app.use('/api/petitions', petitionRoutes);  // Internal limits applied in routes
app.use('/api/officers', officerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/comments', commentRoutes);    // Internal limits applied in routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', db: 'connected', time: result.rows[0].now });
    } catch (error) {
        console.error('DB Connection error:', error);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// 404 catch-all
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
