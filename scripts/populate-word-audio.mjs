#!/usr/bin/env node

/**
 * Batch populate US Male audio for English vocabulary cards in Anki.
 * Zero external dependencies: uses native Windows SAPI / System.Speech and AnkiConnect.
 *
 * Usage:
 *   node scripts/populate-word-audio.mjs
 *   node scripts/populate-word-audio.mjs --deck "[🗣️] Language::[🔠] English"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';

const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
        return args[idx + 1];
    }
    return defaultValue;
}

const deckName = getArg('--deck', '[🗣️] Language::[🔠] English');

async function callAnki(action, params = {}) {
    const res = await fetch(ANKI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result;
}

function synthesizeMaleWav(word, outputPath) {
    const safeWord = word.replace(/'/g, "''").trim();
    const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Male, [System.Speech.Synthesis.VoiceAge]::Adult, 1, [System.Globalization.CultureInfo]::GetCultureInfo("en-US"))
$synth.SetOutputToWaveFile('${outputPath.replace(/'/g, "''")}')
$synth.Speak('${safeWord}')
$synth.Dispose()
`;
    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { stdio: 'pipe' });
}

async function main() {
    console.log(`=== US Male Audio Populator for Anki ===`);
    console.log(`Deck: ${deckName}`);

    const noteIds = await callAnki('findNotes', { query: `deck:"${deckName}"` });
    console.log(`Found ${noteIds.length} total notes in deck.`);

    if (noteIds.length === 0) {
        console.log('No notes found. Exiting.');
        return;
    }

    const notes = await callAnki('notesInfo', { notes: noteIds });
    const pending = notes.filter((n) => {
        const audio = n.fields?.word_audio?.value?.trim() || '';
        return audio.length === 0;
    });

    console.log(`Notes needing audio: ${pending.length} (Skipping ${notes.length - pending.length} already populated)\n`);

    if (pending.length === 0) {
        console.log('All notes already have audio! Done.');
        return;
    }

    const tempDir = os.tmpdir();
    let count = 0;

    for (let i = 0; i < pending.length; i++) {
        const note = pending[i];
        const rawWord = note.fields?.Word?.value?.trim() || '';
        if (!rawWord) continue;

        // Clean word for filename and TTS
        const cleanWord = rawWord.replace(/<[^>]+>/g, '').trim();
        const safeFilename = cleanWord.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const mediaFilename = `audio_${safeFilename}_male.wav`;
        const tempWavPath = path.join(tempDir, `tmp_${safeFilename}.wav`);

        try {
            process.stdout.write(`[${i + 1}/${pending.length}] Generating audio for "${cleanWord}"... `);

            // 1. Synthesize US Male voice WAV
            synthesizeMaleWav(cleanWord, tempWavPath);

            // 2. Read base64
            const wavBuffer = fs.readFileSync(tempWavPath);
            const base64Data = wavBuffer.toString('base64');

            // 3. Store into Anki media folder
            await callAnki('storeMediaFile', {
                filename: mediaFilename,
                data: base64Data
            });

            // 4. Update note fields
            await callAnki('updateNoteFields', {
                note: {
                    id: note.noteId,
                    fields: {
                        word_audio: `[sound:${mediaFilename}]`
                    }
                }
            });

            // Clean temp file
            if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);

            console.log(`Done! -> "[sound:${mediaFilename}]"`);
            count++;
        } catch (err) {
            console.error(`\n  [ERROR] on "${cleanWord}": ${err.message}`);
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully generated and attached audio to ${count} cards!`);
}

main().catch(console.error);
