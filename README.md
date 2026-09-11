# Anki Study Manager

Personal Anki study manager for HSC curriculum, flat tag-driven decks, and spaced repetition workflows.

## Overview
- Architecture pattern: Flat subject decks (`[🎓] Academic::2.[💻] ICT`, `[🎓] Academic::7.[📊] Higher Math`) with hierarchical tags (`subject::paper::chapter::role`).
- Minimum Information Principle: Single-answer concepts are active; multi-line problem cards and proofs are suspended.
- Documentation: See [`docs/study-management-system.md`](./docs/study-management-system.md).

## Connection to MCP Server
This repo works seamlessly with [`mcp-anki-connect`](https://github.com/rockyxwall/mcp-anki-connect). Both connect to the local Anki instance (`http://127.0.0.1:8765`). AI assistants (Antigravity/Claude) access Anki tools via the MCP server while operating on this workspace.
