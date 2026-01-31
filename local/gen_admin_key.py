#!/usr/bin/env python3
"""
Generate a secure admin key and its hash for Railway.

Usage:
    python gen_admin_key.py
    
The output will give you:
1. Your secret ADMIN_KEY (keep this private!)
2. The ADMIN_SECRET_HASH to set on Railway
"""

import secrets
import hashlib

def main():
    # Generate a secure random key (32 bytes = 256 bits, base64url encoded)
    admin_key = secrets.token_urlsafe(32)
    
    # Generate SHA-256 hash
    admin_hash = hashlib.sha256(admin_key.encode()).hexdigest()
    
    print("\n" + "=" * 60)
    print("🔐 Admin Key Generator")
    print("=" * 60)
    
    print("\n📋 YOUR SECRET ADMIN KEY (keep this private!):")
    print(f"   {admin_key}")
    
    print("\n📋 HASH FOR RAILWAY (set as ADMIN_SECRET_HASH):")
    print(f"   {admin_hash}")
    
    print("\n" + "-" * 60)
    print("📝 Setup Instructions:")
    print("-" * 60)
    
    print("\n1. On Railway, add this environment variable:")
    print(f"   ADMIN_SECRET_HASH={admin_hash}")
    
    print("\n2. Locally, when running scripts, use:")
    print(f"   export ADMIN_KEY='{admin_key}'")
    
    print("\n3. Or pass directly to the test script:")
    print(f"   python test_bulk.py '{admin_key}' 'sk-ant-...'")
    
    print("\n⚠️  IMPORTANT:")
    print("   - Never share or commit your ADMIN_KEY")
    print("   - Only the HASH goes on Railway")
    print("   - If compromised, generate a new key")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
