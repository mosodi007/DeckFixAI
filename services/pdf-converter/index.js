const express = require('express');
const multer = require('multer');
const pdf = require('pdf-poppler');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_PAGES = 20;
const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 65;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-converter' });
});

// Convert PDF to images endpoint
app.post('/convert', upload.single('pdf'), async (req, res) => {
  let tempPdfPath = null;
  let tempDir = null;

  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
      });
    }

    // Create temporary directory for processing
    tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pdf-convert-'));
    tempPdfPath = path.join(tempDir, 'input.pdf');

    // Write PDF buffer to temporary file
    fs.writeFileSync(tempPdfPath, req.file.buffer);

    // Get PDF info to check page count
    const pdfInfo = await pdf.getInfo(tempPdfPath);
    const pageCount = pdfInfo.pages || 0;

    if (pageCount > MAX_PAGES) {
      return res.status(400).json({ 
        error: `PDF has ${pageCount} pages, maximum allowed is ${MAX_PAGES}` 
      });
    }

    if (pageCount === 0) {
      return res.status(400).json({ error: 'PDF has no pages' });
    }

    // Convert PDF pages to images
    const options = {
      format: 'jpeg',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null, // Convert all pages
      scale: 1.0, // We'll resize with sharp
    };

    await pdf.convert(tempPdfPath, options);

    // Process images: resize and optimize
    const imageBuffers = [];
    const imageFiles = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('page') && file.endsWith('.jpg'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    for (const imageFile of imageFiles) {
      const imagePath = path.join(tempDir, imageFile);
      const imageBuffer = await readFile(imagePath);

      // Get image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;

      // Calculate scale if needed
      let targetWidth = width;
      let targetHeight = height;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        targetWidth = Math.round(width * scale);
        targetHeight = Math.round(height * scale);
      }

      // Resize and optimize image
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ 
          quality: JPEG_QUALITY,
          mozjpeg: true, // Better compression
        })
        .toBuffer();

      imageBuffers.push({
        pageNumber: parseInt(imageFile.match(/\d+/)?.[0] || '0'),
        buffer: optimizedBuffer,
        width: targetWidth,
        height: targetHeight,
        size: optimizedBuffer.length,
      });

      // Clean up individual image file
      await unlink(imagePath);
    }

    // Clean up temporary files
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      await unlink(tempPdfPath);
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Return images as base64 encoded strings
    const images = imageBuffers.map(img => ({
      pageNumber: img.pageNumber,
      data: img.buffer.toString('base64'),
      width: img.width,
      height: img.height,
      size: img.size,
    }));

    res.json({
      success: true,
      pageCount: images.length,
      images,
    });

  } catch (error) {
    console.error('PDF conversion error:', error);

    // Clean up temporary files on error
    try {
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
        await unlink(tempPdfPath);
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({
      error: 'Failed to convert PDF',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Converter Service running on port ${PORT}`);
});

