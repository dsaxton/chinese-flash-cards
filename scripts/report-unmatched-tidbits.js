#!/usr/bin/env node
const path = require("path");
const {
  loadModel,
  listUnmatchedWords,
} = require("./tidbit-lib");

const root = path.resolve(__dirname, "..");
const model = loadModel(root);
const unmatched = listUnmatchedWords(model);

console.log(`unmatched words: ${unmatched.length}/${model.vocab.length}`);
for (const card of unmatched) {
  console.log(`${card.hanzi}: ${card.english}`);
}
