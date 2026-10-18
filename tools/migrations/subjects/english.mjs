import path from 'path';

export default {
    key: 'english',
    name: 'English',
    rootDeck: '[🎓] Academic::4.[📕] English',
    searchQuery: 'deck:"*English*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'english_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'english_classification.json'),

    classify(card, note) {
        const deckName = card.deckName;
        const tags = (note.tags || []).map(t => t.toLowerCase());
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const text = (note.fields?.Text?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || note.fields?.Extra?.value || '').toLowerCase();
        const combined = `${deckName} ${header} ${text} ${comments} ${tags.join(' ')}`.toLowerCase();

        // 1. Right Form of Verbs (RFofV) -> practice exercise -> SUSPENDED
        if (deckName.includes('rfofv') || combined.includes('right forms of verbs') || combined.includes('right form of verbs') || combined.includes('rfofv')) {
            return {
                chapter: 'english::p2::grammar::rfov',
                role: 'problem',
                roleTag: 'english::p2::grammar::rfov::problem',
                action: 'SUSPEND'
            };
        }

        // 2. Narration -> Grammar Rules -> ACTIVE
        if (deckName.includes('narration') || combined.includes('narration') || combined.includes('direct-to-indirect')) {
            return {
                chapter: 'english::p2::grammar::narration',
                role: 'concept',
                roleTag: 'english::p2::grammar::narration::concept',
                action: 'ACTIVATE'
            };
        }

        // 3. Theme Writing -> EFT Poem Themes -> ACTIVE
        if (deckName.includes('theme writing') || combined.includes('theme') || combined.includes('poetry-analysis') || combined.includes('poem')) {
            return {
                chapter: 'english::p1::theme',
                role: 'concept',
                roleTag: 'english::p1::theme::concept',
                action: 'ACTIVATE'
            };
        }

        return {
            chapter: 'english::p1::general',
            role: 'concept',
            roleTag: 'english::p1::general::concept',
            action: 'ACTIVATE'
        };
    }
};

