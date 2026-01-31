#!/usr/bin/env python3
"""
Test the bulk generator with a small example (no Gemini required)
"""

import requests
import json
import time
import sys
import os

SERVER = "http://localhost:3000"

# Pre-defined test concepts (no Gemini needed)
TEST_CONCEPTS = [
    "Mirror the pattern horizontally",
    "Rotate 90 degrees clockwise",
    "Invert all colors (0→9, 1→8, etc)",
    "Apply gravity - colored cells fall downward",
    "Tile the input pattern in a 2x2 grid",
    "Connect all cells of the same color with lines",
    "Fill enclosed regions with a new color",
    "Repeat the pattern vertically 3 times",
    "Extract and enlarge the central 3x3 region",
    "Swap positions of cells with colors 1 and 2"
]

def create_job(concept, admin_key):
    """Create a job on the server"""
    url = f"{SERVER}/api/jobs"
    try:
        response = requests.post(
            url,
            json={
                "concept": concept,
                "model": "test-batch",
                "adminKey": admin_key
            },
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"❌ Unauthorized - invalid admin key")
        else:
            print(f"❌ Failed to create job: {e}")
        return None
    except Exception as e:
        print(f"❌ Failed to create job: {e}")
        return None

def create_puzzle(job_id, concept, api_key):
    """Create a puzzle for a job"""
    url = f"{SERVER}/api/puzzles"
    try:
        response = requests.post(
            url,
            json={
                "idea": concept,
                "apiKey": api_key,
                "model": None,
                "jobId": job_id
            },
            timeout=60
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed: {e}")
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python test_bulk.py <ADMIN_KEY> <PUZZLE_API_KEY>")
        print("Example: python test_bulk.py my-secret-key sk-ant-...")
        print("")
        print("Or set environment variables:")
        print("  export ADMIN_KEY='your-secret-key'")
        print("  export PUZZLE_API_KEY='sk-ant-...'")
        print("  python test_bulk.py")
        sys.exit(1)
    
    admin_key = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ADMIN_KEY")
    api_key = sys.argv[2] if len(sys.argv) > 2 else os.getenv("PUZZLE_API_KEY")
    
    if not admin_key:
        print("❌ Error: ADMIN_KEY not provided")
        sys.exit(1)
    
    if not api_key:
        print("❌ Error: PUZZLE_API_KEY not provided")
        sys.exit(1)
    
    count = 10
    
    print(f"\n{'='*60}")
    print(f"🧪 Testing Bulk Generation")
    print(f"{'='*60}")
    print(f"Server: {SERVER}")
    print(f"Puzzles: {count}")
    print(f"{'='*60}\n")
    
    concepts = TEST_CONCEPTS[:count]
    jobs = []
    
    # Create jobs
    print("📤 Creating jobs...")
    for i, concept in enumerate(concepts, 1):
        print(f"  [{i}/{len(concepts)}] {concept}")
        job = create_job(concept, admin_key)
        if job:
            jobs.append({"id": job["id"], "concept": concept})
            print(f"    ✓ Job ID: {job['id']}")
        else:
            print(f"    ✗ Skipping...")
        time.sleep(0.5)
    
    if not jobs:
        print("\n❌ No jobs created. Check your admin key.")
        sys.exit(1)
    
    print(f"\n✅ Created {len(jobs)} jobs\n")
    
    # Generate puzzles
    print("🎨 Generating puzzles...")
    successful = 0
    failed = 0
    
    for i, job in enumerate(jobs, 1):
        print(f"[{i}/{len(jobs)}] {job['concept'][:50]}...")
        result = create_puzzle(job["id"], job["concept"], api_key)
        
        if result and not result.get("error"):
            puzzle_id = result.get("id")
            is_existing = result.get("existing", False)
            
            if is_existing:
                print(f"  ℹ️  Exists: {puzzle_id}")
            else:
                print(f"  ✅ Created: {puzzle_id}")
            
            successful += 1
        else:
            error = result.get("error") if result else "Unknown"
            print(f"  ❌ Failed: {error}")
            failed += 1
        
        time.sleep(2)  # Delay between requests
    
    print(f"\n{'='*60}")
    print(f"📊 Results")
    print(f"{'='*60}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Success rate: {successful/len(jobs)*100:.1f}%")
    print(f"{'='*60}")
    print(f"\n🌐 View at: {SERVER}/jobs\n")

if __name__ == "__main__":
    main()
