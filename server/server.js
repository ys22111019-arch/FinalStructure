const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load .env from same folder

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const restaurantRoutes = require('./routes/restaurants');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

// Models
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Public folder
const publicPath = path.join(__dirname, '..', 'public');

// ===== MIDDLEWARE =====
// Allow access from anywhere
// Note: If you need to allow credentials from any origin, use:
// app.use(cors({ origin: true, credentials: true }));
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  console.log('Serving static files from:', publicPath);
}

// ===== TEST ROUTE =====
app.get('/api/test', (req, res) => res.json({ success: true, message: 'Server is working' }));

// ===== API ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// ===== DEBUG: list registered API routes =====
app.get('/api/debug/routes', (req, res) => {
  // Return a simple, reliable list of mounted API base routes and known endpoints.
  const routes = [
    { path: '/api/test', methods: 'GET' },
    { path: '/api/debug/routes', methods: 'GET' },
    { path: '/api/auth', methods: 'POST (register, login)' },
    { path: '/api/users', methods: 'GET, PUT (profile)' },
    { path: '/api/restaurants', methods: 'GET, POST (admin), GET /:id' },
    { path: '/api/menu', methods: 'GET (/:restaurantId), POST (admin)' },
    { path: '/api/orders', methods: 'GET (my-orders), POST' }
  ];

  res.json({ success: true, count: routes.length, routes });
});

// ===== API 404 =====
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// ===== SPA fallback =====
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexFile = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.status(404).send('Not Found');
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Server error' });
});

// ===== DATABASE CONNECT & ADMIN CREATION =====
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack.split('\n').slice(0,10).join('\n'));

    console.log('\n=== MongoDB Connection Hints ===');
    if (!uri) {
      console.log('- MONGODB_URI is not set. Add it to .env or the environment.');
    }
    if (err && err.message) {
      const m = err.message;
      if (/querySrv|SRV|ENOTFOUND|getaddrinfo/i.test(m))
        console.log('- DNS/SRV lookup failed. If using mongodb+srv, ensure DNS resolves and you have network access.');
      if (/ECONNREFUSED|connect ECONNREFUSED|ENETUNREACH/i.test(m))
        console.log('- Connection refused. Check network, firewall, and that the DB host/port are reachable.');
      if (/authentication|auth failed|Authentication failed/i.test(m))
        console.log('- Authentication failed. Verify DB username/password and user privileges.');
      if (/not authorized|IP address .* is not whitelisted|Access denied|IP.*not allowed/i.test(m))
        console.log('- IP not allowed. Add your IP to MongoDB Atlas Network Access (or 0.0.0.0/0 for testing).');
    }
    console.log('- For quick local route testing, set SKIP_DB=true (development only).');
    console.log('================================\n');

    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    const adminEmailRaw = process.env.ADMIN_EMAIL || 'admin@foodapp.com';
    const adminEmail = adminEmailRaw.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      await User.create({ name: 'Admin', email: adminEmail, password: adminPassword, role: 'admin' });
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error('createAdminUser error:', err.message);
  }
};

// ===== START SERVER =====
const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set.');
    // Allow starting without a database for quick local route testing
    if (process.env.SKIP_DB === 'true') {
      console.log('SKIP_DB=true — skipping MongoDB connection and admin creation');
      const srv = app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB skipped)`));
      // Ensure the Node process stays alive in environments where a listening socket
      // might not keep the event loop open (keepalive for quick dev testing)
      // This only runs when DB is intentionally skipped.
      if (!process.env.TEST_KEEPALIVE_DISABLED) {
        setInterval(() => {}, 1e7);
      }
      return;
    }

    await connectDB();
    await createAdminUser();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.stack || err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
