// server/routes/uploadRoutes.js
import express from 'express';
import upload from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multi-image upload (for room photos, profile pic, or KYC documents)
router.post('/', protect, (req, res) => {
  upload.array('images', 6)(req, res, function (err) {
    if (err) {
      console.error('Multer/Cloudinary Error:', err.message);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: 'No images uploaded. Front-end key must be "images"' });
      }

      const imageUrls = req.files.map((file) => file.path || file.secure_url);

      return res.json({ imageUrls, url: imageUrls[0] });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  });
});

export default router;
