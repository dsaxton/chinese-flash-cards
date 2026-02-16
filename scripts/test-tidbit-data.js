#!/usr/bin/env node
const path = require("path");
const { loadModel } = require("./tidbit-lib");

const root = path.resolve(__dirname, "..");
const model = loadModel(root);

const errors = [];

for (const [i, tidbit] of model.tidbits.entries()) {
  const id = `tidbit#${i + 1}`;
  if (!tidbit.quote || typeof tidbit.quote !== "string") {
    errors.push(`${id}: missing quote`);
  }
  if (!tidbit.translation || typeof tidbit.translation !== "string") {
    errors.push(`${id}: missing translation`);
  }
  if (!tidbit.source || typeof tidbit.source !== "string") {
    errors.push(`${id}: missing source`);
  }
  if (!tidbit.url || typeof tidbit.url !== "string") {
    errors.push(`${id}: missing url`);
  } else if (!tidbit.url.startsWith("https://ctext.org/")) {
    errors.push(`${id}: url must use ctext.org (${tidbit.url})`);
  }
  if (!Array.isArray(tidbit.relevance) || tidbit.relevance.length === 0) {
    errors.push(`${id}: relevance must be a non-empty array`);
  }
  if ((tidbit.quote || "").replace(/\s+/g, "").length > model.maxQuoteChars) {
    errors.push(`${id}: quote exceeds max length (${model.maxQuoteChars})`);
  }
}

if (errors.length > 0) {
  console.error("tidbit data validation failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`tidbit data validation passed (${model.tidbits.length} entries)`);
