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
router.get('/', protect, (req, res, next) => {
  console.log('🔍 Staff Inquiry GET Route - Checking authorization...');
  console.log('🔍 Staff Inquiry GET Route - User:', req.user);
  return authorize('staff')(req, res, next);
}, getAllInquiry);

router.get('/:id', protect, authorize('staff'), getInquiryById);
router.post('/', protect, authorize('staff'), createInquiry);
router.put('/:id', protect, authorize('staff'), updateInquiry);
router.delete('/:id', protect, authorize('staff'), deleteInquiry);

export default router;
