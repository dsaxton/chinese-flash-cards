#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["edge-tts"]
# ///
"""Generate MP3 audio files for all hanzi entries using Microsoft Edge TTS.

Usage:
    uv run scripts/generate-audio.py

The script reads data/deck-data.json and data/sentence-data.json, collects
every unique hanzi string, and generates one MP3 per entry into data/audio/.
A manifest (data/audio/manifest.json) maps each hanzi string to its filename.

Files are named by hex-encoding the UTF-8 bytes of the hanzi string, which
keeps filenames ASCII-safe and deterministic.
"""

import asyncio
import json
import os
import sys
import time

import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-15%"
CONCURRENCY = 5
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(PROJECT_ROOT, "data", "audio")
MANIFEST_PATH = os.path.join(AUDIO_DIR, "manifest.json")


def hanzi_to_filename(hanzi: str) -> str:
    """Deterministic ASCII-safe filename from a hanzi string."""
    return hanzi.encode("utf-8").hex() + ".mp3"


def collect_hanzi_entries() -> list[str]:
    """Read deck and sentence data, return sorted unique hanzi strings."""
    deck_path = os.path.join(PROJECT_ROOT, "data", "deck-data.json")
    sentence_path = os.path.join(PROJECT_ROOT, "data", "sentence-data.json")

    with open(deck_path, encoding="utf-8") as f:
        deck = json.load(f)
    with open(sentence_path, encoding="utf-8") as f:
        sdata = json.load(f)

    entries = set()
    for card in deck.get("vocab", []):
        entries.add(card["hanzi"])
    for card in deck.get("radicals", []):
        entries.add(card["hanzi"])
    for card in deck.get("numbers", []):
        entries.add(card["hanzi"])
    for card in sdata.get("sentences", []):
        entries.add(card["hanzi"])

    return sorted(entries)


async def generate_one(
    sem: asyncio.Semaphore, hanzi: str, out_path: str
) -> tuple[str, bool, str]:
    """Generate a single MP3. Returns (hanzi, success, message)."""
    async with sem:
        try:
            comm = edge_tts.Communicate(hanzi, VOICE, rate=RATE)
            await comm.save(out_path)
            size_kb = os.path.getsize(out_path) / 1024
            return (hanzi, True, f"{size_kb:.1f} KB")
        except Exception as exc:
            return (hanzi, False, str(exc))


async def main() -> None:
    entries = collect_hanzi_entries()
    print(f"Entries to generate: {len(entries)}")
    print(f"Voice: {VOICE}")
    print(f"Output: {AUDIO_DIR}/")
    print()

    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Determine which files already exist and can be skipped.
    manifest: dict[str, str] = {}
    to_generate: list[tuple[str, str]] = []
    skipped = 0

    for hanzi in entries:
        fname = hanzi_to_filename(hanzi)
        out_path = os.path.join(AUDIO_DIR, fname)
        manifest[hanzi] = fname
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            skipped += 1
        else:
            to_generate.append((hanzi, out_path))

    if skipped:
        print(f"Skipping {skipped} already-generated files.")

    if not to_generate:
        print("Nothing to generate — all files exist.")
    else:
        print(f"Generating {len(to_generate)} files ...")
        sem = asyncio.Semaphore(CONCURRENCY)
        start = time.time()

        tasks = [generate_one(sem, hanzi, path) for hanzi, path in to_generate]
        results = await asyncio.gather(*tasks)

        elapsed = time.time() - start
        successes = sum(1 for _, ok, _ in results if ok)
        failures = [(h, msg) for h, ok, msg in results if not ok]

        print(f"\nGenerated {successes}/{len(to_generate)} in {elapsed:.1f}s")

        if failures:
            print(f"\n{len(failures)} failures:")
            for hanzi, msg in failures:
                print(f"  {hanzi}: {msg}")
            sys.exit(1)

    # Write manifest.
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total_bytes = sum(
        os.path.getsize(os.path.join(AUDIO_DIR, fname))
        for fname in manifest.values()
        if os.path.exists(os.path.join(AUDIO_DIR, fname))
    )
    print(f"\nManifest written: {MANIFEST_PATH}")
    print(f"Total audio size: {total_bytes / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    asyncio.run(main())
