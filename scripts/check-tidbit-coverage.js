#!/usr/bin/env node
const path = require("path");
const {
  loadModel,
  computeCoverageStats,
} = require("./tidbit-lib");

const root = path.resolve(__dirname, "..");
const model = loadModel(root);
const stats = computeCoverageStats(model);

const minRatio = Number(process.argv[2] || "0.80");
const maxRawMatchesPerWord = Number(process.argv[3] || "90");
const maxPrimaryShare = Number(process.argv[4] || "0.20");

console.log(`tidbit coverage: ${stats.covered}/${stats.total} (${(stats.ratio * 100).toFixed(1)}%)`);
console.log(`minimum threshold: ${(minRatio * 100).toFixed(1)}%`);
console.log(`max raw matches for a word: ${stats.worstRawMatches} (${stats.worstWord || "n/a"})`);
console.log(`max allowed raw matches per word: ${maxRawMatchesPerWord}`);
console.log(`largest primary-tidbit share: ${(stats.primaryShare * 100).toFixed(1)}%`);
console.log(`max allowed primary-tidbit share: ${(maxPrimaryShare * 100).toFixed(1)}%`);

if (
  stats.ratio < minRatio ||
  stats.worstRawMatches > maxRawMatchesPerWord ||
  stats.primaryShare > maxPrimaryShare
) {
  console.error("coverage below threshold");
  process.exit(1);
}
