import express from 'express';
import { getTicketConcerns } from '../controllers/ticketConcernsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getTicketConcerns);

export default router;
