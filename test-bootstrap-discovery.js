#!/usr/bin/env node
/**
 * Bootstrap Discovery Test
 * 
 * Tests the VNS-based bootstrap discovery system:
 * 1. Parse bootstrap configuration (static vs VNS)
 * 2. Simulate VNS registration
 * 3. Simulate VNS discovery
 * 4. Verify bootstrap peer expansion
 */

import { parseBootstrapConfig, discoverBootstrapPeers, registerAsBootstrap, expandBootstrapPeers } from './dist/networking/bootstrap-discovery.js';
import http from 'http';

const PASSED = '\x1b[32m✓\x1b[0m';
const FAILED = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

let testsRun = 0;
let testsPassed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`${PASSED} ${message}`);
    return true;
  } else {
    console.log(`${FAILED} ${message}`);
    return false;
  }
}

/**
 * Mock VNS API server for testing
 */
function createMockVNSServer(port, bootstraps) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    
    // Handle VNS resolve
    if (url.pathname.startsWith('/api/vns/resolve/')) {
      const name = decodeURIComponent(url.pathname.replace('/api/vns/resolve/', ''));
      
      if (name === 'bootstrap.vns' && bootstraps.length > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          entry: {
            name: 'bootstrap.vns',
            value: {
              endpoints: bootstraps
            }
          }
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    }
    // Handle VNS register
    else if (url.pathname === '/api/vns/register' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log(`${INFO} Mock VNS received registration:`, data.name, '→', data.value?.endpoint);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400);
          res.end();
        }
      });
    }
    // Handle VNS status
    else if (url.pathname === '/api/vns/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ enabled: true, entries: bootstraps.length }));
    }
    else {
      res.writeHead(404);
      res.end();
    }
  });
  
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`${INFO} Mock VNS server listening on port ${port}`);
      resolve(server);
    });
  });
}

