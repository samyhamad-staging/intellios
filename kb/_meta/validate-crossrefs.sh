#!/bin/bash
# Intellios KB Cross-Reference Validator
# Validates that all prerequisites, related, and next_steps IDs in frontmatter
# resolve to existing articles in the KB.
#
# Usage: bash _meta/validate-crossrefs.sh
# Run from the kb/ directory.

set -euo pipefail

KB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
WARNINGS=0
TOTAL_REFS=0

echo "=============================================="
echo "  Intellios KB Cross-Reference Validator"
echo "=============================================="
echo "KB directory: $KB_DIR"
echo ""

# Step 1: Build registry of all article IDs from frontmatter
declare -A ARTICLE_IDS
echo "--- Building article ID registry ---"
while IFS= read -r file; do
  id=$(grep -m1 '^id:' "$file" 2>/dev/null | sed 's/id: *"\?\([^"]*\)"\?/\1/' | tr -d ' ')
  if [ -n "$id" ]; then
    ARTICLE_IDS["$id"]="$file"
  fi
done < <(find "$KB_DIR" -name "*.md" -not -path "*/_meta/*" -not -name "KB-GOVERNANCE-PLAN.md")
echo "Found ${#ARTICLE_IDS[@]} article IDs"
echo ""

# Step 2: Check all cross-reference fields
echo "--- Validating cross-references ---"
while IFS= read -r file; do
  relpath="${file#$KB_DIR/}"

  # Extract prerequisites, related, next_steps arrays from YAML frontmatter
  in_frontmatter=false
  in_field=""

  while IFS= read -r line; do
    if [ "$line" = "---" ]; then
      if [ "$in_frontmatter" = true ]; then
        break  # End of frontmatter
      else
        in_frontmatter=true
        continue
      fi
    fi

    if [ "$in_frontmatter" = true ]; then
      # Check if this line starts a new field
      if echo "$line" | grep -qE '^(prerequisites|related|next_steps):'; then
        in_field=$(echo "$line" | sed 's/:.*//')
        continue
      fi

      # Check if this is an array item under the current field
      if [ -n "$in_field" ] && echo "$line" | grep -qE '^\s*- '; then
        ref=$(echo "$line" | sed 's/^\s*- *"\?\([^"]*\)"\?/\1/' | tr -d ' ')
        if [ -n "$ref" ]; then
          TOTAL_REFS=$((TOTAL_REFS + 1))

          # Check if ref is a valid article ID (format: NN-NNN)
          if echo "$ref" | grep -qE '^[0-9]{2}-[0-9]{3}$'; then
            if [ -z "${ARTICLE_IDS[$ref]+x}" ]; then
              echo "ERROR: $relpath → $in_field references '$ref' but no article with this ID exists"
              ERRORS=$((ERRORS + 1))
            fi
          else
            echo "WARNING: $relpath → $in_field contains non-ID reference: '$ref'"
            WARNINGS=$((WARNINGS + 1))
          fi
        fi
      elif echo "$line" | grep -qE '^[a-z]'; then
        in_field=""  # New field started
      fi
    fi
  done < "$file"

done < <(find "$KB_DIR" -name "*.md" -not -path "*/_meta/*" -not -name "KB-GOVERNANCE-PLAN.md")

echo ""
echo "=============================================="
echo "  Validation Results"
echo "=============================================="
echo "Total cross-references checked: $TOTAL_REFS"
echo "Errors (broken references):     $ERRORS"
echo "Warnings (non-ID references):   $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All cross-references are valid!"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  No broken references, but $WARNINGS warnings found."
  exit 0
else
  echo "❌ $ERRORS broken references found. Fix before publishing."
  exit 1
fi
