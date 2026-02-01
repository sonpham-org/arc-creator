#!/usr/bin/env python3
"""
Import official ARC puzzles into the ARC Creator platform.

This script reads ARC puzzle datasets from the data/ directory and uploads them
to the platform via the admin API.

Usage:
    python import_arc_puzzles.py --source arc-2024-training --server http://localhost:3000
    python import_arc_puzzles.py --source arc-2025-evaluation --limit 10
"""

import os
import sys
import json
import argparse
import requests
from pathlib import Path
from typing import Dict, Any


def load_arc_dataset(data_dir: Path, year: str, split: str) -> Dict[str, Any]:
    """Load ARC dataset from JSON file and merge with solutions."""
    filename_map = {
        'training': f'arc-agi_training_challenges.json',
        'evaluation': f'arc-agi_evaluation_challenges.json',
        'test': f'arc-agi_test_challenges.json',
    }
    
    solution_map = {
        'training': f'arc-agi_training_solutions.json',
        'evaluation': f'arc-agi_evaluation_solutions.json',
        'test': None,  # Test sets don't have solutions
    }
    
    challenges_path = data_dir / f'arc-{year}' / filename_map[split]
    solutions_path = data_dir / f'arc-{year}' / solution_map[split] if solution_map[split] else None
    
    if not challenges_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {challenges_path}")
    
    print(f"📂 Loading challenges from: {challenges_path}")
    
    with open(challenges_path, 'r') as f:
        challenges = json.load(f)
    
    # Load solutions if available
    solutions = {}
    if solutions_path and solutions_path.exists():
        print(f"📂 Loading solutions from: {solutions_path}")
        with open(solutions_path, 'r') as f:
            solutions = json.load(f)
    
    # Merge test outputs from solutions into challenges
    for puzzle_id, puzzle_data in challenges.items():
        if puzzle_id in solutions:
            # Merge test outputs
            test_cases = puzzle_data.get('test', [])
            test_solutions = solutions[puzzle_id]
            
            for i, test_case in enumerate(test_cases):
                if i < len(test_solutions):
                    test_case['output'] = test_solutions[i]
            
            print(f"✓ Merged {len(test_solutions)} test solutions for {puzzle_id}")
    
    return challenges


def import_puzzles(server_url: str, admin_key: str, source: str, puzzles: Dict[str, Any], limit: int = None):
    """Import puzzles to the server via admin API."""
    url = f"{server_url}/api/admin/puzzles/import"
    
    # Apply limit if specified
    if limit:
        puzzle_items = list(puzzles.items())[:limit]
        puzzles = dict(puzzle_items)
        print(f"⚠️  Limiting import to {limit} puzzles")
    
    total = len(puzzles)
    print(f"\n📤 Uploading {total} puzzles to {server_url}...")
    print(f"   Source: {source}")
    
    payload = {
        "adminKey": admin_key,
        "source": source,
        "puzzles": puzzles
    }
    
    try:
        response = requests.post(url, json=payload, timeout=300)  # 5 min timeout for large imports
        response.raise_for_status()
        
        result = response.json()
        
        print(f"\n✅ Import complete!")
        print(f"   Imported: {result['imported']}")
        print(f"   Skipped (already exist): {result['skipped']}")
        print(f"   Failed: {result['failed']}")
        
        if result.get('errors'):
            print(f"\n❌ Errors encountered:")
            for error in result['errors'][:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(result['errors']) > 10:
                print(f"   ... and {len(result['errors']) - 10} more")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Failed to import puzzles: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"   Server response: {error_detail}")
            except:
                print(f"   Server response: {e.response.text[:200]}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Import official ARC puzzles')
    parser.add_argument(
        '--source',
        required=True,
        choices=[
            'arc-2024-training',
            'arc-2024-evaluation',
            'arc-2024-test',
            'arc-2025-training',
            'arc-2025-evaluation',
            'arc-2025-test',
        ],
        help='ARC dataset source to import'
    )
    parser.add_argument(
        '--server',
        default='http://localhost:3000',
        help='Server URL (default: http://localhost:3000)'
    )
    parser.add_argument(
        '--data-dir',
        type=Path,
        default=Path(__file__).parent.parent / 'data',
        help='Path to data directory containing ARC datasets'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of puzzles to import (for testing)'
    )
    
    args = parser.parse_args()
    
    # Get admin key from environment
    admin_key = os.getenv('ADMIN_KEY')
    if not admin_key:
        print("❌ Error: ADMIN_KEY environment variable not set")
        print("   Set it with: export ADMIN_KEY=your_secret_key")
        sys.exit(1)
    
    # Parse source
    parts = args.source.split('-')
    year = parts[1]  # e.g., '2024'
    split = '-'.join(parts[2:])  # e.g., 'training', 'evaluation'
    
    # Load dataset
    try:
        puzzles = load_arc_dataset(args.data_dir, year, split)
        print(f"✓ Loaded {len(puzzles)} puzzles")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # Import puzzles
    import_puzzles(
        server_url=args.server.rstrip('/'),
        admin_key=admin_key,
        source=args.source,
        puzzles=puzzles,
        limit=args.limit
    )


if __name__ == '__main__':
    main()
