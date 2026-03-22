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
router.get('/', protect, authorize('staff'), getAllInquiry);
router.get('/:id', protect, authorize('staff'), getInquiryById);
router.post('/', protect, authorize('staff'), createInquiry);
router.put('/:id', protect, authorize('staff'), updateInquiry);
router.delete('/:id', protect, authorize('staff'), deleteInquiry);

export default router;
