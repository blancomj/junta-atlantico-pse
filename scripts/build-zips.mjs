#!/usr/bin/env node
/**
 * scripts/build-zips.mjs
 *
 * Genera deploy/backend.zip y deploy/frontend.zip para subir a Hostinger.
 * Funciona en Windows, Mac y Linux sin comandos externos (no usa "zip").
 *
 * USO — abrir terminal en la RAIZ del proyecto y ejecutar:
 *   node scripts/build-zips.mjs
 *
 * SALIDA en la RAIZ del proyecto:
 *   deploy/
 *     backend.zip    <- subir a Hostinger (Web App Node.js)
 *     frontend.zip   <- subir a Hostinger (Web App estatico)
 */

import { execSync }                              from 'node:child_process';
import { existsSync, rmSync, mkdirSync,
         readdirSync, statSync,
         readFileSync, writeFileSync }           from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath }                         from 'node:url';

const ROOT     = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND  = resolve(ROOT, 'backend');
const FRONTEND = resolve(ROOT, 'frontend');
const OUT      = resolve(ROOT, 'deploy');

// ─── Utilidades ──────────────────────────────────────────────────────────────

function step(msg) {
  console.log(`\n${'─'.repeat(58)}\n  ${msg}\n${'─'.repeat(58)}`);
}

function run(cmd, cwd = ROOT) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

// ─── Generador de ZIP en puro Node.js (sin "zip", sin librerias) ─────────────

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosDateTime() {
  const d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * Construye un archivo ZIP en memoria.
 * @param {Array<{name:string, data:Buffer}>} entries
 * @returns {Buffer}
 */
function buildZip(entries) {
  const locals  = [];
  const central = [];
  let   offset  = 0;
  const dt      = dosDateTime();

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const data      = entry.data;
    const crc       = crc32(data);
    const size      = data.length;

    const local = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]),
      u16(20), u16(0), u16(0),            // version, flags, compression (stored)
      u16(dt.time), u16(dt.date),
      u32(crc), u32(size), u32(size),     // crc, compressed size, uncompressed size
      u16(nameBytes.length), u16(0),      // name length, extra length
      nameBytes,
      data,
    ]);

    const cdir = Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]),
      u16(20), u16(20), u16(0), u16(0),
      u16(dt.time), u16(dt.date),
      u32(crc), u32(size), u32(size),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset),
      nameBytes,
    ]);

    locals.push(local);
    central.push(cdir);
    offset += local.length;
  }

  const centralBuf  = Buffer.concat(central);
  const eocd = Buffer.concat([
    Buffer.from([0x50,0x4B,0x05,0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralBuf.length), u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

/**
 * Lee todos los archivos de una carpeta recursivamente.
 * @param {string} baseDir  carpeta raíz (para calcular el path relativo dentro del zip)
 * @param {string} dir      carpeta actual
 * @param {string[]} skip   nombres de carpeta/archivo a omitir
 * @returns {Array<{name:string, data:Buffer}>}
 */
function collectFiles(baseDir, dir, skip = []) {
  const result = [];
  for (const name of readdirSync(dir)) {
    if (skip.includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      result.push(...collectFiles(baseDir, full, skip));
    } else {
      // El estándar ZIP exige forward slash en los paths
      const relName = relative(baseDir, full).split(sep).join('/');
      result.push({ name: relName, data: readFileSync(full) });
    }
  }
  return result;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

// Limpiar y crear carpeta de salida
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ── 1. Compilar TypeScript del backend ───────────────────────────────────────
step('1/4  Compilando TypeScript (backend)');

if (!existsSync(resolve(BACKEND, 'node_modules'))) {
  console.error('\nERROR: falta instalar las devDependencies del backend.');
  console.error('Ejecuta:  cd backend && npm install\n');
  process.exit(1);
}

const DIST = resolve(BACKEND, 'dist');
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
run('npx tsc -p tsconfig.build.json', BACKEND);

if (!existsSync(resolve(DIST, 'backend', 'server.js'))) {
  console.error('\nERROR: la compilación no generó dist/backend/server.js\n');
  process.exit(1);
}
console.log('\n✓ TypeScript compilado →', DIST);

// ── 2. Generar backend.zip ───────────────────────────────────────────────────
step('2/4  Generando backend.zip');

const backendEntries = [
  ...collectFiles(BACKEND, DIST),           // todo el JS compilado
  {                                          // package.json (con start correcto)
    name: 'package.json',
    data: readFileSync(resolve(BACKEND, 'package.json')),
  },
];

const backendZipBuf  = buildZip(backendEntries);
const backendZipPath = resolve(OUT, 'backend.zip');
writeFileSync(backendZipPath, backendZipBuf);
console.log(`✓ backend.zip  (${(backendZipBuf.length / 1024).toFixed(0)} KB)  →  deploy\\backend.zip`);

// ── 3. Compilar frontend (Vite) ──────────────────────────────────────────────
step('3/4  Compilando Vue/Vite (frontend)');

if (!existsSync(resolve(FRONTEND, 'node_modules'))) {
  console.error('\nERROR: falta instalar las dependencias del frontend.');
  console.error('Ejecuta:  cd frontend && npm install\n');
  process.exit(1);
}

const FDIST = resolve(FRONTEND, 'dist');
if (existsSync(FDIST)) rmSync(FDIST, { recursive: true });
run('npx vite build', FRONTEND);

if (!existsSync(resolve(FDIST, 'index.html'))) {
  console.error('\nERROR: Vite no generó index.html\n');
  process.exit(1);
}
console.log('\n✓ Vite build OK →', FDIST);

// ── 4. Generar frontend.zip ──────────────────────────────────────────────────
step('4/4  Generando frontend.zip');

const frontendEntries = collectFiles(FDIST, FDIST);
const frontendZipBuf  = buildZip(frontendEntries);
const frontendZipPath = resolve(OUT, 'frontend.zip');
writeFileSync(frontendZipPath, frontendZipBuf);
console.log(`✓ frontend.zip (${(frontendZipBuf.length / 1024).toFixed(0)} KB)  →  deploy\\frontend.zip`);

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log(`
${'═'.repeat(58)}
  ✅  Listo. Archivos generados en la carpeta deploy\\
${'═'.repeat(58)}

  📦  deploy\\backend.zip
      → Subir a Hostinger (Web App Node.js - api.juntaatlantico.co)
      → Build command : dejar VACÍO
      → Start command : node dist/backend/server.js
      → Node version  : 20.x o 22.x

  🌐  deploy\\frontend.zip
      → Subir a Hostinger (Web App estático - pse.juntaatlantico.co)
      → Descomprimir en la raíz del dominio

${'═'.repeat(58)}
`);
