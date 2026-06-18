import multer from 'multer';
import { AppError } from './error.middleware';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../types';

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type '${file.mimetype}' is not allowed. Allowed types: PDF, images, Word documents`,
        400,
        'Bad Request'
      )
    );
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
}).single('file');

export const uploadMultipleMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
}).array('files', 5);
