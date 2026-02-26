import express from 'express';
import { sendMessage, getChatById, getUserChats, deleteAllChats, createTicketForChat } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/message', protect, sendMessage);
router.delete('/all', protect, deleteAllChats);
router.get('/:chatId', protect, getChatById);
router.get('/', protect, getUserChats);
router.post('/:chatId/create-ticket', protect, createTicketForChat);

export default router;
