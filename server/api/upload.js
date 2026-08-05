// api/upload.js
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const router = express.Router();

const bucketDir = path.join(process.cwd(), 'public', 'bucket');

// Store uploads in memory first (similar to file.arrayBuffer())
const upload = multer({
  storage: multer.memoryStorage(),
});

router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // Ensure bucket exists
    await fs.mkdir(bucketDir, { recursive: true });

    // Generate unique filename
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    const filepath = path.join(bucketDir, filename);

    // Save file
    await fs.writeFile(filepath, file.buffer);

    // URL to access the file
    const url = `/bucket/${filename}`;

    return res.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: 'Upload failed',
    });
  }
});

export default router;
