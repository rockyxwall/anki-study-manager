#!/usr/bin/env node

/**
 * Unified Anki Flat Deck & Tag Migration Engine.
 * 
 * Usage:
 *   node tools/migrate-deck.mjs --subject math --dry-run
 *   node tools/migrate-deck.mjs --subject ict --execute
 *   node tools/migrate-deck.mjs --subject physics --restore
 */

import fs from 'fs';
import path from 'path';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';
const AVAILABLE_SUBJECTS = ['math', 'ict', 'bangla', 'english', 'physics', 'chemistry', 'language'];

const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isExecute = hasFlag('--execute');
const isRestore = hasFlag('--restore');
const rawSubject = (getArg('--subject') || getArg('-s') || '').toLowerCase().trim();

// Normalize aliases
const SUBJECT_ALIASES = {
    'chem': 'chemistry',
    'lang': 'language',
    'higher-math': 'math',
    'highermath': 'math'
};
const subjectKey = SUBJECT_ALIASES[rawSubject] || rawSubject;

async function callAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    if (!res.ok) throw new Error(`Anki HTTP error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.error) throw new Error(`AnkiConnect error: ${data.error}`);
    return data.result;
}

function printUsage() {
    console.log('=== Anki Unified Migration Engine ===');
    console.log('Usage:');
    console.log('  node tools/migrate-deck.mjs --subject <subject> --dry-run');
    console.log('  node tools/migrate-deck.mjs --subject <subject> --execute');
    console.log('  node tools/migrate-deck.mjs --subject <subject> --restore\n');
    console.log('Available subjects:');
    for (const sub of AVAILABLE_SUBJECTS) {
        console.log(`  - ${sub}`);
    }
}

async function restore(config) {
    console.log(`=== Restoring Anki ${config.name} Deck from Snapshot ===`);
    if (!fs.existsSync(config.snapshotPath)) {
        console.error(`[ERROR] Snapshot not found at ${config.snapshotPath}`);
        process.exit(1);
    }

    const snapshot = JSON.parse(fs.readFileSync(config.snapshotPath, 'utf8'));
    console.log(`Loaded snapshot containing ${snapshot.cards.length} cards.`);

    const deckGroups = {};
    const suspendIds = [];
    const unsuspendIds = [];

    for (const c of snapshot.cards) {
        deckGroups[c.deckName] = deckGroups[c.deckName] || [];
        deckGroups[c.deckName].push(c.cardId);

        if (c.queue === -1) {
            suspendIds.push(c.cardId);
        } else {
            unsuspendIds.push(c.cardId);
        }
    }

    for (const [deck, cardIds] of Object.entries(deckGroups)) {
        console.log(`Moving ${cardIds.length} cards back to "${deck}"...`);
        await callAnki('changeDeck', { cards: cardIds, deck });
    }

    if (suspendIds.length > 0) await callAnki('suspend', { cards: suspendIds });
    if (unsuspendIds.length > 0) await callAnki('unsuspend', { cards: unsuspendIds });

    console.log(`Restore complete for ${config.name}.`);
}

async function main() {
    if (!subjectKey || !AVAILABLE_SUBJECTS.includes(subjectKey)) {
        printUsage();
        process.exit(subjectKey ? 1 : 0);
    }

    if (!isDryRun && !isExecute && !isRestore) {
        console.log(`Please specify an action for subject "${subjectKey}": --dry-run, --execute, or --restore.`);
        process.exit(1);
    }

    // Load subject module
    const modulePath = `./migrations/subjects/${subjectKey}.mjs`;
    let config;
    try {
        const mod = await import(modulePath);
        config = mod.default;
    } catch (e) {
        console.error(`Failed to load subject module "${modulePath}": ${e.message}`);
        process.exit(1);
    }

    if (isRestore) {
        await restore(config);
        return;
    }

    console.log(`=== Anki ${config.name} Flat Deck & Tag Migration ===`);

    // 1. Fetch cards and notes
    const cardIds = await callAnki('findCards', { query: config.searchQuery });
    console.log(`Found ${cardIds.length} cards matching query: ${config.searchQuery}`);

    if (cardIds.length === 0) {
        console.log(`No cards found. Done.`);
        return;
    }

    const cardsInfo = await callAnki('cardsInfo', { cards: cardIds });
    const noteIds = Array.from(new Set(cardsInfo.map(c => c.note)));
    console.log(`Found ${noteIds.length} unique notes.`);
    const notesInfo = await callAnki('notesInfo', { notes: noteIds });
    const noteMap = new Map(notesInfo.map(n => [n.noteId, n]));

    // 2. Classify each card & note
    const manifest = [];
    const tagUpdates = {};
    const suspendCardIds = [];
    const activateCardIds = [];

    for (const card of cardsInfo) {
        const note = noteMap.get(card.note);
        if (!note) continue;

        const classification = config.classify(card, note);
        const roleTag = classification.roleTag;
        const action = classification.action || 'ACTIVATE';

        if (action === 'SUSPEND') {
            suspendCardIds.push(card.cardId);
        } else {
            activateCardIds.push(card.cardId);
        }

        manifest.push({
            cardId: card.cardId,
            noteId: note.noteId,
            originalDeck: card.deckName,
            header: note.fields?.Header?.value || note.fields?.Front?.value?.substring(0, 60) || note.fields?.Word?.value || '',
            chapter: classification.chapter,
            role: classification.role,
            roleTag,
            currentQueue: card.queue,
            action
        });

        if (roleTag) {
            tagUpdates[roleTag] = tagUpdates[roleTag] || new Set();
            tagUpdates[roleTag].add(note.noteId);
        }
    }

    // Save manifest preview
    const dataDir = path.dirname(config.manifestPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(config.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${config.manifestPath}`);

    const suspendNotesCount = new Set(manifest.filter(m => m.action === 'SUSPEND').map(m => m.noteId)).size;
    const activeNotesCount = new Set(manifest.filter(m => m.action === 'ACTIVATE').map(m => m.noteId)).size;

    console.log('\n--- Classification Summary ---');
    console.log(`Total Notes:    ${noteIds.length}`);
    console.log(`Total Cards:    ${cardIds.length}`);
    console.log(`Active Notes:   ${activeNotesCount} (${activateCardIds.length} cards) -> ACTIVE`);
    console.log(`Suspend Notes:  ${suspendNotesCount} (${suspendCardIds.length} cards) -> SUSPENDED`);

    if (isDryRun) {
        console.log('\n[DRY RUN COMPLETE] No changes made to Anki.');
        console.log('Inspect manifest to verify, then run with --execute.');
        return;
    }

    // 3. Save pre-migration state snapshot (if not already existing)
    if (!fs.existsSync(config.snapshotPath)) {
        console.log(`\nSaving pre-migration snapshot to ${config.snapshotPath}...`);
        fs.writeFileSync(config.snapshotPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            cards: cardsInfo.map(c => ({
                cardId: c.cardId,
                note: c.note,
                deckName: c.deckName,
                queue: c.queue,
                due: c.due
            })),
            notes: notesInfo.map(n => ({
                noteId: n.noteId,
                tags: n.tags
            }))
        }, null, 2), 'utf8');
    }

    // 4. Apply chapter role tags
    console.log('\nApplying tags...');
    for (const [tag, nids] of Object.entries(tagUpdates)) {
        await callAnki('addTags', {
            notes: Array.from(nids),
            tags: tag
        });
        console.log(`  Tagged ${nids.size} notes with "${tag}"`);
    }

    // 5. Suspend & unsuspend
    console.log(`\nUpdating suspension state:`);
    if (suspendCardIds.length > 0) {
        await callAnki('suspend', { cards: suspendCardIds });
        console.log(`  Suspended ${suspendCardIds.length} cards.`);
    }
    if (activateCardIds.length > 0) {
        await callAnki('unsuspend', { cards: activateCardIds });
        console.log(`  Activated ${activateCardIds.length} cards.`);
    }

    // 6. Move cards to root deck
    console.log(`\nMoving all ${cardIds.length} cards into root deck "${config.rootDeck}"...`);
    await callAnki('changeDeck', {
        cards: cardIds,
        deck: config.rootDeck
    });

    // 7. Prune empty subdecks leaf-to-root
    const allDecks = await callAnki('deckNames');
    const subdecks = allDecks.filter(d => d.startsWith(`${config.rootDeck}::`));

    if (subdecks.length > 0) {
        console.log(`\nVerifying ${subdecks.length} subdecks are empty...`);
        for (const subdeck of subdecks) {
            const remaining = await callAnki('findCards', { query: `deck:"${subdeck}"` });
            if (remaining.length > 0) {
                throw new Error(`Safety check failed: Subdeck "${subdeck}" still contains ${remaining.length} cards! Aborting.`);
            }
        }
        subdecks.sort((a, b) => b.length - a.length);
        console.log('Deleting empty subdecks...');
        await callAnki('deleteDecks', {
            decks: subdecks,
            cardsToo: true
        });
        console.log(`Successfully deleted ${subdecks.length} empty subdecks.`);
    }

    // 8. Preset configuration enforcement
    if (config.enforceDeckPreset) {
        console.log(`\nEnforcing deck configuration for "${config.rootDeck}"...`);
        const deckConfig = await callAnki('getDeckConfig', { deck: config.rootDeck });
        if (deckConfig) {
            Object.assign(deckConfig, config.enforceDeckPreset);
            await callAnki('saveDeckConfig', { config: deckConfig });
            console.log('  Deck preset updated.');
        }
    }

    // 9. Priority tag repositioning
    if (config.priorityTags && config.priorityTags.length > 0) {
        function getPriorityRank(roleTag) {
            const idx = config.priorityTags.indexOf(roleTag);
            return idx === -1 ? 999 : idx;
        }

        const newCards = manifest.filter(m => m.currentQueue === 0);
        newCards.sort((a, b) => {
            const rankA = getPriorityRank(a.roleTag);
            const rankB = getPriorityRank(b.roleTag);
            if (rankA !== rankB) return rankA - rankB;
            return a.cardId - b.cardId;
        });

        if (newCards.length > 0) {
            console.log(`\nRepositioning ${newCards.length} new cards in curriculum order...`);
            const repositionActions = newCards.map((m, idx) => ({
                action: 'setSpecificValueOfCard',
                params: {
                    card: m.cardId,
                    keys: ['due'],
                    newValues: [idx + 1]
                }
            }));

            const CHUNK_SIZE = 100;
            for (let i = 0; i < repositionActions.length; i += CHUNK_SIZE) {
                const chunk = repositionActions.slice(i, i + CHUNK_SIZE);
                await callAnki('multi', { actions: chunk });
            }
            console.log(`  Repositioned ${repositionActions.length} new cards.`);
        }
    }

    console.log(`\n=== Migration Completed Successfully for ${config.name} ===`);
}

main().catch(err => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
});

