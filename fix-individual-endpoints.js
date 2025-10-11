#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of individual creator endpoints that need OAuth migration
const endpoints = [
  'app/api/creators/[creatorUuid]/followers/route.ts',
  'app/api/creators/[creatorUuid]/earnings/route.ts'
];

function fixEndpoint(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace imports
  content = content.replace(
    /import { NextRequest, NextResponse } from "next\/server";/,
    'import { NextRequest, NextResponse } from "next/server";\nimport { makeAuthenticatedRequest, isAuthenticated, getAuthUrl } from "@/lib/oauth";'
  );
  
  // Replace API key check with OAuth check
  content = content.replace(
    /const apiKey = process\.env\.FANVUE_API_KEY;\s*const apiVersion = process\.env\.FANVUE_API_VERSION \|\| "2025-06-26";\s*if \(!apiKey\) \{\s*return NextResponse\.json\(\s*\{ error: "API key not configured" \},\s*\{ status: 500 \}\s*\);\s*\}/,
    `// Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { 
          error: "Authentication required",
          authUrl: getAuthUrl()
        },
        { status: 401 }
      );
    }`
  );
  
  // Replace fetchWithRetry with makeAuthenticatedRequest
  content = content.replace(
    /const response = await fetchWithRetry\(fanvueUrl, \{\s*method: "GET",\s*headers: \{\s*"X-Fanvue-API-Key": apiKey,\s*"X-Fanvue-API-Version": apiVersion,\s*"Content-Type": "application/json",\s*\},\s*\}\);/,
    'const response = await makeAuthenticatedRequest(fanvueUrl, {\n        method: "GET",\n      }, request);'
  );
  
  // Remove fetchWithRetry function definition
  content = content.replace(
    /\/\/ Rate limiting utility\s*async function fetchWithRetry\([^}]+\}\s*\n/g,
    ''
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
}

// Fix all endpoints
endpoints.forEach(endpoint => {
  const fullPath = path.join(process.cwd(), endpoint);
  if (fs.existsSync(fullPath)) {
    fixEndpoint(fullPath);
  } else {
    console.log(`❌ File not found: ${endpoint}`);
  }
});

console.log('🎉 All individual creator endpoints migrated to OAuth!');
