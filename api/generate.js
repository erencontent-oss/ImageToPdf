const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Use multer to parse the multipart form
  upload.array('images', 6)(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to parse images' });
    }

    try {
      const files = req.files;
      const vin = req.body.vin || "";

      if (!files || files.length !== 6) {
        return res.status(400).json({ error: 'Яг 6 зураг оруулах шаардлагатай.' });
      }

      // Extract last 4 digits of VIN
      const last4 = vin.length >= 4 ? vin.slice(-4) : "car_images";
      const filename = `${last4}.pdf`;

      const qualities = [85, 75, 65, 55, 45];
      let finalPdfBuffer = null;

      for (const quality of qualities) {
        const pdfDoc = await PDFDocument.create();
        
        for (const file of files) {
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

        if (finalPdfBuffer.length < 2 * 1024 * 1024) {
          break;
        }
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(finalPdfBuffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
