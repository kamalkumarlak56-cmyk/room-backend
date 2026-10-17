// server/routes/chatRoutes.js
import express from 'express';
import {
  startOrGetConversation,
  getMyConversations,
  getConversationMessages,
  sendMessage,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/conversations', startOrGetConversation);
router.get('/conversations', getMyConversations);
router.get('/conversations/:id/messages', getConversationMessages);
router.post('/messages', sendMessage);

export default router;
