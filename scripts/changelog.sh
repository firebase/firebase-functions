#!/bin/bash
set -e

# Ensure we run from the repository root
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

PREVIOUS_TAG=""
for tag in $(git log --tags --simplify-by-decoration --pretty="format:%d" | grep -o 'tag: [^,)]*' | sed 's/tag: //'); do
  if echo "$tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
    PREVIOUS_TAG="$tag"
    break
  fi
done

if [ -z "$PREVIOUS_TAG" ]; then
  echo "Initial release."
  exit 0
fi

# First pass: Identify all reverted PRs and SHAs in the interval
REVERTED_PRS=" "
REVERTED_SHAS=" "
while read -r sha; do
  COMMIT_SUBJECT=$(git log -1 --format="%s" "$sha")
  if [[ "$COMMIT_SUBJECT" =~ ^Revert[[:space:]]\" ]]; then
    # Extract PR number from revert subject: e.g. Revert "feat: foo (#123)" -> 123
    REVERTED_PR=$(echo "$COMMIT_SUBJECT" | grep -oE '\(#[0-9]+\)' | tr -d '(#)' || true)
    if [ -n "$REVERTED_PR" ]; then
      REVERTED_PRS+="$REVERTED_PR "
    fi

    # Extract reverted commit SHA from the body: e.g. "This reverts commit 8ec5..."
    REVERTED_SHA=$(git log -1 --format="%b" "$sha" | grep -iE 'this reverts commit' | sed -E 's/.*[Tt]his reverts commit[[:space:]]+([0-9a-fA-F]+).*/\1/' || true)
    if [ -n "$REVERTED_SHA" ]; then
      RESOLVED_SHA=$(git rev-parse "$REVERTED_SHA" 2>/dev/null || echo "$REVERTED_SHA")
      REVERTED_SHAS+="$RESOLVED_SHA "
      
      # Also try to get the PR number associated with the reverted commit
      REVERTED_SHA_SUBJECT=$(git log -1 --format="%s" "$RESOLVED_SHA" 2>/dev/null || true)
      if [ -n "$REVERTED_SHA_SUBJECT" ]; then
        REVERTED_SHA_PR=$(echo "$REVERTED_SHA_SUBJECT" | grep -oE '\(#[0-9]+\)' | tr -d '(#)' || true)
        if [ -n "$REVERTED_SHA_PR" ]; then
          REVERTED_PRS+="$REVERTED_SHA_PR "
        fi
      fi
    fi
  fi
done < <(git rev-list "${PREVIOUS_TAG}..HEAD")

CHANGELOG_NOTES=""
while read -r sha; do
  # Check if this SHA was reverted
  FULL_SHA=$(git rev-parse "$sha")
  if [[ "$REVERTED_SHAS" =~ " $FULL_SHA " ]]; then
    continue
  fi

  COMMIT_SUBJECT=$(git log -1 --format="%s" "$sha")
  
  # Skip revert commits themselves
  if [[ "$COMMIT_SUBJECT" =~ ^Revert[[:space:]]\" ]]; then
    continue
  fi

  PR_SUFFIX=$(echo "$COMMIT_SUBJECT" | grep -oE '\(#[0-9]+\)$' || true)
  if [ -n "$PR_SUFFIX" ]; then
    PR_NUM=$(echo "$PR_SUFFIX" | tr -d '(#)')
    if [[ "$REVERTED_PRS" =~ " $PR_NUM " ]]; then
      continue
    fi
  fi

  while read -r line; do
    if [ -n "$line" ]; then
      if echo "$line" | grep -qE '\(#[0-9]+\)$'; then
        CHANGELOG_NOTES+="- $line"$'\n'
      elif [ -n "$PR_SUFFIX" ]; then
        CHANGELOG_NOTES+="- $line $PR_SUFFIX"$'\n'
      else
        CHANGELOG_NOTES+="- $line"$'\n'
      fi
    fi
  done < <(git log -1 --format="%b" "$sha" | \
           grep -iE '^relnotes?:' | \
           grep -vi 'relnotes?:[[:space:]]*none' | \
           sed -E 's/^[Rr]elnotes?:[[:space:]]*//g' | \
           sed -E 's/[[:space:]]*$//')
done < <(git rev-list "${PREVIOUS_TAG}..HEAD")

if [ -z "$CHANGELOG_NOTES" ]; then
  CHANGELOG_NOTES="- Internal maintenance updates and chore improvements."
fi

echo -e "$CHANGELOG_NOTES"
