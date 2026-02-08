import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { extractTextFromPDF, cleanText } from '../utils/pdfParser.js';

const router = express.Router();

// Setup __dirname (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute uploads directory (safer)
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, `pdf-${uniqueSuffix}${path.extname(safeName)}`);
  }
});

// File filter (PDF only)
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded. Please upload a PDF file.' 
      });
    }

    // Extract text from PDF
    const { text, numPages } = await extractTextFromPDF(req.file.path);
    const cleanedText = cleanText(text);

    if (!cleanedText || cleanedText.length < 20) {
      // Delete invalid file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Unable to extract readable text from PDF.'
      });
    }

    res.json({
      success: true,
      fileName: req.file.originalname,
      filePath: req.file.path,
      numPages,
      textLength: cleanedText.length,
      preview: cleanedText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Cleanup file if something failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'File upload failed'
    });
  }
});

export default router;
