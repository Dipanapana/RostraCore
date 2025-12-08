/**
 * API Proxy Route Handler
 *
 * This is the ULTIMATE solution for Mixed Content / stale cache issues.
 *
 * Why this works:
 * 1. This is SERVER-SIDE code - always fresh, never cached in browser
 * 2. Every request goes through this handler (no client-side cache bypass)
 * 3. Old or new JavaScript - doesn't matter, both make requests to /api/v1/*
 * 4. Full control over request/response handling
 *
 * Architecture:
 * Browser → /api/v1/* (same-origin) → This handler → Railway backend
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BACKEND = process.env.RAILWAY_BACKEND_URL ||
  'https://rostracore-production.up.railway.app';

/**
 * Proxy a request to the Railway backend
 */
async function proxyRequest(req: NextRequest, method: string): Promise<NextResponse> {
  let path = req.nextUrl.pathname; // e.g., /api/v1/clients
  const searchParams = req.nextUrl.search; // query string including ?

  // IMPORTANT: Add trailing slash to prevent Railway from redirecting
  // Railway's FastAPI uses redirect_slashes=True which generates 307 redirects
  // with the Railway hostname, causing the browser to bypass our proxy
  if (!path.endsWith('/') && !path.includes('.')) {
    path = path + '/';
  }

  const targetUrl = `${RAILWAY_BACKEND}${path}${searchParams}`;

  // Log for debugging (visible in Vercel function logs)
  console.log(`[API Proxy] ${method} ${path} → ${targetUrl}`);

  // Forward headers (especially Authorization)
  const headers: HeadersInit = {};
  req.headers.forEach((value, key) => {
    // Skip headers that shouldn't be forwarded
    const skipHeaders = ['host', 'connection', 'keep-alive', 'transfer-encoding'];
    if (!skipHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // Forward body for POST/PUT/PATCH
  let body: BodyInit | null = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await req.text();
    } catch (e) {
      // No body or already consumed
      body = null;
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    // Build response headers (skip problematic ones)
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const skipResponseHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
      if (!skipResponseHeaders.includes(key.toLowerCase())) {
        // CRITICAL: Rewrite Location header to keep redirects going through our proxy
        if (key.toLowerCase() === 'location') {
          const location = value;
          // Replace Railway backend URL with our proxy URL
          const rewrittenLocation = location.replace(
            RAILWAY_BACKEND,
            '' // Empty = same-origin, relative URL
          );
          responseHeaders.set(key, rewrittenLocation);
          console.log(`[API Proxy] Rewrote redirect: ${location} → ${rewrittenLocation}`);
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    // Add CORS headers for good measure
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[API Proxy] Error proxying ${method} ${path}:`, error);
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: String(error) },
      { status: 502 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, 'GET');
}

export async function POST(req: NextRequest) {
  return proxyRequest(req, 'POST');
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req, 'PUT');
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req, 'PATCH');
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, 'DELETE');
}
