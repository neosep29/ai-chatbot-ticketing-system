const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createTicket, getTickets, getTicket, updateTicket, getTicketHistory } = require('../controllers/ticketController');

// Create ticket
router.post('/', protect, authorize('user', 'staff'), createTicket);

// Get all tickets
router.get('/', protect, authorize('user', 'staff'), getTickets);

// Get single ticket
router.get('/:id', protect, authorize('user', 'staff'), getTicket);

// Get ticket status history
router.get('/:id/history', protect, authorize('user', 'staff'), getTicketHistory);

// Update ticket
router.put('/:id', protect, authorize('user', 'staff'), updateTicket);

module.exports = router;