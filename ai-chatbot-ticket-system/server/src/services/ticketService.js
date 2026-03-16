import { classifyTicket } from '../services/aiService.js';
import { sendTicketAcceptedToStudent, sendTicketRejectedToStudent, sendTicketForwardedToStaff } from '../services/emailService.js';
import { createInquiryData } from './inquiryService.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import {
  MESSAGE_CONTENT_REQUIRED_MESSAGE,
  TICKET_ACCEPT_NOT_AUTHORIZED_MESSAGE,
  TICKET_ACCESS_NOT_AUTHORIZED_MESSAGE,
  TICKET_ALREADY_ACCEPTED_MESSAGE,
  TICKET_CLASSIFY_NOT_AUTHORIZED_MESSAGE,
  TICKET_END_CONVERSATION_NOT_AUTHORIZED_MESSAGE,
  TICKET_NOT_FOUND_MESSAGE,
  TICKET_UPDATE_NOT_AUTHORIZED_MESSAGE,
  TICKET_ADD_MESSAGE_NOT_AUTHORIZED_MESSAGE
} from '../constants/controllerMessages.js';
import {
  countTickets,
  findTicketById,
  findTicketByIdRaw,
  findTicketByIdWithChat,
  findTickets,
  findTicketsByUserId,
  saveTicket
} from '../repositories/ticketRepository.js';

export const getAllTicketsData = async ({ page = 1, limit = 10, status, user }) => {
  const startIndex = (page - 1) * limit;
  let filter = {};
  let baseFilter = {};

  if (status) {
    filter.status = status;
  }

  if (user.role === 'staff') {
    const User = (await import('../models/User.js')).default;
    const me = await User.findById(user.id).select('tags');
    const myTags = (me?.tags || []).map(t => String(t).trim()).filter(Boolean);
    const tagFilter = myTags.length ? { $in: myTags } : { $in: [] };

    baseFilter = {
      ...filter,
      $or: [
        { assignedTo: user.id },
        { forwardedTo: user.id },
        { assignedTo: null, forwardedTo: null, tag: tagFilter }
      ]
    };
    filter = baseFilter;
  } else {
    baseFilter = {};
  }

  // For listing we respect the (possibly) status-filtered query
  let tickets = await findTickets(filter, {
    sort: { createdAt: 1 },
    skip: startIndex,
    limit
  });
  const filteredTotal = await countTickets(filter);

  // Status counters using base visibility filter (ignoring status param)
  const statuses = ['pending', 'accepted', 'in-progress', 'resolved', 'closed', 'rejected'];
  const statusCounts = {};
  for (const s of statuses) {
    statusCounts[s] = await countTickets({ ...baseFilter, status: s });
  }
  const overallTotal = await countTickets(baseFilter);
  const openCount = (statusCounts['pending'] || 0) + (statusCounts['accepted'] || 0) + (statusCounts['in-progress'] || 0);

  // Auto-close check for listed tickets
  const activeStatuses = ['accepted', 'in-progress'];
  const toAutoClose = tickets.filter(t => activeStatuses.includes(t.status) && t.autoCloseAt && new Date(t.autoCloseAt).getTime() <= Date.now());
  if (toAutoClose.length) {
    for (const t of toAutoClose) {
      try {
        const raw = await findTicketByIdRaw(t._id);
        if (raw && activeStatuses.includes(raw.status) && raw.autoCloseAt && new Date(raw.autoCloseAt).getTime() <= Date.now()) {
          raw.status = 'closed';
          await saveTicket(raw);
        }
      } catch (e) {
        console.error('Auto-close error for ticket', t._id, e);
      }
    }
    tickets = await findTickets(filter, {
      sort: { createdAt: 1 },
      skip: startIndex,
      limit
    });
  }

  return {
    status: 200,
    payload: {
      success: true,
      count: tickets.length,
      total: overallTotal,
      pagination: {
        pages: Math.ceil(filteredTotal / limit),
        page,
        limit
      },
      data: tickets,
      counters: {
        total: overallTotal,
        open: openCount,
        pending: statusCounts['pending'] || 0,
        accepted: statusCounts['accepted'] || 0,
        inProgress: statusCounts['in-progress'] || 0,
        resolved: statusCounts['resolved'] || 0,
        closed: statusCounts['closed'] || 0,
        rejected: statusCounts['rejected'] || 0
      }
    }
  };
};

