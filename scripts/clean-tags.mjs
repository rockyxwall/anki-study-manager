#!/usr/bin/env node

/**
 * Script to clean up and strip non-canonical / AI-describer loose tags from ICT and Math notes.
 * 
 * Rules:
 * - Every note in ICT retains exactly its canonical tag:
 *   ict::chX::concept, ict::chX::mcq, ict::chX::problem (or ict::ch3::3.X::*)
 * - Every note in Higher Math retains exactly its canonical tag:
 *   math::basics::*, math::p1::chX::*, math::p2::ch3::*
 * - All AI-describer loose tags (Physics, Networking, Matrix, Coordinate-Geometry, etc.)
 *   and legacy flat tags (ict, math, ict::ch1, math-bengali, etc.) are removed.
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

const groundTruthTags = new Map();

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
    // ICT realignments (NCTB Ch1 Global Village & Data vs Ch2)
    1766560301106: 'ict::ch1::concept',
    1766385402749: 'ict::ch1::concept'
};
for (const [nid, tag] of Object.entries(CURRICULUM_REALIGNMENTS)) {
    groundTruthTags.set(parseInt(nid, 10), tag);
}

function getIctCanonicalTag(note) {
    if (groundTruthTags.has(note.noteId)) {
        return groundTruthTags.get(note.noteId);
    }
    const tagStr = note.tags.join(' ').toLowerCase();
    const isMcq = note.tags.some(t => t.toLowerCase().includes('mcq'));
    const role = isMcq ? 'mcq' : 'concept';

    if (tagStr.includes('ict::ch3::3.1')) return `ict::ch3::3.1::${role}`;
    if (tagStr.includes('ict::ch3::3.2')) return `ict::ch3::3.2::${role}`;
    if (tagStr.includes('ict::ch1')) return `ict::ch1::${role}`;
    if (tagStr.includes('ict::ch2')) return `ict::ch2::${role}`;
    if (tagStr.includes('ict::ch4')) return `ict::ch4::${role}`;
    if (tagStr.includes('ict::ch5')) return `ict::ch5::${role}`;
    if (tagStr.includes('ict::ch6')) return `ict::ch6::${role}`;

    return `ict::ch1::${role}`;
}

function getMathCanonicalTag(note) {
    if (groundTruthTags.has(note.noteId)) {
        return groundTruthTags.get(note.noteId);
    }
    const tags = note.tags;
    const tagStr = tags.join(' ').toLowerCase();
    const isProblem = tags.some(t => t.includes('::problem'));
    const isMcq = tags.some(t => t.includes('::mcq'));
    const role = isProblem ? 'problem' : (isMcq ? 'mcq' : 'concept');

    if (tags.some(t => t.startsWith('math::p2::ch3')) || tagStr.includes('complex') || tagStr.includes('omega') || tagStr.includes('imaginary')) {
        return `math::p2::ch3::${role}`;
    }
    if (tags.some(t => t.startsWith('math::basics')) && !tags.some(t => t.startsWith('math::p1::ch3'))) {
        return `math::basics::${role}`;
    }
    if (tags.some(t => t.startsWith('math::p1::ch9')) || tagStr.includes('calculus') || tagStr.includes('limit') || tagStr.includes('অবিচ্ছিন্নতা') || tagStr.includes('অন্তরীকরণ')) {
        return `math::p1::ch9::${role}`;
    }
    if (tags.some(t => t.startsWith('math::p1::ch7')) || tagStr.includes('trigonometry') || tagStr.includes('ত্রিকোণমিতি') || tagStr.includes('compound-angles')) {
        return `math::p1::ch7::${role}`;
    }
    if (tags.some(t => t.startsWith('math::p1::ch4')) || tagStr.includes('circle') || tagStr.includes('বৃত্ত')) {
        return `math::p1::ch4::${role}`;
    }
    if (tags.some(t => t.startsWith('math::p1::ch3')) || tagStr.includes('coordinate-geometry') || tagStr.includes('straight-lines') || tagStr.includes('locus') || tagStr.includes('স্থানাঙ্ক-জ্যামিতি') || tagStr.includes('সঞ্চারপথ')) {
        return `math::p1::ch3::${role}`;
    }
    if (tags.some(t => t.startsWith('math::p1::ch2')) || tagStr.includes('vector')) {
        return `math::p1::ch2::${role}`;
    }

    return `math::p1::ch1::${role}`;
}

async function cleanDeck(deckQuery, getCanonicalTagFn) {
    const res = await callAnki('findNotes', { query: `deck:"${deckQuery}"` });
    const notes = await callAnki('notesInfo', { notes: res });

    const removals = [];
    const additions = [];

    for (const n of notes) {
        const canonical = getCanonicalTagFn(n);
        const tagsToRemove = n.tags.filter(t => t !== canonical);

        if (!n.tags.includes(canonical)) {
            additions.push({ noteId: n.noteId, tag: canonical });
        }
        if (tagsToRemove.length > 0) {
            removals.push({ noteId: n.noteId, remove: tagsToRemove, canonical });
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

    console.log('=== Cleaning Tags in ICT & Higher Math Decks ===\n');

    const ict = await cleanDeck('[🎓] Academic::2.[💻] ICT', getIctCanonicalTag);
    const math = await cleanDeck('[🎓] Academic::7.[📊] Higher Math', getMathCanonicalTag);

    console.log(`[ICT] Total Notes: ${ict.totalNotes} | Notes with redundant tags to strip: ${ict.removals.length}`);
    console.log(`[Math] Total Notes: ${math.totalNotes} | Notes with redundant tags to strip: ${math.removals.length}`);

    // Sample preview
    console.log('\n--- Sample ICT Cleanup Preview ---');
    ict.removals.slice(0, 3).forEach(r => {
        console.log(`Note ${r.noteId}: Keep "${r.canonical}", Remove [${r.remove.slice(0, 6).join(', ')}... (${r.remove.length} tags)]`);
    });

    console.log('\n--- Sample Math Cleanup Preview ---');
    math.removals.slice(0, 3).forEach(r => {
        console.log(`Note ${r.noteId}: Keep "${r.canonical}", Remove [${r.remove.slice(0, 6).join(', ')}... (${r.remove.length} tags)]`);
    });

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki. Run with --execute to apply.');
        return;
    }

    // Save backup before cleaning
    console.log(`\nSaving safety backup to ${BACKUP_PATH}...`);
    const allNotes = [...ict.notes, ...math.notes];
    fs.writeFileSync(BACKUP_PATH, JSON.stringify({
        timestamp: new Date().toISOString(),
        notes: allNotes.map(n => ({ noteId: n.noteId, tags: n.tags }))
    }, null, 2), 'utf8');

    // Apply additions first (ensure canonical tag exists)
    const allAdditions = [...ict.additions, ...math.additions];
    const addGroups = {};
    for (const a of allAdditions) {
        addGroups[a.tag] = addGroups[a.tag] || [];
        addGroups[a.tag].push(a.noteId);
    }
    for (const [tag, nids] of Object.entries(addGroups)) {
        await callAnki('addTags', { notes: nids, tags: tag });
        console.log(`Added canonical tag "${tag}" to ${nids.length} notes`);
    }

    // Apply removals
    const allRemovals = [...ict.removals, ...math.removals];
    // Group notes by tag to remove
    const removeTagMap = {};
    for (const r of allRemovals) {
        for (const t of r.remove) {
            removeTagMap[t] = removeTagMap[t] || [];
            removeTagMap[t].push(r.noteId);
        }
    }

    console.log(`\nStripping ${Object.keys(removeTagMap).length} unique non-canonical tags...`);
    for (const [tag, nids] of Object.entries(removeTagMap)) {
        await callAnki('removeTags', { notes: nids, tags: tag });
    }

    console.log('\n=== Tag Cleanup Completed Successfully ===');
    console.log('All notes in ICT and Higher Math now strictly carry their single canonical taxonomy tag.');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});
