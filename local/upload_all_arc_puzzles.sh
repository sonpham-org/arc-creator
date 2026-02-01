#!/bin/bash
# Upload ALL ARC puzzles to Railway production server

set -e

# Check if ADMIN_KEY is set
if [ -z "$ADMIN_KEY" ]; then
    echo "❌ Error: ADMIN_KEY environment variable not set"
    echo "   Set it with: export ADMIN_KEY=your_secret_key"
    exit 1
fi

# Railway production URL
SERVER="https://arc-creator-production.up.railway.app"

echo "🚀 Uploading ALL ARC puzzles to Railway production"
echo "   Server: $SERVER"
echo ""

# Upload ARC 2024 datasets
echo "📦 ARC 2024 Training Set..."
python import_arc_puzzles.py --source arc-2024-training --server "$SERVER"
echo ""

echo "📦 ARC 2024 Evaluation Set..."
python import_arc_puzzles.py --source arc-2024-evaluation --server "$SERVER"
echo ""

# Upload ARC 2025 datasets
echo "📦 ARC 2025 Training Set..."
python import_arc_puzzles.py --source arc-2025-training --server "$SERVER"
echo ""

echo "📦 ARC 2025 Evaluation Set..."
python import_arc_puzzles.py --source arc-2025-evaluation --server "$SERVER"
echo ""

echo "✅ ALL ARC puzzles uploaded successfully!"
