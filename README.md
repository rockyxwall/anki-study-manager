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

## Workflows & Scripts
- `npm run migrate-math:exec`: Higher Math flat deck migration and curriculum queue sequencing.
- `npm run migrate-ict:exec`: ICT flat deck migration and curriculum queue sequencing.
- `npm run migrate-bangla:exec`: Bangla flat deck migration, CQ ক/খ taxonomy, and queue sequencing.
- `npm run migrate-english:exec`: English flat deck migration, EFT themes, and narration rules.
- `npm run migrate-physics:exec`: Physics flat deck migration, vector & mechanics taxonomy, CQ math suspension.
- `npm run clean-tags:exec`: Strip non-canonical tags and AI-describer noise across all 5 decks while preserving exact canonical roles.

## Connection to MCP Server
This repo works seamlessly with [`mcp-anki-connect`](https://github.com/rockyxwall/mcp-anki-connect). Both connect to the local Anki instance (`http://127.0.0.1:8765`). AI assistants (Antigravity/Claude) access Anki tools via the MCP server while operating on this workspace.