async function runTests() {
  console.log('\n🧪 Bootstrap Discovery Test Suite\n');
  console.log('═'.repeat(50));
  
  // Test 1: Parse static bootstrap configuration
  console.log('\n📋 Test 1: Parse Static Bootstrap Config');
  const staticConfig = parseBootstrapConfig('http://1.2.3.4:3001,http://5.6.7.8:3001');
  assert(staticConfig.staticPeers.length === 2, 'Should parse 2 static peers');
  assert(staticConfig.vnsDiscovery === false, 'Should not enable VNS discovery for static config');
  assert(staticConfig.staticPeers[0] === 'http://1.2.3.4:3001', 'First peer URL correct');
  
  // Test 2: Parse VNS discovery configuration
  console.log('\n📋 Test 2: Parse VNS Discovery Config');
  const vnsConfig1 = parseBootstrapConfig('bootstrap.vns');
  assert(vnsConfig1.vnsDiscovery === true, 'Should enable VNS discovery for .vns name');
  assert(vnsConfig1.vnsName === 'bootstrap.vns', 'Should extract VNS name');
  
  const vnsConfig2 = parseBootstrapConfig('seed:bootstrap.vns');
  assert(vnsConfig2.vnsDiscovery === true, 'Should enable VNS discovery for seed: prefix');
  assert(vnsConfig2.vnsName === 'bootstrap.vns', 'Should extract VNS name from seed: prefix');
  
  // Test 3: Parse hybrid configuration
  console.log('\n📋 Test 3: Parse Hybrid Config (Static + VNS)');
  const hybridConfig = parseBootstrapConfig('http://1.2.3.4:3001,bootstrap.vns');
  assert(hybridConfig.staticPeers.length === 1, 'Should parse static peer');
  assert(hybridConfig.vnsDiscovery === true, 'Should enable VNS discovery');
  assert(hybridConfig.vnsName === 'bootstrap.vns', 'Should extract VNS name');
  
  // Test 4: Start mock VNS servers
  console.log('\n🌐 Test 4: Mock VNS Server Setup');
  const mockBootstraps = [
    'http://bootstrap1.test:3001',
    'http://bootstrap2.test:3001',
    'http://bootstrap3.test:3001'
  ];
  
  const mockServer = await createMockVNSServer(9001, mockBootstraps);
  assert(mockServer !== null, 'Mock VNS server started');
  
  // Test 5: Discover bootstrap peers via VNS
  console.log('\n🔍 Test 5: VNS Bootstrap Discovery');
  const discovered = await discoverBootstrapPeers(
    'bootstrap.vns',
    ['http://localhost:9001']
  );
  assert(discovered.length === 3, `Should discover 3 bootstraps (found ${discovered.length})`);
  assert(discovered.includes('http://bootstrap1.test:3001'), 'Should include bootstrap1');
  assert(discovered.includes('http://bootstrap2.test:3001'), 'Should include bootstrap2');
  assert(discovered.includes('http://bootstrap3.test:3001'), 'Should include bootstrap3');
  
  // Test 6: Expand bootstrap peers (static only)
  console.log('\n🔧 Test 6: Expand Static Bootstrap Peers');
  const expanded1 = await expandBootstrapPeers('http://1.2.3.4:3001,http://5.6.7.8:3001', {
    seedBootstraps: ['http://localhost:9001']
  });
  assert(expanded1.length === 2, `Should return 2 static peers (got ${expanded1.length})`);
  
  // Test 7: Expand bootstrap peers (VNS discovery)
  console.log('\n🔧 Test 7: Expand Bootstrap Peers with VNS Discovery');
  const expanded2 = await expandBootstrapPeers('bootstrap.vns', {
    seedBootstraps: ['http://localhost:9001']
  });
  assert(expanded2.length === 3, `Should discover and return 3 peers (got ${expanded2.length})`);
  
  // Test 8: Expand hybrid (static + discovered)
  console.log('\n🔧 Test 8: Expand Hybrid Config (Static + VNS)');
  const expanded3 = await expandBootstrapPeers('http://static.example.com:3001,bootstrap.vns', {
    seedBootstraps: ['http://localhost:9001']
  });
  assert(expanded3.length === 4, `Should return 4 peers (1 static + 3 discovered, got ${expanded3.length})`);
  assert(expanded3.includes('http://static.example.com:3001'), 'Should include static peer');
  assert(expanded3.includes('http://bootstrap1.test:3001'), 'Should include discovered peer');
  
  // Test 9: Register as bootstrap
  console.log('\n📝 Test 9: Bootstrap Self-Registration');
  const registered = await registerAsBootstrap(
    'bootstrap.vns',
    'http://test-node:3001',
    'http://localhost:9001'
  );
  assert(registered === true, 'Should successfully register as bootstrap');
  
  // Test 10: Handle discovery failure gracefully
  console.log('\n⚠️  Test 10: Discovery Failure Handling');
  const expandedFail = await expandBootstrapPeers('bootstrap.vns', {
    seedBootstraps: ['http://localhost:9999'] // Non-existent server
  });
  assert(expandedFail.length === 0, 'Should return empty array on discovery failure');
  
  // Test 11: Deduplication
  console.log('\n🔄 Test 11: Bootstrap Peer Deduplication');
  const expanded4 = await expandBootstrapPeers('http://bootstrap1.test:3001,bootstrap.vns', {
    seedBootstraps: ['http://localhost:9001']
  });
  // bootstrap1.test appears both in static and discovered - should dedupe
  assert(expanded4.length === 3, `Should deduplicate (got ${expanded4.length})`);
  const counts = {};
  expanded4.forEach(url => counts[url] = (counts[url] || 0) + 1);
  const allUnique = Object.values(counts).every(count => count === 1);
  assert(allUnique, 'All bootstrap URLs should be unique');
  
  // Cleanup
  console.log('\n🧹 Cleanup');
  mockServer.close();
  console.log(`${PASSED} Mock server stopped`);
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Test Results: ${testsPassed}/${testsRun} passed`);
  
  if (testsPassed === testsRun) {
    console.log(`\n${PASSED} All tests passed! ✨\n`);
    process.exit(0);
  } else {
    console.log(`\n${FAILED} ${testsRun - testsPassed} test(s) failed\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`\n${FAILED} Test suite crashed:`, error);
  process.exit(1);
});
