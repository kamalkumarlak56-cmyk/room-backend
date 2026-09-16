// server/routes/uploadRoutes.js
import express from 'express';
// 1. यहाँ कर्ली ब्रेसेस बिल्कुल मत लगाओ! डिफ़ॉल्ट इम्पोर्ट 'upload' ही सही है क्योंकि आपकी config फ़ाइल में default export है।
import upload from '../config/cloudinary.js'; 

import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 2. राउट को सुरक्षित तरीके से चलाने के लिए एक्सप्रेस एरर हैंडलर ब्लॉक का उपयोग करें
router.post('/', protect, authorizeRoles('owner', 'admin'), (req, res) => {
  
  // Multer को फंक्शन की तरह रन करें ताकि एरर Vercel को क्रैश न करे
  upload.array('images', 5)(req, res, function (err) {
    if (err) {
      console.error("Multer/Cloudinary Error:", err.message);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded. Front-end key must be "images"' });
      }

      // Cloudinary से इमेजेस का डायरेक्ट URL निकालें
      const imageUrls = req.files.map((file) => file.path || file.secure_url);
      
      return res.json({ imageUrls });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });
});

export default router;
