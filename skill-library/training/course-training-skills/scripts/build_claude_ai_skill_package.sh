#!/usr/bin/env bash
# Builds a claude.ai-compatible Custom Skill zip from this repository.
#
# claude.ai's Custom Skill upload requires:
#   - exactly one file named SKILL.md in the whole zip
#   - no .claude-plugin/ plugin manifest (that's Claude Code-specific)
#
# This repo is authored as a Claude Code plugin (10 skills, each with its
# own SKILL.md, plus .claude-plugin/plugin.json), which is NOT directly
# uploadable to claude.ai as-is. This script derives a compliant copy:
#   - drops .claude-plugin/, .git/, .github/, caches
#   - renames every skills/<name>/SKILL.md -> skills/<name>/INSTRUCTIONS.md
#     (kept as ordinary supporting files the root SKILL.md points to)
#   - rewrites every "skills/<name>/SKILL.md" cross-reference in the repo's
#     own docs to match
#   - leaves the root SKILL.md as the single skill entry point
#
# Usage: bash scripts/build_claude_ai_skill_package.sh
# Output: dist/course-training-skills-CLAUDE-SKILL-UPLOAD.zip

set -euo pipefail
cd "$(dirname "$0")/.."   # repo root
REPO_ROOT="$(pwd)"
REPO_NAME="course-training-skills"
BUILD_DIR="$(mktemp -d)"
OUT_DIR="$REPO_ROOT/dist"
OUT_ZIP="$OUT_DIR/${REPO_NAME}-CLAUDE-SKILL-UPLOAD.zip"

mkdir -p "$OUT_DIR"
cp -r . "$BUILD_DIR/$REPO_NAME"

cd "$BUILD_DIR/$REPO_NAME"
rm -rf .git .github dist
find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
rm -rf .pytest_cache

# claude.ai skills can't carry a Claude Code plugin manifest
rm -rf .claude-plugin

# Rename every sub-skill's SKILL.md so only the root SKILL.md remains
for f in skills/*/SKILL.md; do
  mv "$f" "$(dirname "$f")/INSTRUCTIONS.md"
done

# Rewrite cross-references across every markdown file
find . -name "*.md" -print0 | xargs -0 sed -i \
  -e 's#skills/\([a-z-]*\)/SKILL\.md#skills/\1/INSTRUCTIONS.md#g' \
  -e 's#skills/\*/SKILL\.md#skills/*/INSTRUCTIONS.md#g'

cd "$BUILD_DIR"
zip -r -q "$OUT_ZIP" "$REPO_NAME"
rm -rf "$BUILD_DIR"

echo "Built: $OUT_ZIP"
echo "SKILL.md count in package:"
unzip -l "$OUT_ZIP" | grep -c "SKILL\.md$" || true
