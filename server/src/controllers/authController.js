const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Lazy-load User model to handle memory-only mode gracefully
const getUser = () => {
  try { return require('../models/User'); } catch { return null; }
};

// ─── In-Memory Fallback Store ─────────────────────────────────────────────────
// Used when MongoDB is unavailable. Do NOT use in production.
let inMemoryUsers = [];

const findUserByEmail = async (email) => {
  if (mongoose.connection.readyState === 1) {
    const User = getUser();
    return User ? User.findOne({ email }).select('+password') : null;
  }
  return inMemoryUsers.find(u => u.email === email.toLowerCase()) || null;
};

const saveUser = async (userData) => {
  if (mongoose.connection.readyState === 1) {
    const User = getUser();
    if (!User) throw new Error('User model unavailable');
    const user = new User(userData);
    return user.save();
  }
  // Memory mode: manually hash password
  const hashed = await bcrypt.hash(userData.password, 12);
  const user = {
    ...userData,
    _id: require('uuid').v4(),
    password: hashed,
    email: userData.email.toLowerCase(),
    role: userData.role || 'operator',
    isActive: true,
    preferences: { alertThreshold: 2.5, simulationMode: true, tickRate: 2000 },
    createdAt: new Date(),
  };
  inMemoryUsers.push(user);
  return user;
};

const generateToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback-dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const comparePassword = async (candidate, hashed) => {
  return bcrypt.compare(candidate, hashed);
};

const safeUser = (user) => {
  const u = user.toSafeJSON ? user.toSafeJSON() : { ...user };
  delete u.password;
  return u;
};

// ─── Seed Default Admin ───────────────────────────────────────────────────────
const seedDefaultUser = async () => {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@sensorguard.io';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Guard@2025';
  const name = process.env.DEFAULT_ADMIN_NAME || 'SensorGuard Admin';

  const existing = await findUserByEmail(email).catch(() => null);
  if (existing) return;

  await saveUser({ name, email, password, role: 'admin' }).catch(() => {});
  console.log(`  [Auth] Default admin seeded → ${email}`);
};

// ─── Controllers ──────────────────────────────────────────────────────────────

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: { message: 'Account disabled' } });
    }

    // Update last login
    if (user.save) { user.lastLogin = new Date(); await user.save().catch(() => {}); }

    const token = generateToken(user);
    res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, error: { message: 'Authentication failed' } });
  }
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  try {
    const { name, email, password } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'Email already registered' } });
    }
    const user = await saveUser({ name, email, password, role: 'operator' });
    const token = generateToken(user);
    res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, error: { message: 'Registration failed' } });
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { login, register, getMe, seedDefaultUser };
