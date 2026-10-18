import path from 'path';

export default {
    key: 'bangla',
    name: 'Bangla',
    rootDeck: '[🎓] Academic::3.[📙] Bangla',
    searchQuery: 'deck:"*Bangla*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'bangla_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'bangla_classification.json'),

    classify(card, note) {
        const deckName = card.deckName;
        const tags = (note.tags || []).map(t => t.toLowerCase());
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
        const text = `${deckName} ${header} ${comments} ${tags.join(' ')}`.toLowerCase();

        // 1. Check Subdeck / Stimulus hints
        if (deckName.includes('3-mark') || header.includes('উদ্দীপক') || text.includes('উদ্দীপক তুলনা') || text.includes('3-mark')) {
            return {
                chapter: 'bangla::p1::sahapath::lalsalu',
                role: 'problem',
                roleTag: 'bangla::p1::sahapath::lalsalu::cq::problem',
                action: 'SUSPEND'
            };
        }

        if (deckName.includes('1-mark') || header.includes('জ্ঞানমূলক') || header.includes('1-mark') || text.includes('1-mark')) {
            return {
                chapter: 'bangla::p1::sahapath::lalsalu',
                role: 'cq::k',
                roleTag: 'bangla::p1::sahapath::lalsalu::cq::k',
                action: 'ACTIVATE'
            };
        }

        if (deckName.includes('2-mark') || header.includes('অনুধাবন') || header.includes('2-mark') || text.includes('2-mark')) {
            return {
                chapter: 'bangla::p1::sahapath::lalsalu',
                role: 'cq::kh',
                roleTag: 'bangla::p1::sahapath::lalsalu::cq::kh',
                action: 'ACTIVATE'
            };
        }

        // 2. Identify Topic
        let topicTag = 'bangla::p1::sahapath::lalsalu';
        if (deckName.includes('মেঘনাদ') || text.includes('মেঘনাদ') || text.includes('বিভীষণ') || text.includes('মধুসূদন') || text.includes('meghnad')) {
            topicTag = 'bangla::p1::kavita::meghnad';
        } else if (deckName.includes('বিলাসী') || text.includes('বিলাসী') || text.includes('মৃত্যুঞ্জয়') || text.includes('শরৎচন্দ্র') || text.includes('bilashi') || text.includes('bilasi') || text.includes('অভাগীর স্বর্গ')) {
            topicTag = 'bangla::p1::gaddya::bilashi';
        } else if (deckName.includes('মাসি পিসি') || text.includes('মাসি-পিসি') || text.includes('মাসি পিসি') || text.includes('আহ্লাদী') || text.includes('masi-pisi') || text.includes('মানিক')) {
            topicTag = 'bangla::p1::gaddya::masi-pisi';
        } else if (deckName.includes('অপরিচিতা') || text.includes('অপরিচিতা') || text.includes('অনুপম') || text.includes('aparichita')) {
            topicTag = 'bangla::p1::gaddya::aparichita';
        } else if (deckName.includes('লালসালু') || text.includes('লালসালু') || text.includes('মজিদ') || text.includes('lalsalu') || text.includes('lalshalu')) {
            topicTag = 'bangla::p1::sahapath::lalsalu';
        }

        // 3. Identify Role
        let role = 'concept';
        if (tags.includes('mcq') || text.includes('mcq') || text.includes('বহুনির্বাচনি') || text.includes('বহুনির্বাচনী')) {
            role = 'mcq';
        }

        return {
            chapter: topicTag,
            role,
            roleTag: `${topicTag}::${role}`,
            action: role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
        };
    }
};

