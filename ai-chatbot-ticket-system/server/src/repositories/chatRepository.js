import Chat from '../models/Chat.js';

/** @typedef {import('../interfaces/chatRepositoryTypes.js').ChatRepository} ChatRepository */

export const findChatById = (id) => Chat.findById(id);

export const createChat = (data) => Chat.create(data);

export const saveChat = (chat) => chat.save();

export const findChatsByUserId = (userId) =>
  Chat.find({ userId }).sort({ updatedAt: -1 });

export const deleteChatsByUserId = (userId) => Chat.deleteMany({ userId });

export const findChats = (filter) => Chat.find(filter);

export const countChats = (filter) => Chat.countDocuments(filter);

export const deleteManyChats = (filter) => Chat.deleteMany(filter);

/** @type {ChatRepository} */
export const chatRepository = {
  findChatById,
  createChat,
  saveChat,
  findChatsByUserId,
  deleteChatsByUserId,
  findChats,
  countChats,
  deleteManyChats
};
