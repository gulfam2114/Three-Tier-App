const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Config
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'login_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;
let dbStatus = 'connecting';

// Create DB connection safely
async function connectDB() {
    try {
        pool = mysql.createPool(dbConfig);

        // Test connection
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();

        dbStatus = 'connected';
        console.log('✅ Database connected successfully');
    } catch (error) {
        dbStatus = 'error';
        console.error('❌ Database connection failed:', error.message);

        // Retry
        setTimeout(connectDB, 5000);
    }
}

connectDB();

// Safe DB check middleware
function ensureDB(req, res, next) {
    if (dbStatus !== 'connected' || !pool) {
        return res.status(503).json({
            message: 'Database not ready. Try again in a few seconds.'
        });
    }
    next();
}

// Routes
app.get('/', (req, res) => {
    res.send('Backend Running Successfully');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        database: dbStatus,
        time: new Date()
    });
});

// REGISTER
app.post('/api/register', ensureDB, async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: 'Name, email, password required'
        });
    }

    try {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: 'User already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// LOGIN
app.post('/api/login', ensureDB, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password required'
        });
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// USERS (test)
app.get('/api/users', ensureDB, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email FROM users'
        );

        res.json(users);

    } catch (error) {
        console.error('Users error:', error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});