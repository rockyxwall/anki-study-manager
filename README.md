# Anki Study Manager

Personal Anki study manager for HSC curriculum, flat tag-driven decks, and spaced repetition workflows.

## Overview
- Architecture pattern: Flat subject decks (`[🎓] Academic::2.[💻] ICT`, `[🎓] Academic::7.[📊] Higher Math`) with hierarchical tags (`subject::paper::chapter::role` for multi-paper, `subject::chapter::role` for single-paper).
- Minimum Information Principle: Single-answer concepts are active; multi-line problem cards and proofs are suspended.
- Documentation:
  - System architecture: [`docs/study-management-system.md`](./docs/study-management-system.md)
  - Higher Math NCTB curriculum: [`docs/hsc-higher-math-curriculum.md`](./docs/hsc-higher-math-curriculum.md)
  - ICT NCTB curriculum: [`docs/hsc-ict-curriculum.md`](./docs/hsc-ict-curriculum.md)

## Workflows & Scripts
- `npm run migrate-math:exec`: Run Higher Math flat deck migration and curriculum queue sequencing.
- `npm run migrate-ict:exec`: Run ICT flat deck migration and curriculum queue sequencing.
- `npm run clean-tags:exec`: Strip non-canonical tags and AI-describer noise while preserving exact chapter-scoped roles.

## Connection to MCP Server
This repo works seamlessly with [`mcp-anki-connect`](https://github.com/rockyxwall/mcp-anki-connect). Both connect to the local Anki instance (`http://127.0.0.1:8765`). AI assistants (Antigravity/Claude) access Anki tools via the MCP server while operating on this workspace.

