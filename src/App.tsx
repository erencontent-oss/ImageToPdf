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
  const [images, setImages] = useState<Record<string, ImageFile>>({});
  const [vin, setVin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfData, setPdfData] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeSlot) return;

    const file = files[0];
    const newImages = { ...images };
    
    // Cleanup old preview if exists
    if (newImages[activeSlot]) {
      URL.revokeObjectURL(newImages[activeSlot].preview);
    }

    newImages[activeSlot] = {
      id: activeSlot,
      file,
      preview: URL.createObjectURL(file),
    };

    setImages(newImages);
    setPdfData(null);
    setActiveSlot(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImages = { ...images };
    if (newImages[id]) {
      URL.revokeObjectURL(newImages[id].preview);
      delete newImages[id];
    }
    setImages(newImages);
    setPdfData(null);
  };

  const generatePDF = async () => {
    if (Object.keys(images).length !== 6) {
      setError('Эхлээд 6 зургаа бүгдийг нь оруулна уу.');
      return;
    }

    if (!vin || vin.length < 4) {
      setError('Арлын дугаарыг (VIN) зөв оруулна уу (хамгийн багадаа сүүлийн 4 орон).');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPdfData(null);

    const formData = new FormData();
    formData.append('vin', vin);
    // Append images in order of SLOTS
    SLOTS.forEach(slot => {
      formData.append('images', images[slot.id].file);
    });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF үүсгэхэд алдаа гарлаа');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'car_images.pdf';
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

  const allUploaded = Object.keys(images).length === 6;

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
            Шаардлагатай 6 зургийг оруулна уу. Бид зургийн хэмжээг өөрчилж, шахаж, 2МБ-аас бага хэмжээтэй PDF файл болгоно.
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
          <p className="text-[10px] text-slate-400 mt-2">PDF файл нь VIN дугаарын сүүлийн 4 оронгоор нэрлэгдэх болно.</p>
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {/* Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {SLOTS.map((slot, index) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setActiveSlot(slot.id);
                fileInputRef.current?.click();
              }}
              className={`relative group aspect-video rounded-2xl border-2 border-dashed transition-all overflow-hidden cursor-pointer ${
                images[slot.id] 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              {images[slot.id] ? (
                <>
                  <img 
                    src={images[slot.id].preview} 
                    alt={slot.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  <button 
                    onClick={(e) => removeImage(slot.id, e)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-xs text-white font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      {slot.label}
                    </p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-xl mb-2 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                    {slot.icon}
                  </div>
                  <p className="text-sm font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                    {slot.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Дарж зураг оруулна уу</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-start gap-3 border border-red-100"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
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
