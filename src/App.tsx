/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Trash2,
  Car,
  Image as ImageIcon,
  ChevronRight,
  FileCode,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SLOTS = [
  { id: 'front', label: 'Урд тал', icon: <Car className="w-5 h-5" /> },
  { id: 'rear', label: 'Ар тал', icon: <Car className="w-5 h-5 rotate-180" /> },
  { id: 'left', label: 'Зүүн тал', icon: <ChevronRight className="w-5 h-5 rotate-180" /> },
  { id: 'right', label: 'Баруун тал', icon: <ChevronRight className="w-5 h-5" /> },
  { id: 'vin', label: 'Арлын дугаар (VIN)', icon: <FileText className="w-5 h-5" /> },
  { id: 'odometer', label: 'Гүйлт (Одометр)', icon: <ImageIcon className="w-5 h-5" /> },
];

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [vin, setVin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfData, setPdfData] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files) as File[];
    
    if (selectedFiles.length !== 6) {
      setError(`Та ${selectedFiles.length} зураг сонгосон байна. Яг 6 зураг сонгох шаардлагатай.`);
      setImages([]);
      return;
    }

    // Cleanup old previews
    images.forEach(img => URL.revokeObjectURL(img.preview));

    const newImages = selectedFiles.map((file, index) => ({
      id: `img-${index}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(newImages);
    setPdfData(null);
    setError(null);
  };

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSide = 1200;

          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = async () => {
    if (images.length !== 6) {
      setError('Яг 6 зураг сонгох шаардлагатай.');
      return;
    }

    if (!vin || vin.length < 4) {
      setError('Арлын дугаар сүүлийн 4 оронг зөв оруулна уу.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPdfData(null);

    try {
      const formData = new FormData();
      formData.append('vin', vin);
      
      // Resize images on client side before uploading
      for (const img of images) {
        const resizedBlob = await resizeImage(img.file);
        formData.append('images', resizedBlob, `${img.id}.jpg`);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'PDF үүсгэхэд алдаа гарлаа';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${vin.slice(-4)}.pdf`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfData({ url, filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsProcessing(false);
    }
  };

  const allUploaded = images.length === 6;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 pb-24 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-blue-600 text-white rounded-2xl mb-4 shadow-lg"
          >
            <Camera className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Автомашины зургийн PDF хэрэгсэл
          </h1>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            6 зургаа нэг дор сонгоод оруулна уу. Бид зургийн хэмжээг өөрчилж, 2МБ-аас бага PDF файл болгоно.
          </p>
        </header>

        {/* VIN Input */}
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-600" />
            Арлын дугаар сүүлийн 4 орон
          </label>
          <input 
            type="text" 
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-mono text-center"
          />
        </div>

        {/* Multi-upload Area */}
        <div className="mb-8">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-slate-300 rounded-3xl bg-white hover:bg-slate-50 hover:border-blue-400 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">Зургаа сонгох (6 зураг)</p>
              <p className="text-xs text-slate-400 mt-1">6 зургаа зэрэг идэвхжүүлээд сонгоно уу</p>
            </div>
          </button>
        </div>

        {/* Selected Images Preview */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {images.map((img, index) => (
              <motion.div 
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white"
              >
                <img 
                  src={img.preview} 
                  alt={`Preview ${index}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                  {index + 1}
                </div>
              </motion.div>
            ))}
            {/* Fill empty slots if less than 6 */}
            {Array.from({ length: Math.max(0, 6 - images.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2 border border-red-100"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 sm:relative sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:p-0">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {!pdfData ? (
              <button 
                onClick={generatePDF}
                disabled={!allUploaded || isProcessing || !vin}
                className="w-full py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PDF боловсруулж байна...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    PDF файл үүсгэх
                  </>
                )}
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <a 
                  href={pdfData.url} 
                  download={pdfData.filename}
                  className="w-full py-4 px-6 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                >
                  <Download className="w-5 h-5" />
                  {pdfData.filename} татах
                </a>
                <button 
                  onClick={() => setPdfData(null)}
                  className="w-full py-3 px-6 bg-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-300 transition-all text-sm"
                >
                  Дахин эхлэх
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-12 text-center text-slate-400 text-xs pb-12 sm:pb-0">
          <p>Зургуудыг аюулгүйгээр боловсруулж, 2МБ-аас бага хэмжээтэй болгон шахна.</p>
          <p className="mt-1">Хамгийн их өргөн: 1200px | PDF формат</p>
        </footer>
      </div>
    </div>
  );
}
