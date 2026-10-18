import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const BACKUP_PATH = path.resolve(process.cwd(), 'data', 'deleted_compound_angle_notes_backup.json');

const NOTES_TO_DELETE = [
    1767547443263,
    1767547580656,
    1767547622455,
    1767547684741,
    1767547733508,
    1767547776993,
    1767547796280,
    1767547826286,
    1767547848008
];

const MASTER_NOTE_ID = 1778429606418;

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

async function main() {
    console.log('=== Option B: Removing Redundant Compound Angle Slide Notes ===');

    // 1. Fetch full details for safety backup
    const notesInfo = await callAnki('notesInfo', { notes: NOTES_TO_DELETE });
    const cardIds = notesInfo.flatMap(n => n.cards);
    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });

    const backupData = {
        timestamp: new Date().toISOString(),
        description: 'Backup of 9 redundant trigonometric compound angle lecture slide notes prior to deletion',
        masterNoteId: MASTER_NOTE_ID,
        notes: notesInfo,
        cards: cardsInfo
    };

    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`Saved safety backup of ${notesInfo.length} notes (${cardIds.length} cards) to ${BACKUP_PATH}`);

    // 2. Verify master note is alive
    const masterInfo = await callAnki('notesInfo', { notes: [MASTER_NOTE_ID] });
    if (!masterInfo || masterInfo.length === 0 || !masterInfo[0]) {
        throw new Error(`Master note ${MASTER_NOTE_ID} not found! Aborting deletion.`);
    }
    console.log(`Verified Master Note ${MASTER_NOTE_ID} (${masterInfo[0].fields.Header?.value}) is intact with ${masterInfo[0].cards.length} cards.`);

    // 3. Delete redundant notes
    console.log(`Deleting ${NOTES_TO_DELETE.length} redundant notes...`);
    await callAnki('deleteNotes', { notes: NOTES_TO_DELETE });
    console.log('Notes successfully deleted from Anki.');

    // 4. Verification
    const remaining = await callAnki('findNotes', { query: `nid:${NOTES_TO_DELETE.join(',')}` });
    console.log(`Verification: Remaining deleted notes in Anki = ${remaining.length} (expected 0).`);

    const masterCards = await callAnki('cardsInfo', { cards: masterInfo[0].cards });
    console.log(`Master note has ${masterCards.length} cards active.`);
}

main().catch(err => {
    console.error('[ERROR]:', err);
    process.exit(1);
});

