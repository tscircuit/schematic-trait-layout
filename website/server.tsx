#!/usr/bin/env bun

import { type ServerWebSocket } from 'bun'

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url)
    
    // Serve the main HTML page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(
        `<!DOCTYPE html>
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
  <script type="module" src="/bundle.js"></script>
</body>
</html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }
    
    // Serve the bundled JavaScript
    if (url.pathname === '/bundle.js') {
      const result = await Bun.build({
        entrypoints: ['./src/index.tsx'],
        target: 'browser',
        minify: false,
        splitting: false,
        format: 'esm',
        external: [],
      })
      
      if (result.success) {
        const [output] = result.outputs
        const text = await output.text()
        return new Response(text, {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache',
          },
        })
      } else {
        console.error('Build failed:', result.logs)
        return new Response('Build failed', { status: 500 })
      }
    }
    
    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Server running at http://localhost:${server.port}`)