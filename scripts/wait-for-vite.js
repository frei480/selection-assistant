#!/usr/bin/env node

const http = require('http')
const max_attempts = 30
let attempts = 0

const check_server = () => {
  attempts++
  
  const req = http.get('http://localhost:5173', (res) => {
    console.log('✓ Vite server is ready!')
    process.exit(0)
  })
  
  req.on('error', () => {
    if (attempts >= max_attempts) {
      console.error('✗ Timeout waiting for Vite server')
      process.exit(1)
    }
    console.log(`Waiting for Vite server... (${attempts}/${max_attempts})`)
    setTimeout(check_server, 1000)
  })
}

console.log('Waiting for Vite server to start...')
check_server()
