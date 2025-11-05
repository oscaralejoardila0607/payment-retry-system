/**
 * Novo Retry Intelligence API
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const retryRoutes = require('./routes/retry-routes');

const app = express();

// Configuration
const PORT = process.env.PORT || 4000;
const API_VERSION = process.env.API_VERSION || 'v1';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(limiter); // Apply rate limiting

// API Routes
app.use(`/api/${API_VERSION}`, retryRoutes);

// Serve static files from React build (production)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');

  // Check if React build exists
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If no build, show API info
    res.json({
      name: 'Novo Retry Intelligence API',
      version: '1.0.0',
      description: 'Intelligent payment retry recommendation API',
      message: 'React dashboard not built yet. Run: cd client && npm run build',
      endpoints: {
        health: `/api/${API_VERSION}/health`,
        analyzeFailure: {
          method: 'POST',
          path: `/api/${API_VERSION}/analyze-failure`,
        },
      },
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server (only in local development, not in Vercel)
if (require.main === module && process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Novo Retry Intelligence API                            ║
║   Environment: ${NODE_ENV.padEnd(42)}║
║   Port: ${PORT.toString().padEnd(49)}║
║   API Version: ${API_VERSION.padEnd(44)}║
║   Endpoints:                                             ║
║   - GET  /api/${API_VERSION}/health                            ║
║   - POST /api/${API_VERSION}/analyze-failure                   ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel
module.exports = app;
