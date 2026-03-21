import {
  deleteManyTickets,
  countTickets
} from '../repositories/ticketRepository.js';
import {
  findChats,
  deleteManyChats,
  countChats
} from '../repositories/chatRepository.js';
import {
  findStaff,
  countStaff,
  updateManyStaff
} from '../repositories/staffRepository.js';
import {
  countInquiryRelevance,
  countInquiries
} from '../repositories/inquiryRepository.js';

// Get system statistics before reset
export const getSystemStats = async () => {
  try {
    // Count tickets
    const ticketStats = await countTickets({});
    
    // Count chats
    const chatStats = await countChats({});
    
    // Count staff with ratings
    const staffWithRatings = await findStaff({
      $or: [
        { performanceScore: { $exists: true, $ne: 0 } },
        { totalRatings: { $exists: true, $ne: 0 } },
        { averageRating: { $exists: true, $ne: 0 } }
      ]
    });
    
    // Count total staff
    const totalStaff = await countStaff({});
    
    // Count inquiry relevance (preserved)
    const inquiryRelevanceCount = await countInquiryRelevance({});
    
    // Count inquiries (preserved)
    const inquiryCount = await countInquiries({});

    return {
      tickets: {
        total: ticketStats
      },
      chats: {
        total: chatStats
      },
      staff: {
        total: totalStaff,
        withRatings: staffWithRatings.length
      },
      inquiryRelevance: {
        total: inquiryRelevanceCount
      },
      inquiries: {
        total: inquiryCount
      }
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
};

// Delete all tickets (including staff assignments)
export const deleteAllTickets = async () => {
  try {
    const result = await deleteManyTickets({});
    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting tickets:', error);
    throw error;
  }
};

// Delete all chats
export const deleteAllChats = async () => {
  try {
    const result = await deleteManyChats({});
    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting chats:', error);
    throw error;
  }
};

// Reset all staff ratings to 0
export const resetAllStaffRatings = async () => {
  try {
    const result = await updateManyStaff(
      {}, // All staff
      {
        $set: {
          performanceScore: 0,
          totalRatings: 0,
          averageRating: 0,
          performanceOverview: {
            totalTickets: 0,
            resolvedTickets: 0,
            averageResponseTime: 0,
            customerSatisfaction: 0
          }
        },
        $unset: {
          recentRatings: "",
          lastRatingReset: ""
        }
      }
    );
    return { modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error('Error resetting staff ratings:', error);
    throw error;
  }
};
