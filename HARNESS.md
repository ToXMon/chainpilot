# Development Harness

Based on 0xSero's Agentic Coding 101 methodology. This document defines all standards, patterns, and workflows that agent subordinates must follow when working in this repository.

## Sub-Agent Profiles and Behavioral Rules

### Engineering Agents (ai-engineer, backend-architect, devops-automator, test-engineer)
- Enforce modular slice architecture: configs in dedicated files, domain isolation, no cross-module leakage
- TypeScript strict mode: no any types, centralized types in src/lib/types.ts, use unknown + explicit cast
- LSP rules: 300 lines per file (ERROR), 20 files per directory (ERROR), no unused imports
- Database interface pattern: all DB access through typed interface, JSON mock for dev/testing, Prisma for production, switch via DATABASE env var
- AGENTS.md: check/create before modifying any module
- Workpack: generate for any task over 4 hours (rules.md + scope.md + task_NNN.md)
- Refactor cadence: 2 days feature, 3 days refactor (code minimization)
- Integration tests: full pipeline with /data JSON output
- Autonomy: no questions mid-task, no stop on non-blocking errors (log to /data/errors.json), self-decide on ambiguity

### Product Agents (product-manager, workflow-optimizer, project-shipper)
- Feature specs map to Workpack structure: scope.md (source of truth), rules.md (engineering owns), task_NNN.md (engineering owns)
- Pre-decompose features into atomic tasks before engineering handoff
- Every spec includes state diagram, JSON mock of API/DB shape, measurable success criteria
- RICE scoring for prioritization, data-driven decisions
- Account for 50/50 refactor cadence in milestone planning

### QA Agent (test-engineer)
- Verify integration test coverage for every module (full pipeline, not just units)
- Validate /data output JSON against acceptance criteria in scope.md
- Enforce no any types, no type divergence across modules
- LSP rules must be active in CI/CD (not just local dev)
- Generate state diagrams post-merge, archive in docs/state/

### Documentation Agent (documentation-lead)
- Maintain recursive AGENTS.md hierarchy across all modules
- Generate state machine diagrams (Mermaid/ASCII) in docs/state/
- Auto-generate CHANGELOG.md at PR merge
- Audit /data pipeline outputs, summarize health in docs/reports/

## Workpack Pattern

For any task over 4 hours:
1. Generate rules.md with autonomy rules (no-questions, no-stop-on-error, self-decision, file limits, type strictness, AGENTS.md-first)
2. Generate scope.md with feature summary, user story, success criteria, modules affected, data flow, interface contracts
3. Generate task_NNN.md files (zero-padded) with: files touched, description, approach, outcome, acceptance criteria, dependencies, complexity
4. Queue tasks sequentially — agent runs 12-16 hours autonomously

## AGENTS.md Hierarchy Standard

- Root: repo overview, tech stack, module map, global standards
- Per module: purpose, how it works, module-specific standards, type contracts, dependencies
- Models auto-load nearest AGENTS.md when operating in that directory
- Never stale — update after every module modification

## Database Interface Pattern

All DB access through src/lib/db/interface.ts (DatabaseInterface).
Two implementations:
- src/lib/db/json.ts — JSON flat-file, activated with DATABASE=json
- src/lib/db/prisma.ts — Prisma/PostgreSQL, activated with DATABASE=prisma (default)
Factory: src/lib/db/index.ts exports getDatabase() that reads DATABASE env var.

## Refactor Cadence (50/50 Rule)

2 days feature work followed by 3 days refactoring.
Goal: minimize total lines, eliminate duplication, remove stubs.
Rationale: fewer files = faster agent context loading = better output quality.

## State Diagram Protocol

After major changes, generate Mermaid or ASCII state machine diagram.
Output to docs/state/ with timestamp.
Covers: database structure, pipeline flows, module state transitions, user flows.

## Integration Test + /data Pipeline Standard

- Every major business logic module has integration tests (full pipeline, not just units)
- Tests simulate: data in -> processing -> data out
- Each pipeline step outputs structured JSON to /data/
- Verify correctness by reading /data output, not raw source code
- QA agent validates /data against acceptance criteria

## File Structure

AGENTS.md                    — Top-level repo documentation
HARNESS.md                   — This file
src/lib/types.ts             — Centralized type definitions
src/lib/db/interface.ts      — Database interface contract
src/lib/db/json.ts           — JSON flat-file DB implementation
src/lib/db/prisma.ts         — Prisma production DB implementation
src/lib/db/index.ts          — Database factory
.eslintrc.json               — LSP enforcement rules (300-line, 20-file, no-any)
data/                        — Pipeline test output directory (gitignored)
data/.gitkeep                — Placeholder
docs/state/                  — State machine diagrams archive
docs/state/.gitkeep          — Placeholder

## Current Audit Status

- AGENTS.md files: CREATED (root + 4 modules)
- Centralized types: EXISTS (src/lib/types.ts)
- Database interface + JSON mock: CREATED
- LSP rules (300/20 limits): CREATED (.eslintrc.json)
- /data directory: CREATED
- File violations: page.tsx at 371 lines (NEEDS SPLIT — future refactor task)
