import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const ANKI_URL = 'http://127.0.0.1:8765';
const TARGET_DECK = '[🪟] iNCode::[🟣] Kotlin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'kotlin-course-cards.json');

async function invokeAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
}

async function main() {
    console.log('=== Step 1: Loading Flashcard Dataset ===');
    if (!fs.existsSync(DATA_FILE)) {
        throw new Error(`Data file not found at ${DATA_FILE}`);
    }
    const cards = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Loaded ${cards.length} cards from data/kotlin-course-cards.json`);

    console.log('\n=== Step 2: Ensure Target Subdeck Exists ===');
    await invokeAnki('createDeck', { deck: TARGET_DECK });
    console.log(`Verified subdeck "${TARGET_DECK}"`);

    console.log('\n=== Step 3: Duplicate Audit ===');
    const existingNoteIds = await invokeAnki('findNotes', { query: `deck:"${TARGET_DECK}"` });
    console.log(`Existing notes in "${TARGET_DECK}": ${existingNoteIds.length}`);

    let existingFronts = new Set();
    if (existingNoteIds.length > 0) {
        const notesInfo = await invokeAnki('notesInfo', { notes: existingNoteIds });
        for (const info of notesInfo) {
            if (info.fields?.Front?.value) {
                existingFronts.add(info.fields.Front.value.trim());
            }
        }
    }

    const newCards = cards.filter(c => !existingFronts.has(c.fields.Front.trim()));
    console.log(`Candidate cards: ${cards.length}`);
    console.log(`New cards to add: ${newCards.length} (${cards.length - newCards.length} already exist)`);

    if (newCards.length === 0) {
        console.log('All cards already imported. Exiting.');
        return;
    }

    console.log('\n=== Step 4: Batch Note Insertion ===');
    const addResults = await invokeAnki('addNotes', { notes: newCards });
    const successCount = addResults.filter(id => id !== null).length;
    console.log(`Successfully added ${successCount} notes to "${TARGET_DECK}"`);

    console.log('\n=== Step 5: Post-Verification ===');
    const finalNoteIds = await invokeAnki('findNotes', { query: `deck:"${TARGET_DECK}"` });
    console.log(`Total notes in "${TARGET_DECK}": ${finalNoteIds.length}`);
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});

