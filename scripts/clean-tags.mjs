#!/usr/bin/env node

/**
 * Script to clean up and strip non-canonical / AI-describer loose tags from all 5 academic decks:
 * - [??] Academic::2.[??] ICT
 * - [??] Academic::7.[??] Higher Math
 * - [??] Academic::3.[??] Bangla
 * - [??] Academic::4.[??] English
 * - [??] Academic::5.[?] Physics
 * 
 * Rules:
 * - Every note retains exactly its canonical hierarchical tag.
 * - All AI-describer loose tags and legacy flat tags are removed.
 * 
 * Flags:
 *   --dry-run   Preview tag removals without modifying Anki.
 *   --execute   Apply tag cleanup in Anki.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const BACKUP_PATH = path.resolve(process.cwd(), 'data', 'pre_tag_cleanup_backup.json');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');

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

const groundTruthTags = new Map();

// 1. Load canonical tags from snapshots & git
const mathPath = path.resolve(process.cwd(), 'data', 'pre_migration_state.json');
const ictPath = path.resolve(process.cwd(), 'data', 'ict_pre_migration_state.json');

const mathRaw = fs.existsSync(mathPath)
    ? fs.readFileSync(mathPath, 'utf8')
    : execSync('git show 95ff36f:data/pre_migration_state.json', { encoding: 'utf8' });
const ictRaw = fs.existsSync(ictPath)
    ? fs.readFileSync(ictPath, 'utf8')
    : execSync('git show 3ebf82c:data/ict_pre_migration_state.json', { encoding: 'utf8' });
const mathGit = JSON.parse(mathRaw);
const ictGit = JSON.parse(ictRaw);

mathGit.notes.forEach(n => {
    const tags = n.tags;
    let canonical = null;
    if (tags.some(t => t.includes('p2::ch3::mcq'))) canonical = 'math::p2::ch3::mcq';
    else if (tags.some(t => t.includes('p2::ch3::problem'))) canonical = 'math::p2::ch3::problem';
    else if (tags.some(t => t.includes('p2::ch3'))) canonical = 'math::p2::ch3::concept';
    else if (tags.some(t => t.includes('math::basics'))) canonical = 'math::basics::concept';
    else if (tags.some(t => t.includes('p1::ch9::problem'))) canonical = 'math::p1::ch9::problem';
    else if (tags.some(t => t.includes('p1::ch9::concept'))) canonical = 'math::p1::ch9::concept';
    else if (tags.some(t => t.includes('p1::ch7::problem'))) canonical = 'math::p1::ch7::problem';
    else if (tags.some(t => t.includes('p1::ch7::concept'))) canonical = 'math::p1::ch7::concept';
    else if (tags.some(t => t.includes('p1::ch4::problem'))) canonical = 'math::p1::ch4::problem';
    else if (tags.some(t => t.includes('p1::ch4::concept'))) canonical = 'math::p1::ch4::concept';
    else if (tags.some(t => t.includes('p1::ch3::problem'))) canonical = 'math::p1::ch3::problem';
    else if (tags.some(t => t.includes('p1::ch3::concept'))) canonical = 'math::p1::ch3::concept';
    else if (tags.some(t => t.includes('p1::ch1::problem'))) canonical = 'math::p1::ch1::problem';
    else if (tags.some(t => t.includes('p1::ch1::concept'))) canonical = 'math::p1::ch1::concept';
    if (canonical) groundTruthTags.set(n.noteId, canonical);
});

ictGit.notes.forEach(n => {
    const tags = n.tags;
    let canonical = null;
    if (tags.some(t => t.includes('ict::ch1::mcq'))) canonical = 'ict::ch1::mcq';
    else if (tags.some(t => t.includes('ict::ch2::mcq'))) canonical = 'ict::ch2::mcq';
    else if (tags.some(t => t.includes('ict::ch3::3.1'))) canonical = 'ict::ch3::3.1::concept';
    else if (tags.some(t => t.includes('ict::ch3::3.2') || t.includes('ict::ch3::3.2-info'))) canonical = 'ict::ch3::3.2::concept';
    else if (tags.some(t => t.includes('ict::ch2') || t.includes('ict::ch2::info'))) canonical = 'ict::ch2::concept';
    else if (tags.some(t => t.includes('ict::ch1'))) canonical = 'ict::ch1::concept';
    if (canonical) groundTruthTags.set(n.noteId, canonical);
});

// Authentic NCTB Curriculum realignments
const CURRICULUM_REALIGNMENTS = {
    // Higher Math realignments
    1762405702530: 'math::p1::ch6::concept',
    1765002226115: 'math::p1::ch6::concept',
    1765002254578: 'math::p1::ch6::concept',
    1765002278030: 'math::p1::ch6::concept',
    1765002307744: 'math::p1::ch6::concept',
    1778305927590: 'math::p1::ch4::concept',
    1778298054942: 'math::p1::ch4::problem',
    1762402200638: 'math::p2::ch3::concept',
    1780321375405: 'math::basics::concept',
    1781548908851: 'math::basics::concept',
    // ICT realignments
    1766560301106: 'ict::ch1::concept',
    1766385402749: 'ict::ch1::concept'
};
for (const [nid, tag] of Object.entries(CURRICULUM_REALIGNMENTS)) {
    groundTruthTags.set(parseInt(nid, 10), tag);
}

// 2. Load manifest ground truth from all 5 subjects if manifests exist
const MANIFEST_FILES = [
    'data/math_classification.json',
    'data/ict_classification.json',
    'data/bangla_classification.json',
    'data/english_classification.json',
    'data/physics_classification.json'
];

for (const mf of MANIFEST_FILES) {
    const fullPath = path.resolve(process.cwd(), mf);
    if (fs.existsSync(fullPath)) {
        try {
            const list = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            for (const item of list) {
                if (item.noteId && item.roleTag) {
                    groundTruthTags.set(item.noteId, item.roleTag);
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

function getCanonicalTag(note, defaultPrefix = '') {
    if (groundTruthTags.has(note.noteId)) {
        return groundTruthTags.get(note.noteId);
    }
    const tags = note.tags || [];
    // Search for any existing structured tag: e.g. physics::*, bangla::*, english::*, math::*, ict::*
    const match = tags.find(t => t.startsWith(defaultPrefix) && (t.endsWith('::concept') || t.endsWith('::mcq') || t.endsWith('::problem') || t.includes('::cq::')));
    if (match) return match;
    return `${defaultPrefix}::concept`;
}

async function cleanDeck(deckQuery, tagResolver, defaultPrefix) {
    const cardIds = await callAnki('findCards', { query: `deck:"${deckQuery}"` });
    if (cardIds.length === 0) return { totalNotes: 0, removals: [], additions: [], notes: [] };

    const cards = await callAnki('cardsInfo', { cards: cardIds });
    const noteIds = Array.from(new Set(cards.map(c => c.note)));
    const notes = await callAnki('notesInfo', { notes: noteIds });

    const removals = [];
    const additions = [];

    for (const note of notes) {
        const canonical = tagResolver(note, defaultPrefix);
        const tags = note.tags;

        const toRemove = tags.filter(t => t.toLowerCase() !== canonical.toLowerCase());
        if (toRemove.length > 0) {
            removals.push({
                noteId: note.noteId,
                canonical,
                remove: toRemove
            });
        }

        if (!tags.some(t => t.toLowerCase() === canonical.toLowerCase())) {
            additions.push({
                noteId: note.noteId,
                tag: canonical
            });
        }
    }

    return { totalNotes: notes.length, removals, additions, notes };
}

async function main() {
    if (!isDryRun && !isExecute) {
        console.log('Usage:');
        console.log('  node scripts/clean-tags.mjs --dry-run');
        console.log('  node scripts/clean-tags.mjs --execute');
        return;
    }

    console.log('=== Cleaning Tags Across All 5 Academic Decks ===\n');

    const ict = await cleanDeck('[🎓] Academic::2.[💻] ICT', getCanonicalTag, 'ict');
    const math = await cleanDeck('[🎓] Academic::7.[📊] Higher Math', getCanonicalTag, 'math');
    const bangla = await cleanDeck('[🎓] Academic::3.[📙] Bangla', getCanonicalTag, 'bangla');
    const english = await cleanDeck('[🎓] Academic::4.[📕] English', getCanonicalTag, 'english');
    const physics = await cleanDeck('[🎓] Academic::5.[⚡] Physics', getCanonicalTag, 'physics');

    console.log(`[ICT]         Total Notes: ${ict.totalNotes.toString().padStart(3)} | Notes to strip: ${ict.removals.length.toString().padStart(3)} | Canonical tags to add: ${ict.additions.length.toString().padStart(3)}`);
    console.log(`[Higher Math] Total Notes: ${math.totalNotes.toString().padStart(3)} | Notes to strip: ${math.removals.length.toString().padStart(3)} | Canonical tags to add: ${math.additions.length.toString().padStart(3)}`);
    console.log(`[Bangla]      Total Notes: ${bangla.totalNotes.toString().padStart(3)} | Notes to strip: ${bangla.removals.length.toString().padStart(3)} | Canonical tags to add: ${bangla.additions.length.toString().padStart(3)}`);
    console.log(`[English]     Total Notes: ${english.totalNotes.toString().padStart(3)} | Notes to strip: ${english.removals.length.toString().padStart(3)} | Canonical tags to add: ${english.additions.length.toString().padStart(3)}`);
    console.log(`[Physics]     Total Notes: ${physics.totalNotes.toString().padStart(3)} | Notes to strip: ${physics.removals.length.toString().padStart(3)} | Canonical tags to add: ${physics.additions.length.toString().padStart(3)}`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki. Run with --execute to apply.');
        return;
    }

    // Save backup before cleaning
    console.log(`\nSaving safety backup to ${BACKUP_PATH}...`);
    const allNotes = [...ict.notes, ...math.notes, ...bangla.notes, ...english.notes, ...physics.notes];
    fs.writeFileSync(BACKUP_PATH, JSON.stringify({
        timestamp: new Date().toISOString(),
        notes: allNotes.map(n => ({ noteId: n.noteId, tags: n.tags }))
    }, null, 2), 'utf8');

    // 1. Apply removals first (strip non-canonical tags)
    const allRemovals = [...ict.removals, ...math.removals, ...bangla.removals, ...english.removals, ...physics.removals];
    const removeTagMap = {};
    for (const r of allRemovals) {
        for (const t of r.remove) {
            removeTagMap[t] = removeTagMap[t] || [];
            removeTagMap[t].push(r.noteId);
        }
    }

    if (Object.keys(removeTagMap).length > 0) {
        console.log(`\nStripping ${Object.keys(removeTagMap).length} unique non-canonical tags...`);
        for (const [tag, nids] of Object.entries(removeTagMap)) {
            await callAnki('removeTags', { notes: nids, tags: tag });
        }
    } else {
        console.log('\nNo non-canonical tags to strip.');
    }

    // 2. Apply additions second (ensure canonical tag exists)
    const allAdditions = [...ict.additions, ...math.additions, ...bangla.additions, ...english.additions, ...physics.additions];
    const addGroups = {};
    for (const a of allAdditions) {
        addGroups[a.tag] = addGroups[a.tag] || [];
        addGroups[a.tag].push(a.noteId);
    }
    if (allAdditions.length > 0) {
        console.log(`\nApplying canonical tags to ${allAdditions.length} notes...`);
        for (const [tag, nids] of Object.entries(addGroups)) {
            await callAnki('addTags', { notes: nids, tags: tag });
            console.log(`Added canonical tag "${tag}" to ${nids.length} notes`);
        }
    } else {
        console.log('\nAll notes already possess canonical tags.');
    }

    console.log('\nPurging unused tags from Anki database cache...');
    try {
        await callAnki('clearUnusedTags');
        console.log('Unused tags successfully purged.');
    } catch (err) {
        console.warn('Warning: clearUnusedTags failed or not supported:', err.message);
    }

    console.log('\n=== Tag Cleanup Completed Successfully ===');
    console.log('All notes across all 5 decks now strictly carry their canonical hierarchical tags.');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});
