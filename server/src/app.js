require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const { alertRouter: alertRoutes } = require('./routes/alerts');
const setupSocketHandlers = require('./socket/socketHandler');
const { seedDefaultUser } = require('./controllers/authController');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'SensorGuard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'memory-mode',
    simulator: 'active',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { message: err.message || 'Internal Server Error', code: err.code || 'INTERNAL_ERROR' },
  });
});

// ─── Database Connection ──────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sensorguard', {
      serverSelectionTimeoutMS: 4000,
    });
    console.log('  [DB] MongoDB connected');
  } catch (err) {
    console.warn('  [DB] MongoDB unavailable — running in memory-only mode');
    console.warn('  [DB] Install MongoDB or set MONGODB_URI to enable persistence');
  }
  // Always seed the default admin — works in both DB and memory modes
  await seedDefaultUser();
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log('\n');
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║   🛡️  SensorGuard — Backend Active     ║');
    console.log(`  ║   Port: ${PORT}   Mode: ${process.env.NODE_ENV || 'development'}        ║`);
    console.log('  ║   🔌 Socket.io ready                   ║');
    console.log('  ║   🧪 Sensor simulator running          ║');
    console.log('  ╚═══════════════════════════════════════╝\n');
  });
});

module.exports = { app, io };
