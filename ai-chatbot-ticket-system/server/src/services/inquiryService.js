import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createEmbedding, preprocessText, generateInquiriesAI } from './aiService.js';
import { MAX_CHARS } from '../constants/constants.js';
import { escapeRegex } from '../utils/utils.js';
import {
  FILE_EXCEEDS_CHAR_LIMIT_MESSAGE,
  FILE_IMPORT_DUPLICATE_MESSAGE,
  FILE_IMPORT_SERVER_ERROR_MESSAGE,
  INQUIRY_MEMBER_DELETED_MESSAGE,
  INQUIRY_MEMBER_NOT_FOUND_MESSAGE,
  INQUIRY_RELEVANCE_NOT_FOUND_MESSAGE,
  IS_RELEVANT_REQUIRED_MESSAGE,
  NO_FILE_UPLOADED_MESSAGE,
  PROMPT_QUESTION_EXISTS_MESSAGE,
  PROMPT_QUESTION_REQUIRED_MESSAGE,
  RELEVANCE_UPDATED_MESSAGE,
  UNSUPPORTED_FILE_TYPE_MESSAGE
} from '../constants/controllerMessages.js';
import {
  aggregateInquiryRelevance,
  countInquiries,
  createInquiry,
  deleteInquiryById,
  findInquiries,
  findInquiryById,
  findInquiryByPromptQuestion,
  findInquiryByPromptQuestionExcludingId,
  findInquiryRelevanceById,
  saveInquiry,
  updateInquiryRelevanceMany
} from '../repositories/inquiryRepository.js';

// ========================================
// Cosine similarity function for semantic duplicate detection
// ========================================
const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
};

// ========================================
// CRUD and Query Functions
// ========================================

export const getAllInquiryData = async ({ page = 1, limit = 5, search = '', status = 'all' }) => {
  const query = {};

  if (search) {
    query.$or = [
      { promptQuestion: { $regex: escapeRegex(search), $options: 'i' } },
      { promptResponse: { $regex: escapeRegex(search), $options: 'i' } }
    ];
  }

  if (status !== 'all') {
    query.isEnabled = status === 'enabled';
  }

  const total = await countInquiries(query);
  const inquiries = await findInquiries(query, {
    sort: { createdAt: -1 },
    skip: (page - 1) * limit,
    limit
  });

  return {
    success: true,
    count: inquiries.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: inquiries
  };
};

export const getInquiryByIdData = async (id) => {
  const inquiry = await findInquiryById(id);
  if (!inquiry) {
    return {
      status: 404,
      payload: { success: false, message: INQUIRY_MEMBER_NOT_FOUND_MESSAGE }
    };
  }

  return {
    status: 200,
    payload: { success: true, data: inquiry }
  };
};

export const updateInquiryData = async (id, { promptQuestion, promptResponse, isEnabled }) => {
  const inquiry = await findInquiryById(id);
  if (!inquiry) {
    return {
      status: 404,
      payload: { success: false, message: INQUIRY_MEMBER_NOT_FOUND_MESSAGE }
    };
  }

  if (promptQuestion) {
    const preProcessedQuestion = preprocessText(promptQuestion);
    const currentQuestion = preprocessText(inquiry.promptQuestion);

    if (preProcessedQuestion !== currentQuestion) {
      const existing = await findInquiryByPromptQuestionExcludingId(promptQuestion, inquiry._id);
      if (existing) {
        return {
          status: 409,
          payload: { success: false, message: PROMPT_QUESTION_EXISTS_MESSAGE }
        };
      }

      inquiry.promptQuestion = promptQuestion;
      inquiry.embedding = await createEmbedding(preprocessText(preProcessedQuestion, true));
    }
  }

  if (promptResponse !== undefined) {
    inquiry.promptResponse = promptResponse;
  }
  if (isEnabled !== undefined) {
    inquiry.isEnabled = isEnabled;
  }

  const updated = await saveInquiry(inquiry);
  return { status: 200, payload: { success: true, data: updated } };
};

