import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = [
  { filename: "icon-192.png", size: 192 },
  { filename: "icon-512.png", size: 512 },
  { filename: "apple-touch-icon.png", size: 180 },
];

function getProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "..");
}

function parseInputArg(argv) {
  const inputIndex = argv.findIndex((arg) => arg === "--input");
  if (inputIndex === -1) {
    return null;
  }

  const value = argv[inputIndex + 1];
  return value ? value.trim() : null;
}

async function assertReadableFile(filePath) {
  await access(filePath, fsConstants.R_OK);
}

function assertFfmpegAvailable() {
  const result = spawnSync("ffmpeg", ["-version"], {
    stdio: "ignore",
  });

  if (result.status === 0) {
    return;
  }

  throw new Error(
    "ffmpeg est requis pour generer les assets PWA. Installe-le puis relance npm run generate:pwa-assets.",
  );
}

function renderPng(sourcePath, destinationPath, size) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      sourcePath,
      "-vf",
      `scale=${size}:${size}`,
      "-frames:v",
      "1",
      "-update",
      "1",
      destinationPath,
    ],
    {
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`La generation de ${path.basename(destinationPath)} a echoue.`);
  }
}

async function main() {
  const projectRoot = getProjectRoot();
  const publicDir = path.join(projectRoot, "public");
  const inputArg = parseInputArg(process.argv.slice(2));
  const sourcePath = inputArg
    ? path.resolve(projectRoot, inputArg)
    : path.join(publicDir, "icon.svg");

  assertFfmpegAvailable();
  await assertReadableFile(sourcePath);

  console.log(`Source PWA: ${path.relative(projectRoot, sourcePath)}`);

  for (const asset of ASSETS) {
    const destinationPath = path.join(publicDir, asset.filename);
    renderPng(sourcePath, destinationPath, asset.size);
    console.log(`Genere: public/${asset.filename} (${asset.size}x${asset.size})`);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Erreur inconnue.";
  console.error(message);
  process.exitCode = 1;
});
