import path from 'path';

export default {
    key: 'physics',
    name: 'Physics',
    rootDeck: '[🎓] Academic::5.[⚡] Physics',
    searchQuery: 'deck:"*Physics*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'physics_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'physics_classification.json'),

    classify(card, note) {
        const deckName = card.deckName;
        const tags = (note.tags || []).map(t => t.toLowerCase());
        const header = (note.fields?.Header?.value || note.fields?.Front?.value || '').toLowerCase();
        const comments = (note.fields?.Comments?.value || note.fields?.Back?.value || '').toLowerCase();
        const text = `${deckName} ${header} ${comments} ${tags.join(' ')}`.toLowerCase();

        // 1. Creative Questions (CQ) in Dynamics -> SUSPENDED
        if (deckName.includes('3::cq') || text.includes('গাণিতিক সমস্যা') || text.includes('projectile and wall') || (text.includes('cq') && deckName.includes('3'))) {
            return {
                chapter: 'physics::p1::ch3',
                role: 'problem',
                roleTag: 'physics::p1::ch3::cq::problem',
                action: 'SUSPEND'
            };
        }

        // 2. MCQ Deck handling
        if (deckName.includes('mcq') || tags.includes('mcq') || text.includes('বহুনির্বাচনী') || text.includes('বহুনির্বাচনি') || text.includes('mcqs') || text.includes('mcq')) {
            if (text.includes('স্থির তড়িৎ') || text.includes('electrostatics') || text.includes('তড়িৎপ্রবাহ') || text.includes('current-electricity')) {
                return {
                    chapter: 'physics::p2::ch2',
                    role: 'mcq',
                    roleTag: 'physics::p2::ch2::mcq',
                    action: 'ACTIVATE'
                };
            }
            if (text.includes('পরিমাপ') || text.includes('একক') || text.includes('measurement') || text.includes('errors')) {
                return {
                    chapter: 'physics::p1::ch1',
                    role: 'mcq',
                    roleTag: 'physics::p1::ch1::mcq',
                    action: 'ACTIVATE'
                };
            }
            if (text.includes('ভেক্টর') || text.includes('vector') || text.includes('cross-product')) {
                return {
                    chapter: 'physics::p1::ch2',
                    role: 'mcq',
                    roleTag: 'physics::p1::ch2::mcq',
                    action: 'ACTIVATE'
                };
            }
            if (text.includes('dynamics') || text.includes('kinematics') || text.includes('প্রাস') || text.includes('projectile')) {
                return {
                    chapter: 'physics::p1::ch3',
                    role: 'mcq',
                    roleTag: 'physics::p1::ch3::mcq',
                    action: 'ACTIVATE'
                };
            }
            if (text.includes('rotational') || text.includes('newtonian') || text.includes('বলবিদ্যা')) {
                return {
                    chapter: 'physics::p1::ch4',
                    role: 'mcq',
                    roleTag: 'physics::p1::ch4::mcq',
                    action: 'ACTIVATE'
                };
            }
            return {
                chapter: 'physics::p1::ch1',
                role: 'mcq',
                roleTag: 'physics::p1::ch1::mcq',
                action: 'ACTIVATE'
            };
        }

        // 3. Chapter 3 Formulas
        if (deckName.includes('3::formulas') || text.includes('গতির সমীকরণ') || text.includes('পরন্ত বস্তু') || text.includes('লেখচিত্র')) {
            return {
                chapter: 'physics::p1::ch3',
                role: 'concept',
                roleTag: 'physics::p1::ch3::concept',
                action: 'ACTIVATE'
            };
        }

        // 4. Chapter 4 Newtonian Mechanics
        if (deckName.includes('4::1') || deckName.includes('4::2') || text.includes('newtonian') || text.includes('banking') || text.includes('torque') || text.includes('momentum') || text.includes('ঘর্ষণ')) {
            if (text.includes('অনুধাবন') || text.includes('কেন') || text.includes('ব্যাখ্যা')) {
                return {
                    chapter: 'physics::p1::ch4',
                    role: 'cq::kh',
                    roleTag: 'physics::p1::ch4::cq::kh',
                    action: 'ACTIVATE'
                };
            }
            if (text.includes('জ্ঞানমূলক') || text.includes('সংজ্ঞা') || text.includes('কাকে বলে')) {
                return {
                    chapter: 'physics::p1::ch4',
                    role: 'cq::k',
                    roleTag: 'physics::p1::ch4::cq::k',
                    action: 'ACTIVATE'
                };
            }
            return {
                chapter: 'physics::p1::ch4',
                role: 'concept',
                roleTag: 'physics::p1::ch4::concept',
                action: 'ACTIVATE'
            };
        }

        // 5. Chapter 2 Vectors & A-B Questions
        if (deckName.includes('vector') || text.includes('vector') || text.includes('ভেক্টর')) {
            if (header.startsWith('ক.') || text.includes('জ্ঞানমূলক') || text.includes('কাকে বলে') || header.includes('সংজ্ঞা (definition)')) {
                return {
                    chapter: 'physics::p1::ch2',
                    role: 'cq::k',
                    roleTag: 'physics::p1::ch2::cq::k',
                    action: 'ACTIVATE'
                };
            }
            if (header.startsWith('খ.') || text.includes('অনুধাবন') || text.includes('ব্যাখ্যা') || text.includes('কেন')) {
                return {
                    chapter: 'physics::p1::ch2',
                    role: 'cq::kh',
                    roleTag: 'physics::p1::ch2::cq::kh',
                    action: 'ACTIVATE'
                };
            }
            return {
                chapter: 'physics::p1::ch2',
                role: 'concept',
                roleTag: 'physics::p1::ch2::concept',
                action: 'ACTIVATE'
            };
        }

        // 6. Chapter 1 Physical World / Intro
        return {
            chapter: 'physics::p1::ch1',
            role: 'concept',
            roleTag: 'physics::p1::ch1::concept',
            action: 'ACTIVATE'
        };
    }
};

