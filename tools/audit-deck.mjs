#!/usr/bin/env node

/**
 * Unified Deck Inspection & Tag Audit Tool.
 * 
 * Usage:
 *   node tools/audit-deck.mjs --deck "Higher Math" --inspect
 *   node tools/audit-deck.mjs --query "deck:*ICT* tag:*mcq*" --inspect
 *   node tools/audit-deck.mjs --deck "Higher Math" --dump data/math_dump.json
 *   node tools/audit-deck.mjs --audit-math
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';

const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const isInspect = hasFlag('--inspect');
const isAuditMath = hasFlag('--audit-math');
const dumpPath = getArg('--dump');
const deckArg = getArg('--deck');
const queryArg = getArg('--query');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : 50;

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

async function auditMathCurriculum() {
    console.log('=== Auditing Math Curriculum Tags ===');
    const noteIds = await callAnki('findNotes', { query: 'deck:"*Higher Math*"' });
    const notes = await callAnki('notesInfo', { notes: noteIds });

    const issues = [];
    notes.forEach((n) => {
        const fieldTexts = Object.entries(n.fields).map(([k, v]) => `${k}: ${v.value}`).join(' | ');
        const cleanText = fieldTexts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const tLower = cleanText.toLowerCase();
        const curr = n.tags[0] || 'NONE';

        let suggested = null;
        let reason = '';

        if (curr.startsWith('math::p1::ch4')) {
            if (tLower.includes('বীজগণিত সূত্র') || tLower.includes('algebraic expansion of trinomial') || tLower.includes('(a + b + c)^2')) {
                suggested = 'math::basics::concept';
                reason = 'Trinomial square expansion is basic algebra, not circle.';
            }
        }
        if (curr.startsWith('math::p1::ch3')) {
            if (tLower.includes('বৃত্তের জ্যা') || tLower.includes('length of circle chord') || (tLower.includes('chord length') && tLower.includes('radius'))) {
                suggested = 'math::p1::ch4::problem';
                reason = 'Circle chord length problem belongs to Ch4 (Circle), not Ch3 (Straight line).';
            }
        }
        if (curr.startsWith('math::p1::ch7') || curr.startsWith('math::p1::ch6') || curr.startsWith('math::p2::ch7')) {
            if (tLower.includes('circular system') || tLower.includes('centesimal') || tLower.includes('radian') || tLower.includes('angle measurement') || tLower.includes('ষাটমূলক') || tLower.includes('বৃত্তীয়')) {
                suggested = curr.includes('problem') ? 'math::p1::ch6::problem' : 'math::p1::ch6::concept';
                reason = 'Angle measurement belongs to Ch6, not Ch7.';
            }
            if (tLower.includes('inverse') && (tLower.includes('sin^{-1}') || tLower.includes('tan^{-1}'))) {
                suggested = curr.includes('problem') ? 'math::p2::ch7::problem' : 'math::p2::ch7::concept';
                reason = 'Inverse trig belongs to Paper 2 Ch7.';
            }
        }
        if (tLower.includes('parabola') || tLower.includes('ellipse') || tLower.includes('hyperbola') || tLower.includes('পরাবৃত্ত') || tLower.includes('উপবৃত্ত')) {
            if (!curr.startsWith('math::p2::ch6')) {
                suggested = curr.includes('problem') ? 'math::p2::ch6::problem' : 'math::p2::ch6::concept';
                reason = 'Conics belong to Paper 2 Ch6.';
            }
        }

        if (suggested && suggested !== curr) {
            issues.push({ id: n.noteId, current: curr, suggested, reason, header: n.fields?.Header?.value || '' });
        }
    });

    console.log(`Found ${issues.length} potential curriculum mismatches.`);
    issues.forEach(iss => {
        console.log(`- Note ${iss.id}: [${iss.current}] -> [${iss.suggested}]`);
        console.log(`  Header: ${iss.header}`);
        console.log(`  Reason: ${iss.reason}`);
    });
}

async function main() {
    if (isAuditMath) {
        await auditMathCurriculum();
        return;
    }

    let query = queryArg;
    if (!query && deckArg) {
        query = `deck:"*${deckArg}*"`;
    }

    if (!query) {
        console.log('Usage:');
        console.log('  node tools/audit-deck.mjs --deck <name> --inspect');
        console.log('  node tools/audit-deck.mjs --query <query> --inspect');
        console.log('  node tools/audit-deck.mjs --deck <name> --dump <file.json>');
        console.log('  node tools/audit-deck.mjs --audit-math');
        return;
    }

    console.log(`Querying Anki with: ${query}`);
    const noteIds = await callAnki('findNotes', { query });
    console.log(`Found ${noteIds.length} notes.`);

    if (noteIds.length === 0) return;

    const notes = await callAnki('notesInfo', { notes: noteIds });

    if (dumpPath) {
        const cleanNotes = notes.map(n => {
            const fieldTexts = Object.entries(n.fields).map(([k, v]) => `${k}: ${v.value}`).join(' | ');
            const cleanText = fieldTexts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return {
                id: n.noteId,
                tags: n.tags,
                model: n.modelName,
                header: n.fields?.Header?.value || n.fields?.Front?.value || '',
                cleanText
            };
        });

        const fullPath = path.resolve(process.cwd(), dumpPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, JSON.stringify(cleanNotes, null, 2), 'utf8');
        console.log(`Dumped ${cleanNotes.length} notes to ${fullPath}`);
    }

    if (isInspect) {
        console.log(`\n=== Sample Notes (showing up to ${limit}) ===`);
        notes.slice(0, limit).forEach((n, idx) => {
            const header = n.fields?.Header?.value || n.fields?.Front?.value || '';
            const comments = n.fields?.Comments?.value || n.fields?.Back?.value || '';
            console.log(`[${idx + 1}] Note ${n.noteId} | Tags: [${n.tags.join(', ')}]`);
            if (header) console.log(`    Header:   ${header.substring(0, 80)}`);
            if (comments) console.log(`    Comments: ${comments.replace(/<[^>]+>/g, ' ').substring(0, 100)}`);
        });
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

