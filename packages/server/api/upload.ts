// api/upload.js

import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { bucketDir } from '../src/helpers';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif']);

async function ensureBucketExists() {
  await fs.mkdir(bucketDir, { recursive: true });
}

/**
 * GET /api/upload
 * Returns all uploaded images.
 */
router.get('/api/upload', async (_, res) => {
  try {
    await ensureBucketExists();

    const files = await fs.readdir(bucketDir);

    const images = files
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort()
      .reverse()
      .map((file) => ({
        id: file,
        name: file,
        src: `/bucket/${file}`,
      }));

    res.json(images);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Failed to load images',
    });
  }
});

/**
 * POST /api/upload
 */
router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    await ensureBucketExists();

    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    const filepath = path.join(bucketDir, filename);

    await fs.writeFile(filepath, file.buffer);

    res.json({
      success: true,
      image: {
        id: filename,
        name: file.originalname,
        src: `/bucket/${filename}`,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Upload failed',
    });
  }
});

/**
 * DELETE /api/upload
 */
router.delete('/api/upload', express.json(), async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Missing image id',
      });
    }

    const filepath = path.join(bucketDir, id);
    await fs.unlink(filepath);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Delete failed',
    });
  }
});

export default router;
