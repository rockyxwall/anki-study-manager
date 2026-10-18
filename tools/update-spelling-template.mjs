const ANKI_URL = process.env.ANKI_CONNECT_URL || 'http://127.0.0.1:8765';

const frontTemplate = `<div class="customCard">
  <!-- Audio First: Auto-plays US Male Voice -->
  {{#word_audio}}
  <div class="wordAudioButtonFront">{{word_audio}}</div>
  {{/word_audio}}
  {{^word_audio}}
  <div>{{tts en_US voices=Microsoft_David_Desktop:Word}}</div>
  {{/word_audio}}

  <div style="margin-top: 18px; margin-bottom: 8px; font-size: 14px; opacity: 0.75; font-weight: 500;">
    🎧 Listen &amp; Type Spelling:
  </div>
  <div style="font-size: 22px;">
    {{type:Word}}
  </div>

  {{#Sentence Translation}}
  <div class="sentenceTranslation" style="margin-top: 16px; opacity: 0.85;">
    Hint: {{Sentence Translation}}
  </div>
  {{/Sentence Translation}}
</div>`;

const backTemplate = `<div class="customCard cardBack">
  <div class="targetWordContainerBack borderBottom" style="padding-bottom: 12px;">
    <!-- Typing result comparison -->
    <div style="font-size: 24px; margin-bottom: 8px;">{{type:Word}}</div>
    {{#word_audio}}
    <span class="wordAudioButtonBack">{{word_audio}}</span>
    {{/word_audio}}
    {{^word_audio}}
    <span>{{tts en_US voices=Microsoft_David_Desktop:Word}}</span>
    {{/word_audio}}
  </div>

  <div class="section borderBottom">
    <div class="header">example:</div>
    <div class="indent">
      <div class="exampleSentenceWrapper">
        <span>"{{Example Sentence}}"</span>
        <span>{{sentence_audio}}</span>
      </div>
      <div class="sentenceTranslation">{{Sentence Translation}}</div>
    </div>
  </div>

  <div class="section borderBottom">
    <div class="header">definitions:</div>
    <div class="indent">
      <ul class="definitionsList">
        {{#Definitions 1}}
        <li>{{Definitions 1}}</li>
        {{/Definitions 1}}
        {{#Definitions 2}}
        <li>{{Definitions 2}}</li>
        {{/Definitions 2}}
      </ul>
    </div>
  </div>

  {{#image}}
  <div class="image borderBottom">{{image}}</div>
  {{/image}}

  <div class="section borderBottom">
    <div class="header">external references:</div>
    <div class="linkButtonGroup">
      <a
        class="linkButton"
        style="flex: 1"
        href="https://www.deepl.com/translator#??/en/{{Example Sentence}}"
      >
        <img src="_deepl_icon.png" height="24" alt="Translator Icon" />
        <span>Translator</span>
      </a>
      <a
        class="linkButton"
        href="https://chatgpt.com/g/g-dRLKjcaf8-dictionary-killer"
      >
        <img src="_chatgpt_icon.png" height="24" alt="Dictionary Icon" />
        <span>Ask an AI Dictionary</span>
      </a>
    </div>
  </div>

  <div class="footer">
    <span>Refold Languages Inc.</span>
    <a
      class="linkButton"
      id="tutorialButton"
      href="https://refold.link/sentence-mining-tutorial"
    >
      <img src="_youtube_icon.png" height="19" alt="Tutorial Video Icon" />
      <span>Tutorial</span>
    </a>
  </div>
</div>`;

async function main() {
  console.log('Updating "Refold Sentence Miner: Word Only" card template in Anki...');
  const res = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'updateModelTemplates',
      version: 6,
      params: {
        model: {
          name: 'Refold Sentence Miner: Word Only',
          templates: {
            'Refold Sentence Miner: Word Only Card': {
              Front: frontTemplate,
              Back: backTemplate
            }
          }
        }
      }
    })
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }

  console.log('Successfully updated template! Audio-first spelling typing is now ACTIVE!');
}

main().catch(console.error);

