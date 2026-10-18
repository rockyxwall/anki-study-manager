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

    const report = notes.map(n => {
        const header = (n.fields?.Header?.value || n.fields?.Front?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const comments = (n.fields?.Comments?.value || n.fields?.Back?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return {
            id: n.noteId,
            tags: n.tags,
            header,
            comments
        };
    });

    // Write full json report
    fs.writeFileSync('data/math_notes_audit_dump.json', JSON.stringify(report, null, 2), 'utf8');
    console.log(`Wrote ${report.length} notes to data/math_notes_audit_dump.json`);

    // Group by current tag
    const grouped = {};
    report.forEach(r => {
        const t = r.tags[0] || 'NONE';
        grouped[t] = grouped[t] || [];
        grouped[t].push(r);
    });

    for (const [tag, items] of Object.entries(grouped)) {
        console.log(`\n=== ${tag} (${items.length} notes) ===`);
        items.slice(0, 10).forEach(it => {
            console.log(`[${it.id}] H: "${it.header.slice(0, 60)}" | C: "${it.comments.slice(0, 80)}"`);
        });
        if (items.length > 10) {
            console.log(`... and ${items.length - 10} more`);
        }
    }
}

run().catch(console.error);

