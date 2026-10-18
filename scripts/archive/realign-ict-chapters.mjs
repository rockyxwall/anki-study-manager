#!/usr/bin/env node

/**
 * Realign ICT notes to their authentic NCTB Class 11-12 syllabus chapters.
 * 
 * Realignments based on deep content analysis:
 * 1. Note 1766560301106: "বিশ্বগ্রামের জনক (Father of Global Village - Marshall McLuhan)"
 *    Global Village is Chapter 1 Section 1.2 -> ict::ch1::concept (was erroneously ict::ch2::concept)
 * 2. Note 1766385402749: "উপাত্ত ও তথ্য (Data and Information)"
 *    Foundational concept of ICT is Chapter 1 Section 1.1 -> ict::ch1::concept (was erroneously ict::ch2::concept)
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
    {
        noteId: 1766560301106,
        oldTag: 'ict::ch2::concept',
        newTag: 'ict::ch1::concept',
        reason: 'Father of Global Village (Marshall McLuhan) is NCTB Ch1 Section 1.2'
    },
    {
        noteId: 1766385402749,
        oldTag: 'ict::ch2::concept',
        newTag: 'ict::ch1::concept',
        reason: 'Data and Information (উপাত্ত ও তথ্য) is NCTB Ch1 Section 1.1'
    }
];

async function main() {
    if (!isDryRun && !isExecute) {
        console.log('Usage:');
        console.log('  node scripts/realign-ict-chapters.mjs --dry-run');
        console.log('  node scripts/realign-ict-chapters.mjs --execute');
        return;
    }

    console.log('=== NCTB ICT Chapter Realignment ===\n');

    console.log(`Found ${REALIGNMENTS.length} notes requiring chapter tag corrections:`);
    REALIGNMENTS.forEach(r => {
        console.log(`- Note ${r.noteId}: "${r.oldTag}" -> "${r.newTag}" (${r.reason})`);
    });

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki. Run with --execute to apply.');
        return;
    }

    console.log('\nApplying updated canonical chapter tags...');
    for (const r of REALIGNMENTS) {
        await callAnki('addTags', { notes: [r.noteId], tags: r.newTag });
        await callAnki('removeTags', { notes: [r.noteId], tags: r.oldTag });
        console.log(`  Updated Note ${r.noteId}: ${r.oldTag} -> ${r.newTag}`);
    }

    console.log('\n=== ICT Chapter Realignment Successfully Applied ===');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

