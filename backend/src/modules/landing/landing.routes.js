const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./landing.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { s3UploadMiddleware } = require('../../config/s3');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/landing');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG, WEBP ou GIF uniquement'), ok);
  },
});

// Public — accessible sans authentification
router.get('/config', ctrl.getAllConfig);
router.get('/config/:section', ctrl.getSection);

// Admin only
router.put('/config/:section', authentifier, autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.upsertSection);
router.post('/upload', authentifier, autoriser('SUPER_ADMIN', 'ADMIN_OPS'), upload.single('image'), s3UploadMiddleware('landing'), ctrl.uploadImage);

module.exports = router;