export const createInquiryData = async ({ promptQuestion, promptResponse }) => {
  if (!promptQuestion) {
    return {
      status: 400,
      payload: { success: false, message: PROMPT_QUESTION_REQUIRED_MESSAGE }
    };
  }

  const existing = await findInquiryByPromptQuestion(promptQuestion);
  if (existing) {
    return {
      status: 409,
      payload: { success: false, message: PROMPT_QUESTION_EXISTS_MESSAGE }
    };
  }

  const embedding = await createEmbedding(preprocessText(promptQuestion, true));
  const inquiry = await createInquiry({
    promptQuestion,
    promptResponse,
    embedding
  });

  return { status: 201, payload: { success: true, data: inquiry } };
};

export const deleteInquiryData = async (id) => {
  const inquiry = await findInquiryById(id);
  if (!inquiry) {
    return {
      status: 404,
      payload: { success: false, message: INQUIRY_MEMBER_DELETED_MESSAGE }
    };
  }

  await deleteInquiryById(id);
  return {
    status: 200,
    payload: { success: true, message: INQUIRY_MEMBER_DELETED_MESSAGE }
  };
};

// ========================================
// File Extraction
// ========================================

const extractTextFromFile = async (file) => {
  const mime = file.mimetype;

  if (mime === 'application/pdf') {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return result?.text || '';
    } finally {
      await parser.destroy();
    }
  }

  if (mime === 'text/plain' || mime === 'text/csv') {
    return file.buffer?.toString('utf8') || '';
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result?.value || '';
  }

  if (mime === 'application/msword') {
    throw new Error('DOC format is not supported. Please upload DOCX instead.');
  }

  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });

    let extractedText = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      extractedText += `\n--- Sheet: ${sheetName} ---\n`;
      for (const row of rows) {
        extractedText += row.join(' ') + '\n';
      }
    });

    return extractedText.trim();
  }

  throw new Error(`Unsupported file type: ${mime}`);
};

// ========================================
// Import Inquiries with Semantic Duplicate Detection
// ========================================

export const importInquiryFileData = async (file, count) => {
  if (!file) {
    return { status: 400, payload: { success: false, message: NO_FILE_UPLOADED_MESSAGE } };
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return { status: 400, payload: { success: false, message: UNSUPPORTED_FILE_TYPE_MESSAGE } };
  }

  let text = '';
  try {
    text = await extractTextFromFile(file);
  } catch (error) {
    console.error('Text extraction error:', error);
    return {
      status: 400,
      payload: { success: false, message: 'Failed to extract text from file. Please try another file.' }
    };
  }

  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    return {
      status: 400,
      payload: { success: false, message: 'File has no readable text content.' }
    };
  }

  if (normalizedText.length > MAX_CHARS) {
    return {
      status: 400,
      payload: { success: false, message: FILE_EXCEEDS_CHAR_LIMIT_MESSAGE(MAX_CHARS) }
    };
  }

  try {
    const inquiries = await generateInquiriesAI(normalizedText, count);

    // Track exact batch duplicates
    const uniqueQuestions = new Set();
    let processedCount = 0;

    // OPTIMIZATION: Fetch all existing embeddings ONCE
    console.log('Fetching existing embeddings for duplicate check...');
    const existingInquiries = await findInquiries({}, { projection: { embedding: 1 } });
    console.log(`Found ${existingInquiries.length} existing embeddings`);

    for (const inquiry of inquiries) {
      if (!inquiry?.question) continue;

      const normalizedQuestion = preprocessText(inquiry.question);
      if (uniqueQuestions.has(normalizedQuestion)) continue;
      uniqueQuestions.add(normalizedQuestion);

      // Progress logging to prevent timeout
      processedCount++;
      if (processedCount % 5 === 0) {  // Log every 5 instead of 10
        console.log(`Processing inquiry ${processedCount}/${inquiries.length}...`);
      }
      
      // Keep connection alive with heartbeat
      if (processedCount % 25 === 0) {
        console.log(`Still processing... ${processedCount} completed, ${inquiries.length - processedCount} remaining`);
      }

      // 1️⃣ Create embedding for new inquiry
      const newEmbedding = await createEmbedding(preprocessText(inquiry.question, true));

      // 2️⃣ Check semantic similarity using pre-fetched embeddings
      let isDuplicate = false;
      for (const existing of existingInquiries) {
        if (!existing.embedding) continue;
        const similarity = cosineSimilarity(newEmbedding, existing.embedding);
        if (similarity > 0.85) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) continue;

      // 4️⃣ Save new inquiry
      await createInquiry({
        promptQuestion: inquiry.question,
        promptResponse: inquiry.answer,
        isEnabled: true,
        embedding: newEmbedding
      });
    }

    return {
      status: 200,
      payload: {
        success: true,
        text: normalizedText,
        length: normalizedText.length,
        type: file.mimetype,
        inquiries
      }
    };
  } catch (error) {
    console.error(error);

    let message = FILE_IMPORT_SERVER_ERROR_MESSAGE;
    if (String(error?.message || '').includes('E11000')) {
      message = FILE_IMPORT_DUPLICATE_MESSAGE;
    }

    return { status: 500, payload: { success: false, message } };
  }
};

