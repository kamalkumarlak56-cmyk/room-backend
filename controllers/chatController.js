// server/controllers/chatController.js
import { Conversation, Message } from '../models/Chat.js';

// @desc    Start or get an existing conversation between User and Landlord
// @route   POST /api/chat/conversations
// @access  Private
export const startOrGetConversation = async (req, res) => {
  try {
    const { receiverId, roomId, initialMessage } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'You cannot start a chat with yourself' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        room: roomId || null,
        lastMessage: initialMessage || '',
        lastMessageAt: new Date(),
      });
    } else if (roomId) {
      conversation.room = roomId;
      await conversation.save();
    }

    if (initialMessage && initialMessage.trim()) {
      await Message.create({
        conversationId: conversation._id,
        sender: senderId,
        receiver: receiverId,
        text: initialMessage.trim(),
        room: roomId || conversation.room || null,
      });
      conversation.lastMessage = initialMessage.trim();
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name email phone profilePic role')
      .populate('room', 'title rent roomType location images')
      .lean();

    const otherParticipant =
      populated.participants?.find((p) => p._id.toString() !== senderId.toString()) ||
      populated.participants?.[0];

    res.json({
      ...populated,
      otherParticipant,
      unreadCount: 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all conversations for logged-in user/landlord
// @route   GET /api/chat/conversations
// @access  Private
export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name email phone profilePic role')
      .populate('room', 'title rent roomType location images')
      .sort({ lastMessageAt: -1 })
      .lean();

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: userId,
          read: false,
        },
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    for (const item of unreadCounts) {
      unreadMap[item._id.toString()] = item.count;
    }

    const enriched = conversations.map((conv) => {
      const otherParticipant =
        conv.participants?.find((p) => p._id.toString() !== userId.toString()) ||
        conv.participants?.[0];
      return {
        ...conv,
        otherParticipant,
        unreadCount: unreadMap[conv._id.toString()] || 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all messages in a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
export const getConversationMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Mark messages sent to current user as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        receiver: req.user._id,
        read: false,
      },
      { $set: { read: true } }
    );

    const messages = await Message.find({ conversationId: conversation._id })
      .populate('sender', 'name profilePic role')
      .populate('room', 'title rent roomType')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a chat message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, text, roomId } = req.body;
    const senderId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    let conv = null;
    if (conversationId) {
      conv = await Conversation.findById(conversationId);
    } else if (receiverId) {
      conv = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      });
      if (!conv) {
        conv = await Conversation.create({
          participants: [senderId, receiverId],
          room: roomId || null,
        });
      }
    }

    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const targetReceiver =
      receiverId ||
      conv.participants.find((p) => p.toString() !== senderId.toString());

    const message = await Message.create({
      conversationId: conv._id,
      sender: senderId,
      receiver: targetReceiver,
      text: text.trim(),
      room: roomId || conv.room || null,
    });

    conv.lastMessage = text.trim();
    conv.lastMessageAt = new Date();
    if (roomId) conv.room = roomId;
    await conv.save();

    const populatedMsg = await Message.findById(message._id)
      .populate('sender', 'name profilePic role')
      .populate('room', 'title rent roomType');

    res.status(201).json(populatedMsg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
