#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ENGLISH_MEANING_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "for", "from", "in", "is", "of", "on",
  "or", "the", "to", "with",
]);

const LITERAL_SHAPE_HINT_PATTERNS = [
  /\blooks like\b/i,
  /\bshape\b/i,
  /\bstroke(s)?\b/i,
  /\bline(s)?\b/i,
  /\bbox(es)?\b/i,
  /\brectangle\b/i,
  /\bcross\b/i,
  /\bhook\b/i,
  /\bvertical\b/i,
  /\bhorizontal\b/i,
];

const BOILERPLATE_STORY_PATTERNS = [
  /\bflashes?\s+into\s+the\s+scene\b/i,
];

const ABSTRACT_STORY_PATTERNS = [
  /\bconcept of\b/i,
  /\bidea of\b/i,
  /\bessence of\b/i,
  /\benergy of\b/i,
  /\bstate of\b/i,
  /\bnotion of\b/i,
  /\bsymboli[sz]es?\b/i,
  /\brepresents?\b/i,
  /\bdefinition of\b/i,
];

const COMPONENT_META_PATTERNS = [
  /\bcomponent(s)?\b/i,
  /\bradical(s)?\b/i,
  /\bsemantic\b/i,
  /\bphonetic\b/i,
  /\bused in compounds\b/i,
  /\bappears in (characters|words|terms)\b/i,
  /\bleft side\b/i,
  /\bright side\b/i,
  /\btop\b/i,
  /\bbottom\b/i,
];

const CONCRETE_SCENE_VERBS = /\b(?:walk|run|step|call|ask|open|close|hold|carry|move|stand|sit|eat|drink|kick|push|pull|lean|point|shout|speak|arrive|cross|raise|duck|hide|wait|glide|pack|gather|confess|settle|remain|head|roll|roam|jump|leap|write|read|watch|look|find|search|check|rest|sleep|swim|dance|buy|sell)\w*\b/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadDeckData(rootDir) {
  return readJson(path.join(rootDir, "data", "deck-data.json"));
}

function loadPhoneticConfig(rootDir) {
  return readJson(path.join(rootDir, "data", "phonetic-config.json"));
}

function extractCanonicalAnchorWord(soundAnchor) {
  const text = String(soundAnchor || "").trim();
  const match = text.match(/^Think of ([A-Z]+)\.$/);
  return match ? match[1] : "";
}

function normalizeAnchorAliasMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return {};
  const out = {};
  for (const [anchorWord, aliases] of Object.entries(rawMap)) {
    const key = String(anchorWord || "").toUpperCase().trim();
    if (!key) continue;
    const nextAliases = Array.isArray(aliases)
      ? aliases
        .map((x) => String(x || "").trim().toLowerCase())
        .filter(Boolean)
      : [];
    out[key] = [...new Set(nextAliases)];
  }
  return out;
}

function anchorFormsForStory(soundAnchor, aliasMap = {}) {
  const anchorWord = extractCanonicalAnchorWord(soundAnchor);
  if (!anchorWord) return [];
  const key = anchorWord.toUpperCase();
  const aliases = Array.isArray(aliasMap[key]) ? aliasMap[key] : [];
  return [key, ...aliases];
}

function anchorIntegratedInStoryWithAliases(soundAnchor, story, aliasMap = {}) {
  const forms = anchorFormsForStory(soundAnchor, aliasMap);
  const text = String(story || "");
  if (forms.length === 0) return false;
  return forms.some((form) => {
    if (!form) return false;
    const escaped = String(form).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });
}

