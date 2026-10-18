import path from 'path';

export default {
    key: 'ict',
    name: 'ICT',
    rootDeck: '[🎓] Academic::2.[💻] ICT',
    searchQuery: 'deck:"*ICT*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'ict_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'ict_classification.json'),

    priorityTags: [
        'ict::ch1::concept',
        'ict::ch2::concept',
        'ict::ch3::3.1::concept',
        'ict::ch3::3.2::concept',
        'ict::ch4::concept',
        'ict::ch5::concept',
        'ict::ch6::concept',
        'ict::ch1::mcq',
        'ict::ch2::mcq',
        'ict::ch3::3.1::mcq',
        'ict::ch3::3.2::mcq',
        'ict::ch4::mcq',
        'ict::ch5::mcq',
        'ict::ch6::mcq'
    ],

    enforceDeckPreset: {
        newGatherPriority: 2,
        newSortOrder: 1
    },

    determineChapter(deckName, existingTags, noteText = '') {
        const tagStr = existingTags.join(' ').toLowerCase();

        if (tagStr.includes('ict::ch3::3.1')) return 'ict::ch3::3.1';
        if (tagStr.includes('ict::ch3::3.2') || tagStr.includes('ict::ch3::3.2-info')) return 'ict::ch3::3.2';
        if (tagStr.includes('ict::ch1')) return 'ict::ch1';
        if (tagStr.includes('ict::ch2')) return 'ict::ch2';
        if (tagStr.includes('ict::ch4')) return 'ict::ch4';
        if (tagStr.includes('ict::ch5')) return 'ict::ch5';
        if (tagStr.includes('ict::ch6')) return 'ict::ch6';

        const text = `${tagStr} ${noteText}`.toLowerCase();
        if (text.includes('সংখ্যা') || text.includes('number system') || text.includes('binary') || text.includes('octal') || text.includes('hexadecimal')) {
            return 'ict::ch3::3.1';
        }
        if (text.includes('logic-gates') || text.includes('boolean') || text.includes('গেট') || text.includes('লজিক') || text.includes('adder') || text.includes('flip-flop')) {
            return 'ict::ch3::3.2';
        }
        if (text.includes('network') || text.includes('bandwidth') || text.includes('communication') || text.includes('transmission') || text.includes('topology')) {
            return 'ict::ch2';
        }
        if (text.includes('html') || text.includes('web')) {
            return 'ict::ch4';
        }
        if (text.includes('programming') || text.includes('c-program') || text.includes('flowchart')) {
            return 'ict::ch5';
        }
        if (text.includes('database') || text.includes('dbms') || text.includes('sql')) {
            return 'ict::ch6';
        }

        return 'ict::ch1';
    },

    isMcqCard(note) {
        const tags = (note.tags || []).map(t => t.toLowerCase());
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
        const text = `${header} ${comments} ${tags.join(' ')}`;

        return (
            tags.some(t => t.includes('mcq')) ||
            text.includes('mcq') ||
            text.includes('board questions') ||
            text.includes('board-questions')
        );
    },

    isProblemCard(note) {
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
        const tags = note.tags.join(' ').toLowerCase();
        const text = `${header} ${comments} ${tags}`;

        if (
            text.includes('সমাধান কর') ||
            text.includes('write a c program') ||
            text.includes('প্রোগ্রাম লিখ') ||
            text.includes('truth table derivation') ||
            text.includes('2\'s complement subtraction calculation') ||
            text.includes('রূপান্তর কর')
        ) {
            if (
                header.includes('প্রকারভেদ') ||
                header.includes('types') ||
                header.includes('definition') ||
                header.includes('সংজ্ঞা') ||
                header.includes('law') ||
                header.includes('আইন') ||
                header.includes('gate') ||
                header.includes('ব্যান্ডউইথ') ||
                header.includes('উপপাদ্য') ||
                header.includes('ai') ||
                header.includes('বুদ্ধিমত্তা')
            ) {
                return false;
            }
            return true;
        }
        return false;
    },

    classify(card, note) {
        let roleTag = note.tags.find(t => t.startsWith('ict::') && (t.endsWith('::concept') || t.endsWith('::problem') || t.endsWith('::mcq')));
        let role, chapter;
        if (roleTag) {
            const parts = roleTag.split('::');
            role = parts.pop();
            chapter = parts.join('::');
        } else {
            const noteText = `${note.fields?.Header?.value || ''} ${note.fields?.Comments?.value || ''}`;
            chapter = this.determineChapter(card.deckName, note.tags, noteText);
            if (this.isProblemCard(note)) role = 'problem';
            else if (this.isMcqCard(note)) role = 'mcq';
            else role = 'concept';
            roleTag = `${chapter}::${role}`;
        }

        return {
            chapter,
            role,
            roleTag,
            action: role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
        };
    }
};

