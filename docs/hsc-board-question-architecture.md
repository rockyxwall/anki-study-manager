# HSC Board Question Architecture & Anki Flashcard Strategy (NCTB Bangladesh)

Analysis of Class 11–12 HSC Board Exam structure for Physics, Bangla, and English, and how to classify Mark 1 (?), Mark 2 (?), and Mark 3/4 (?/?) questions in Anki.

---

## 1. HSC Board Exam Question Blueprint

### A. Physics (1st & 2nd Paper)
- **Total Marks:** 100 (Theory: 75, Practical: 25)
- **Section 1: MCQ (????????????) — 25 Marks (25 Questions):**
  - Rapid factual identification, unit/dimension conversion, 1-step numerical calculations.
- **Section 2: Creative Questions (??????? / CQ) — 50 Marks (Answer 5 of 8, 10 marks each):**
  Every CQ contains a stimulus (???????) and 4 standardized sub-questions:
  1. **? (Knowledge / ?????????) — 1 Mark:**
     - *Nature:* Pure factual definition, law statement, constant, unit, or dimension. **Completely independent of the stimulus.**
     - *Examples:* '??? ????? ????????? ???', '???????? ??? ???? ????', '?????? ???'
     - *Anki Role:* Must be directly memorized. Takes <5 seconds to recall.
  2. **? (Comprehension / ???????????) — 2 Marks:**
     - *Nature:* Conceptual reasoning and explanation ('Explain why...', 'What is meant by...'). **Completely independent of the stimulus.**
     - *Examples:* '????? ?? ???? ??????????? ?? ????', '?????????? ???? ?????? ??????? ??? ????', '????? ?????? ?????? ??? ?? ????'
     - *Anki Role:* Short 2–3 sentence conceptual reasoning. Takes <15 seconds to recall.
  3. **? (Application / ???????????) — 3 Marks:**
     - *Nature:* Direct mathematical problem solving based on stimulus numbers and conditions.
     - *Examples:* '????????? ??????????? ??????? ???????? ?????? ? ???????? ??????? ????'
     - *Anki Role:* Multi-step math. High cognitive load, requires scrap paper and calculator. **Violates Minimum Information Principle (MIP) for daily SRS.**
  4. **? (Higher Ability / ?????? ??????) — 4 Marks:**
     - *Nature:* Comparative mathematical analysis, verification of physical laws, or scenario justification.
     - *Examples:* '????????? ???? ????? ???????????? ???????? ???? ???? ???? ??? ??????????? ???????? ????'
     - *Anki Role:* Multi-stage math and evaluation. **Violates MIP for daily SRS.**

> [!IMPORTANT]
> In Physics, **? + ? = 3 marks per CQ $\times$ 5 answered = 15 marks (30% of total CQ score!)**.
> These 15 marks come from pure memory recall without solving any math from the stimulus!

---

### B. Bangla (1st & 2nd Paper)
- **Bangla 1st Paper (100 Marks):**
  - **MCQ — 30 Marks (30 Questions):** Factual author details, vocabulary, poetic meter, grammar.
  - **CQ — 70 Marks (Answer 7 of 11, 10 marks each):**
    1. **? (?????????) — 1 Mark:** Factual recall from text (e.g. '??????? ????? ???? ?? ????', '?????? ????? ??????? ??? ???'). Single line answer.
    2. **? (???????????) — 2 Marks:** Explaining a line, metaphor, or character decision (e.g. ''????? ???? ?? ????? ???? ???? ????'-??????? ???????? ???'). 2–3 sentences.
    3. **? (???????????) — 3 Marks:** Linking stimulus scenario to textbook characters/themes. 1–2 paragraphs.
    4. **? (?????? ??????) — 4 Marks:** Deep thematic synthesis and critical assessment. Full essay answer.
  - *Board Impact:* ** \times (1 + 2) = 21$ marks (30% of written exam!)** comes directly from memorizing ? & ? questions.

- **Bangla 2nd Paper (100 Marks):**
  - Part A: Grammar (30 Marks) — 6 questions $\times$ 5 marks (Pronunciation rules, Spelling rules, Word classes, Samas/Word formation, Sentence transformation, Error correction).
  - Part B: Composition (70 Marks) — Translation/Terminology, Reports, Applications, Summaries, Dialogues, Essays.

---

### C. English (1st & 2nd Paper)
- **English 1st Paper (100 Marks):**
  - MCQs & Short Comprehension Questions ( \times 2 = 10$ marks).
  - Theme Writing (50 words) on EFT poems: Central message, imagery, poetic tone.
  - Cloze tests with/without clues, Flowchart, Summary.
- **English 2nd Paper (100 Marks):**
  - Part A: Grammar (60 Marks) — 9 focused items (Prepositions, Special words, Completing sentences, Right Form of Verbs, Narration, Modifiers, Connectors, Synonym/Antonym, Punctuation).
  - Part B: Composition (40 Marks) — Formal letters and descriptive/cause-effect paragraphs.

---

## 2. Flashcard Taxonomy & Classification Strategy

To resolve the challenge:
*“Mark 1 and 2 are not MCQs, nor do they fit with pure mathematical concepts because they need rote memorization for written board exams and don't directly assist in solving math equations.”*

We establish an expanded **5-Tier Taxonomy**:

`
Academic Subject Deck
 +-- 1. concept          <- Formulas, physical laws, core definitions, grammar rules (ACTIVE)
 +-- 2. cq::k  (mark1)   <- Board CQ Part ? (1-mark direct factual recall) (ACTIVE)
 +-- 3. cq::kh (mark2)   <- Board CQ Part ? (2-mark conceptual reasoning & explanations) (ACTIVE)
 +-- 4. mcq              <- Board exam multiple-choice questions & options (ACTIVE)
 +-- 5. problem          <- Board CQ Part ? & ? (3/4-mark multi-step math/proofs) (SUSPENDED)
`

### Why this segmentation works:
1. **Separation of Concerns:**
   - When solving math: filter 	ag:*::concept to see only formulas and laws.
   - When preparing for written CQ exams: filter 	ag:*::cq::k or 	ag:*::cq::kh to drill high-yield board question definitions and explanations.
   - When speed-testing: filter 	ag:*::mcq.
2. **Fixed Order Queue Priority:**
   - **Queue Position 1:** concept (Foundational theory and formulas gathered first).
   - **Queue Position 2:** cq::k (Mark 1 definitions gathered next).
   - **Queue Position 3:** cq::kh (Mark 2 explanations gathered next).
   - **Queue Position 4:** mcq (Board MCQs gathered last for practice).
   - **Suspended Queue:** problem (Mark 3 & 4 multi-step math and stimulus essays stay suspended, avoiding SRS failure loops).
