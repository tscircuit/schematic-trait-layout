# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Testing**:
- `bun test` - Run all tests  
- `bun test tests/path/to/test.test.ts` - Run specific test

**Code Quality**:
- `bun run format` - Format code with Biome
- `bun run format:check` - Check formatting
- No separate lint/typecheck commands - use TypeScript compiler directly

**Development**:
- `bun run generate-comments` - Generate template comments

## Architecture Overview

This is a **PMARS** (Partition, Match, Adapt, Refine, Stitch) automatic schematic layout system for tscircuit. The pipeline transforms input netlists into positioned circuit layouts using pre-generated templates.

### Core Pipeline
- **Partition**: Split complex circuits (not implemented)
- **Match**: `MatchPhaseSolver` → `SingleMatchSolver` finds best template match
- **Adapt**: `AdaptPhaseSolver` modifies templates to fit input (stub implementation)  
- **Refine**: Optimize layouts (not implemented)
- **Stitch**: Combine partitions (not implemented)

### Key Components

**Solvers** (`lib/solvers/`):
- `SchematicLayoutPipelineSolver` - Main entry point, orchestrates PMARS pipeline
- `BaseSolver` - Step-based execution framework with timing/progress
- `SingleMatchSolver` - Template matching against input netlist

**Builders** (`lib/builder/`):
- `CircuitBuilder` - Primary API for constructing/modifying circuit templates  
- `ChipBuilder` - Individual component construction
- Templates in `templates/` return `CircuitBuilder` instances

**Data Flow**:
1. `InputNetlist` (boxes, connections, nets) → 
2. Template matching against library →
3. Edit operations to adapt template →
4. Positioned circuit output

### Testing Guidelines

- One test per file, enumerate multiple tests: `myFunction01.test.ts`, `myFunction02.test.ts`
- Start with `CircuitBuilder` user input
- Use `.toMatchInlineSnapshot()` for input visualization, then test output verification
- Prefer snapshots over small assertions

### Important File Paths

- `lib/input-types.ts` - Input data structures (`InputNetlist`, `Box`, `Connection`)
- `lib/builder/circuit-types.ts` - Output circuit types (`Line`, `NetLabel`)  
- `lib/adapt/EditOperation.ts` - Template modification operations
- `templates/` - Pre-built circuit layout templates
- `tests/e2e/` - End-to-end pipeline tests