// ========================================
// Remaining Inquiry Relevance Functions
// ========================================

export const getAllInquiryRelevanceData = async ({ page = 1, limit = 5, search = '', relevance = 'all', updated = 'all' }) => {
  page = parseInt(page);
  limit = parseInt(limit);

  const matchStage = {};
  const andConditions = [];

  if (search) {
    andConditions.push({
      $or: [
        { userInquiry: { $regex: escapeRegex(search), $options: 'i' } },
        { generatedInquiry: { $regex: escapeRegex(search), $options: 'i' } }
      ]
    });
  }

  if (relevance === 'relevant') {
    matchStage.isRelevant = 1;
  } else if (relevance === 'not_relevant') {
    matchStage.isRelevant = 0;
  }

  if (updated === 'updated') {
    matchStage.isUpdated = true;
  } else if (updated === 'not_updated') {
    andConditions.push({
      $or: [
        { isUpdated: false },
        { isUpdated: { $exists: false } }
      ]
    });
  }

  if (andConditions.length > 0) {
    matchStage.$and = andConditions;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          userInquiry: '$userInquiry',
          generatedInquiry: '$generatedInquiry'
        },
        doc: { $first: '$$ROOT' }
      }
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ];

  const entries = await aggregateInquiryRelevance(pipeline);

  const totalAgg = await aggregateInquiryRelevance([
    { $match: matchStage },
    {
      $group: {
        _id: {
          userInquiry: '$userInquiry',
          generatedInquiry: '$generatedInquiry'
        }
      }
    },
    { $count: 'total' }
  ]);

  const total = totalAgg[0]?.total || 0;

  return {
    success: true,
    count: entries.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: entries
  };
};

export const getInquiryRelevanceByIdData = async (id) => {
  const entry = await findInquiryRelevanceById(id);
  if (!entry) {
    return {
      status: 404,
      payload: { success: false, message: INQUIRY_RELEVANCE_NOT_FOUND_MESSAGE }
    };
  }

  return { status: 200, payload: { success: true, data: entry } };
};

export const updateInquiryRelevanceData = async (id, { isRelevant, isUpdated }) => {
  const entry = await findInquiryRelevanceById(id);
  if (!entry) {
    return {
      status: 404,
      payload: { success: false, message: INQUIRY_RELEVANCE_NOT_FOUND_MESSAGE }
    };
  }

  if (isRelevant === undefined) {
    return {
      status: 400,
      payload: { success: false, message: IS_RELEVANT_REQUIRED_MESSAGE }
    };
  }

  const result = await updateInquiryRelevanceMany(
    {
      userInquiry: entry.userInquiry,
      generatedInquiry: entry.generatedInquiry
    },
    {
      $set: {
        isRelevant,
        ...(typeof isUpdated === 'boolean' ? { isUpdated } : {})
      }
    }
  );

  return {
    status: 200,
    payload: {
      success: true,
      updatedCount: result.modifiedCount,
      message: RELEVANCE_UPDATED_MESSAGE
    }
  };
};
