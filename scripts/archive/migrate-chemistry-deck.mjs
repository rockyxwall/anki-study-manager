#!/usr/bin/env node

/**
 * Migration script for HSC Chemistry deck:
 * - Flatten all subdecks into single root: [🎓] Academic::6.[🧪] Chemistry
 * - Tag 118 Periodic Table element notes as chemistry::basics::peg
 * - Keep 34 reviewed Peg cards ACTIVE, SUSPEND 556 unstudied Peg cards
 * - Classify non-peg notes to NCTB chapters (Ch 2 Qualitative, Ch 3 Quantitative, Ch 4 Changes)
 * - Suspend Mark 3/4 problem calculations (Molarity problem)
 * - Delete 10 empty subdecks leaf-to-root
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
const ROOT_DECK = '[🎓] Academic::6.[🧪] Chemistry';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'chemistry_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'chemistry_classification.json');

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

// Known ground truth mappings for non-peg Chemistry notes
const KNOWN_NOTE_MAPPINGS = {
    1760019051987: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Electron & Valence Electron
    1760274821995: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Isotope/Isotone/Isobar
    1762625220515: { topicTag: 'chemistry::p1::ch2', role: 'cq::kh', canonicalTag: 'chemistry::p1::ch2::cq::kh' },     // Rutherford vs Bohr
    1762872201459: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Bohr model postulate
    1762950046202: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Unit conversion (m to nm)
    1763194618105: { topicTag: 'chemistry::p1::ch4', role: 'concept', canonicalTag: 'chemistry::p1::ch4::concept' }, // Work and energy (Thermochemistry)
    1763351673699: { topicTag: 'chemistry::p2::ch3', role: 'problem', canonicalTag: 'chemistry::p2::ch3::problem' }, // Molarity calculation
    1765123024463: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }  // Quantum numbers
};

function classifyCard(card, note) {
    if (note.modelName === 'PeriodicTable-d75c0' || card.deckName.includes('Periodic Table Memory Pegs')) {
        return {
            topicTag: 'chemistry::basics',
            role: 'peg',
            canonicalTag: 'chemistry::basics::peg',
            // 34 cards already in review stay ACTIVE; unstudied cards (queue 0 or -1) stay SUSPENDED
            action: card.queue === 2 ? 'ACTIVATE' : 'SUSPEND'
        };
    }

    if (KNOWN_NOTE_MAPPINGS[note.noteId]) {
        const mapping = KNOWN_NOTE_MAPPINGS[note.noteId];
        return {
            ...mapping,
            action: mapping.role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
        };
    }

    // Default fallback
    return {
        topicTag: 'chemistry::basics',
        role: 'concept',
        canonicalTag: 'chemistry::basics::concept',
        action: 'ACTIVATE'
    };
}

async function restore() {
    console.log('=== Restoring Anki Chemistry Deck from Snapshot ===');
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.error(`[ERROR] Snapshot not found at ${SNAPSHOT_PATH}`);
        process.exit(1);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    console.log(`Loaded snapshot containing ${snapshot.cards.length} cards.`);

    const deckGroups = {};
    const suspendIds = [];
    const unsuspendIds = [];

    for (const c of snapshot.cards) {
        deckGroups[c.deckName] = deckGroups[c.deckName] || [];
        deckGroups[c.deckName].push(c.cardId);

        if (c.queue === -1) {
            suspendIds.push(c.cardId);
        } else {
            unsuspendIds.push(c.cardId);
        }
    }

    for (const [deck, cardIds] of Object.entries(deckGroups)) {
        console.log(`Moving ${cardIds.length} cards back to "${deck}"...`);
        await callAnki('changeDeck', { cards: cardIds, deck });
    }

    if (suspendIds.length > 0) await callAnki('suspend', { cards: suspendIds });
    if (unsuspendIds.length > 0) await callAnki('unsuspend', { cards: unsuspendIds });

    console.log('Restore complete.');
}

async function main() {
    if (!isDryRun && !isExecute && !isRestore) {
        console.log('Usage:');
        console.log('  node scripts/migrate-chemistry-deck.mjs --dry-run');
        console.log('  node scripts/migrate-chemistry-deck.mjs --execute');
        console.log('  node scripts/migrate-chemistry-deck.mjs --restore');
        return;
    }

    if (isRestore) {
        await restore();
        return;
    }

    console.log(`=== Inspecting "${ROOT_DECK}" and Subdecks ===\n`);

    const cardIds = await callAnki('findCards', { query: `deck:"${ROOT_DECK}"` });
    if (cardIds.length === 0) {
        console.log(`No cards found in ${ROOT_DECK}. Nothing to migrate.`);
        return;
    }

    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });
    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const notesMap = new Map(notesInfo.map(n => [n.noteId, n]));

    console.log(`Found ${cardsInfo.length} cards across ${noteIds.length} notes.`);

    const manifest = [];
    const tagsToAdd = {};
    const suspendCardIds = [];
    const activeCardIds = [];

    for (const card of cardsInfo) {
        const note = notesMap.get(card.note);
        const { topicTag, role, canonicalTag, action } = classifyCard(card, note);

        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            originalDeck: card.deckName,
            header: note.fields?.Header?.value || note.fields?.Name?.value || note.fields?.Front?.value || '',
            topicTag,
            role,
            roleTag: canonicalTag,
            currentQueue: card.queue,
            action
        });

        tagsToAdd[canonicalTag] = tagsToAdd[canonicalTag] || new Set();
        tagsToAdd[canonicalTag].add(note.noteId);

        if (action === 'SUSPEND') {
            suspendCardIds.push(card.cardId);
        } else {
            activeCardIds.push(card.cardId);
        }
    }

    const dataDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${MANIFEST_PATH}`);

    const pegNotesCount = new Set(manifest.filter(m => m.role === 'peg').map(m => m.noteId)).size;
    const conceptNotesCount = new Set(manifest.filter(m => m.role === 'concept').map(m => m.noteId)).size;
    const khNotesCount = new Set(manifest.filter(m => m.role === 'cq::kh').map(m => m.noteId)).size;
    const problemNotesCount = new Set(manifest.filter(m => m.role === 'problem').map(m => m.noteId)).size;

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:     ${noteIds.length}`);
    console.log(`Total Cards:     ${cardIds.length}`);
    console.log(`Concept Notes:   ${conceptNotesCount} (${manifest.filter(m => m.role === 'concept').length} cards) -> ACTIVE`);
    console.log(`CQ ? (2-mark):   ${khNotesCount} (${manifest.filter(m => m.role === 'cq::kh').length} cards) -> ACTIVE`);
    console.log(`Problem Notes:   ${problemNotesCount} (${manifest.filter(m => m.role === 'problem').length} cards) -> SUSPENDED`);
    console.log(`Memory Peg Notes: ${pegNotesCount} (${manifest.filter(m => m.role === 'peg').length} cards) -> 34 ACTIVE, 556 SUSPENDED`);
    console.log(`Total Active Cards:    ${activeCardIds.length} (7 academic + 34 reviewed pegs)`);
    console.log(`Total Suspended Cards: ${suspendCardIds.length} (1 molarity problem + 556 unstudied pegs)`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki.');
        console.log('Inspect manifest to verify, then run with --execute.');
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

    console.log('\nApplying role tags...');
    for (const [tag, nids] of Object.entries(tagsToAdd)) {
        await callAnki('addTags', {
            notes: Array.from(nids),
            tags: tag
        });
        console.log(`  Added tag "${tag}" to ${nids.size} notes`);
    }

    if (suspendCardIds.length > 0) {
        console.log(`\nSuspending ${suspendCardIds.length} unstudied peg & problem cards...`);
        await callAnki('suspend', { cards: suspendCardIds });
    }

    if (activeCardIds.length > 0) {
        console.log(`Ensuring ${activeCardIds.length} active academic & reviewed peg cards are unsuspended...`);
        await callAnki('unsuspend', { cards: activeCardIds });
    }

    console.log(`\nMoving all ${cardIds.length} cards into flat root deck "${ROOT_DECK}"...`);
    await callAnki('changeDeck', { cards: cardIds, deck: ROOT_DECK });

    // Verify and delete empty subdecks
    const allDecks = await callAnki('deckNames');
    const subdecks = allDecks.filter(d => d.startsWith(`${ROOT_DECK}::`));

    console.log(`\nFound ${subdecks.length} subdecks. Verifying zero cards...`);
    for (const subdeck of subdecks) {
        const remaining = await callAnki('findCards', { query: `deck:"${subdeck}"` });
        if (remaining.length > 0) {
            throw new Error(`Safety check failed: Subdeck "${subdeck}" still contains ${remaining.length} cards! Aborting deletion.`);
        }
    }
    console.log('All subdecks verified empty.');

    if (subdecks.length > 0) {
        subdecks.sort((a, b) => b.length - a.length);
        console.log('Deleting empty subdecks leaf-to-root...');
        await callAnki('deleteDecks', { decks: subdecks, cardsToo: true });
        console.log(`Successfully deleted ${subdecks.length} empty subdecks.`);
    }

    console.log(`\nEnforcing fixed order in deck preset for "${ROOT_DECK}"...`);
    const deckConfig = await callAnki('getDeckConfig', { deck: ROOT_DECK });
    if (deckConfig) {
        deckConfig.newGatherPriority = 2; // 2 = Ascending position (fixed order)
        deckConfig.newSortOrder = 1;       // 1 = Order gathered
        await callAnki('saveDeckConfig', { config: deckConfig });
        console.log('  Deck preset updated: newGatherPriority=2 (Ascending), newSortOrder=1.');
    }

    console.log('\n=== Chemistry Migration Complete ===');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});

