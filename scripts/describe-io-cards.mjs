#!/usr/bin/env node

/**
 * Batch Image Occlusion describer using Gemini Multimodal Vision and AnkiConnect.
 * Zero extra dependencies: uses native Node.js fetch.
 *
 * Usage:
 *   node scripts/describe-io-cards.mjs --api-key YOUR_KEY
 *   node scripts/describe-io-cards.mjs --limit 5 --dry-run
 *   node scripts/describe-io-cards.mjs --deck "Academic::Physics"
 *   node scripts/describe-io-cards.mjs --fast
 *   node scripts/describe-io-cards.mjs --force
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
        return args[idx + 1];
    }
    return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isFast = hasFlag('--fast');
const isForce = hasFlag('--force');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;
const deckFilter = getArg('--deck');
const modelName = getArg('--model', 'gemini-3.1-flash-lite');

// Resolve API Key
let apiKey = getArg('--api-key') || process.env.GEMINI_API_KEY;
if (!apiKey) {
    const candidatePaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', 'mcp-anki-connect', '.env')
    ];
    for (const envPath of candidatePaths) {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
            if (match) {
                apiKey = match[1];
                break;
            }
        }
    }
}

async function callAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    if (!res.ok) {
        throw new Error(`AnkiConnect HTTP error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) {
        throw new Error(`AnkiConnect error: ${data.error}`);
    }
    return data.result;
}

function extractImageFilename(html) {
    if (!html) return null;
    const match = html.match(/src=["']([^"']+)["']/i) || html.match(/src=([^>\s]+)/i);
    return match ? (match[1] || match[2]) : null;
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.webp':
            return 'image/webp';
        case '.gif':
            return 'image/gif';
        default:
            return 'image/jpeg';
    }
}

async function describeWithGemini(imageBase64, mimeType, key, retries = 3) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const systemPrompt = `You analyze flashcard images from Anki notes (especially physics, math, science in Bengali and English).
The image is from an Image Occlusion card where certain parts are occluded/tested.
Extract full meaning with high precision (transcribing Bengali script, formulas, and diagrams).

Output strictly valid JSON matching this structure:
{
  "header": "Clean 3-6 word topic title (Bengali + English if applicable, e.g. ভেক্টর রাশি (Vector Quantities))",
  "comments": "Terse technical description in caveman style. Full conceptual substance, zero fluff. Include: (1) Core concept/topic, (2) Formulas/identities in LaTeX ($...$), (3) Key Bengali/English definitions, (4) Likely occluded elements or testable facts."
}`;

    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType,
                            data: imageBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    header: { type: 'STRING' },
                    comments: { type: 'STRING' }
                },
                required: ['header', 'comments']
            },
            temperature: 0.2
        }
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (res.status === 503 || res.status === 429) {
                if (attempt < retries) {
                    process.stdout.write(`[retry ${attempt}/${retries} (code ${res.status})] `);
                    await sleep(3500 * attempt);
                    continue;
                }
            }

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Gemini API error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!candidate) {
                throw new Error('No text returned from Gemini API');
            }

            let parsed;
            try {
                parsed = JSON.parse(candidate);
            } catch {
                const cleaned = candidate.replace(/```json\s*|```/g, '').trim();
                try {
                    parsed = JSON.parse(cleaned);
                } catch {
                    const fixed = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
                    parsed = JSON.parse(fixed);
                }
            }
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (err) {
            if (attempt === retries) throw err;
            await sleep(2000 * attempt);
        }
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log('=== Anki Image Occlusion AI Describer ===');

    if (!apiKey) {
        console.error('\n[ERROR] Missing GEMINI_API_KEY.');
        console.error('Provide via flag or environment:');
        console.error('  node scripts/describe-io-cards.mjs --api-key "AIzaSy..."');
        console.error('  or set GEMINI_API_KEY in environment / .env\n');
        process.exit(1);
    }

    // 1. Verify AnkiConnect
    try {
        const version = await callAnki('version');
        console.log(`Connected to AnkiConnect (version ${version})`);
    } catch (e) {
        console.error(`\n[ERROR] Could not connect to AnkiConnect at ${ANKI_URL}: ${e.message}`);
        console.error('Make sure Anki is running with AnkiConnect enabled.\n');
        process.exit(1);
    }

    // 2. Query Notes
    let query = '(note:"Image Occlusion" OR note:"Image Occlusion Enhanced")';
    if (deckFilter) {
        query = `deck:"${deckFilter}" ${query}`;
    }

    console.log(`Searching notes with query: ${query}`);
    const noteIds = await callAnki('findNotes', { query });
    console.log(`Found ${noteIds.length} total Image Occlusion notes.`);

    if (noteIds.length === 0) {
        console.log('No notes found. Done.');
        return;
    }

    // 3. Inspect notes info in batches
    console.log('Fetching note fields...');
    const allNotes = [];
    const BATCH_SIZE = 100;
    for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
        const slice = noteIds.slice(i, i + BATCH_SIZE);
        const notes = await callAnki('notesInfo', { notes: slice });
        allNotes.push(...notes);
    }

    // 4. Filter for notes needing description
    const targets = allNotes.filter((n) => {
        const comments = n.fields?.Comments?.value?.trim() || '';
        if (isForce) return true;
        return comments.length === 0;
    });

    console.log(`Notes requiring description: ${targets.length} (Skipping ${allNotes.length - targets.length} already populated)`);

    const queue = targets.slice(0, limit);
    console.log(`Processing queue: ${queue.length} notes (limit: ${limit === Infinity ? 'all' : limit})\n`);

    let successCount = 0;
    let failCount = 0;

    for (let idx = 0; idx < queue.length; idx++) {
        const note = queue[idx];
        const noteId = note.noteId;
        const progress = `[${idx + 1}/${queue.length}] Note ${noteId}`;

        try {
            const imageHtml = note.fields?.Image?.value || '';
            const filename = extractImageFilename(imageHtml);

            if (!filename) {
                console.warn(`${progress}: Skipped (No image found in note)`);
                continue;
            }

            // Retrieve image base64
            const base64Data = await callAnki('retrieveMediaFile', { filename });
            if (!base64Data || typeof base64Data !== 'string') {
                console.warn(`${progress}: Skipped (Image media file "${filename}" not found in Anki)`);
                continue;
            }

            const mimeType = getMimeType(filename);

            // Call Gemini
            process.stdout.write(`${progress}: Calling Gemini for "${filename}"... `);
            const aiRes = await describeWithGemini(base64Data, mimeType, apiKey);

            const headerVal = note.fields?.Header?.value?.trim() || aiRes.header || '';
            const commentsVal = aiRes.comments || '';

            if (isDryRun) {
                console.log('\n  [DRY-RUN RESULT]');
                console.log(`  Header:   ${headerVal}`);
                console.log(`  Comments: ${commentsVal}`);
            } else {
                // Write to Anki
                const fields = { Comments: commentsVal };
                if (!note.fields?.Header?.value?.trim() && aiRes.header) {
                    fields.Header = aiRes.header;
                }

                await callAnki('updateNoteFields', {
                    note: {
                        id: noteId,
                        fields
                    }
                });
                console.log(`Done! -> "${aiRes.header}"`);
            }

            successCount++;

            // Rate-limit delay (Free tier: 15 RPM = ~4s delay per request)
            if (idx < queue.length - 1) {
                const delayMs = isFast ? 200 : 4100;
                await sleep(delayMs);
            }
        } catch (err) {
            failCount++;
            console.error(`\n  [ERROR] on Note ${noteId}: ${err.message}`);
            // If quota error, pause longer
            if (err.message.includes('429') || err.message.includes('Quota')) {
                console.warn('  Hit rate limit. Pausing 30s before resuming...');
                await sleep(30000);
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Total processed: ${queue.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});

