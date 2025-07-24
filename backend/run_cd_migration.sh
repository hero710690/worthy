#!/bin/bash

# CD Asset Support Migration Runner
# This script runs the CD migration with proper environment setup

set -e  # Exit on any error

echo "🚀 Running CD Asset Support Migration..."
echo

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found"
    echo "Please create a .env file with your DATABASE_URL"
    echo "You can copy from .env.example and update the values"
    exit 1
fi

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: python3 not found"
    echo "Please install Python 3"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install required dependencies
echo "📦 Installing required dependencies..."
pip install python-dotenv psycopg2-binary

echo
echo "🔧 Running migration script..."
python migrate_cd_support.py

echo
echo "✅ Migration script completed!"
echo "Check the output above to see if the migration was successful."