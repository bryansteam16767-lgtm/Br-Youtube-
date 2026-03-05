import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Configure multer for file storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const upload = multer({ storage });

  // API Routes
  app.post("/upload", upload.single("video"), (req, res) => {
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    console.log(`Received upload: ${title} - ${file.path}`);

    // In a real app, we would save this to a database
    // For now, we just return success
    res.json({
      message: "Upload successful",
      video: {
        title,
        filename: file.filename,
        path: `/uploads/${file.filename}`,
      },
    });
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
