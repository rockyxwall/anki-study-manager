#!/usr/bin/env node

/**
 * Migration & Tag Normalization script for Anki Physics:
 * 1. Audits notes and classifies into 5-tier Board CQ Question taxonomy:
 *    - concept: Formulas, laws, definitions, vector types (ACTIVE)
 *    - cq::k: Board CQ Part ? (1-mark direct factual recall) (ACTIVE)
 *    - cq::kh: Board CQ Part ? (2-mark conceptual reasoning & explanations) (ACTIVE)
 *    - mcq: Board multiple-choice questions (ACTIVE)
 *    - problem: Board CQ Part ? & ? (3/4-mark multi-step math/proofs) (SUSPENDED)
 * 2. Applies canonical role tags (physics::p1::chX::*, physics::p2::chX::*).
 * 3. Flattens all cards into root deck "[??] Academic::5.[?] Physics".
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
const ROOT_DECK = '[🎓] Academic::5.[⚡] Physics';
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'physics_pre_migration_state.json');
const MANIFEST_PATH = path.resolve(process.cwd(), 'data', 'physics_classification.json');

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

    // 1. Creative Questions (CQ) in Dynamics -> SUSPENDED
    if (deckName.includes('3::cq') || text.includes('গাণিতিক সমস্যা') || text.includes('projectile and wall') || text.includes('cq') && deckName.includes('3')) {
        return {
            chapter: 'physics::p1::ch3',
            role: 'problem',
            canonicalTag: 'physics::p1::ch3::cq::problem'
        };
    }

    // 2. MCQ Deck handling
    if (deckName.includes('mcq') || tags.includes('mcq') || text.includes('বহুনির্বাচনী') || text.includes('বহুনির্বাচনি') || text.includes('mcqs') || text.includes('mcq')) {
        if (text.includes('স্থির তড়িৎ') || text.includes('electrostatics') || text.includes('তড়িৎপ্রবাহ') || text.includes('current-electricity')) {
            return {
                chapter: 'physics::p2::ch2',
                role: 'mcq',
                canonicalTag: 'physics::p2::ch2::mcq'
            };
        }
        if (text.includes('পরিমাপ') || text.includes('একক') || text.includes('measurement') || text.includes('errors')) {
            return {
                chapter: 'physics::p1::ch1',
                role: 'mcq',
                canonicalTag: 'physics::p1::ch1::mcq'
            };
        }
        if (text.includes('ভেক্টর') || text.includes('vector') || text.includes('cross-product')) {
            return {
                chapter: 'physics::p1::ch2',
                role: 'mcq',
                canonicalTag: 'physics::p1::ch2::mcq'
            };
        }
        if (text.includes('dynamics') || text.includes('kinematics') || text.includes('প্রাস') || text.includes('projectile')) {
            return {
                chapter: 'physics::p1::ch3',
                role: 'mcq',
                canonicalTag: 'physics::p1::ch3::mcq'
            };
        }
        if (text.includes('rotational') || text.includes('newtonian') || text.includes('বলবিদ্যা')) {
            return {
                chapter: 'physics::p1::ch4',
                role: 'mcq',
                canonicalTag: 'physics::p1::ch4::mcq'
            };
        }
        return {
            chapter: 'physics::p1::ch1',
            role: 'mcq',
            canonicalTag: 'physics::p1::ch1::mcq'
        };
    }

    // 3. Chapter 3 Formulas
    if (deckName.includes('3::formulas') || text.includes('গতির সমীকরণ') || text.includes('পরন্ত বস্তু') || text.includes('লেখচিত্র')) {
        return {
            chapter: 'physics::p1::ch3',
            role: 'concept',
            canonicalTag: 'physics::p1::ch3::concept'
        };
    }

    // 4. Chapter 4 Newtonian Mechanics
    if (deckName.includes('4::1') || deckName.includes('4::2') || text.includes('newtonian') || text.includes('banking') || text.includes('torque') || text.includes('momentum') || text.includes('ঘর্ষণ')) {
        if (text.includes('অনুধাবন') || text.includes('কেন') || text.includes('ব্যাখ্যা')) {
            return {
                chapter: 'physics::p1::ch4',
                role: 'cq::kh',
                canonicalTag: 'physics::p1::ch4::cq::kh'
            };
        }
        if (text.includes('জ্ঞানমূলক') || text.includes('সংজ্ঞা') || text.includes('কাকে বলে')) {
            return {
                chapter: 'physics::p1::ch4',
                role: 'cq::k',
                canonicalTag: 'physics::p1::ch4::cq::k'
            };
        }
        return {
            chapter: 'physics::p1::ch4',
            role: 'concept',
            canonicalTag: 'physics::p1::ch4::concept'
        };
    }

    // 5. Chapter 2 Vectors & A-B Questions
    if (deckName.includes('vector') || text.includes('vector') || text.includes('ভেক্টর')) {
        if (header.startsWith('ক.') || text.includes('জ্ঞানমূলক') || text.includes('কাকে বলে') || header.includes('সংজ্ঞা (definition)')) {
            return {
                chapter: 'physics::p1::ch2',
                role: 'cq::k',
                canonicalTag: 'physics::p1::ch2::cq::k'
            };
        }
        if (header.startsWith('খ.') || text.includes('অনুধাবন') || text.includes('ব্যাখ্যা') || text.includes('কেন')) {
            return {
                chapter: 'physics::p1::ch2',
                role: 'cq::kh',
                canonicalTag: 'physics::p1::ch2::cq::kh'
            };
        }
        return {
            chapter: 'physics::p1::ch2',
            role: 'concept',
            canonicalTag: 'physics::p1::ch2::concept'
        };
    }

    // 6. Chapter 1 Physical World / Intro
    return {
        chapter: 'physics::p1::ch1',
        role: 'concept',
        canonicalTag: 'physics::p1::ch1::concept'
    };
}

async function restore() {
    console.log('=== Restoring Anki Physics Deck from Snapshot ===');
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
        console.log('  node scripts/migrate-physics-deck.mjs --dry-run');
        console.log('  node scripts/migrate-physics-deck.mjs --execute');
        console.log('  node scripts/migrate-physics-deck.mjs --restore');
        return;
    }

    console.log('=== Anki Physics Flat Deck & Tag Migration ===');

    const cardIds = await callAnki('findCards', { query: 'deck:"*Physics*"' });
    console.log(`Found ${cardIds.length} cards across Physics decks.`);
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
        const { chapter, role, canonicalTag } = determineClassification(originalDeck, note);

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
            chapter,
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
        console.log(`\nSuspending ${problemCardIds.length} CQ math/problem cards...`);
        await callAnki('suspend', { cards: problemCardIds });
    }

    if (activeCardIds.length > 0) {
        console.log(`Ensuring ${activeCardIds.length} concept, CQ ?/? & MCQ cards are active...`);
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

    // Reposition active cards: p1::ch1..ch10 concepts -> cq::k -> cq::kh -> mcqs
    function getPriorityRank(roleTag) {
        let baseRank = 500;
        const match = roleTag.match(/physics::p(\d)::ch(\d+)/);
        if (match) {
            const paper = parseInt(match[1], 10);
            const ch = parseInt(match[2], 10);
            baseRank = (paper - 1) * 200 + ch * 15;
        }
        if (roleTag.endsWith('::concept')) return baseRank + 1;
        if (roleTag.endsWith('::cq::k')) return baseRank + 3;
        if (roleTag.endsWith('::cq::kh')) return baseRank + 5;
        if (roleTag.endsWith('::mcq')) return baseRank + 8;
        return baseRank + 12;
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

    console.log('\n=== Physics Migration Completed Successfully ===');
    console.log(`Physics is standardized in deck "${ROOT_DECK}".`);
    console.log(`Roles enforced: ${conceptNotesCount} concepts, ${kNotesCount} CQ-?, ${khNotesCount} CQ-?, ${mcqNotesCount} MCQs active, ${problemNotesCount} CQ-?/? math problems suspended.`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});