export const getUserTicketsData = async (userId) => {
  const tickets = await findTicketsByUserId(userId);
  return {
    status: 200,
    payload: { success: true, count: tickets.length, data: tickets }
  };
};

export const getTicketByIdData = async ({ id, user }) => {
  let ticket = await findTicketById(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

  const isOwner = ticket.userId._id.toString() === user.id;
  const isStaff = user.role === 'admin' || user.role === 'staff';
  const isAssigned = ticket.assignedTo && ticket.assignedTo._id.toString() === user.id;

  if (!isOwner && !isStaff && !isAssigned) {
    return {
      status: 403,
      payload: { success: false, message: TICKET_ACCESS_NOT_AUTHORIZED_MESSAGE }
    };
  }

  // Auto-close check
  const activeStatuses = ['accepted', 'in-progress'];
  const isActive = activeStatuses.includes(ticket.status);
  const shouldAutoClose = isActive && ticket.autoCloseAt && new Date(ticket.autoCloseAt).getTime() <= Date.now();
  if (shouldAutoClose) {
    const raw = await findTicketByIdRaw(id);
    raw.status = 'closed';
    await saveTicket(raw);
    ticket = await findTicketById(id);
  }
  return { status: 200, payload: { success: true, data: ticket } };
};

export const updateTicketData = async ({ id, user, updates }) => {
  let ticket = await findTicketByIdRaw(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

  if (user.role !== 'admin') {
    return {
      status: 403,
      payload: { success: false, message: TICKET_UPDATE_NOT_AUTHORIZED_MESSAGE }
    };
  }

  const { status, priority, category, assignedTo } = updates;
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (category) ticket.category = category;
  if (assignedTo) ticket.assignedTo = assignedTo;

  await saveTicket(ticket);
  ticket = await findTicketById(id);

  return { status: 200, payload: { success: true, data: ticket } };
};

export const addTicketMessageData = async ({ id, user, content }) => {
  if (!content) {
    return {
      status: 400,
      payload: { success: false, message: MESSAGE_CONTENT_REQUIRED_MESSAGE }
    };
  }

  const ticket = await findTicketByIdRaw(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

  const isOwner = ticket.userId.toString() === user.id;
  const isStaff = user.role === 'admin' || user.role === 'staff';
  const isAssigned = ticket.assignedTo && ticket.assignedTo.toString() === user.id;

  if (!isOwner && !isStaff && !isAssigned) {
    return {
      status: 403,
      payload: { success: false, message: TICKET_ADD_MESSAGE_NOT_AUTHORIZED_MESSAGE }
    };
  }

  ticket.messages.push({ sender: user.id, content });

  // Create inquiry from staff answer for training data
  if ((user.role === 'admin' || user.role === 'staff')) {
    try {
      // Create inquiry from staff answer (disabled for admin review)
      const inquiryResult = await createInquiryData({
        promptQuestion: `Ticket: ${ticket.title} - User Question: ${ticket.description}`,
        promptResponse: content,
        isEnabled: false, // Disabled for admin review first
        createdAt: ticket.createdAt // Use ticket's original creation date
      });
      
      if (inquiryResult.status === 201) {
        console.log(`✅ Created inquiry from ticket #${ticket._id} for training (disabled)`);
      } else if (inquiryResult.status === 409) {
        console.log(`ℹ️ Inquiry already exists for ticket #${ticket._id}`);
      } else {
        console.log(`❌ Failed to create inquiry from ticket #${ticket._id}:`, inquiryResult.payload?.message);
      }
    } catch (error) {
      console.error(`❌ Error creating inquiry from ticket #${ticket._id}:`, error);
    }
  }

  if ((user.role === 'admin' || user.role === 'staff') && ticket.status === 'accepted') {
    ticket.status = 'in-progress';
  }
  if (user.role === 'admin' || user.role === 'staff') {
    const now = new Date();
    ticket.lastStaffReplyAt = now;
    ticket.autoCloseAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  } else {
    // Student replied - keep conversation active and cancel any scheduled auto-close
    ticket.autoCloseAt = null;
  }

  await saveTicket(ticket);
  const updatedTicket = await findTicketById(id);

  return { status: 200, payload: { success: true, data: updatedTicket } };
};

export const classifyTicketData = async ({ id, user }) => {
  const ticket = await findTicketByIdWithChat(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

  if (user.role !== 'admin') {
    return {
      status: 403,
      payload: { success: false, message: TICKET_CLASSIFY_NOT_AUTHORIZED_MESSAGE }
    };
  }

  const chatMessages = ticket.chatId ? ticket.chatId.messages : [];
  const { category, priority } = await classifyTicket(ticket.description, chatMessages);
  ticket.category = category;
  ticket.priority = priority;
  await saveTicket(ticket);

  return {
    status: 200,
    payload: { success: true, data: { ticketId: ticket._id, category, priority } }
  };
};

export const acceptTicketData = async ({ id, user }) => {
  const ticket = await findTicketByIdRaw(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

const isForwardedToMe = ticket.forwardedTo && ticket.forwardedTo.toString() === user.id;
  
  if (ticket.status !== 'pending' && !isForwardedToMe) {
    return {
      status: 400,
      payload: { success: false, message: TICKET_ALREADY_ACCEPTED_MESSAGE }
    };
  }
  
  if (isForwardedToMe && (ticket.status === 'accepted' || ticket.status === 'in-progress')) {
    ticket.status = 'accepted';
    ticket.acceptedBy = user.id;
    ticket.acceptedAt = new Date();
    ticket.assignedTo = user.id;
    ticket.forwardedTo = null;
    ticket.forwardedAt = null;
    await saveTicket(ticket);

    const updatedTicket = await findTicketById(id);
    return { status: 200, payload: { success: true, data: updatedTicket } };
  }

  if (user.role === 'staff') {
    const User = (await import('../models/User.js')).default;
    const me = await User.findById(user.id).select('tags');
    const myTags = (me?.tags || []).map(t => String(t).trim());

    const ticketTag = String(ticket.tag || '').trim();
    const isForwardedToMe = ticket.forwardedTo && ticket.forwardedTo.toString() === user.id;
    const isAssignedToMe = ticket.assignedTo && ticket.assignedTo.toString() === user.id;
    const hasMatchingTag = ticketTag && myTags.includes(ticketTag);

    const allowed = isForwardedToMe || isAssignedToMe || hasMatchingTag;

    if (!allowed) {
      return {
        status: 403,
        payload: { success: false, message: TICKET_ACCEPT_NOT_AUTHORIZED_MESSAGE }
      };
    }
  }

  ticket.status = 'accepted';
  ticket.acceptedBy = user.id;
  ticket.acceptedAt = new Date();
  ticket.assignedTo = user.id;
  await saveTicket(ticket);

  const updatedTicket = await findTicketById(id);

  // Send email asynchronously without blocking response
  setTimeout(async () => {
    try {
      // Re-enabled - Using port 2525 to bypass DigitalOcean restrictions
      const studentName = updatedTicket.userId?.name || 'Student';
      const studentEmail = updatedTicket.userId?.email || '';
      const staffName = updatedTicket.acceptedBy?.name || 'Staff';
      if (studentEmail) {
        await sendTicketAcceptedToStudent(updatedTicket, studentName, studentEmail, staffName);
      }
    } catch (emailError) {
      console.error('Error sending acceptance email:', emailError);
    }
  }, 0);

  return { status: 200, payload: { success: true, data: updatedTicket } };
};

export const endConversationData = async ({ id, user }) => {
  const ticket = await findTicketByIdRaw(id);
  if (!ticket) {
    return { status: 404, payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE } };
  }

  const isStaff = user.role === 'admin' || user.role === 'staff';
  const ticketUserId = ticket.userId._id ? ticket.userId._id.toString() : ticket.userId.toString();
  const isOwner = ticketUserId === user.id;

  if (!isStaff && !isOwner) {
    return {
      status: 403,
      payload: { success: false, message: TICKET_END_CONVERSATION_NOT_AUTHORIZED_MESSAGE }
    };
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed' || ticket.status === 'rejected') {
    const updatedTicket = await findTicketById(id);
    return { status: 200, payload: { success: true, data: updatedTicket } };
  }

  if (isOwner && !isStaff) {
    ticket.messages.push({
      sender: user.id,
      content: 'Student marked this conversation as satisfied ✅ Conversation closed.'
    });
    ticket.status = 'closed';
  } else if (isStaff) {
    ticket.messages.push({
      sender: user.id,
      content: 'Conversation closed by staff ✅'
    });
    ticket.status = 'closed';
  }

  await saveTicket(ticket);

  const updatedTicket = await findTicketById(id);
  return { status: 200, payload: { success: true, data: updatedTicket } };
};

export const rejectTicketData = async ({ id, user, reason }) => {
  const ticket = await findTicketByIdRaw(id);

  if (!ticket) {
    return {
      status: 404,
      payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE }
    };
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed' || ticket.status === 'rejected') {
    return {
      status: 400,
      payload: { success: false, message: 'Conversation already closed' }
    };
  }


  if (user.role !== 'admin' && user.role !== 'staff') {
    return {
      status: 403,
      payload: { success: false, message: 'Not authorized' }
    };
  }

  ticket.status = 'rejected';
  ticket.rejectedBy = user.id;
  ticket.rejectedAt = new Date();
  ticket.rejectionReason = reason || 'No reason provided';

  await saveTicket(ticket);

  const populatedTicket = await findTicketById(id);

  // Send email asynchronously without blocking response
  setTimeout(async () => {
    try {
      // Re-enabled - Using port 2525 to bypass DigitalOcean restrictions
      const studentName = populatedTicket.userId?.name || 'Student';
      const studentEmail = populatedTicket.userId?.email || '';
      const staffName = user.name || 'Staff';
      if (studentEmail) {
        await sendTicketRejectedToStudent(
          populatedTicket,
          studentName,
          studentEmail,
          staffName,
          reason
        );
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
    }
  }, 0);

  return {
    status: 200,
    payload: { success: true, data: populatedTicket }
  };
};

export const forwardTicketData = async ({ id, user, staffId }) => {
  const ticket = await findTicketByIdRaw(id);

  if (!ticket) {
    return {
      status: 404,
      payload: { success: false, message: TICKET_NOT_FOUND_MESSAGE }
    };
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    return {
      status: 403,
      payload: { success: false, message: 'Not authorized' }
    };
  }

  ticket.assignedTo = staffId;
  ticket.forwardedTo = staffId;
  ticket.forwardedAt = new Date();

  await saveTicket(ticket);

  const populatedTicket = await findTicketById(id);

  // Send email asynchronously without blocking response
  setTimeout(async () => {
    try {
      // Re-enabled - Using port 2525 to bypass DigitalOcean restrictions
      const forwardedStaff = await User.findById(staffId);
      if (forwardedStaff && forwardedStaff.email) {
        await sendTicketForwardedToStaff(
          populatedTicket,
          forwardedStaff.name,
          forwardedStaff.email
        );
      }
    } catch (emailError) {
      console.error('Error sending forward email:', emailError);
    }
  }, 0);

  return {
    status: 200,
    payload: { success: true, data: populatedTicket }
  };
};
