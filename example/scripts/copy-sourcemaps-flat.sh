#!/bin/bash

# Copy all Next.js source maps to a single flat folder with unique names
# Usage: npm run copy-sourcemaps-flat

OUTPUT_DIR="sourcemaps-flat"

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

# Copy all source maps with unique names
echo "📋 Copying source maps with unique names..."
counter=1
find .next -name "*.js.map" -type f | while read -r file; do
  # Get original filename
  basename=$(basename "$file")

  # Create unique name: counter_originalname.map
  unique_name=$(printf "%04d_%s" $counter "$basename")

  # Copy file with unique name
  cp "$file" "$OUTPUT_DIR/$unique_name"

  counter=$((counter + 1))
done

# Get total size
SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)

echo ""
echo "✅ All source maps copied successfully!"
echo "📁 Location: $OUTPUT_DIR/"
echo "📊 Total files: $TOTAL"
echo "💾 Total size: $SIZE"
echo ""
echo "📤 You can now upload all files from '$OUTPUT_DIR' folder to your RiviumTrace dashboard"
echo "💡 Note: Files are renamed with numbers (0001_file.map, 0002_file.map, etc.)"
echo "💡 Tip: Tag with version: $(node -p "require('./package.json').version" 2>/dev/null || echo 'v1.0.0')"
