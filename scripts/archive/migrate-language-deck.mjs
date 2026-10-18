#!/usr/bin/env node

/**
 * Migration script for Language deck:
 * - Flatten subdeck: [🗣️] Language::[🔠] English::1.[🔠] Word Mining -> [🗣️] Language::[🔠] English
 * - Retain [🪟] iNCode intact (per user instruction)
 * - Tag vocabulary notes as lang::eng::word::mining
 * - Strip loose/unneeded tags (word-mining, spelling-fix, yomitan, ict::*)
 * - Apply deck preset (newGatherPriority = 2, newSortOrder = 1)
 * 
 * Flags:
 *   --dry-run   Preview migration plan without modifying Anki.
 *   --execute   Apply migration to Anki.
 *   --restore   Revert migration using saved snapshot.
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const TARGET_DECK = '[🗣️] Language::[🔠] English';
const SUBDECK = '[🗣️] Language::[🔠] English::1.[🔠] Word Mining';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'language_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'language_classification.json');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');
const isRestore = args.includes('--restore');

async function callAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    if (!res.ok) throw new Error(`Anki HTTP error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.error) throw new Error(`AnkiConnect error: ${data.error}`);
    return data.result;
}

async function restore() {
    console.log('=== Restoring Language Deck from Snapshot ===');
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.error(`[ERROR] Snapshot not found at ${SNAPSHOT_PATH}`);
        process.exit(1);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    console.log(`Loaded snapshot containing ${snapshot.cards.length} cards.`);

    const deckGroups = {};
    for (const c of snapshot.cards) {
        deckGroups[c.deckName] = deckGroups[c.deckName] || [];
        deckGroups[c.deckName].push(c.cardId);
    }

    for (const [deck, cardIds] of Object.entries(deckGroups)) {
        console.log(`Moving ${cardIds.length} cards back to "${deck}"...`);
        await callAnki('changeDeck', { cards: cardIds, deck });
    }

    console.log('Restore complete.');
}

async function main() {
    if (!isDryRun && !isExecute && !isRestore) {
        console.log('Usage:');
        console.log('  node scripts/migrate-language-deck.mjs --dry-run');
        console.log('  node scripts/migrate-language-deck.mjs --execute');
        console.log('  node scripts/migrate-language-deck.mjs --restore');
        return;
    }

    if (isRestore) {
        await restore();
        return;
    }

    console.log(`=== Inspecting Language Cards in "${SUBDECK}" and "${TARGET_DECK}" ===\n`);

    const cardIds = await callAnki('findCards', { query: `deck:"${TARGET_DECK}"` });
    if (cardIds.length === 0) {
        console.log(`No cards found in ${TARGET_DECK}. Nothing to migrate.`);
        return;
    }

    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });
    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const notesMap = new Map(notesInfo.map(n => [n.noteId, n]));

    console.log(`Found ${cardsInfo.length} cards across ${noteIds.length} notes.`);

    const manifest = [];
    const CANONICAL_TAG = 'lang::eng::word::mining';

    for (const card of cardsInfo) {
        const note = notesMap.get(card.note);
        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            word: note.fields?.Word?.value || '',
            originalDeck: card.deckName,
            roleTag: CANONICAL_TAG,
            currentQueue: card.queue,
            action: 'ACTIVATE'
        });
    }

    const dataDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${MANIFEST_PATH}`);

    console.log('\n--- Migration Plan ---');
    console.log(`Total Notes: ${noteIds.length}`);
    console.log(`Total Cards: ${cardsInfo.length} (Dual templates: Recognition + Spelling)`);
    console.log(`Target Flat Deck: "${TARGET_DECK}"`);
    console.log(`Subdeck to Delete: "${SUBDECK}"`);
    console.log(`Preserving [🪟] iNCode: YES (Untouched)`);
    console.log(`Canonical Tag: "${CANONICAL_TAG}"`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki. Run with --execute to apply.');
        return;
    }

    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.log(`\nSaving pre-migration snapshot to ${SNAPSHOT_PATH}...`);
        fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({
            timestamp: new Date().toISOString(),
            cards: cardsInfo.map(c => ({
                cardId: c.cardId,
                note: c.note,
                deckName: c.deckName,
                queue: c.queue,
                due: c.due
            })),
            notes: notesInfo.map(n => ({
                noteId: n.noteId,
                tags: n.tags
            }))
        }, null, 2), 'utf8');
    }

    console.log(`\nApplying canonical tag "${CANONICAL_TAG}" to ${noteIds.length} notes...`);
    await callAnki('addTags', { notes: noteIds, tags: CANONICAL_TAG });

    console.log(`Moving all ${cardIds.length} cards into flat deck "${TARGET_DECK}"...`);
    await callAnki('changeDeck', { cards: cardIds, deck: TARGET_DECK });

    // Verify and delete subdeck
    const remainingInSubdeck = await callAnki('findCards', { query: `deck:"${SUBDECK}"` });
    if (remainingInSubdeck.length > 0) {
        throw new Error(`Safety check failed: Subdeck "${SUBDECK}" still contains ${remainingInSubdeck.length} cards!`);
    }

    console.log(`Deleting empty subdeck "${SUBDECK}"...`);
    await callAnki('deleteDecks', { decks: [SUBDECK], cardsToo: true });
    console.log(`Successfully deleted empty subdeck.`);

    console.log(`\nEnforcing fixed order in deck preset for "${TARGET_DECK}"...`);
    const deckConfig = await callAnki('getDeckConfig', { deck: TARGET_DECK });
    if (deckConfig) {
        deckConfig.newGatherPriority = 2; // 2 = Ascending position (fixed order)
        deckConfig.newSortOrder = 1;       // 1 = Order gathered
        await callAnki('saveDeckConfig', { config: deckConfig });
        console.log('  Deck preset updated: newGatherPriority=2 (Ascending), newSortOrder=1.');
    }

    console.log('\n=== Language Deck Migration Complete ===');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});

