#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonFiles = [
  "data/deck-data.json",
  "data/tidbit-data.json",
  "data/sentence-data.json",
  "data/phonetic-config.json",
  "data/audio/manifest.json",
  "manifest.webmanifest",
];

const errors = [];
for (const rel of jsonFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  try {
    const raw = fs.readFileSync(file, "utf8");
    JSON.parse(raw);
  } catch (e) {
    errors.push(`${rel}: ${e.message}`);
  }
}

if (errors.length > 0) {
  console.error("JSON validation failed:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("JSON validation passed");
