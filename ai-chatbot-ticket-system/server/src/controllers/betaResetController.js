import {
  deleteAllTickets,
  deleteAllChats,
  resetAllStaffRatings,
  getSystemStats
} from '../services/betaResetService.js';
import { SERVER_ERROR_MESSAGE } from '../constants/controllerMessages.js';

// @desc    Get current system statistics before reset
// @route   GET /api/beta-reset/stats
// @access  Private/Admin
export const getBetaResetStats = async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting beta reset stats:', error);
    res.status(500).json({
      success: false,
      message: SERVER_ERROR_MESSAGE
    });
  }
};

// @desc    Reset system for beta testing
// @route   POST /api/beta-reset/reset
// @access  Private/Admin
export const performBetaReset = async (req, res) => {
  try {
    console.log('🔄 Starting beta reset...');
    
    // Step 1: Get current stats before reset
    const beforeStats = await getSystemStats();
    console.log('📊 Before reset:', beforeStats);
    
    // Step 2: Delete all user tickets (including staff assignments)
    console.log('🗑️ Deleting all tickets...');
    const ticketResult = await deleteAllTickets();
    console.log(`✅ Deleted ${ticketResult.deletedCount} tickets`);
    
    // Step 3: Delete all user chats
    console.log('🗑️ Deleting all chats...');
    const chatResult = await deleteAllChats();
    console.log(`✅ Deleted ${chatResult.deletedCount} chats`);
    
    // Step 4: Reset all staff ratings to 0
    console.log('🔄 Resetting staff ratings...');
    const ratingResult = await resetAllStaffRatings();
    console.log(`✅ Reset ratings for ${ratingResult.modifiedCount} staff members`);
    
    // Step 5: Get after stats
    const afterStats = await getSystemStats();
    console.log('📊 After reset:', afterStats);
    
    console.log('✅ Beta reset completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Beta reset completed successfully',
      data: {
        before: beforeStats,
        after: afterStats,
        resetSummary: {
          ticketsDeleted: ticketResult.deletedCount,
          chatsDeleted: chatResult.deletedCount,
          staffRatingsReset: ratingResult.modifiedCount
        }
      }
    });
  } catch (error) {
    console.error('Error performing beta reset:', error);
    res.status(500).json({
      success: false,
      message: SERVER_ERROR_MESSAGE
    });
  }
};

// @desc    Confirm what will be reset (preview)
// @route   GET /api/beta-reset/preview
// @access  Private/Admin
export const previewBetaReset = async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.status(200).json({
      success: true,
      message: 'Beta reset preview',
      data: {
        willBeDeleted: {
          tickets: stats.tickets.total,
          chats: stats.chats.total,
          staffRatings: stats.staff.withRatings
        },
        willBePreserved: {
          inquiryRelevanceEvaluations: stats.inquiryRelevance.total,
          gptMetrics: 'Preserved',
          staffAccounts: stats.staff.total,
          systemConfig: 'Preserved'
        }
      }
    });
  } catch (error) {
    console.error('Error previewing beta reset:', error);
    res.status(500).json({
      success: false,
      message: SERVER_ERROR_MESSAGE
    });
  }
};
