#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function hexFilename(hanzi) {
  return Buffer.from(hanzi, "utf8").toString("hex") + ".mp3";
}

function collectHanzi(deckData, sentenceData) {
  const entries = new Set();

  for (const card of deckData.vocab || []) entries.add(card.hanzi);
  for (const card of deckData.radicals || []) entries.add(card.hanzi);
  for (const card of sentenceData.sentences || []) entries.add(card.hanzi);

  return Array.from(entries);
}

function main() {
  const root = path.resolve(__dirname, "..");
  const audioDir = path.join(root, "data", "audio");

  const deckData = readJson(root, "data/deck-data.json");
  const sentenceData = readJson(root, "data/sentence-data.json");
  const manifest = readJson(root, "data/audio/manifest.json");

  const expectedHanzi = collectHanzi(deckData, sentenceData);
  const manifestHanzi = Object.keys(manifest);

  const missingFromManifest = expectedHanzi.filter((h) => !manifest[h]);
  assert(
    missingFromManifest.length === 0,
    `Missing ${missingFromManifest.length} manifest entries (sample: ${missingFromManifest.slice(0, 5).join(", ")})`
  );

  const extraInManifest = manifestHanzi.filter((h) => !expectedHanzi.includes(h));
  assert(
    extraInManifest.length === 0,
    `Manifest has ${extraInManifest.length} extra entries (sample: ${extraInManifest.slice(0, 5).join(", ")})`
  );

  const seenFilenames = new Set();
  const duplicateFilenames = [];
  const missingFiles = [];
  const emptyFiles = [];
  const namingMismatches = [];

  for (const [hanzi, filename] of Object.entries(manifest)) {
    if (seenFilenames.has(filename)) duplicateFilenames.push(filename);
    seenFilenames.add(filename);

    const expectedName = hexFilename(hanzi);
    if (filename !== expectedName) namingMismatches.push({ hanzi, filename, expectedName });

    const fullPath = path.join(audioDir, filename);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(filename);
      continue;
    }

    const size = fs.statSync(fullPath).size;
    if (size === 0) emptyFiles.push(filename);
  }

  assert(duplicateFilenames.length === 0, `Duplicate filenames detected: ${duplicateFilenames.join(", ")}`);
  assert(missingFiles.length === 0, `Manifest points to missing files: ${missingFiles.slice(0, 5).join(", ")}`);
  assert(emptyFiles.length === 0, `Zero-byte audio files: ${emptyFiles.slice(0, 5).join(", ")}`);
  assert(
    namingMismatches.length === 0,
    `Filenames not matching hex scheme: ${namingMismatches
      .slice(0, 5)
      .map((m) => `${m.hanzi}->${m.filename} (expected ${m.expectedName})`)
      .join("; ")}`
  );

  const audioFiles = fs.readdirSync(audioDir).filter((f) => f.endsWith(".mp3"));
  const orphans = audioFiles.filter((file) => !seenFilenames.has(file));
  assert(orphans.length === 0, `Orphan audio files found: ${orphans.slice(0, 5).join(", ")}`);

  const totalBytes = audioFiles
    .filter((file) => seenFilenames.has(file))
    .reduce((sum, file) => sum + fs.statSync(path.join(audioDir, file)).size, 0);

  console.log(`Audio coverage OK: ${expectedHanzi.length} entries, ${audioFiles.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main();
