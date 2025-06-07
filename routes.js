// routes.js - Simple route handlers
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// In-memory storage (replace with database in production)
const taskCompletions = new Map(); // userAddress -> completion data
const usedTransactionHashes = new Set(); // Track unique transaction hashes

// Helper functions
function isValidTimestamp(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - (365 * 24 * 60 * 60);
  return timestamp >= oneYearAgo && timestamp <= now + 300; // Allow 5 minutes in future
}

function createSuccessResponse(timestamp, tx) {
  return {
    status: 1,
    data: {
      timestamp: timestamp,
      tx: tx || ""
    }
  };
}

function createIncompleteResponse() {
  return {
    status: 0,
    data: {
      timestamp: 0,
      tx: ""
    }
  };
}

function createErrorResponse(message) {
  return {
    status: 0,
    error: message,
    data: {
      timestamp: 0,
      tx: ""
    }
  };
}

// Validation middleware
const validateTaskCompletion = [
  body('userAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('timestamp')
    .isInt({ min: 1 })
    .withMessage('Timestamp must be a positive integer'),
  body('tx')
    .optional()
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format')
];

const validateAddressParam = [
  param('userAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format')
];

// Routes

/**
 * Complete a task
 * POST /api/complete-task
 */
router.post('/complete-task', validateTaskCompletion, (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createErrorResponse(errors.array()[0].msg));
    }

    const { userAddress, timestamp, tx } = req.body;
    const normalizedAddress = userAddress.toLowerCase();

    // Validate timestamp
    if (!isValidTimestamp(timestamp)) {
      return res.status(400).json(createErrorResponse('Invalid timestamp'));
    }

    // Check for duplicate transaction hash
    if (tx && usedTransactionHashes.has(tx)) {
      return res.status(400).json(createErrorResponse('Transaction hash already used'));
    }

    // Check existing completion
    const existingCompletion = taskCompletions.get(normalizedAddress);
    
    if (existingCompletion) {
      // Return existing completion data (no repeat allowed)
      return res.json(createSuccessResponse(existingCompletion.timestamp, existingCompletion.tx));
    }

    // Store new completion
    const completionData = {
      timestamp: timestamp,
      tx: tx || "",
      completedAt: new Date().toISOString()
    };

    taskCompletions.set(normalizedAddress, completionData);
    
    if (tx) {
      usedTransactionHashes.add(tx);
    }

    console.log(`Task completed by ${userAddress} at ${timestamp}${tx ? ` with tx ${tx}` : ''}`);

    return res.json(createSuccessResponse(timestamp, tx));

  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json(createErrorResponse('Internal server error'));
  }
});

/**
 * Check task completion status
 * GET /api/task-status/:userAddress
 */
router.get('/task-status/:userAddress', validateAddressParam, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createErrorResponse(errors.array()[0].msg));
    }

    const { userAddress } = req.params;
    const completion = taskCompletions.get(userAddress.toLowerCase());
    
    if (!completion) {
      return res.json(createIncompleteResponse());
    }

    return res.json(createSuccessResponse(completion.timestamp, completion.tx));
  } catch (error) {
    console.error('Error checking task status:', error);
    return res.status(500).json(createErrorResponse('Internal server error'));
  }
});

/**
 * Health check
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Math.floor(Date.now() / 1000),
    completions: taskCompletions.size,
    transactions: usedTransactionHashes.size
  });
});

/**
 * Get stats (simple version)
 * GET /api/stats
 */
router.get('/stats', (req, res) => {
  res.json({
    totalCompletions: taskCompletions.size,
    totalTransactions: usedTransactionHashes.size,
    timestamp: Math.floor(Date.now() / 1000)
  });
});

module.exports = router;