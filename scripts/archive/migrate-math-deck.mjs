#!/usr/bin/env node

/**
 * Migration script for Anki Higher Math:
 * 1. Backs up current card states to scratch/pre_migration_state.json.
 * 2. Tags notes with chapter-scoped role tags (math::p1::chX::concept / math::p1::chX::problem).
 * 3. Suspends problem cards, keeps concept cards active.
 * 4. Consolidates cards into flat root deck "[🎓] Academic::7.[📊] Higher Math".
 * 5. Safely asserts and deletes empty subdecks leaf-first.
 * 
 * Flags:
 *   --dry-run   Preview classification and generate manifest without modifying Anki.
 *   --execute   Perform full migration.
 *   --restore   Revert cards to snapshot state.
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const ROOT_DECK = '[🎓] Academic::7.[📊] Higher Math';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'math_classification.json');

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

function determineChapter(deckName, existingTags) {
    const tagStr = existingTags.join(' ').toLowerCase();
    if (tagStr.includes('math::basics')) return 'math::basics';
    if (tagStr.includes('math::p2::ch3')) return 'math::p2::ch3';
    if (tagStr.includes('math::p1::ch9')) return 'math::p1::ch9';
    if (tagStr.includes('math::p1::ch7')) return 'math::p1::ch7';
    if (tagStr.includes('math::p1::ch6')) return 'math::p1::ch6';
    if (tagStr.includes('math::p1::ch4')) return 'math::p1::ch4';
    if (tagStr.includes('math::p1::ch3')) return 'math::p1::ch3';
    if (tagStr.includes('math::p1::ch2')) return 'math::p1::ch2';
    if (tagStr.includes('math::p1::ch1')) return 'math::p1::ch1';

    const d = deckName.toLowerCase();
    if (d.includes('matrix')) return 'math::p1::ch1';
    if (d.includes('straight lines')) return 'math::p1::ch3';
    if (d.includes('circle')) return 'math::p1::ch4';
    if (d.includes('trigonometry')) return 'math::p1::ch7';
    if (d.includes('dif')) return 'math::p1::ch9';

    return 'math::p1::ch1';
}

function isProblemCard(note) {
    const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
    const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
    const tags = note.tags.join(' ').toLowerCase();
    const text = `${header} ${comments} ${tags}`;

    // Exercise problems / long proofs
    if (
        text.includes('প্রমাণ') ||
        text.includes('proof') ||
        text.includes('সমাধান') ||
        text.includes('solution') ||
        text.includes('construct') ||
        text.includes('given vertices') ||
        text.includes('problem') ||
        text.includes('evaluation of') ||
        text.includes('piecewise function continuity check') ||
        text.includes('prove discontinuity') ||
        text.includes('continuity problem')
    ) {
        // Exception: pure definitions/identities that happen to mention "proof" in tags
        if (header.includes('identity') || header.includes('formula') || header.includes('types') || header.includes('শর্ত')) {
            return false;
        }
        return true;
    }
    return false;
}

async function restore() {
    console.log('=== Restoring Anki Math Deck from Snapshot ===');
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.error(`[ERROR] Snapshot not found at ${SNAPSHOT_PATH}`);
        process.exit(1);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    console.log(`Loaded snapshot containing ${snapshot.cards.length} cards.`);

    // Group cards by original deck
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

    if (suspendIds.length > 0) {
        await callAnki('suspend', { cards: suspendIds });
    }
    if (unsuspendIds.length > 0) {
        await callAnki('unsuspend', { cards: unsuspendIds });
    }

    console.log('Restore complete.');
}

async function main() {
    if (isRestore) {
        await restore();
        return;
    }

    if (!isDryRun && !isExecute) {
        console.log('Usage:');
        console.log('  node scripts/migrate-math-deck.mjs --dry-run');
        console.log('  node scripts/migrate-math-deck.mjs --execute');
        console.log('  node scripts/migrate-math-deck.mjs --restore');
        return;
    }

    console.log('=== Anki Higher Math Flat Deck & Tag Migration ===');

    // 1. Fetch all Higher Math cards and notes
    const cardIds = await callAnki('findCards', { query: 'deck:"*Higher Math*"' });
    console.log(`Found ${cardIds.length} cards across all Higher Math decks.`);
    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });

    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    console.log(`Found ${noteIds.length} unique notes.`);
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const noteMap = new Map(notesInfo.map(n => [n.noteId, n]));

    // 2. Classify each note
    const manifest = [];
    const tagUpdates = [];
    const problemCardIds = [];
    const conceptCardIds = [];

    for (const card of cardsInfo) {
        const note = noteMap.get(card.note);
        if (!note) continue;

        let roleTag = note.tags.find(t => t.startsWith('math::') && (t.endsWith('::concept') || t.endsWith('::problem') || t.endsWith('::mcq')));
        let role, chapter;
        if (roleTag) {
            const parts = roleTag.split('::');
            role = parts.pop();
            chapter = parts.join('::');
        } else {
            chapter = determineChapter(card.deckName, note.tags);
            const isProblem = isProblemCard(note);
            role = isProblem ? 'problem' : 'concept';
            roleTag = `${chapter}::${role}`;
        }
        const isProblem = role === 'problem';

        if (isProblem) {
            problemCardIds.push(card.cardId);
        } else {
            conceptCardIds.push(card.cardId);
        }

        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            originalDeck: card.deckName,
            header: note.fields?.Header?.value || note.fields?.Front?.value?.substring(0, 60) || '',
            chapter,
            role,
            roleTag,
            currentQueue: card.queue,
            action: isProblem ? 'SUSPEND' : 'ACTIVATE'
        });

        tagUpdates.push({
            noteId: note.noteId,
            tag: roleTag
        });
    }

    // Ensure scratch directory exists
    const scratchDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
    }

    // Save manifest preview
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${MANIFEST_PATH}`);

    const problemNotesCount = new Set(manifest.filter(m => m.role === 'problem').map(m => m.noteId)).size;
    const conceptNotesCount = new Set(manifest.filter(m => m.role === 'concept').map(m => m.noteId)).size;

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:    ${noteIds.length}`);
    console.log(`Total Cards:    ${cardIds.length}`);
    console.log(`Concept Notes:  ${conceptNotesCount} (${conceptCardIds.length} cards) -> ACTIVE`);
    console.log(`Problem Notes:  ${problemNotesCount} (${problemCardIds.length} cards) -> SUSPENDED`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki.');
        console.log('Inspect manifest to verify, then run with --execute.');
        return;
    }

    // 3. Save pre-migration state snapshot (if not already existing)
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

    // 4. Apply chapter-scoped tags
    console.log('\nApplying chapter role tags...');
    // Group note IDs by tag
    const tagToNotes = {};
    tagUpdates.forEach(({ noteId, tag }) => {
        tagToNotes[tag] = tagToNotes[tag] || new Set();
        tagToNotes[tag].add(noteId);
    });

    for (const [tag, nids] of Object.entries(tagToNotes)) {
        await callAnki('addTags', {
            notes: Array.from(nids),
            tags: tag
        });
        console.log(`  Tagged ${nids.size} notes with "${tag}"`);
    }

    // 5. Suspend problems & unsuspend concepts
    console.log(`\nSuspending ${problemCardIds.length} problem cards...`);
    if (problemCardIds.length > 0) {
        await callAnki('suspend', { cards: problemCardIds });
    }

    console.log(`Ensuring ${conceptCardIds.length} concept cards are active...`);
    if (conceptCardIds.length > 0) {
        await callAnki('unsuspend', { cards: conceptCardIds });
    }

    // 6. Move all cards to root deck
    console.log(`\nMoving all ${cardIds.length} cards into root deck "${ROOT_DECK}"...`);
    await callAnki('changeDeck', {
        cards: cardIds,
        deck: ROOT_DECK
    });

    // 7. Find all subdecks and verify 0 cards remain
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

    // 8. Delete empty subdecks leaf-first (longest names first)
    if (subdecks.length > 0) {
        subdecks.sort((a, b) => b.length - a.length);
        console.log('Deleting empty subdecks leaf-to-root...');
        await callAnki('deleteDecks', {
            decks: subdecks,
            cardsToo: true
        });
        console.log(`Successfully deleted ${subdecks.length} empty subdecks.`);
    }

    // 9. Enforce fixed order in deck configuration
    console.log(`\nEnforcing fixed order in deck preset for "${ROOT_DECK}"...`);
    const deckConfig = await callAnki('getDeckConfig', { deck: ROOT_DECK });
    if (deckConfig) {
        deckConfig.newGatherPriority = 2; // 2 = Ascending position (fixed order)
        deckConfig.newSortOrder = 1;       // 1 = Order gathered
        await callAnki('saveDeckConfig', { config: deckConfig });
        console.log('  Deck preset updated: newGatherPriority=2 (Ascending position), newSortOrder=1.');
    }

    // 10. Reposition new cards by curriculum priority: basics -> p1::ch1..ch10 -> p2::ch3
    const PRIORITY_TAGS = [
        'math::basics::concept',
        'math::p1::ch1::concept',
        'math::p1::ch2::concept',
        'math::p1::ch3::concept',
        'math::p1::ch4::concept',
        'math::p1::ch5::concept',
        'math::p1::ch6::concept',
        'math::p1::ch7::concept',
        'math::p1::ch8::concept',
        'math::p1::ch9::concept',
        'math::p1::ch10::concept',
        'math::p2::ch3::concept',
        'math::p2::ch3::mcq',
    ];

    function getPriorityRank(roleTag) {
        const idx = PRIORITY_TAGS.indexOf(roleTag);
        return idx === -1 ? 999 : idx;
    }

    const newCards = manifest.filter(m => m.currentQueue === 0);
    newCards.sort((a, b) => {
        const rankA = getPriorityRank(a.roleTag);
        const rankB = getPriorityRank(b.roleTag);
        if (rankA !== rankB) return rankA - rankB;
        return a.cardId - b.cardId;
    });

    if (newCards.length > 0) {
        console.log(`\nRepositioning ${newCards.length} new cards in curriculum order...`);
        const repositionActions = newCards.map((m, idx) => ({
            action: 'setSpecificValueOfCard',
            params: {
                card: m.cardId,
                keys: ['due'],
                newValues: [idx + 1]
            }
        }));

        const CHUNK_SIZE = 100;
        for (let i = 0; i < repositionActions.length; i += CHUNK_SIZE) {
            const chunk = repositionActions.slice(i, i + CHUNK_SIZE);
            await callAnki('multi', { actions: chunk });
        }
        console.log(`  Successfully repositioned ${repositionActions.length} new cards.`);
    }

    console.log('\n=== Migration Completed Successfully ===');
    console.log(`Higher Math is now flat like ICT in deck "${ROOT_DECK}".`);
    console.log(`All problems are suspended; all concepts are active.`);
    console.log(`Fixed order enforced: Curriculum concepts prioritized first.`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});
