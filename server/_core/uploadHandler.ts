import { Request, Response } from "express";
import { storagePut } from "../storage";
import { randomBytes } from "crypto";

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export async function handleImageUpload(req: Request & { file?: MulterFile }, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = req.file;
    
    // Validate file type
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "File size exceeds 5MB limit" });
    }

    // Generate unique filename
    const randomSuffix = randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const extension = file.originalname.split(".").pop() || "jpg";
    
    // Determine folder based on request context (default to products for backward compatibility)
    const folder = req.body?.folder || "products";
    const filename = `${folder}/${timestamp}-${randomSuffix}.${extension}`;

    // Upload to S3
    const { url } = await storagePut(filename, file.buffer, file.mimetype);

    return res.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
