/**
 * Image Upload Router
 * Handles image uploads to S3 storage
 */

import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import crypto from "crypto";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Upload single file
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split(".").pop();
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const fileName = `review-${Date.now()}-${randomSuffix}.${fileExtension}`;
    const fileKey = `reviews/${fileName}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({
      success: true,
      url,
      fileName,
    });
  } catch (error) {
    console.error("[Upload] Error uploading file:", error);
    res.status(500).json({
      error: "Failed to upload file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
