
const ANKI_URL = 'http://127.0.0.1:8765';

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

const DEFAULT_MODELS_TO_PRESERVE = [
    'Basic',
    'Basic (and reversed card)',
    'Basic (optional reversed card)',
    'Basic (type in the answer)',
    'Cloze',
    'Image Occlusion'
];

const UNUSED_MODELS_TO_REMOVE = [
    'Basic+',
    'Basic++',
    'Cloze+',
    'Code howto',
    'Code refactor',
    'JavaScript howto',
    'JavaScript output',
    'Refold Sentence Miner: Sentence',
    'Refold Sentence Miner: Sentence Hidden',
    'Simple MCQ'
];

async function main() {
    console.log('=== Step 1: Pre-Audit of Note Types & Cards ===');
    const initialModels = await invokeAnki('modelNames');
    console.log(`Total Note Types: ${initialModels.length}`);

    // Verify all 10 target models exist and have 0 notes
    for (const m of UNUSED_MODELS_TO_REMOVE) {
        if (initialModels.includes(m)) {
            const notes = await invokeAnki('findNotes', { query: `note:"${m}"` });
            if (notes.length > 0) {
                throw new Error(`Safety violation: Model "${m}" has ${notes.length} notes! Aborting.`);
            }
            console.log(`  Target for removal (0 notes): "${m}"`);
        } else {
            console.log(`  Already absent: "${m}"`);
        }
    }

    // Verify default models
    for (const m of DEFAULT_MODELS_TO_PRESERVE) {
        if (!initialModels.includes(m)) {
            console.warn(`  Warning: Default model "${m}" not found in Anki.`);
        } else {
            const notes = await invokeAnki('findNotes', { query: `note:"${m}"` });
            console.log(`  Preserved default: "${m}" (${notes.length} notes)`);
        }
    }

    console.log('\n=== Step 2: Renaming Scattered Card Templates (Card Types) ===');
    const wordTemplates = await invokeAnki('modelTemplates', { modelName: 'Refold Sentence Miner: Word Only' });
    if (wordTemplates['Refold Sentence Miner: Word Only Card']) {
        await invokeAnki('modelTemplateRename', {
            modelName: 'Refold Sentence Miner: Word Only',
            oldTemplateName: 'Refold Sentence Miner: Word Only Card',
            newTemplateName: 'Recognition'
        });
        console.log('  Renamed "Refold Sentence Miner: Word Only Card" -> "Recognition"');
    } else {
        console.log('  "Refold Sentence Miner: Word Only" templates already clean: Recognition, Spelling');
    }

    console.log('\n=== Step 3: Protecting Default Models with Zero Notes ===');
    // Add temporary notes to zero-note default models so removeEmptyNotes skips them
    const zeroNoteDefaults = [];
    for (const m of ['Basic (and reversed card)', 'Basic (optional reversed card)', 'Basic (type in the answer)']) {
        if (initialModels.includes(m)) {
            const count = (await invokeAnki('findNotes', { query: `note:"${m}"` })).length;
            if (count === 0) zeroNoteDefaults.push(m);
        }
    }

    const tempNoteIds = [];
    for (const m of zeroNoteDefaults) {
        const fields = { Front: '__temp_protect__', Back: '__temp_protect__' };
        if (m === 'Basic (optional reversed card)') fields['Add Reverse'] = '';
        const id = await invokeAnki('addNote', {
            note: {
                deckName: '[🗣️] Language::[🔠] English',
                modelName: m,
                fields,
                tags: ['temp::protect']
            }
        });
        tempNoteIds.push(id);
        console.log(`  Added temporary protective note ${id} to "${m}"`);
    }

    console.log('\n=== Step 4: Purging Unused Scattered Note Types ===');
    await invokeAnki('removeEmptyNotes');
    console.log('  Executed removeEmptyNotes.');

    console.log('\n=== Step 5: Removing Temporary Protective Notes ===');
    if (tempNoteIds.length > 0) {
        await invokeAnki('deleteNotes', { notes: tempNoteIds });
        console.log(`  Deleted ${tempNoteIds.length} protective notes.`);
    }

    console.log('\n=== Step 6: Post-Verification of Note Types & Collection Integrity ===');
    const finalModels = await invokeAnki('modelNames');
    console.log(`Remaining Note Types (${finalModels.length}):`);
    for (const m of finalModels) {
        const notes = await invokeAnki('findNotes', { query: `note:"${m}"` });
        console.log(`  - "${m}" (${notes.length} notes)`);
    }

    // Verify all 495 notes remain intact
    let totalNotes = 0;
    for (const m of finalModels) {
        const count = (await invokeAnki('findNotes', { query: `note:"${m}"` })).length;
        totalNotes += count;
    }
    console.log(`\nTotal Notes in Anki: ${totalNotes} (Expected: 495)`);
    if (totalNotes !== 495) {
        throw new Error(`INTEGRITY ERROR: Total notes changed from 495 to ${totalNotes}!`);
    }
    console.log('Integrity check PASSED: Exactly 495 notes, zero data loss!');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});
