import fs from 'fs';

const ANKI_URL = 'http://127.0.0.1:8765';

async function callAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    const d = await res.json();
    return d.result;
}

async function run() {
    const deckNames = await callAnki('deckNames');
    const mathDeck = deckNames.find(d => d.includes('Higher Math'));
    const nids = await callAnki('findNotes', { query: `deck:"${mathDeck}"` });
    const notes = await callAnki('notesInfo', { notes: nids });

    const notesDetail = notes.map(n => {
        const fieldTexts = Object.entries(n.fields).map(([k, v]) => `${k}: ${v.value}`).join(' | ');
        const cleanText = fieldTexts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return {
            id: n.noteId,
            tags: n.tags,
            model: n.modelName,
            cleanText
        };
    });

    fs.writeFileSync('data/math_all_notes_clean.json', JSON.stringify(notesDetail, null, 2), 'utf8');
    console.log(`Saved ${notesDetail.length} notes details.`);
}

run().catch(console.error);

