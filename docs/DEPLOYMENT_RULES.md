# Deployment Rules - DO NOT SKIP

## Critical Rule: Test Locally Before Pushing

**ALWAYS run a production build locally before pushing to Railway.**

```bash
# 1. Clean build test
cd /home/son/Desktop/GitHub/arc-creator
rm -rf .next
npm run build

# 2. If build succeeds, test production server
npm run start

# 3. Only then push to Railway
git add -A
git commit -m "your message"
git push origin main
```

## Why This Matters

- Railway charges per build minute
- Failed deployments waste time and resources
- Local builds catch 99% of deployment issues
- Much faster iteration cycle

## Common Issues & Fixes

### Node Version Mismatch
**Problem:** "Node.js version X is required"
**Solution:** Check `.node-version` file matches package requirements
```bash
# Current: Node 20.11.0 for Next.js 16 + Prisma 6
cat .node-version
```

### Prisma Issues
**Problem:** Prisma version incompatible with Node
**Solution:** 
- Prisma 6: Node 18, 20, 22
- Prisma 7: Node 20.19+, 22.12+, 24+
```bash
# Test Prisma generation
npx prisma generate
```

### Environment Variables
**Problem:** Missing env vars in Railway
**Solution:** Add to Railway dashboard:
- `DATABASE_URL` (internal Railway URL for production)
- `ADMIN_SECRET_HASH`
- `PUZZLE_API_KEY`

### Build Failures
**Problem:** Build fails on Railway but works locally
**Solution:**
1. Check Railway build logs for the exact error
2. Ensure `.node-version` is committed
3. Verify `package.json` scripts are correct
4. Run `npm ci` (not `npm install`) to match Railway's behavior

## Deployment Checklist

Before every push:
- [ ] `npm run build` succeeds locally
- [ ] No TypeScript errors
- [ ] Prisma schema is valid
- [ ] Environment variables documented
- [ ] `.node-version` matches requirements

## Railway-Specific Notes

- Railway uses `.node-version` to determine Node version
- Uses `npm ci` (lockfile-strict) not `npm install`
- Runs `npm run build` during deployment
- Starts with `npm run start`
- SSL required for production PostgreSQL

## Quick Debug Commands

```bash
# Check Node version
node --version

# Clean install (matches Railway)
rm -rf node_modules package-lock.json
npm install

# Verify Prisma
npx prisma validate
npx prisma generate

# Production build
npm run build

# Production server (local)
npm run start
```
