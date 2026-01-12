const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
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

    // Get PDF info to check page count using pdfinfo
    let pageCount = 0;
    try {
      const { stdout } = await execAsync(`pdfinfo "${tempPdfPath}"`);
      const pagesMatch = stdout.match(/Pages:\s*(\d+)/i);
      if (pagesMatch) {
        pageCount = parseInt(pagesMatch[1], 10);
      }
    } catch (error) {
      // If pdfinfo fails, try to convert and count pages
      console.warn('pdfinfo failed, will determine page count from conversion:', error.message);
    }

    if (pageCount > MAX_PAGES) {
      return res.status(400).json({ 
        error: `PDF has ${pageCount} pages, maximum allowed is ${MAX_PAGES}` 
      });
    }

    // Convert PDF pages to images using pdftoppm (direct poppler command)
    // This is more reliable than pdf-poppler package which has platform detection issues
    const outputPrefix = path.join(tempDir, 'page');
    try {
      // Use pdftoppm to convert PDF to JPEG images
      // -jpeg: output format
      // -r 150: resolution (we'll resize with sharp anyway)
      // -scale-to-x 1400 -scale-to-y 1400: scale to max dimension (sharp will handle final resize)
      // pdftoppm outputs files as: prefix-01.jpg, prefix-02.jpg, etc.
      await execAsync(`pdftoppm -jpeg -r 150 -scale-to-x ${MAX_DIMENSION} -scale-to-y ${MAX_DIMENSION} ${tempPdfPath} ${outputPrefix}`, {
        cwd: tempDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large PDFs
      });
      
      // If pageCount wasn't determined, count the generated files
      if (pageCount === 0) {
        const files = fs.readdirSync(tempDir).filter(f => f.startsWith('page-') && f.endsWith('.jpg'));
        pageCount = files.length;
      }
    } catch (error) {
      console.error('pdftoppm error:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }

    if (pageCount === 0) {
      return res.status(400).json({ error: 'PDF has no pages or conversion failed' });
    }

    // Process images: resize and optimize
    // pdftoppm outputs files as: page-01.jpg, page-02.jpg, etc.
    const imageBuffers = [];
    const imageFiles = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('page-') && file.endsWith('.jpg'))
      .sort((a, b) => {
        // Extract page number from filename (e.g., "page-01.jpg" -> 1)
        const numA = parseInt(a.match(/-(\d+)\./)?.[1] || '0', 10);
        const numB = parseInt(b.match(/-(\d+)\./)?.[1] || '0', 10);
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

      // Extract page number from filename (e.g., "page-01.jpg" -> 1)
      const pageNum = parseInt(imageFile.match(/-(\d+)\./)?.[1] || '0', 10);
      imageBuffers.push({
        pageNumber: pageNum,
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

