// server/routes/uploadRoutes.js
import express from 'express';
// 1. यहाँ डिफ़ॉल्ट इम्पोर्ट हटाकर कर्ली ब्रेसेस के साथ सही { uploadCloud } लगाएँ
import { uploadCloud } from '../config/cloudinary.js';

import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Ek baar me maximum 5 images upload ho sakti hain
router.post(
  '/',
  protect,
  authorizeRoles('owner', 'admin'),
  // 2. यहाँ 'upload' की जगह 'uploadCloud' का इस्तेमाल करें
  uploadCloud.array('images', 5),
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      // Cloudinary se har file ka direct image URL nikalte hain
      const imageUrls = req.files.map((file) => file.path);
      res.json({ imageUrls });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
