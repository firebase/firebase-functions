#!/bin/bash
set -e

# Ensure we run from the repository root
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

show_usage() {
  echo "Firebase Functions Release Manager (Polymorphic)"
  echo "Usage: ./scripts/publish.sh <major|minor|patch> [options]"
  echo ""
  echo "Required Positional Argument:"
  echo "  <major|minor|patch>       The type of SemVer version bump"
  echo ""
  echo "Options:"
  echo "  --prerelease              Flag the build as a release candidate"
  echo "  --dry-run                 Run tests/checks, but skip external writes (no npm/git push)"
  echo "  --branch <name>           The Git branch to check out (defaults to cloned HEAD)"
  echo "  --org <name>              GitHub Organization override (defaults to 'firebase')"
  echo "  --repository <name>       GitHub Repository override (defaults to 'firebase-functions')"
  echo "  --sdk <name>              Name override for Twitter announcements (defaults to repo name)"
  echo "  --dist-tag <tag>          The npm distribution tag (defaults to 'latest')"
  echo "  --project <project>       The GCP project used to run the deploy pipeline"
  exit 1
}

if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  show_usage
fi

BUMP_TYPE=$1
shift

# Validate positional argument
if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "❌ Error: Invalid bump type '$BUMP_TYPE'. Must be 'major', 'minor', or 'patch'."
  exit 1
fi

# Set default values
IS_PRERELEASE=false
DRY_RUN=false
TARGET_BRANCH=""
ORG="firebase"
REPO="firebase-functions"
SDK=""
DIST_TAG="latest"
TARGET_PROJECT="firebase-functions-publishing"

# Parse optional arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --prerelease)
      IS_PRERELEASE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --org)
      ORG="$2"
      shift 2
      ;;
    --repository)
      REPO="$2"
      shift 2
      ;;
    --sdk)
      SDK="$2"
      shift 2
      ;;
    --dist-tag)
      DIST_TAG="$2"
      shift 2
      ;;
    --project)
      TARGET_PROJECT="$2"
      shift 2
      ;;
    *)
      # Legacy positional fallback for tags (e.g. "latest" passed at the end)
      if [[ ! "$1" =~ ^- ]]; then
        DIST_TAG="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "$SDK" ]; then
  SDK="$REPO"
fi

# ==============================================================================
# MODE A: LOCAL ORCHESTRATOR MODE (Runs on your machine)
# ==============================================================================
if [ -z "$BUILD_ID" ]; then
  echo "🖥️  [Orchestrator Mode] Local terminal execution detected."
  
  # 1. Pre-flight CLI checks
  if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: 'gcloud' CLI tool is not installed."
    exit 1
  fi
  if [ -z "$(gcloud config get-value account 2>/dev/null)" ]; then
    echo "❌ Error: No active Google Cloud account detected. Run 'gcloud auth login'."
    exit 1
  fi
  
  # 2. Build parameter mapping
  SUBSTITUTIONS="_BUMP_TYPE=$BUMP_TYPE"
  [ "$IS_PRERELEASE" = true ] && SUBSTITUTIONS+=",_PRERELEASE=true"
  [ "$DRY_RUN" = true ] && SUBSTITUTIONS+=",_DRY_RUN=true"
  [ -n "$TARGET_BRANCH" ] && SUBSTITUTIONS+=",_BRANCH=$TARGET_BRANCH"
  SUBSTITUTIONS+=",_REPOSITORY_ORG=$ORG"
  SUBSTITUTIONS+=",_REPOSITORY_NAME=$REPO"
  SUBSTITUTIONS+=",_SDK=$SDK"
  SUBSTITUTIONS+=",_DIST_TAG=$DIST_TAG"

  echo "--------------------------------------------------------"
  echo "Dispatched Release Parameters:"
  echo "  Bump Type:        $BUMP_TYPE"
  echo "  Is Prerelease:    $IS_PRERELEASE"
  echo "  Is Dry Run:       $DRY_RUN"
  echo "  Target Branch:    ${TARGET_BRANCH:-[default]}"
  echo "  GitHub Host:      $ORG/$REPO"
  echo "  Twitter SDK:      $SDK"
  echo "  NPM Tag:          $DIST_TAG"
  echo "--------------------------------------------------------"

  echo "Dispatched to Cloud Build..."
  gcloud builds submit \
    --project="$TARGET_PROJECT" \
    --config="scripts/publish/cloudbuild.yaml" \
    --substitutions="$SUBSTITUTIONS"
  exit 0
fi

# ==============================================================================
# MODE B: CLOUD WORKER MODE (Runs inside the Cloud Build Docker container)
# ==============================================================================
echo "☁️  [Worker Mode] Cloud Build environment detected (Build ID: $BUILD_ID)."

# 1. Optional Branch Checkout
if [ -n "$TARGET_BRANCH" ]; then
  echo "Checking out target branch: $TARGET_BRANCH..."
  git checkout "$TARGET_BRANCH"
