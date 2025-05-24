#!/usr/bin/env bun

import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

// Create dist directory
if (!existsSync('dist')) {
  await mkdir('dist', { recursive: true })
}

console.log('Building website...')

// Build the client bundle
const result = await Bun.build({
  entrypoints: ['./src/index.tsx'],
  target: 'browser',
  minify: true,
  splitting: false,
  format: 'esm',
  outdir: './dist',
  naming: 'bundle.[hash].js',
})

if (!result.success) {
  console.error('Build failed:', result.logs)
  process.exit(1)
}

const [output] = result.outputs
const bundleName = output.path.split('/').pop()

// Generate static HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TSCircuit Layout Pipeline Demo</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background-color: #f5f5f5;
    }
    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/${bundleName}"></script>
</body>
</html>`

await writeFile('dist/index.html', html)

console.log('Build complete! Files created in dist/')