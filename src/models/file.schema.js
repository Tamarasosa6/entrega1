import mongoose from 'mongoose';

// Metadatos de un archivo subido. El archivo en sí vive en disco (carpeta de uploads);
// en MongoDB solo se guarda esta información.
export const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    documentType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
