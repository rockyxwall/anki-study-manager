# Anki Study Manager

Personal Anki study manager for HSC curriculum, flat tag-driven decks, and spaced repetition workflows.

## Overview
- Architecture pattern: Flat subject decks (`ICT`, `Higher Math`, `Bangla`, `English`, `Physics`) with hierarchical tags (`subject::paper::chapter::role` for multi-paper, `subject::chapter::role` for single-paper).
- Minimum Information Principle & 5-Tier Taxonomy: Single-answer concepts, Board CQ Part ক (1-mark), Board CQ Part খ (2-mark), and MCQs are active; multi-line problem cards and stimulus essays are suspended.
- Documentation:
  - System architecture: [`docs/study-management-system.md`](./docs/study-management-system.md)
  - Board CQ question architecture: [`docs/hsc-board-question-architecture.md`](./docs/hsc-board-question-architecture.md)
  - Higher Math NCTB curriculum: [`docs/hsc-higher-math-curriculum.md`](./docs/hsc-higher-math-curriculum.md)
  - ICT NCTB curriculum: [`docs/hsc-ict-curriculum.md`](./docs/hsc-ict-curriculum.md)
  - Physics NCTB curriculum: [`docs/hsc-physics-curriculum.md`](./docs/hsc-physics-curriculum.md)
  - Bangla NCTB curriculum: [`docs/hsc-bangla-curriculum.md`](./docs/hsc-bangla-curriculum.md)
  - English NCTB curriculum: [`docs/hsc-english-curriculum.md`](./docs/hsc-english-curriculum.md)
  - Chemistry NCTB curriculum: [`docs/hsc-chemistry-curriculum.md`](./docs/hsc-chemistry-curriculum.md)

## Tools & Workflows

All active CLI tools live in [`tools/`](./tools):
- **Image Description & Tagging**:
  - `npm run describe-io:dry`: Preview multimodal AI descriptions & tags for Image Occlusion notes.
  - `npm run describe-io`: Populate Anki notes with AI descriptions and tags via AnkiConnect.
- **Subject Migrations** (Powered by unified [`tools/migrate-deck.mjs`](./tools/migrate-deck.mjs)):
  - `npm run migrate-math:exec`: Higher Math flat deck migration & curriculum queue sequencing.
  - `npm run migrate-ict:exec`: ICT flat deck migration & curriculum queue sequencing.
  - `npm run migrate-bangla:exec`: Bangla flat deck migration & CQ taxonomy.
  - `npm run migrate-english:exec`: English flat deck migration & EFT theme taxonomy.
  - `npm run migrate-physics:exec`: Physics flat deck migration & CQ math suspension.
  - `npm run migrate-chem:exec`: Chemistry flat deck migration & peg taxonomy.
  - `npm run migrate-lang:exec`: Language flat deck migration & word mining taxonomy.
- **Maintenance & Hygiene**:
  - `npm run clean-tags:dry` / `npm run clean-tags:exec`: Strip non-canonical tags and noise while preserving canonical roles.
  - `npm run audio:word`: Synthesize and attach US Male audio to vocabulary cards using Windows SAPI / System.Speech.
  - `npm run organize-types`: Purge unused note types/models and clean card templates.
  - `npm run reorganize-presets`: Consolidate and rename deck configuration presets into 5 self-documenting groups.
  - `npm run template:spelling`: Synchronize and refresh Spelling card template.
  - `npm run audit:math`: Audit curriculum tag classification integrity.

Historical one-off patches and initial migrations are preserved in [`scripts/archive/`](./scripts/archive).

## Connection to MCP Server
This repo works seamlessly with [`mcp-anki-connect`](https://github.com/rockyxwall/mcp-anki-connect). Both connect to the local Anki instance (`http://127.0.0.1:8765`). AI assistants (Antigravity/Claude) access Anki tools via the MCP server while operating on this workspace.

