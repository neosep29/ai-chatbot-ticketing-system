import express from 'express';
import {
  getAllInquiry,
  getInquiryById,
  createInquiry,
  updateInquiry,
  deleteInquiry
} from '../controllers/inquiryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route /api/staff/inquiries
router.get('/', protect, authorize('staff', 'admin'), getAllInquiry);
router.get('/:id', protect, authorize('staff', 'admin'), getInquiryById);
router.post('/', protect, authorize('staff', 'admin'), createInquiry);
router.put('/:id', protect, authorize('staff', 'admin'), updateInquiry);
router.delete('/:id', protect, authorize('staff', 'admin'), deleteInquiry);

export default router;
