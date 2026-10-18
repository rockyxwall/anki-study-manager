import path from 'path';

const KNOWN_NOTE_MAPPINGS = {
    1760019051987: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Electron & Valence Electron
    1760274821995: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Isotope/Isotone/Isobar
    1762625220515: { topicTag: 'chemistry::p1::ch2', role: 'cq::kh', canonicalTag: 'chemistry::p1::ch2::cq::kh' },     // Rutherford vs Bohr
    1762872201459: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Bohr model postulate
    1762950046202: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }, // Unit conversion (m to nm)
    1763194618105: { topicTag: 'chemistry::p1::ch4', role: 'concept', canonicalTag: 'chemistry::p1::ch4::concept' }, // Work and energy (Thermochemistry)
    1763351673699: { topicTag: 'chemistry::p2::ch3', role: 'problem', canonicalTag: 'chemistry::p2::ch3::problem' }, // Molarity calculation
    1765123024463: { topicTag: 'chemistry::p1::ch2', role: 'concept', canonicalTag: 'chemistry::p1::ch2::concept' }  // Quantum numbers
};

export default {
    key: 'chemistry',
    name: 'Chemistry',
    rootDeck: '[🎓] Academic::6.[🧪] Chemistry',
    searchQuery: 'deck:"*Chemistry*"',
    snapshotPath: path.resolve(process.cwd(), 'data', 'chemistry_pre_migration_state.json'),
    manifestPath: path.resolve(process.cwd(), 'data', 'chemistry_classification.json'),

    classify(card, note) {
        if (note.modelName === 'PeriodicTable-d75c0' || card.deckName.includes('Periodic Table Memory Pegs')) {
            return {
                chapter: 'chemistry::basics',
                role: 'peg',
                roleTag: 'chemistry::basics::peg',
                action: card.queue === 2 ? 'ACTIVATE' : 'SUSPEND'
            };
        }

        if (KNOWN_NOTE_MAPPINGS[note.noteId]) {
            const mapping = KNOWN_NOTE_MAPPINGS[note.noteId];
            return {
                chapter: mapping.topicTag,
                role: mapping.role,
                roleTag: mapping.canonicalTag,
                action: mapping.role === 'problem' ? 'SUSPEND' : 'ACTIVATE'
            };
        }

        return {
            chapter: 'chemistry::basics',
            role: 'concept',
            roleTag: 'chemistry::basics::concept',
            action: 'ACTIVATE'
        };
    }
};

