#!/usr/bin/env node

/**
 * Migration & Tag Normalization script for Anki Bangla:
 * 1. Audits notes and classifies into 5-tier Board CQ Question taxonomy:
 *    - concept: Foundational theme, plot, author, character analysis (ACTIVE)
 *    - cq::k: Board CQ Part ? (1-mark direct factual recall) (ACTIVE)
 *    - cq::kh: Board CQ Part ? (2-mark conceptual reasoning & explanations) (ACTIVE)
 *    - mcq: Board exam multiple-choice questions (ACTIVE)
 *    - problem: Board CQ Part ? & ? (3/4-mark stimulus application) (SUSPENDED)
 * 2. Applies canonical role tags (bangla::p1::<section>::<topic>::<role>).
 * 3. Flattens all cards into root deck "[??] Academic::3.[??] Bangla".
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
const ROOT_DECK = '[🎓] Academic::3.[📙] Bangla';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'bangla_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'bangla_classification.json');

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
    const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
    const text = `${deckName} ${header} ${comments} ${tags.join(' ')}`.toLowerCase();

    // 1. Check Subdeck / Stimulus hints
    if (deckName.includes('3-mark') || header.includes('উদ্দীপক') || text.includes('উদ্দীপক তুলনা') || text.includes('3-mark')) {
        return {
            topicTag: 'bangla::p1::sahapath::lalsalu',
            role: 'problem',
            canonicalTag: 'bangla::p1::sahapath::lalsalu::cq::problem'
        };
    }

    if (deckName.includes('1-mark') || header.includes('জ্ঞানমূলক') || header.includes('1-mark') || text.includes('1-mark')) {
        return {
            topicTag: 'bangla::p1::sahapath::lalsalu',
            role: 'cq::k',
            canonicalTag: 'bangla::p1::sahapath::lalsalu::cq::k'
        };
    }

    if (deckName.includes('2-mark') || header.includes('অনুধাবন') || header.includes('2-mark') || text.includes('2-mark')) {
        return {
            topicTag: 'bangla::p1::sahapath::lalsalu',
            role: 'cq::kh',
            canonicalTag: 'bangla::p1::sahapath::lalsalu::cq::kh'
        };
    }

    // 2. Identify Topic
    let topicTag = 'bangla::p1::sahapath::lalsalu';
    if (deckName.includes('মেঘনাদ') || text.includes('মেঘনাদ') || text.includes('বিভীষণ') || text.includes('মধুসূদন') || text.includes('meghnad')) {
        topicTag = 'bangla::p1::kavita::meghnad';
    } else if (deckName.includes('বিলাসী') || text.includes('বিলাসী') || text.includes('মৃত্যুঞ্জয়') || text.includes('শরৎচন্দ্র') || text.includes('bilashi') || text.includes('bilasi') || text.includes('অভাগীর স্বর্গ')) {
        topicTag = 'bangla::p1::gaddya::bilashi';
    } else if (deckName.includes('মাসি পিসি') || text.includes('মাসি-পিসি') || text.includes('মাসি পিসি') || text.includes('আহ্লাদী') || text.includes('masi-pisi') || text.includes('মানিক')) {
        topicTag = 'bangla::p1::gaddya::masi-pisi';
    } else if (deckName.includes('অপরিচিতা') || text.includes('অপরিচিতা') || text.includes('অনুপম') || text.includes('aparichita')) {
        topicTag = 'bangla::p1::gaddya::aparichita';
    } else if (deckName.includes('লালসালু') || text.includes('লালসালু') || text.includes('মজিদ') || text.includes('lalsalu') || text.includes('lalshalu')) {
        topicTag = 'bangla::p1::sahapath::lalsalu';
    }

    // 3. Identify Role
    let role = 'concept';
    if (tags.includes('mcq') || text.includes('mcq') || text.includes('বহুনির্বাচনি') || text.includes('বহুনির্বাচনী')) {
        role = 'mcq';
    }

    return {
        topicTag,
        role,
        canonicalTag: `${topicTag}::${role}`
    };
}

async function restore() {
    console.log('=== Restoring Anki Bangla Deck from Snapshot ===');
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
        console.log('  node scripts/migrate-bangla-deck.mjs --dry-run');
        console.log('  node scripts/migrate-bangla-deck.mjs --execute');
        console.log('  node scripts/migrate-bangla-deck.mjs --restore');
        return;
    }

    console.log('=== Anki Bangla Flat Deck & Tag Migration ===');

    const cardIds = await callAnki('findCards', { query: 'deck:"*Bangla*"' });
    console.log(`Found ${cardIds.length} cards across Bangla decks.`);
    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });

    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    console.log(`Found ${noteIds.length} unique notes.`);
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const noteMap = new Map(notesInfo.map(n => [n.noteId, n]));

    const manifest = [];
    const tagsToAdd = {};
    const problemCardIds = [];
    const activeCardIds = [];

    const originalDeckMap = new Map();
    if (fs.existsSync(SNAPSHOT_PATH)) {
        try {
            const snap = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
            snap.cards.forEach(c => originalDeckMap.set(c.cardId, c.deckName));
        } catch (e) {}
    }

    for (const card of cardsInfo) {
        const note = noteMap.get(card.note);
        if (!note) continue;

        const originalDeck = originalDeckMap.get(card.cardId) || card.deckName;
        const { topicTag, role, canonicalTag } = determineClassification(originalDeck, note);

        if (role === 'problem') {
            problemCardIds.push(card.cardId);
        } else {
            activeCardIds.push(card.cardId);
        }

        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            originalDeck,
            header: note.fields?.Header?.value || note.fields?.Front?.value?.substring(0, 60) || '',
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
    const mcqNotesCount = new Set(manifest.filter(m => m.role === 'mcq').map(m => m.noteId)).size;
    const kNotesCount = new Set(manifest.filter(m => m.role === 'cq::k').map(m => m.noteId)).size;
    const khNotesCount = new Set(manifest.filter(m => m.role === 'cq::kh').map(m => m.noteId)).size;
    const conceptNotesCount = new Set(manifest.filter(m => m.role === 'concept').map(m => m.noteId)).size;

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:    ${noteIds.length}`);
    console.log(`Total Cards:    ${cardIds.length}`);
    console.log(`Concept Notes:  ${conceptNotesCount} (${manifest.filter(m => m.role === 'concept').length} cards) -> ACTIVE`);
    console.log(`CQ ? (1-mark):  ${kNotesCount} (${manifest.filter(m => m.role === 'cq::k').length} cards) -> ACTIVE`);
    console.log(`CQ ? (2-mark):  ${khNotesCount} (${manifest.filter(m => m.role === 'cq::kh').length} cards) -> ACTIVE`);
    console.log(`MCQ Notes:      ${mcqNotesCount} (${manifest.filter(m => m.role === 'mcq').length} cards) -> ACTIVE`);
    console.log(`CQ ? (3-mark):  ${problemNotesCount} (${manifest.filter(m => m.role === 'problem').length} cards) -> SUSPENDED`);

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
        console.log(`\nSuspending ${problemCardIds.length} problem/stimulus cards...`);
        await callAnki('suspend', { cards: problemCardIds });
    }

    if (activeCardIds.length > 0) {
        console.log(`Ensuring ${activeCardIds.length} concept, CQ ?/? & MCQ cards are active...`);
        await callAnki('unsuspend', { cards: activeCardIds });
    }

    console.log(`\nEnsuring all ${cardIds.length} cards reside in root deck "${ROOT_DECK}"...`);
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

    // Reposition new cards sequentially: concepts -> cq::k -> cq::kh -> mcqs
    const PRIORITY_PREFIXES = [
        'bangla::p1::gaddya',
        'bangla::p1::kavita',
        'bangla::p1::sahapath',
        'bangla::p2::byakoron',
        'bangla::p2::nirmithi'
    ];

    function getPriorityRank(roleTag) {
        let baseRank = 500;
        for (let i = 0; i < PRIORITY_PREFIXES.length; i++) {
            if (roleTag.startsWith(PRIORITY_PREFIXES[i])) {
                baseRank = i * 100;
                break;
            }
        }
        if (roleTag.endsWith('::concept')) return baseRank + 10;
        if (roleTag.endsWith('::cq::k')) return baseRank + 20;
        if (roleTag.endsWith('::cq::kh')) return baseRank + 30;
        if (roleTag.endsWith('::mcq')) return baseRank + 40;
        return baseRank + 90;
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

    console.log('\n=== Bangla Migration Completed Successfully ===');
    console.log(`Bangla is standardized in deck "${ROOT_DECK}".`);
    console.log(`Roles enforced: ${conceptNotesCount} concepts, ${kNotesCount} CQ-?, ${khNotesCount} CQ-?, ${mcqNotesCount} MCQs active, ${problemNotesCount} CQ-?/stimulus suspended.`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});
