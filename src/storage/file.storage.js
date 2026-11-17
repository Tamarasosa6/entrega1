// Único lugar que escribe y borra archivos en disco (como los repositories lo son para MongoDB).
import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import config from '../config/index.js';
import { buildStoredName } from '../config/upload.config.js';
import { FileSaveError } from '../errors/domain.errors.js';

const MAX_ORIGINAL_NAME_LENGTH = 255;

export const FileStorage = {
  // Guarda el archivo en uploads/<folder>/ y devuelve SOLO sus metadatos.
  async save({ folder, fieldName, file }) {
    const storedName = buildStoredName(fieldName, file.originalname);
    const directory = path.join(config.uploadsDir, folder);

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, storedName), file.buffer, { flag: 'wx' });
    } catch (error) {
      throw new FileSaveError(error);
    }

    return {
      originalName: path.basename(String(file.originalname)).slice(0, MAX_ORIGINAL_NAME_LENGTH),
      storedName,
      path: `${folder}/${storedName}`, // relativa a la carpeta de uploads
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
  },

  // Borra un archivo ya guardado (por ejemplo si falla el registro en la base). Nunca lanza.
  async remove(relativePath) {
    try {
      await unlink(path.join(config.uploadsDir, relativePath));
    } catch {
      // si no existe o no se puede borrar, no hay nada más que hacer
    }
  },
};
