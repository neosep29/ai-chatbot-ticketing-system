import Ticket from '../models/Ticket.js';
import TicketCounter from '../models/TicketCounter.js';

/** @typedef {import('../interfaces/ticketRepositoryTypes.js').TicketRepository} TicketRepository */

export const findTickets = (filter, { sort, skip, limit }) =>
  Ticket.find(filter).populate('userId', 'name email').populate('assignedTo', 'name email').sort(sort).skip(skip).limit(limit);

export const countTickets = (filter) => Ticket.countDocuments(filter);

export const findTicketsByUserId = (userId) =>
  Ticket.find({ userId })
    .populate('assignedTo', 'name email department')
    .populate('acceptedBy', 'name email')
    .sort({ createdAt: 1 });

export const findTicketById = (id) =>
  Ticket.findById(id)
    .populate('userId', 'name email')
    .populate('assignedTo', 'name email department')
    .populate('acceptedBy', 'name email')
    .populate({
      path: 'messages.sender',
      select: 'name role'
    });

export const findTicketByIdWithChat = (id) =>
  Ticket.findById(id).populate({
    path: 'chatId',
    select: 'messages'
  });

export const findTicketByIdRaw = (id) => Ticket.findById(id);

export const saveTicket = (ticket) => ticket.save();

export const createTicket = async (data) => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const dateKey = `${mm}${dd}${yyyy}`;

  const counter = await TicketCounter.findOneAndUpdate(
    { dateKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seqStr = String(counter.seq).padStart(2, '0');
  const ticketNumber = `${dateKey}${seqStr}`;

  const payload = { ...data, ticketNumber };
  return Ticket.create(payload);
};

export const deleteManyTickets = (filter) => Ticket.deleteMany(filter);

/** @type {TicketRepository} */
export const ticketRepository = {
  findTickets,
  countTickets,
  findTicketsByUserId,
  findTicketById,
  findTicketByIdWithChat,
  findTicketByIdRaw,
  saveTicket,
  createTicket,
  deleteManyTickets
};
