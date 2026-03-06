#!/bin/bash

# Copy all Next.js source maps to a specific folder for RiviumTrace upload
# Usage: npm run copy-sourcemaps

OUTPUT_DIR="sourcemaps-upload"

echo "🔍 Finding all source maps in .next directory..."

if [ ! -d ".next" ]; then
  echo "❌ Error: .next directory not found. Please run 'npm run build' first."
  exit 1
fi

# Count source maps
TOTAL=$(find .next -name "*.js.map" -type f | wc -l | tr -d ' ')
echo "✅ Found $TOTAL source map files"

# Create output directory
if [ -d "$OUTPUT_DIR" ]; then
  echo "🗑️  Cleaning existing $OUTPUT_DIR directory..."
  rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"
echo "📁 Created $OUTPUT_DIR directory"

# Copy all source maps preserving directory structure
echo "📋 Copying source maps..."
find .next -name "*.js.map" -type f | while read -r file; do
  # Get relative path from .next
  rel_path=$(echo "$file" | sed 's|^.next/||')

  # Create subdirectory if needed
  dir=$(dirname "$OUTPUT_DIR/$rel_path")
  mkdir -p "$dir"

  # Copy file
  cp "$file" "$OUTPUT_DIR/$rel_path"
done

# Get total size
SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)

echo ""
echo "✅ All source maps copied successfully!"
echo "📁 Location: $OUTPUT_DIR/"
echo "📊 Total files: $TOTAL"
echo "💾 Total size: $SIZE"
echo ""
echo "📤 You can now upload the entire '$OUTPUT_DIR' folder to your RiviumTrace dashboard"
echo "💡 Tip: Tag with version: $(node -p "require('./package.json').version" 2>/dev/null || echo 'v1.0.0')"
