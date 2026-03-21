import express from 'express';
import {
  getBetaResetStats,
  performBetaReset,
  previewBetaReset
} from '../controllers/betaResetController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route /api/beta-reset
router.get('/stats', protect, authorize('admin'), getBetaResetStats);
router.post('/reset', protect, authorize('admin'), performBetaReset);
router.get('/preview', protect, authorize('admin'), previewBetaReset);

export default router;
