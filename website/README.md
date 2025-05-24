# TSCircuit Layout Pipeline Demo Website

This website allows users to paste TSCircuit code, run it, and see both the original layout and the optimized layout using the PMARS pipeline.

## Features

- **Code Editor**: Paste TSCircuit code with syntax highlighting
- **Real-time Execution**: Run TSCircuit code and see results
- **Layout Comparison**: View original vs optimized layouts side-by-side
- **URL Sharing**: Code is automatically encoded in the URL for easy sharing
- **Responsive Design**: Works on desktop and mobile

## Development

```bash
# Install dependencies and start development server
bun run website:dev

# Build for production
bun run website:build

# Serve production build
bun run website:serve
```

## Architecture

- **Frontend**: React with TypeScript
- **Server**: Bun server with dynamic bundling
- **Layout Engine**: PMARS (Partition, Match, Adapt, Refine, Stitch) pipeline
- **Code Evaluation**: `@tscircuit/eval` for running TSCircuit code
- **SVG Generation**: `circuit-to-svg` for schematic visualization
- **URL Encoding**: `@tscircuit/create-snippet-url` for shareable links

## Usage

1. Paste or write TSCircuit code in the editor
2. Click "Run Code" to execute and generate layouts
3. View the original layout (left) and optimized layout (right)
4. Share the URL to share your circuit with others

The default example shows a simple circuit with a chip (U1) and resistor (R1) connected together.