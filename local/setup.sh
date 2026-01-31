#!/bin/bash

# Quick setup script for the bulk puzzle generator

echo "🚀 Setting up ARC Puzzle Bulk Generator"
echo "========================================"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set your API keys:"
echo "   export GEMINI_API_KEY='your-gemini-key'"
echo "   export PUZZLE_API_KEY='sk-ant-...'"
echo ""
echo "2. Run the generator:"
echo "   python3 generate_puzzles.py --count 10"
echo ""
echo "3. View results at: http://localhost:3000/jobs"
echo ""
