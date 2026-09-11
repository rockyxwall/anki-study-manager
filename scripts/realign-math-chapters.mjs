#!/usr/bin/env node

/**
 * Realign Higher Math notes to their authentic NCTB Class 11-12 syllabus chapters.
 * 
 * Realignments based on deep content analysis:
 * 1. Note 1763194618105: Chemistry note ("meq", Quantitative Chemistry) -> Move to Chemistry deck
 * 2. Notes 1762405702530, 1765002226115, 1765002254578, 1765002278030, 17650022307744:
 *    Angle measurement (radian, degree, circular, centesimal) -> math::p1::ch6::concept
 * 3. Notes 1778305927590 (circle equation) & 1778298054942 (circle chord):
 *    Circle content previously in Ch3 -> math::p1::ch4::concept & math::p1::ch4::problem
 * 4. Note 1762402200638:
 *    Cube roots of unity previously in Ch1 -> math::p2::ch3::concept
 * 5. Notes 1780321375405 (trinomial formula) & 1781548908851 (polygon area/perimeter):
 *    Algebra/geometry basics -> math::basics::concept
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
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

const REALIGNMENTS = [
    // 1. Ch6: Trigonometric Ratios & Angle Measurement
    { noteId: 1762405702530, oldTag: 'math::p1::ch3::concept', newTag: 'math::p1::ch6::concept', reason: 'Radian to degree conversion' },
    { noteId: 1765002226115, oldTag: 'math::p1::ch7::concept', newTag: 'math::p1::ch6::concept', reason: 'Sexagesimal angle measurement' },
    { noteId: 1765002254578, oldTag: 'math::p1::ch7::concept', newTag: 'math::p1::ch6::concept', reason: 'Circular system radian measurement' },
    { noteId: 1765002278030, oldTag: 'math::p1::ch7::concept', newTag: 'math::p1::ch6::concept', reason: 'Centesimal system grade measurement' },
    { noteId: 1765002307744, oldTag: 'math::p1::ch7::concept', newTag: 'math::p1::ch6::concept', reason: 'Angle units conversion D/90=G/100=2R/pi' },

    // 2. Ch4: Circles
    { noteId: 1778305927590, oldTag: 'math::p1::ch3::concept', newTag: 'math::p1::ch4::concept', reason: 'Circle standard equation x^2+y^2=r^2' },
    { noteId: 1778298054942, oldTag: 'math::p1::ch3::problem', newTag: 'math::p1::ch4::problem', reason: 'Length of circle chord problem' },

    // 3. Paper 2 Ch3: Complex Numbers
    { noteId: 1762402200638, oldTag: 'math::p1::ch1::concept', newTag: 'math::p2::ch3::concept', reason: 'Cube roots of unity identities' },

    // 4. Basics: Algebra & Polygon Geometry
    { noteId: 1780321375405, oldTag: 'math::p1::ch4::concept', newTag: 'math::basics::concept', reason: 'Trinomial square expansion (a+b+c)^2' },
    { noteId: 1781548908851, oldTag: 'math::p1::ch7::concept', newTag: 'math::basics::concept', reason: 'Polygon area and perimeter formulas' }
];

const CHEMISTRY_CARD_ID = 1763194618105;
const CHEMISTRY_DECK = '[🎓] Academic::6.[🧪] Chemistry::b.|🧪| 2nd Paper::3.|🧪| Quantitative Chemistry';

async function main() {
    if (!isDryRun && !isExecute) {
        console.log('Usage:');
        console.log('  node scripts/realign-math-chapters.mjs --dry-run');
        console.log('  node scripts/realign-math-chapters.mjs --execute');
        return;
    }

    console.log('=== NCTB Higher Math Chapter Realignment ===\n');

    console.log(`Found ${REALIGNMENTS.length} notes requiring chapter tag corrections:`);
    REALIGNMENTS.forEach(r => {
        console.log(`- Note ${r.noteId}: "${r.oldTag}" -> "${r.newTag}" (${r.reason})`);
    });

    console.log(`\nFound 1 Chemistry note in Math deck: Note ${CHEMISTRY_CARD_ID} ("meq", Quantitative Chemistry)`);
    console.log(`  Target Deck: "${CHEMISTRY_DECK}"`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki. Run with --execute to apply.');
        return;
    }

    // 1. Move Chemistry note
    console.log(`\nMoving Note ${CHEMISTRY_CARD_ID} to Chemistry deck...`);
    await callAnki('changeDeck', { cards: [CHEMISTRY_CARD_ID], deck: CHEMISTRY_DECK });
    await callAnki('removeTags', { notes: [CHEMISTRY_CARD_ID], tags: 'math::p1::ch1::concept' });
    console.log('  Chemistry card moved and math tag stripped.');

    // 2. Apply new tags
    console.log('\nApplying updated canonical chapter tags...');
    for (const r of REALIGNMENTS) {
        await callAnki('addTags', { notes: [r.noteId], tags: r.newTag });
        await callAnki('removeTags', { notes: [r.noteId], tags: r.oldTag });
        console.log(`  Updated Note ${r.noteId}: ${r.oldTag} -> ${r.newTag}`);
    }

    console.log('\n=== Chapter Realignment Successfully Applied ===');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

