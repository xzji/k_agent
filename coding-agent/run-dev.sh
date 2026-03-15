#!/bin/bash
# Development runner - Direct execution (no watch mode)
# Watch mode causes issues with TUI apps
# Run this script again after making code changes

echo "🚀 Starting pi..."
echo "💡 Tip: After editing code, press Ctrl+C and run ./run-dev.sh again"
echo ""

npx tsx src/cli.ts "$@"
