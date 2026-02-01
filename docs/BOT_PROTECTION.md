# Bot Protection Strategy

## Goal

Protect the website against bots, scrapers, and abuse. Must be free or near-free.

## Recommended Layered Approach (All Free)

### Layer 1: Cloudflare Proxy (FREE - Highest Impact)

Put Cloudflare in front of Railway. This is the single most impactful action.

**What you get on the free plan**:
- DDoS mitigation (Layer 3/4)
- Bot Fight Mode (auto-detects and blocks bot traffic)
- AI Bot Blocking (one-click toggle to block AI scrapers)
- IP reputation filtering
- CDN caching (reduces Railway bandwidth)

**Setup options**:
1. **DNS proxy**: Point your domain's DNS through Cloudflare (orange cloud enabled), CNAME to Railway service
2. **Cloudflare Tunnel**: Railway has a [one-click template](https://railway.com/deploy/cf-tunnel) for secure tunnels

**Important**: Railway does NOT provide application-layer (Layer 7) DDoS protection or a WAF. They officially recommend using Cloudflare.

### Layer 2: Cloudflare Turnstile on Forms (FREE)

Invisible CAPTCHA replacement. No puzzles, no friction for real users.

- Free for ~1M verifications/month
- Works on any website (does not require Cloudflare proxy)
- Add to: feedback forms, rating submissions, puzzle creation

**Comparison with alternatives**:
| Solution | Free Tier | User Experience |
|---|---|---|
| **Cloudflare Turnstile** | ~1M/month | Invisible |
| Google reCAPTCHA v3 | 10K/month (slashed in 2025) | Invisible but privacy concerns |
| hCaptcha | Limited | Image puzzles (annoying) |

### Layer 3: Next.js Middleware Rate Limiting (FREE)

Basic in-memory rate limiting. No dependencies.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 60;

  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

**Limitation**: In-memory state resets on redeploy. For persistent rate limiting, use Upstash Redis (500K commands/month free).

### Layer 4: Honeypot Fields on Forms (FREE)

Hidden form fields that real users never see but bots auto-fill.

```tsx
// Add to any form
<input
  type="text"
  name="website_url"
  style={{ position: 'absolute', left: '-9999px' }}
  tabIndex={-1}
  autoComplete="off"
/>
```

Server-side: reject any submission where `website_url` has a value.

### Layer 5: User-Agent Filtering (FREE)

Block known bot user-agents in middleware:

```typescript
const BLOCKED_UAS = [/curl/i, /wget/i, /python-requests/i, /scrapy/i, /httpclient/i];
const ua = request.headers.get('user-agent') ?? '';
if (BLOCKED_UAS.some(re => re.test(ua))) {
  return new NextResponse('Forbidden', { status: 403 });
}
```

Note: Trivially spoofed, but catches lazy bots.

### Layer 6 (Optional): Client-Side Bot Detection (FREE)

**FingerprintJS BotD** - open source, MIT license:
- Detects automation tools (Puppeteer, Playwright, Selenium)
- Detects browser spoofing and virtual machines
- Runs in browser, no server cost
- [github.com/fingerprintjs/BotD](https://github.com/fingerprintjs/BotD)

## Scaling Up (If Needed Later)

If the free layers aren't enough:

| Tool | Free Tier | What It Adds |
|---|---|---|
| **Arcjet** | Free tier available | All-in-one SDK: bot detection + rate limiting + email validation in Next.js middleware |
| **Upstash Redis** | 500K commands/month | Distributed rate limiting that persists across deploys |
| **Cloudflare Pro** | $20/month | WAF rules, advanced bot management, analytics |

## CSRF Protection

Next.js Server Actions already have built-in CSRF protection (Origin vs Host header check). For custom API routes, ensure:
- `SameSite=Strict` on auth cookies
- Validate `Origin` header on mutating endpoints

## Implementation Priority

1. **Now**: Set up Cloudflare DNS proxy (10 min, biggest impact)
2. **Now**: Add Turnstile to feedback/rating forms
3. **Soon**: Add middleware rate limiting
4. **Soon**: Add honeypot fields to forms
5. **Later**: Add BotD client-side detection if abuse is observed
6. **Later**: Upstash Redis for distributed rate limiting if scaling to multiple instances

## Total Cost: $0/month