fi

# 2. Clean compilation & test cycle
echo "Running clean installation..."
npm ci

echo "Compiling workspace..."
npm run build

echo "Executing test suite..."
npm test

# 3. Stateless Version Discovery
PACKAGE_NAME=$(node -p "require('./package.json').name")
STABLE_VERSION=$(npm view "$PACKAGE_NAME" version)

echo "--------------------------------------------------------"
echo "Package Name:                  $PACKAGE_NAME"
echo "Current stable version on npm: $STABLE_VERSION"
echo "Target distribution tag:       $DIST_TAG"
echo "Is Prerelease:                 $IS_PRERELEASE"
echo "Dry Run Mode:                  $DRY_RUN"
echo "GitHub Repo Target:            $ORG/$REPO"
echo "--------------------------------------------------------"

# Update package.json version dynamically in runner memory
if [ "$IS_PRERELEASE" = true ]; then
  PRE_BUMP_TYPE="pre${BUMP_TYPE}"
  echo "Preparing prerelease version change using '$PRE_BUMP_TYPE' (preid: rc)..."
  npm version "$STABLE_VERSION" --no-git-tag-version
  npm version "$PRE_BUMP_TYPE" --preid="rc" --no-git-tag-version
else
  echo "Preparing stable version change using '$BUMP_TYPE'..."
  npm version "$STABLE_VERSION" --no-git-tag-version
  npm version "$BUMP_TYPE" --no-git-tag-version
fi

NEXT_VERSION=$(node -p "require('./package.json').version")
echo "Next target version computed: v$NEXT_VERSION"

# 4. NPM Publish Execution
if [ "$DRY_RUN" = true ]; then
  echo "🔍 [Dry Run] Skipping npm publish --tag $DIST_TAG"
else
  echo "Publishing package to npm under tag: $DIST_TAG..."
  npm publish --tag "$DIST_TAG"
fi

# 5. Stateless Changelog Generation (Strict SemVer Tracking)
echo "Calculating history interval to extract release notes..."

PREVIOUS_TAG=""
for tag in $(git log --tags --simplify-by-decoration --pretty="format:%d" | grep -o 'tag: [^,)]*' | sed 's/tag: //'); do
  if echo "$tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
    PREVIOUS_TAG="$tag"
    break
  fi
done

if [ -z "$PREVIOUS_TAG" ]; then
  echo "⚠️ Warning: No stable SemVer tags found. Analyzing full history..."
  CHANGELOG_NOTES="Initial release v$NEXT_VERSION."
else
  echo "Identified stable base: $PREVIOUS_TAG. Harvesting notes up to HEAD..."
  CHANGELOG_NOTES=""
  
  while read -r sha; do
    COMMIT_SUBJECT=$(git log -1 --format="%s" "$sha")
    PR_SUFFIX=$(echo "$COMMIT_SUBJECT" | grep -oE '\(#[0-9]+\)$')

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
fi

if [ -z "$CHANGELOG_NOTES" ]; then
  CHANGELOG_NOTES="- Internal maintenance updates and chore improvements."
fi

echo "----------------- Generated Release Notes -----------------"
echo -e "$CHANGELOG_NOTES"
echo "-----------------------------------------------------------"

# 6. Push Git Tag (Establish upstream state)
if [ "$DRY_RUN" = true ]; then
  echo "🔍 [Dry Run] Skipping creation of tracking tag: v$NEXT_VERSION"
else
  echo "Pushing lightweight tracking tag to origin..."
  git tag "v$NEXT_VERSION"
  git push origin "v$NEXT_VERSION"
fi

# 7. Create GitHub Release
if [ "$DRY_RUN" = true ]; then
  echo "🔍 [Dry Run] Skipping creation of GitHub Release."
else
  echo "Generating GitHub Release notes..."
  echo "$CHANGELOG_NOTES" > release_notes.md

  GH_RELEASE_FLAGS=""
  if [ "$IS_PRERELEASE" = true ]; then
    GH_RELEASE_FLAGS="--prerelease"
  fi

  gh release create "v$NEXT_VERSION" \
    --repo "$ORG/$REPO" \
    --title "v$NEXT_VERSION" \
    --notes-file release_notes.md \
    $GH_RELEASE_FLAGS

  rm release_notes.md
fi

# 8. Twitter Broadcast
if [ "$IS_PRERELEASE" = false ]; then
  if [ "$DRY_RUN" = true ]; then
    echo "🔍 [Dry Run] Skipping Twitter broadcast..."
  else
    echo "Broadcasting stable release to social networks..."
    # node scripts/tweet.js "$SDK@$NEXT_VERSION has been published!"
  fi
fi

if [ "$DRY_RUN" = true ]; then
  echo "🏁 Dry run completed successfully! No modifications were made to remote systems."
else
  echo "🚀 Release of $PACKAGE_NAME@$NEXT_VERSION successfully completed!"
fi