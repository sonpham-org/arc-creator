#!/usr/bin/env python3
"""
Bulk ARC Puzzle Generator

This script uses Google Gemini to brainstorm diverse puzzle concepts
and spawns jobs to create puzzles on the server.

Usage:
    python generate_puzzles.py --count 100 --server http://localhost:3000

Environment Variables:
    GEMINI_API_KEY: Google Gemini API key
    PUZZLE_API_KEY: API key for puzzle generation (Anthropic/OpenAI)
    ADMIN_KEY: Secret admin key for creating bulk jobs
"""

import os
import sys
import argparse
import requests
import json
import time
from typing import List, Dict
from datetime import datetime

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: google-genai not installed.")
    print("Install it with: pip install google-genai")
    sys.exit(1)


class PuzzleGenerator:
    def __init__(self, server_url: str, gemini_key: str, puzzle_api_key: str = None, admin_key: str = None, model: str = "gemini-2.0-flash-exp"):
        self.server_url = server_url.rstrip('/')
        self.gemini_key = gemini_key
        self.puzzle_api_key = puzzle_api_key
        self.admin_key = admin_key
        self.puzzle_model = model
        
        # Configure Gemini
        self.client = genai.Client(api_key=gemini_key)
        
    def generate_concepts(self, count: int) -> List[str]:
        """Use Gemini to brainstorm diverse puzzle concepts"""
        print(f"\n🧠 Brainstorming {count} diverse puzzle concepts with Gemini...")
        
        prompt = f"""Generate {count} diverse and creative concepts for ARC (Abstraction and Reasoning Corpus) puzzles.

Each concept should be:
1. Unique and different from others
2. Based on visual/spatial transformations
3. Describable in 1-2 sentences
4. Suitable for grid-based puzzles

Include variety across these categories:
- Geometric transformations (rotation, reflection, scaling)
- Color operations (inversion, swapping, patterns)
- Spatial reasoning (gravity, connectivity, symmetry)
- Pattern recognition (repeating, tiling, fractals)
- Logical rules (if-then, counting, comparison)
- Object manipulation (moving, copying, deleting)

Format your response as a JSON array of strings, where each string is a concept description.
Example: ["Mirror the pattern horizontally", "Rotate each colored region 90 degrees clockwise"]

Output ONLY the JSON array, no additional text."""

        try:
            response = self.client.models.generate_content(
                model='gemini-exp-1206',
                contents=prompt
            )
            
            # Extract JSON from response
            text = response.text.strip()
            
            # Try to find JSON array in the response
            if text.startswith('['):
                concepts = json.loads(text)
            else:
                # Try to extract JSON from markdown code blocks
                if '```json' in text:
                    json_start = text.find('```json') + 7
                    json_end = text.find('```', json_start)
                    text = text[json_start:json_end].strip()
                elif '```' in text:
                    json_start = text.find('```') + 3
                    json_end = text.find('```', json_start)
                    text = text[json_start:json_end].strip()
                
                concepts = json.loads(text)
            
            if not isinstance(concepts, list):
                raise ValueError("Response is not a list")
            
            if len(concepts) < count:
                print(f"⚠️  Generated {len(concepts)} concepts (requested {count})")
            
            return concepts[:count]
            
        except Exception as e:
            print(f"❌ Error generating concepts with Gemini: {e}")
            print(f"Response: {response.text if 'response' in locals() else 'No response'}")
            sys.exit(1)
    
    def create_job(self, concept: str) -> Dict:
        """Create a job on the server"""
        url = f"{self.server_url}/api/jobs"
        
        try:
            response = requests.post(
                url,
                json={
                    "concept": concept,
                    "model": self.puzzle_model,
                    "adminKey": self.admin_key
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to create job: {e}")
            return None
    
    def create_puzzle(self, job_id: str, concept: str) -> Dict:
        """Create a puzzle for a job"""
        url = f"{self.server_url}/api/puzzles"
        
        try:
            payload = {
                "idea": concept,
                "model": None,  # Use default model
                "jobId": job_id
            }
            
            # Only include apiKey if provided
            if self.puzzle_api_key:
                payload["apiKey"] = self.puzzle_api_key
            
            response = requests.post(
                url,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to create puzzle: {e}")
            return None
    
    def get_job_status(self, job_id: str) -> Dict:
        """Get job status from server"""
        url = f"{self.server_url}/api/jobs/{job_id}"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get job status: {e}")
            return None
    
    def run(self, count: int, delay: float = 2.0):
        """Main execution flow"""
        print(f"\n{'='*60}")
        print(f"🚀 ARC Puzzle Bulk Generator")
        print(f"{'='*60}")
        print(f"Server: {self.server_url}")
        print(f"Concepts to generate: {count}")
        print(f"Delay between requests: {delay}s")
        print(f"{'='*60}\n")
        
        # Step 1: Generate concepts
        concepts = self.generate_concepts(count)
        print(f"\n✅ Generated {len(concepts)} concepts!\n")
        
        # Preview concepts
        print("📋 Preview of concepts:")
        for i, concept in enumerate(concepts[:5], 1):
            print(f"  {i}. {concept}")
        if len(concepts) > 5:
            print(f"  ... and {len(concepts) - 5} more\n")
        
        # Step 2: Create jobs
        print(f"\n📤 Creating jobs on server...")
        jobs = []
        for i, concept in enumerate(concepts, 1):
            print(f"  [{i}/{len(concepts)}] Creating job: {concept[:60]}...")
            job = self.create_job(concept)
            if job:
                jobs.append({
                    "id": job["id"],
                    "concept": concept,
                    "status": "pending"
                })
                print(f"    ✓ Job created: {job['id']}")
            else:
                print(f"    ✗ Failed to create job")
            
            if delay > 0 and i < len(concepts):
                time.sleep(delay)
        
        print(f"\n✅ Created {len(jobs)} jobs!\n")
        
        # Step 3: Start puzzle generation
        print(f"\n🎨 Starting puzzle generation...")
        print(f"{'='*60}\n")
        
        successful = 0
        failed = 0
        
        for i, job in enumerate(jobs, 1):
            concept = job["concept"]
            job_id = job["id"]
            
            print(f"[{i}/{len(jobs)}] Generating puzzle: {concept[:60]}...")
            print(f"  Job ID: {job_id}")
            
            result = self.create_puzzle(job_id, concept)
            
            if result and not result.get("error"):
                puzzle_id = result.get("id")
                is_existing = result.get("existing", False)
                
                if is_existing:
                    print(f"  ℹ️  Puzzle already exists: {puzzle_id}")
                else:
                    print(f"  ✅ Puzzle created: {puzzle_id}")
                
                successful += 1
            else:
                error = result.get("error") if result else "Unknown error"
                print(f"  ❌ Failed: {error}")
                failed += 1
            
            print()
            
            if delay > 0 and i < len(jobs):
                time.sleep(delay)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"📊 Summary")
        print(f"{'='*60}")
        print(f"Total concepts: {len(concepts)}")
        print(f"Jobs created: {len(jobs)}")
        print(f"Puzzles successful: {successful}")
        print(f"Puzzles failed: {failed}")
        print(f"Success rate: {successful/len(jobs)*100:.1f}%")
        print(f"{'='*60}\n")
        
        # Show where to view results
        print(f"🌐 View results at: {self.server_url}/history\n")


def main():
    parser = argparse.ArgumentParser(
        description="Bulk generate ARC puzzles using Gemini for concept generation"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of puzzle concepts to generate (default: 10)"
    )
    parser.add_argument(
        "--server",
        type=str,
        default="http://localhost:3000",
        help="Server URL (default: http://localhost:3000)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Delay between API requests in seconds (default: 2.0)"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="gemini-2.0-flash-exp",
        help="Model to use for puzzle generation (default: gemini-2.0-flash-exp)"
    )
    
    args = parser.parse_args()
    
    # Get API keys from environment
    gemini_key = os.getenv("GEMINI_API_KEY")
    puzzle_api_key = os.getenv("PUZZLE_API_KEY")  # Optional
    admin_key = os.getenv("ADMIN_KEY")
    
    if not gemini_key:
        print("❌ Error: GEMINI_API_KEY environment variable not set")
        print("   Set it with: export GEMINI_API_KEY='your-key-here'")
        sys.exit(1)
    
    if not admin_key:
        print("❌ Error: ADMIN_KEY environment variable not set")
        print("   This is your secret admin key for creating bulk jobs")
        print("   Set it with: export ADMIN_KEY='your-secret-key'")
        sys.exit(1)
    
    if not puzzle_api_key:
        print("⚠️  Warning: PUZZLE_API_KEY not set")
        print("   Will use server's default API key (if configured)")
        print("")
    
    # Run the generator
    generator = PuzzleGenerator(
        server_url=args.server,
        gemini_key=gemini_key,
        puzzle_api_key=puzzle_api_key,
        admin_key=admin_key,
        model=args.model
    )
    
    try:
        generator.run(count=args.count, delay=args.delay)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. Exiting...")
        sys.exit(0)


if __name__ == "__main__":
    main()
