#!/bin/bash
set -e

USE_OSS_GATE=false
DRY_RUN=true

# Parse optional arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --use-oss-gate)
      USE_OSS_GATE=true
      shift
      ;;
    --no-dry-run)
      DRY_RUN=false
      shift
      ;;
    *)
      echo "❌ Error: Unknown argument '$1'" >&2
      ;;
  esac
done

if [[ "$USE_OSS_GATE" = true && "$DRY_RUN" = false ]]; then
  MANIFEST_NAME="manifest-$(date +%Y%m%d%H%M%S).json"
  gcloud storage cp manifest.json "gs://oss-exit-gate-prod-projects-bucket/firebase-functions/npm/manifests/${MANIFEST_NAME}"
else
  echo "This isn't a live OSS Exit Gate build, so not uploading manifest.json."
fi