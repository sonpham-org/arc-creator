#!/usr/bin/env python3
"""
Fix tags for existing ARC puzzles in the database.
Changes tags from ["arc", "2024", "training"] to ["ARC-AGI 2024", "training"]

Usage:
    python fix_puzzle_tags.py --server https://arc-creator-production.up.railway.app
"""

import os
import sys
import argparse
import requests


def fix_tags(server_url: str, admin_key: str):
    """Fix puzzle tags via admin API."""
    
    # First, get all puzzles
    print("📂 Fetching all puzzles...")
    resp = requests.get(f"{server_url}/api/puzzles")
    resp.raise_for_status()
    puzzles = resp.json()
    
    print(f"✓ Found {len(puzzles)} puzzles\n")
    
    fixed_count = 0
    skip_count = 0
    
    for puzzle in puzzles:
        puzzle_id = puzzle['id']
        old_tags = puzzle.get('tags', [])
        
        # Check if tags need fixing
        # Old format: ["arc", "2024", "training"] or ["arc", "2025", "evaluation"]
        # New format: ["ARC-AGI 2024", "training"] or ["ARC-AGI 2025", "evaluation"]
        
        if not old_tags or len(old_tags) < 2:
            skip_count += 1
            continue
        
        # Check if already in new format
        if any(tag.startswith('ARC-AGI') for tag in old_tags):
            skip_count += 1
            continue
        
        # Fix the tags
        new_tags = []
        year = None
        split_type = None
        
        for tag in old_tags:
            if tag.lower() == 'arc':
                continue  # Remove 'arc' tag
            elif tag in ['2024', '2025']:
                year = tag
            elif tag in ['training', 'evaluation', 'test']:
                split_type = tag
        
        if year:
            new_tags.append(f"ARC-AGI {year}")
        if split_type:
            new_tags.append(split_type)
        
        if new_tags == old_tags:
            skip_count += 1
            continue
        
        # Update the puzzle
        print(f"Fixing {puzzle_id}: {old_tags} → {new_tags}")
        
        update_resp = requests.patch(
            f"{server_url}/api/admin/puzzles/{puzzle_id}",
            json={
                "adminKey": admin_key,
                "tags": new_tags
            }
        )
        
        if update_resp.status_code == 200:
            fixed_count += 1
        else:
            print(f"  ❌ Failed: {update_resp.text}")
    
    print(f"\n✅ Done!")
    print(f"   Fixed: {fixed_count}")
    print(f"   Skipped: {skip_count}")


def main():
    parser = argparse.ArgumentParser(description='Fix ARC puzzle tags')
    parser.add_argument(
        '--server',
        default='http://localhost:3000',
        help='Server URL (default: http://localhost:3000)'
    )
    
    args = parser.parse_args()
    
    # Get admin key from environment
    admin_key = os.getenv('ADMIN_KEY')
    if not admin_key:
        print("❌ Error: ADMIN_KEY environment variable not set")
        print("   Set it with: export ADMIN_KEY=your_secret_key")
        sys.exit(1)
    
    fix_tags(
        server_url=args.server.rstrip('/'),
        admin_key=admin_key
    )


if __name__ == '__main__':
    main()
