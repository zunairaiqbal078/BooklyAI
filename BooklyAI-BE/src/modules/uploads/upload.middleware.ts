import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { ValidationError } from "../../utils/app-error.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local disk folder for uploaded images (served at /uploads). */
export const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function ensureUploadsDir(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new ValidationError("Only JPEG, PNG, WebP, or GIF images are allowed."));
    return;
  }
  cb(null, true);
}

/** Single image field named `image`, max 5 MB. */
export const uploadImageMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("image");
