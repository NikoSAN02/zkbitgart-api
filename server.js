// server.js - Simple main server
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const apiRoutes = require('./routes');

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting: 50 QPS as specified
const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // 50 requests per second
  message: {
    status: 0,
    error: "Rate limit exceeded. Maximum 50 requests per second."
  }
});

app.use('/api', limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Mount API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain Task Completion API',
    version: '1.0.0',
    endpoints: {
      complete_task: 'POST /api/complete-task',
      check_status: 'GET /api/task-status/:userAddress',
      health: 'GET /api/health',
      stats: 'GET /api/stats'
    },
    rate_limit: '50 requests per second',
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// Serve test interface
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API Test Interface</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .response { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 15px 0; border-radius: 4px; white-space: pre-wrap; font-family: monospace; }
        .success { border-color: #28a745; background-color: #d4edda; }
        .error { border-color: #dc3545; background-color: #f8d7da; }
      </style>
    </head>
    <body>
      <h1>🔗 Blockchain Task API Test</h1>
      
      <h2>Complete Task</h2>
      <div class="form-group">
        <label>User Address:</label>
        <input type="text" id="userAddress" placeholder="0x742d35Cc6535C9c80B5D7a8f1C8cd55c26A0f123">
      </div>
      <div class="form-group">
        <label>Timestamp:</label>
        <input type="number" id="timestamp" placeholder="1715418615">
      </div>
      <div class="form-group">
        <label>Transaction Hash (optional):</label>
        <input type="text" id="tx" placeholder="0x6539cac36a07f9c3d58ca0a4884c09ad05707f9d247fed3fb6853d1a86466f15">
      </div>
      <button onclick="completeTask()">Complete Task</button>
      <button onclick="generateSampleData()">Generate Sample Data</button>
      <div id="completeResponse" class="response" style="display: none;"></div>

      <h2>Check Status</h2>
      <div class="form-group">
        <label>User Address:</label>
        <input type="text" id="statusAddress" placeholder="0x742d35Cc6535C9c80B5D7a8f1C8cd55c26A0f123">
      </div>
      <button onclick="checkStatus()">Check Status</button>
      <div id="statusResponse" class="response" style="display: none;"></div>

      <h2>System Info</h2>
      <button onclick="getStats()">Get Stats</button>
      <button onclick="getHealth()">Health Check</button>
      <div id="systemResponse" class="response" style="display: none;"></div>

      <script>
        function generateSampleData() {
          document.getElementById('userAddress').value = '0x742d35Cc6535C9c80B5D7a8f1C8cd55c26A0f' + Math.random().toString(36).substr(2, 3);
          document.getElementById('timestamp').value = Math.floor(Date.now() / 1000);
          document.getElementById('tx').value = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
          document.getElementById('statusAddress').value = document.getElementById('userAddress').value;
        }

        function displayResponse(elementId, response, isSuccess = true) {
          const element = document.getElementById(elementId);
          element.style.display = 'block';
          element.textContent = JSON.stringify(response, null, 2);
          element.className = \`response \${isSuccess ? 'success' : 'error'}\`;
        }

        async function completeTask() {
          const userAddress = document.getElementById('userAddress').value;
          const timestamp = parseInt(document.getElementById('timestamp').value);
          const tx = document.getElementById('tx').value;

          if (!userAddress || !timestamp) {
            alert('Please fill in required fields');
            return;
          }

          try {
            const response = await fetch('/api/complete-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userAddress, timestamp, tx: tx || undefined })
            });

            const data = await response.json();
            displayResponse('completeResponse', data, response.ok);
          } catch (error) {
            displayResponse('completeResponse', { error: error.message }, false);
          }
        }

        async function checkStatus() {
          const userAddress = document.getElementById('statusAddress').value;
          if (!userAddress) {
            alert('Please enter a user address');
            return;
          }

          try {
            const response = await fetch(\`/api/task-status/\${userAddress}\`);
            const data = await response.json();
            displayResponse('statusResponse', data, response.ok);
          } catch (error) {
            displayResponse('statusResponse', { error: error.message }, false);
          }
        }

        async function getStats() {
          try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            displayResponse('systemResponse', data, response.ok);
          } catch (error) {
            displayResponse('systemResponse', { error: error.message }, false);
          }
        }

        async function getHealth() {
          try {
            const response = await fetch('/api/health');
            const data = await response.json();
            displayResponse('systemResponse', data, response.ok);
          } catch (error) {
            displayResponse('systemResponse', { error: error.message }, false);
          }
        }

        // Auto-generate sample data on load
        window.onload = generateSampleData;
      </script>
    </body>
    </html>
  `);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 0,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 0,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blockchain Task API server running on port ${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`🧪 Test Interface: http://localhost:${PORT}/test`);
  console.log(`⚡ Rate limit: 50 requests per second`);
  console.log('═══════════════════════════════════════');
});

module.exports = app;

/*
package.json:
{
  "name": "blockchain-task-api",
  "version": "1.0.0",
  "description": "Simple blockchain task completion API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "express-rate-limit": "^6.7.0",
    "express-validator": "^6.15.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
*/