function normalizePinyinAscii(pinyin) {
  return String(pinyin || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ü/g, "u")
    .replace(/[^a-z'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMnemonicText(card) {
  const mnemonic = card.mnemonic || "";
  const componentPattern = /([\u3400-\u9fff]+)\s*\(([^)]+)\)/g;
  let text = mnemonic.trim();
  const firstStop = text.search(/[。.!?]/);
  if (firstStop !== -1) {
    const head = text.slice(0, firstStop + 1);
    if (/[\u3400-\u9fff]+\s*\([^)]+\)/.test(head)) {
      text = text.slice(firstStop + 1).trim();
    }
  }

  if (!text) {
    text = mnemonic
      .replace(componentPattern, "$1")
      .replace(/\s*[+＋=＝]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  text = text
    .replace(/[\u3400-\u9fff]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*[+＋=＝]\s*/g, " ")
    .replace(/\s*[-–—]\s*/g, " — ")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentenceParts = text.match(/[^.!?]+[.!?]?/g) || [];
  if (sentenceParts.length > 2) {
    text = sentenceParts.slice(0, 2).join(" ").trim();
  }

  return text;
}

function getStoryText(card) {
  if (card && card.mnemonicData && typeof card.mnemonicData === "object") {
    return String(card.mnemonicData.story || "").trim();
  }
  return parseMnemonicText(card);
}

function extractEnglishAnswerTokens(english) {
  const words = String(english || "")
    .toLowerCase()
    .match(/[a-z]+/g) || [];
  const out = [];
  for (const word of words) {
    if (word.length < 3) continue;
    if (ENGLISH_MEANING_STOPWORDS.has(word)) continue;
    out.push(word);
  }
  return out;
}

function hintContainsPinyin(text, pinyin) {
  const rawText = String(text || "");
  const raw = String(pinyin || "").trim();
  if (!raw) return false;
  const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?<![\\p{L}])${escapedRaw}(?![\\p{L}])`, "iu").test(rawText)) {
    return true;
  }
  const plain = normalizePinyinAscii(raw);
  const tokens = plain.split(/\s+/).filter(Boolean);
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(rawText));
}

function hintContainsEnglishAnswer(text, english) {
  const rawText = String(text || "");
  return extractEnglishAnswerTokens(english)
    .some((token) => new RegExp(`\\b${token}`, "i").test(rawText));
}

function hintContainsPhoneticCue(text) {
  return /\b(?:sounds?|sound)\s+like\b/i.test(String(text || "")) || /\bthink of\b/i.test(String(text || ""));
}

function isLiteralShapeHint(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return LITERAL_SHAPE_HINT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasBoilerplateStoryPhrase(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return BOILERPLATE_STORY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isLikelyIncoherentStory(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  if (/\.\s+\./.test(normalized)) return true;
  if (/^[a-z]/.test(normalized)) return true;
  if (/[!?.,]{2,}/.test(normalized)) return true;
  return false;
}

function isLikelyAbstractStory(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return ABSTRACT_STORY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isLikelyComponentOnlyStory(text, options = {}) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  const hasSoundAnchor = Boolean(options.hasSoundAnchor);
  const english = String(options.english || "");
  const hasMeaningHook = hintContainsEnglishAnswer(normalized, english);
  const hasComponentMeta = COMPONENT_META_PATTERNS.some((pattern) => pattern.test(normalized));
  const hasConcreteScene = CONCRETE_SCENE_VERBS.test(normalized);
  return hasComponentMeta && !hasConcreteScene && !hasSoundAnchor && !hasMeaningHook;
}

function collectDeckCards(rootDir = process.cwd()) {
  const deck = loadDeckData(rootDir);
  const vocab = Array.isArray(deck.vocab) ? deck.vocab : [];
  const radicals = Array.isArray(deck.radicals) ? deck.radicals : [];
  const hsk1Count = Number(deck.hsk1CardCount) || 0;
  return {
    vocab,
    hsk1Cards: vocab.slice(0, hsk1Count),
    radicals,
  };
}

function collectHsk1UniqueChars(hsk1Cards) {
  const chars = new Set();
  for (const card of hsk1Cards) {
    for (const ch of String(card.hanzi || "")) chars.add(ch);
  }
  return [...chars];
}

module.exports = {
  collectDeckCards,
  collectHsk1UniqueChars,
  extractEnglishAnswerTokens,
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  hasBoilerplateStoryPhrase,
  isLikelyAbstractStory,
  isLikelyComponentOnlyStory,
  isLikelyIncoherentStory,
  isLiteralShapeHint,
  loadDeckData,
  loadPhoneticConfig,
  extractCanonicalAnchorWord,
  normalizeAnchorAliasMap,
  anchorFormsForStory,
  anchorIntegratedInStoryWithAliases,
};
