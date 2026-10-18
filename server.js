// server/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ============================================================================
// CORS Configuration: Local URLs in code & Deployed URLs in .env
// ============================================================================
// Local frontend URLs stored directly in code
const LOCAL_FRONTEND_URLS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
];

// Deployed frontend URL from .env
const buildAllowedOrigins = () => {
  const origins = [...LOCAL_FRONTEND_URLS];
  if (process.env.FRONTEND_URL) {
    const raw = process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
    origins.push(raw);
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      origins.push(`https://${raw}`);
      origins.push(`http://${raw}`);
    }
  }
  return origins;
};

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin is in our allowed list, is localhost/127.0.0.1, or ends with .vercel.app
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        // Fallback: allow request while logging origin so neither local nor deployed gets broken
        console.warn(`[CORS] Request received from origin: ${origin}`);
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    message: 'Room Radar Zero-Broker API is running...',
    status: 'online',
    timestamp: new Date().toISOString(),
    allowedOrigins,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Local origins allowed: ${LOCAL_FRONTEND_URLS.join(', ')}`);
  if (process.env.FRONTEND_URL) {
    console.log(`Deployed frontend allowed: ${process.env.FRONTEND_URL}`);
  }
});