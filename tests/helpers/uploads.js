// Ayudas para los tests de carga de archivos. Los archivos de prueba se crean en memoria
// (nunca hay que tener archivos sueltos en el repositorio) y la carpeta de uploads de testing
// se vacía antes y después de cada test.
import path from 'node:path';
import { existsSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import config from '../../src/config/index.js';
import { UPLOAD_CONFIG } from '../../src/constants/index.js';

export const UPLOADS_DIR = config.uploadsDir;
export const MAX_FILE_SIZE = UPLOAD_CONFIG.MAX_FILE_SIZE;

const file = (buffer, filename, contentType) => ({ buffer, filename, contentType });

export const pdfFile = (filename = 'dni-frente.pdf') =>
  file(Buffer.from('%PDF-1.4\n% archivo de prueba de ShipNow\n%%EOF\n'), filename, 'application/pdf');

export const pngFile = (filename = 'comprobante.png') =>
  file(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]), filename, 'image/png');

export const jpegFile = (filename = 'foto.jpg') =>
  file(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]), filename, 'image/jpeg');

export const webpFile = (filename = 'foto.webp') =>
  file(Buffer.from('RIFF0000WEBPVP8 '), filename, 'image/webp');

export const textFile = (filename = 'notas.txt') =>
  file(Buffer.from('esto no es un documento permitido'), filename, 'text/plain');

// Tipo MIME permitido pero extensión que no corresponde
export const disguisedFile = () => file(Buffer.from('MZ no soy un png'), 'virus.exe', 'image/png');

// Un byte más que el máximo permitido
export const oversizedFile = (filename = 'enorme.pdf') =>
  file(Buffer.alloc(MAX_FILE_SIZE + 1, 0x61), filename, 'application/pdf');

// Adjunta un archivo de prueba a un request de supertest
export const attach = (request, field, testFile) =>
  request.attach(field, testFile.buffer, { filename: testFile.filename, contentType: testFile.contentType });

// Seguridad: solo se borra una carpeta de uploads de testing (su nombre contiene "test").
function assertTestUploadsDir() {
  if (!config.isTest || !/test/i.test(path.basename(UPLOADS_DIR))) {
    throw new Error(`[Tests] Se rechazó operar sobre la carpeta de uploads "${UPLOADS_DIR}": no es de testing.`);
  }
}

export function resetUploads() {
  assertTestUploadsDir();
  rmSync(UPLOADS_DIR, { recursive: true, force: true });
}

// Rutas (relativas y con "/") de todos los archivos guardados en la carpeta de uploads
export function listUploadedFiles(directory = UPLOADS_DIR) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? listUploadedFiles(full) : [path.relative(UPLOADS_DIR, full).split(path.sep).join('/')];
    })
    .sort();
}

export const uploadedFileSize = (relativePath) => statSync(path.join(UPLOADS_DIR, relativePath)).size;

// Simula una falla de disco: en lugar de la carpeta de destino hay un ARCHIVO con ese nombre,
// así que no se puede crear la carpeta ni guardar nada dentro.
export function breakFolder(folder) {
  assertTestUploadsDir();
  mkdirSync(UPLOADS_DIR, { recursive: true });
  writeFileSync(path.join(UPLOADS_DIR, folder), 'bloqueo');
}
