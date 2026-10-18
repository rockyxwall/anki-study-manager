import path from 'path';

export default {
    key: 'language',
    name: 'Language (English Vocabulary)',
    rootDeck: '[🗣️] Language::[🔠] English',
    searchQuery: 'deck:"[🗣️] Language::[🔠] English"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'language_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'language_classification.json'),

    classify(card, note) {
        return {
            chapter: 'lang::eng::word',
            role: 'mining',
            roleTag: 'lang::eng::word::mining',
            action: 'ACTIVATE'
        };
    }
};

