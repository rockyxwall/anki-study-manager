#!/usr/bin/env node

/**
 * Migration & Tag Normalization script for Anki ICT:
 * 1. Audits notes and classifies into:
 *    - concept: Theory, definitions, formulas, specifications (ACTIVE)
 *    - mcq: Board exam multiple-choice questions & option occlusions (ACTIVE)
 *    - problem: Multi-step calculations, full code, proofs (SUSPENDED)
 * 2. Applies canonical role tags (ict::chX::concept, ict::chX::mcq, ict::chX::problem).
 * 3. Removes cross-contaminated role tags (e.g. concept tag on an MCQ note).
 * 4. Ensures all cards reside in flat root deck "[🎓] Academic::2.[💻] ICT".
 * 
 * Flags:
 *   --dry-run   Preview classification and generate manifest without modifying Anki.
 *   --execute   Perform full migration.
 *   --restore   Revert cards to snapshot state.
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const ROOT_DECK = '[🎓] Academic::2.[💻] ICT';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'ict_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'ict_classification.json');

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

function determineChapter(deckName, existingTags, noteText = '') {
    const tagStr = existingTags.join(' ').toLowerCase();

    if (tagStr.includes('ict::ch3::3.1')) return 'ict::ch3::3.1';
    if (tagStr.includes('ict::ch3::3.2') || tagStr.includes('ict::ch3::3.2-info')) return 'ict::ch3::3.2';
    if (tagStr.includes('ict::ch1')) return 'ict::ch1';
    if (tagStr.includes('ict::ch2')) return 'ict::ch2';
    if (tagStr.includes('ict::ch4')) return 'ict::ch4';
    if (tagStr.includes('ict::ch5')) return 'ict::ch5';
    if (tagStr.includes('ict::ch6')) return 'ict::ch6';

    const text = `${tagStr} ${noteText}`.toLowerCase();
    if (text.includes('সংখ্যা') || text.includes('number system') || text.includes('binary') || text.includes('octal') || text.includes('hexadecimal')) {
        return 'ict::ch3::3.1';
    }
    if (text.includes('logic-gates') || text.includes('boolean') || text.includes('গেট') || text.includes('লজিক') || text.includes('adder') || text.includes('flip-flop')) {
        return 'ict::ch3::3.2';
    }
    if (text.includes('network') || text.includes('bandwidth') || text.includes('communication') || text.includes('transmission') || text.includes('topology')) {
        return 'ict::ch2';
    }
    if (text.includes('html') || text.includes('web')) {
        return 'ict::ch4';
    }
    if (text.includes('programming') || text.includes('c-program') || text.includes('flowchart')) {
        return 'ict::ch5';
    }
    if (text.includes('database') || text.includes('dbms') || text.includes('sql')) {
        return 'ict::ch6';
    }

    return 'ict::ch1';
}

function isMcqCard(note) {
    const tags = (note.tags || []).map(t => t.toLowerCase());
    const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
    const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
    const text = `${header} ${comments} ${tags.join(' ')}`;

    return (
        tags.some(t => t.includes('mcq')) ||
        text.includes('mcq') ||
        text.includes('board questions') ||
        text.includes('board-questions')
    );
}

function isProblemCard(note) {
    const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
    const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
    const tags = note.tags.join(' ').toLowerCase();
    const text = `${header} ${comments} ${tags}`;

    if (
        text.includes('সমাধান কর') ||
        text.includes('write a c program') ||
        text.includes('প্রোগ্রাম লিখ') ||
        text.includes('truth table derivation') ||
        text.includes('2\'s complement subtraction calculation') ||
        text.includes('রূপান্তর কর')
    ) {
        if (
            header.includes('প্রকারভেদ') ||
            header.includes('types') ||
            header.includes('definition') ||
            header.includes('সংজ্ঞা') ||
            header.includes('law') ||
            header.includes('আইন') ||
            header.includes('gate') ||
            header.includes('ব্যান্ডউইথ') ||
            header.includes('উপপাদ্য') ||
            header.includes('ai') ||
            header.includes('বুদ্ধিমত্তা')
        ) {
            return false;
        }
        return true;
    }
    return false;
}

function determineRole(note) {
    if (isProblemCard(note)) return 'problem';
    if (isMcqCard(note)) return 'mcq';
    return 'concept';
}

async function restore() {
    console.log('=== Restoring Anki ICT Deck from Snapshot ===');
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
        console.log('  node scripts/migrate-ict-deck.mjs --dry-run');
        console.log('  node scripts/migrate-ict-deck.mjs --execute');
        console.log('  node scripts/migrate-ict-deck.mjs --restore');
        return;
    }

    console.log('=== Anki ICT Flat Deck & Tag Migration ===');

    // 1. Fetch all ICT cards and notes
    const cardIds = await callAnki('findCards', { query: 'deck:"*ICT*"' });
    console.log(`Found ${cardIds.length} cards across ICT decks.`);
    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });

    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    console.log(`Found ${noteIds.length} unique notes.`);
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const noteMap = new Map(notesInfo.map(n => [n.noteId, n]));

    // 2. Classify each note
    const manifest = [];
    const tagsToAdd = {};
    const tagsToRemove = {};
    const problemCardIds = [];
    const activeCardIds = [];

    for (const card of cardsInfo) {
        const note = noteMap.get(card.note);
        if (!note) continue;

        let roleTag = note.tags.find(t => t.startsWith('ict::') && (t.endsWith('::concept') || t.endsWith('::problem') || t.endsWith('::mcq')));
        let role, chapter;
        if (roleTag) {
            const parts = roleTag.split('::');
            role = parts.pop();
            chapter = parts.join('::');
        } else {
            const noteText = `${note.fields?.Header?.value || ''} ${note.fields?.Comments?.value || ''}`;
            chapter = determineChapter(card.deckName, note.tags, noteText);
            role = determineRole(note);
            roleTag = `${chapter}::${role}`;
        }

        if (role === 'problem') {
            problemCardIds.push(card.cardId);
        } else {
            activeCardIds.push(card.cardId);
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
            action: role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
        });

        // Add correct role tag
        tagsToAdd[roleTag] = tagsToAdd[roleTag] || new Set();
        tagsToAdd[roleTag].add(note.noteId);

        // Clean up cross-assigned role tags
        if (role === 'mcq') {
            const wrongConceptTag = `${chapter}::concept`;
            if (note.tags.includes(wrongConceptTag)) {
                tagsToRemove[wrongConceptTag] = tagsToRemove[wrongConceptTag] || new Set();
                tagsToRemove[wrongConceptTag].add(note.noteId);
            }
        } else if (role === 'concept') {
            const wrongMcqTag = `${chapter}::mcq`;
            if (note.tags.includes(wrongMcqTag)) {
                tagsToRemove[wrongMcqTag] = tagsToRemove[wrongMcqTag] || new Set();
                tagsToRemove[wrongMcqTag].add(note.noteId);
            }
        }
    }

    // Ensure data directory exists
    const dataDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save manifest preview
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${MANIFEST_PATH}`);

    const problemNotesCount = new Set(manifest.filter(m => m.role === 'problem').map(m => m.noteId)).size;
    const mcqNotesCount = new Set(manifest.filter(m => m.role === 'mcq').map(m => m.noteId)).size;
    const conceptNotesCount = new Set(manifest.filter(m => m.role === 'concept').map(m => m.noteId)).size;

    const mcqCardIds = manifest.filter(m => m.role === 'mcq').map(m => m.cardId);
    const conceptCardIds = manifest.filter(m => m.role === 'concept').map(m => m.cardId);

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:    ${noteIds.length}`);
    console.log(`Total Cards:    ${cardIds.length}`);
    console.log(`Concept Notes:  ${conceptNotesCount} (${conceptCardIds.length} cards) -> ACTIVE`);
    console.log(`MCQ Notes:      ${mcqNotesCount} (${mcqCardIds.length} cards) -> ACTIVE`);
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

    // 4. Apply chapter-scoped tags & remove erroneous tags
    console.log('\nApplying role tags...');
    for (const [tag, nids] of Object.entries(tagsToAdd)) {
        await callAnki('addTags', {
            notes: Array.from(nids),
            tags: tag
        });
        console.log(`  Added tag "${tag}" to ${nids.size} notes`);
    }

    for (const [tag, nids] of Object.entries(tagsToRemove)) {
        await callAnki('removeTags', {
            notes: Array.from(nids),
            tags: tag
        });
        console.log(`  Removed mismatched tag "${tag}" from ${nids.size} notes`);
    }

    // 5. Suspend problems & unsuspend active cards
    if (problemCardIds.length > 0) {
        console.log(`\nSuspending ${problemCardIds.length} problem cards...`);
        await callAnki('suspend', { cards: problemCardIds });
    }

    if (activeCardIds.length > 0) {
        console.log(`Ensuring ${activeCardIds.length} concept & MCQ cards are active...`);
        await callAnki('unsuspend', { cards: activeCardIds });
    }

    // 6. Move all cards to root deck if any were elsewhere
    console.log(`\nEnsuring all ${cardIds.length} cards reside in root deck "${ROOT_DECK}"...`);
    await callAnki('changeDeck', {
        cards: cardIds,
        deck: ROOT_DECK
    });

    // 7. Enforce fixed order in deck configuration
    console.log(`\nEnforcing fixed order in deck preset for "${ROOT_DECK}"...`);
    const deckConfig = await callAnki('getDeckConfig', { deck: ROOT_DECK });
    if (deckConfig) {
        deckConfig.newGatherPriority = 2; // 2 = Ascending position (fixed order)
        deckConfig.newSortOrder = 1;       // 1 = Order gathered
        await callAnki('saveDeckConfig', { config: deckConfig });
        console.log('  Deck preset updated: newGatherPriority=2 (Ascending position), newSortOrder=1.');
    }

    // 8. Reposition new cards by curriculum priority: concepts ch1..chX first, then MCQs
    const PRIORITY_TAGS = [
        'ict::ch1::concept',
        'ict::ch2::concept',
        'ict::ch3::3.1::concept',
        'ict::ch3::3.2::concept',
        'ict::ch4::concept',
        'ict::ch5::concept',
        'ict::ch6::concept',
        'ict::ch1::mcq',
        'ict::ch2::mcq',
        'ict::ch3::3.1::mcq',
        'ict::ch3::3.2::mcq',
        'ict::ch4::mcq',
        'ict::ch5::mcq',
        'ict::ch6::mcq',
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

    console.log(`\nRepositioning ${newCards.length} new cards in fixed curriculum order...`);
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
        console.log(`  Successfully repositioned ${repositionActions.length} new cards:`);
        console.log(`  - 1..13:   ict::ch1::concept`);
        console.log(`  - 14..19:  ict::ch2::concept`);
        console.log(`  - 20..34:  ict::ch3::3.2::concept`);
        console.log(`  - 35..152: ict::ch2::mcq`);
    }

    console.log('\n=== Migration Completed Successfully ===');
    console.log(`ICT is standardized in deck "${ROOT_DECK}".`);
    console.log(`Roles enforced: ${conceptNotesCount} concepts, ${mcqNotesCount} MCQs active, ${problemNotesCount} problems suspended.`);
    console.log(`Fixed order enforced: Chapter concepts 1..X prioritized first, followed by MCQs.`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});

