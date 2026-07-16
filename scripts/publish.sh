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
  echo "  --no-dry-run              Perform real write actions (npm publish, git tag, github release)"
  echo "  --force                   Force a release even if there are no new commits since last release"
  echo "  --branch <name>           The Git branch to check out (defaults to cloned HEAD)"
  echo "  --org <name>              GitHub Organization override (defaults to 'firebase')"
  echo "  --repository <name>       GitHub Repository override (defaults to 'firebase-functions')"
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
DRY_RUN=true
FORCE_RELEASE=false
TARGET_BRANCH=""
ORG="firebase"
REPO="firebase-functions"
DIST_TAG="latest"
TARGET_PROJECT="firebase-functions-publishing"

# Parse optional arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --prerelease)
      IS_PRERELEASE=true
      shift
      ;;
    --no-dry-run)
      DRY_RUN=false
      shift
      ;;
    --force)
      FORCE_RELEASE=true
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
  SUBSTITUTIONS+=",_DRY_RUN=$DRY_RUN"
  [ "$FORCE_RELEASE" = true ] && SUBSTITUTIONS+=",_FORCE=true"
  [ -n "$TARGET_BRANCH" ] && SUBSTITUTIONS+=",_BRANCH=$TARGET_BRANCH"
  SUBSTITUTIONS+=",_REPOSITORY_ORG=$ORG"
  SUBSTITUTIONS+=",_REPOSITORY_NAME=$REPO"
  SUBSTITUTIONS+=",_DIST_TAG=$DIST_TAG"

  echo "--------------------------------------------------------"
  echo "Dispatched Release Parameters:"
  echo "  Bump Type:        $BUMP_TYPE"
  echo "  Is Prerelease:    $IS_PRERELEASE"
  echo "  Is Dry Run:       $DRY_RUN"
  echo "  Force Release:    $FORCE_RELEASE"
  echo "  Target Branch:    ${TARGET_BRANCH:-[default]}"
  echo "  GitHub Host:      $ORG/$REPO"
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
echo "Force Release:                 $FORCE_RELEASE"
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

# Generate release notes using the standalone changelog script
CHANGELOG_NOTES=$(./scripts/changelog.sh)

if [ -z "$CHANGELOG_NOTES" ]; then
  if [ "$FORCE_RELEASE" = true ]; then
    echo "⚠️ Warning: No release notes (relnote comments) found since the last release tag ($PREVIOUS_TAG), but continuing due to --force flag."
    CHANGELOG_NOTES="- Internal maintenance updates and chore improvements."
  else
    echo "❌ Error: No release notes (relnote comments) found since the last release tag ($PREVIOUS_TAG). Aborting release. Use --force to override."
    exit 1
  fi
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

if [ "$DRY_RUN" = true ]; then
  echo "🏁 Dry run completed successfully! No modifications were made to remote systems."
else
  echo "🚀 Release of $PACKAGE_NAME@$NEXT_VERSION successfully completed!"
fi