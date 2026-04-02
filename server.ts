import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import cors from "cors";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for PDF generation
  app.post("/api/generate", upload.array("images", 6), async (req: any, res) => {
    try {
      const files = req.files as any[];
      const vin = req.body.vin || "";
      
      if (!files || files.length !== 6) {
        return res.status(400).json({ error: "Яг 6 зураг оруулах шаардлагатай." });
      }

      // Extract last 4 digits of VIN
      const last4 = vin.length >= 4 ? vin.slice(-4) : "car_images";
      const filename = `${last4}.pdf`;

      const qualities = [85, 75, 65, 55, 45];
      let finalPdfBuffer: Buffer | null = null;
      let finalSize = 0;

      for (const quality of qualities) {
        const pdfDoc = await PDFDocument.create();
        
        for (const file of files) {
          // Process image with sharp
          const processedImageBuffer = await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality })
            .toBuffer();

          const image = await pdfDoc.embedJpg(processedImageBuffer);
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }

        const pdfBytes = await pdfDoc.save();
        finalPdfBuffer = Buffer.from(pdfBytes);
        finalSize = finalPdfBuffer.length;

        // Check if size is under 2MB (2 * 1024 * 1024 bytes)
        if (finalSize < 2 * 1024 * 1024) {
          break;
        }
      }

      if (!finalPdfBuffer) {
        throw new Error("Failed to generate PDF");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(finalPdfBuffer);

    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
