import fs from 'fs';

const notes = JSON.parse(fs.readFileSync('data/ict_notes_audit_dump.json', 'utf8'));
const mcqs = notes.filter(n => n.tags[0].includes('mcq'));

console.log(`=== AUDITING ALL ${mcqs.length} ICT MCQ NOTES ===\n`);

mcqs.forEach(m => {
    console.log(`[${m.id}] ${m.tags[0]}`);
    console.log(`  Header:   ${m.header}`);
    console.log(`  Comments: ${m.comments}`);
    console.log('');
});

