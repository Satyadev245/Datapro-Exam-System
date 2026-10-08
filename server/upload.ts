import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads', 'examinations'));

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate clean safe filename with timestamp
    const cleanExt = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `EXAM_${safeBase}_${uniqueSuffix}${cleanExt}`);
  }
});

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

export const examUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    
    if (allowedMimeTypes.includes(file.mimetype) || validExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'));
    }
  }
});


const ATTENDANCE_DIR = path.resolve(process.env.ATTENDANCE_UPLOADS_DIR || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads', 'attendance'));
if (!fs.existsSync(ATTENDANCE_DIR)) fs.mkdirSync(ATTENDANCE_DIR, { recursive: true });
const attendanceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTENDANCE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `ATTENDANCE_${safe}_${Date.now()}${ext}`);
  }
});
export const attendanceUpload = multer({
  storage: attendanceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xls','.xlsx','.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Attendance file must be Excel (.xls/.xlsx) or CSV.'));
  }
});
