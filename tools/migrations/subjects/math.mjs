import path from 'path';

export default {
    key: 'math',
    name: 'Higher Math',
    rootDeck: '[🎓] Academic::7.[📊] Higher Math',
    searchQuery: 'deck:"*Higher Math*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'math_classification.json'),

    priorityTags: [
        'math::basics::concept',
        'math::p1::ch1::concept',
        'math::p1::ch2::concept',
        'math::p1::ch3::concept',
        'math::p1::ch4::concept',
        'math::p1::ch5::concept',
        'math::p1::ch6::concept',
        'math::p1::ch7::concept',
        'math::p1::ch8::concept',
        'math::p1::ch9::concept',
        'math::p1::ch10::concept',
        'math::p2::ch3::concept',
        'math::p2::ch3::mcq'
    ],

    enforceDeckPreset: {
        newGatherPriority: 2, // Ascending position (fixed order)
        newSortOrder: 1       // Order gathered
    },

    determineChapter(deckName, existingTags) {
        const tagStr = existingTags.join(' ').toLowerCase();
        if (tagStr.includes('math::basics')) return 'math::basics';
        if (tagStr.includes('math::p2::ch3')) return 'math::p2::ch3';
        if (tagStr.includes('math::p1::ch9')) return 'math::p1::ch9';
        if (tagStr.includes('math::p1::ch7')) return 'math::p1::ch7';
        if (tagStr.includes('math::p1::ch6')) return 'math::p1::ch6';
        if (tagStr.includes('math::p1::ch4')) return 'math::p1::ch4';
        if (tagStr.includes('math::p1::ch3')) return 'math::p1::ch3';
        if (tagStr.includes('math::p1::ch2')) return 'math::p1::ch2';
        if (tagStr.includes('math::p1::ch1')) return 'math::p1::ch1';

        const d = deckName.toLowerCase();
        if (d.includes('matrix')) return 'math::p1::ch1';
        if (d.includes('straight lines')) return 'math::p1::ch3';
        if (d.includes('circle')) return 'math::p1::ch4';
        if (d.includes('trigonometry')) return 'math::p1::ch7';
        if (d.includes('dif')) return 'math::p1::ch9';

        return 'math::p1::ch1';
    },

    isProblemCard(note) {
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
        const tags = note.tags.join(' ').toLowerCase();
        const text = `${header} ${comments} ${tags}`;

        if (
            text.includes('প্রমাণ') ||
            text.includes('proof') ||
            text.includes('সমাধান') ||
            text.includes('solution') ||
            text.includes('construct') ||
            text.includes('given vertices') ||
            text.includes('problem') ||
            text.includes('evaluation of') ||
            text.includes('piecewise function continuity check') ||
            text.includes('prove discontinuity') ||
            text.includes('continuity problem')
        ) {
            if (header.includes('identity') || header.includes('formula') || header.includes('types') || header.includes('শর্ত')) {
                return false;
            }
            return true;
        }
        return false;
    },

    classify(card, note) {
        let roleTag = note.tags.find(t => t.startsWith('math::') && (t.endsWith('::concept') || t.endsWith('::problem') || t.endsWith('::mcq')));
        let role, chapter;
        if (roleTag) {
            const parts = roleTag.split('::');
            role = parts.pop();
            chapter = parts.join('::');
        } else {
            chapter = this.determineChapter(card.deckName, note.tags);
            const isProblem = this.isProblemCard(note);
            role = isProblem ? 'problem' : 'concept';
            roleTag = `${chapter}::${role}`;
        }
        const isProblem = role === 'problem';

        return {
            chapter,
            role,
            roleTag,
            action: isProblem ? 'SUSPEND' : 'ACTIVATE'
        };
    }
};

