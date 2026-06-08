import { Router } from "express";
import { requireAuth } from "../lib/auth";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

router.post("/proof", requireAuth, (req, res) => {
  const { data, ext = "jpg" } = req.body as { data?: string; ext?: string };
  if (!data) { res.status(400).json({ error: "No data provided" }); return; }

  try {
    const base64 = data.includes(",") ? data.split(",")[1] : data;
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
    const filename = `proof_${randomUUID()}.${safeExt}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
    const url = `/api/uploads/${filename}`;
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/avatar", requireAuth, (req, res) => {
  const { data, ext = "jpg" } = req.body as { data?: string; ext?: string };
  if (!data) { res.status(400).json({ error: "No data provided" }); return; }

  try {
    const base64 = data.includes(",") ? data.split(",")[1] : data;
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
    const filename = `avatar_${randomUUID()}.${safeExt}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
    const url = `/api/uploads/${filename}`;
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
