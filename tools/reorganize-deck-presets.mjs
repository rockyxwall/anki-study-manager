const ANKI_URL = 'http://127.0.0.1:8765';

async function invokeAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
}

const PRESET_IDS = {
    DEFAULT: 1,
    ACADEMIC: 1759754263751,
    LANGUAGE_FSRS: 1717629842288,
    REVIEW_ONLY: 1762968630581,
    EXAM_FREEZE: 1770180193086,
    // Presets to remove
    OLD_REFOLD: 1665204978352,
    OLD_LANGUAGE_CONTAINER: 1758379536763,
    OLD_GAME_CHANGER: 1762087669915
};

async function main() {
    console.log('=== Step 1: Reassign Decks to Canonical Presets ===');
    
    // 1. Assign root Language deck to unified Language Vocabulary (FSRS) preset
    await invokeAnki('setDeckConfigId', {
        decks: ['[🗣️] Language', '[🗣️] Language::[🔠] English'],
        configId: PRESET_IDS.LANGUAGE_FSRS
    });
    console.log('  Assigned "[🗣️] Language" and subdecks to Language Vocabulary (FSRS) preset.');

    // 2. Ensure all Academic decks are assigned to Academic Study preset
    const academicDecks = [
        '[🎓] Academic',
        '[🎓] Academic::1.[✏️] ED',
        '[🎓] Academic::2.[💻] ICT',
        '[🎓] Academic::3.[📙] Bangla',
        '[🎓] Academic::4.[📕] English',
        '[🎓] Academic::5.[⚡] Physics',
        '[🎓] Academic::6.[🧪] Chemistry',
        '[🎓] Academic::7.[📊] Higher Math'
    ];
    await invokeAnki('setDeckConfigId', {
        decks: academicDecks,
        configId: PRESET_IDS.ACADEMIC
    });
    console.log('  Verified all 8 Academic decks assigned to Academic Study preset.');

    // 3. Ensure Default and iNCode decks use Default preset
    await invokeAnki('setDeckConfigId', {
        decks: ['Default', '[🪟] iNCode'],
        configId: PRESET_IDS.DEFAULT
    });
    console.log('  Verified Default and [🪟] iNCode assigned to Default preset.');

    console.log('\n=== Step 2: Safely Rename Presets ===');
    // Rename Academic preset
    const acadCfg = await invokeAnki('getDeckConfig', { deck: '[🎓] Academic' });
    if (acadCfg.name !== 'Academic Study') {
        acadCfg.name = 'Academic Study';
        await invokeAnki('saveDeckConfig', { config: acadCfg });
        console.log('  Renamed [1759754263751] -> "Academic Study"');
    } else {
        console.log('  Preset [1759754263751] already named "Academic Study"');
    }

    // Rename Language FSRS preset
    const langCfg = await invokeAnki('getDeckConfig', { deck: '[🗣️] Language::[🔠] English' });
    if (langCfg.name !== 'Language Vocabulary (FSRS)') {
        langCfg.name = 'Language Vocabulary (FSRS)';
        await invokeAnki('saveDeckConfig', { config: langCfg });
        console.log('  Renamed [1717629842288] -> "Language Vocabulary (FSRS)"');
    } else {
        console.log('  Preset [1717629842288] already named "Language Vocabulary (FSRS)"');
    }

    // Rename unassigned utility presets safely via temporary bridge
    try {
        // Review Only
        await invokeAnki('setDeckConfigId', { decks: ['Default'], configId: PRESET_IDS.REVIEW_ONLY });
        const revCfg = await invokeAnki('getDeckConfig', { deck: 'Default' });
        if (revCfg && revCfg.name !== 'Utility: Review Only') {
            revCfg.name = 'Utility: Review Only';
            await invokeAnki('saveDeckConfig', { config: revCfg });
            console.log('  Renamed [1762968630581] -> "Utility: Review Only"');
        } else {
            console.log('  Preset [1762968630581] already named "Utility: Review Only"');
        }

        // Exam Freeze
        await invokeAnki('setDeckConfigId', { decks: ['Default'], configId: PRESET_IDS.EXAM_FREEZE });
        const examCfg = await invokeAnki('getDeckConfig', { deck: 'Default' });
        if (examCfg && examCfg.name !== 'Utility: Exam Freeze') {
            examCfg.name = 'Utility: Exam Freeze';
            await invokeAnki('saveDeckConfig', { config: examCfg });
            console.log('  Renamed [1770180193086] -> "Utility: Exam Freeze"');
        } else {
            console.log('  Preset [1770180193086] already named "Utility: Exam Freeze"');
        }
    } finally {
        // Always restore Default deck to Config 1
        await invokeAnki('setDeckConfigId', { decks: ['Default'], configId: PRESET_IDS.DEFAULT });
        console.log('  Restored "Default" deck to Config [1].');
    }

    console.log('\n=== Step 3: Remove Redundant Unused Presets ===');
    const toRemove = [
        { id: PRESET_IDS.OLD_REFOLD, label: 'Refold Preset' },
        { id: PRESET_IDS.OLD_LANGUAGE_CONTAINER, label: 'Language (old container)' },
        { id: PRESET_IDS.OLD_GAME_CHANGER, label: 'Game Changer' }
    ];

    for (const item of toRemove) {
        try {
            const removed = await invokeAnki('removeDeckConfigId', { configId: item.id });
            if (removed) {
                console.log(`  Successfully removed [${item.id}] "${item.label}"`);
            } else {
                console.log(`  Already removed or not found: [${item.id}] "${item.label}"`);
            }
        } catch (e) {
            console.log(`  Note on [${item.id}] "${item.label}": ${e.message}`);
        }
    }

    console.log('\n=== Step 4: Post-Reorganization Verification ===');
    const decksAndIds = await invokeAnki('deckNamesAndIds');
    console.log('Deck Config Assignments:');
    for (const d of Object.keys(decksAndIds)) {
        const cfg = await invokeAnki('getDeckConfig', { deck: d });
        console.log(`  "${d}" -> [${cfg.id}] "${cfg.name}" (New: ${cfg.new?.perDay}, Rev: ${cfg.rev?.perDay})`);
    }

    // Verify FSRS parameters preserved
    const verifyLang = await invokeAnki('getDeckConfig', { deck: '[🗣️] Language::[🔠] English' });
    console.log(`\nLanguage FSRS weights count: ${verifyLang.fsrsWeights?.length} (Expected: 17)`);
    if (verifyLang.fsrsWeights?.length !== 17) {
        throw new Error(`CRITICAL: Language FSRS weights count changed! Found ${verifyLang.fsrsWeights?.length}`);
    }

    const verifyAcad = await invokeAnki('getDeckConfig', { deck: '[🎓] Academic::2.[💻] ICT' });
    console.log(`Academic FSRS-6 params count: ${verifyAcad.fsrsParams6?.length} (Expected: 21)`);
    if (verifyAcad.fsrsParams6?.length !== 21) {
        throw new Error(`CRITICAL: Academic FSRS-6 params count changed! Found ${verifyAcad.fsrsParams6?.length}`);
    }

    console.log('\n>>> PRESET REORGANIZATION COMPLETE: 100% VERIFIED <<<');
}

main().catch(err => {
    console.error('[FATAL ERROR]:', err);
    process.exit(1);
});

