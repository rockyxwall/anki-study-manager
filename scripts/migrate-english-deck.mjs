#!/usr/bin/env node

/**
 * Migration & Tag Normalization script for Anki English:
 * 1. Audits notes and classifies into:
 *    - english::p1::theme::concept: EFT Poem Theme Analyses (ACTIVE)
 *    - english::p2::grammar::narration::concept: Narration Rules (ACTIVE)
 *    - english::p2::grammar::rfov::problem: Right Form of Verbs practice cloze (SUSPENDED)
 * 2. Applies canonical role tags.
 * 3. Flattens all cards into root deck "[??] Academic::4.[??] English".
 * 4. Safely deletes empty subdecks leaf-first.
 * 5. Enforces fixed order (newGatherPriority=2, newSortOrder=1) and sequential queue due positions.
 * 
 * Flags:
 *   --dry-run   Preview classification and manifest without modifying Anki.
 *   --execute   Perform full migration.
 *   --restore   Revert cards to snapshot state.
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const ROOT_DECK = '[🎓] Academic::4.[📕] English';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'english_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'english_classification.json');

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

function determineClassification(deckName, note) {
    const tags = (note.tags || []).map(t => t.toLowerCase());
    const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
    const text = (note.fields?.Text?.value || '').toLowerCase();
    const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || note.fields?.Extra?.value || '').toLowerCase();
    const combined = `${deckName} ${header} ${text} ${comments} ${tags.join(' ')}`.toLowerCase();

    // 1. Right Form of Verbs (RFofV) -> practice exercise -> SUSPENDED
    if (deckName.includes('rfofv') || combined.includes('right forms of verbs') || combined.includes('right form of verbs') || combined.includes('rfofv')) {
        return {
            topicTag: 'english::p2::grammar::rfov',
            role: 'problem',
            canonicalTag: 'english::p2::grammar::rfov::problem'
        };
    }

    // 2. Narration -> Grammar Rules -> ACTIVE
    if (deckName.includes('narration') || combined.includes('narration') || combined.includes('direct-to-indirect')) {
        return {
            topicTag: 'english::p2::grammar::narration',
            role: 'concept',
            canonicalTag: 'english::p2::grammar::narration::concept'
        };
    }

    // 3. Theme Writing -> EFT Poem Themes -> ACTIVE
    if (deckName.includes('theme writing') || combined.includes('theme') || combined.includes('poetry-analysis') || combined.includes('poem')) {
        return {
            topicTag: 'english::p1::theme',
            role: 'concept',
            canonicalTag: 'english::p1::theme::concept'
        };
    }

    return {
        topicTag: 'english::p1::general',
        role: 'concept',
        canonicalTag: 'english::p1::general::concept'
    };
}

async function restore() {
    console.log('=== Restoring Anki English Deck from Snapshot ===');
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
    if (isRestore) {
        await restore();
        return;
    }

    if (!isDryRun && !isExecute) {
        console.log('Usage:');
        console.log('  node scripts/migrate-english-deck.mjs --dry-run');
        console.log('  node scripts/migrate-english-deck.mjs --execute');
        console.log('  node scripts/migrate-english-deck.mjs --restore');
        return;
    }

    console.log('=== Anki English Flat Deck & Tag Migration ===');

    const cardIds = await callAnki('findCards', { query: 'deck:"*English*" -deck:"*Language*"' });
    console.log(`Found ${cardIds.length} cards across Academic English decks.`);
    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });

    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    console.log(`Found ${noteIds.length} unique notes.`);
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const noteMap = new Map(notesInfo.map(n => [n.noteId, n]));

    const manifest = [];
    const tagsToAdd = {};
    const problemCardIds = [];
    const activeCardIds = [];

    for (const card of cardsInfo) {
        const note = noteMap.get(card.note);
        if (!note) continue;

        const { topicTag, role, canonicalTag } = determineClassification(card.deckName, note);

        if (role === 'problem') {
            problemCardIds.push(card.cardId);
        } else {
            activeCardIds.push(card.cardId);
        }

        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            originalDeck: card.deckName,
            header: note.fields?.Header?.value || note.fields?.Front?.value?.substring(0, 60) || note.fields?.Text?.value?.substring(0, 60) || '',
            topicTag,
            role,
            roleTag: canonicalTag,
            currentQueue: card.queue,
            action: role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
        });

        tagsToAdd[canonicalTag] = tagsToAdd[canonicalTag] || new Set();
        tagsToAdd[canonicalTag].add(note.noteId);
    }

    const dataDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${MANIFEST_PATH}`);

    const problemNotesCount = new Set(manifest.filter(m => m.role === 'problem').map(m => m.noteId)).size;
    const conceptNotesCount = new Set(manifest.filter(m => m.role === 'concept').map(m => m.noteId)).size;

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:    ${noteIds.length}`);
    console.log(`Total Cards:    ${cardIds.length}`);
    console.log(`Concept Notes:  ${conceptNotesCount} (${manifest.filter(m => m.role === 'concept').length} cards) -> ACTIVE`);
    console.log(`Practice Notes: ${problemNotesCount} (${manifest.filter(m => m.role === 'problem').length} cards) -> SUSPENDED`);

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

    if (problemCardIds.length > 0) {
        console.log(`\nSuspending ${problemCardIds.length} practice cloze cards...`);
        await callAnki('suspend', { cards: problemCardIds });
    }

    if (activeCardIds.length > 0) {
        console.log(`Ensuring ${activeCardIds.length} theme and narration cards are active...`);
        await callAnki('unsuspend', { cards: activeCardIds });
    }

    console.log(`\nEnsuring all ${cardIds.length} cards reside in root deck "${ROOT_DECK}"...`);
    await callAnki('changeDeck', { cards: cardIds, deck: ROOT_DECK });

    // Delete empty subdecks
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

    // Reposition active cards: EFT Themes -> Narration
    const PRIORITY_PREFIXES = [
        'english::p1::theme',
        'english::p2::grammar::narration',
        'english::p2::grammar::rfov'
    ];

    function getPriorityRank(roleTag) {
        let idx = PRIORITY_PREFIXES.findIndex(p => roleTag.startsWith(p));
        return idx === -1 ? 999 : idx;
    }

    const newCards = manifest.filter(m => m.currentQueue === 0 && m.role !== 'problem');
    newCards.sort((a, b) => {
        const rankA = getPriorityRank(a.roleTag);
        const rankB = getPriorityRank(b.roleTag);
        if (rankA !== rankB) return rankA - rankB;
        return a.cardId - b.cardId;
    });

    console.log(`\nRepositioning ${newCards.length} active new cards in fixed curriculum order...`);
    const repositionActions = newCards.map((m, idx) => ({
        action: 'setSpecificValueOfCard',
        params: {
            card: m.cardId,
            keys: ['due'],
            newValues: [idx + 1]
        }
    }));

    if (repositionActions.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < repositionActions.length; i += CHUNK_SIZE) {
            const chunk = repositionActions.slice(i, i + CHUNK_SIZE);
            await callAnki('multi', { actions: chunk });
        }
        console.log(`  Successfully repositioned ${repositionActions.length} new cards.`);
    }

    console.log('\n=== English Migration Completed Successfully ===');
    console.log(`English is standardized in deck "${ROOT_DECK}".`);
    console.log(`Roles enforced: ${conceptNotesCount} themes & narration rules active, ${problemNotesCount} RFofV cloze practice suspended.`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});
