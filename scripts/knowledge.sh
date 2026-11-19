#!/bin/bash

# The knowledge base in .agents/knowledge is an Open Knowledge Format (OKF
# v0.2) bundle: one markdown concept per decision, repository constraint or
# playbook.
#
# Usage (from anywhere):
#   ./scripts/knowledge.sh for <path>...   # the concepts to read before editing these paths
#   ./scripts/knowledge.sh index           # rewrite index.md from the concepts' frontmatter
#   ./scripts/knowledge.sh check           # what CI runs: fails when the bundle no longer
#                                          # matches the repository
#
# `check` fails when index.md is out of date, or when a concept:
#   - has no frontmatter, `title` or `description`, or an unknown `type` or `agents_md`;
#   - names a source file or symbol that no longer exists, or a `governs` glob
#     that matches no file;
#   - links to a concept that doesn't exist;
#   - cites a pull request or issue number (concepts state the decision, not its history).

set -uo pipefail

# The same sort order, and so the same index.md, on every machine.
export LC_ALL=C

# Physical paths, so a symlinked directory (/tmp on macOS) still compares equal.
CALLER_DIR=$(pwd -P)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
KB=.agents/knowledge
cd "$ROOT" || exit 1

concepts() {
  find "$KB" -name '*.md' ! -name index.md ! -name log.md | sort
}

# frontmatter <file>: the YAML between the opening and closing `---` lines.
frontmatter() {
  awk 'NR == 1 { if ($0 != "---") exit; next } $0 == "---" { exit } { print }' "$1"
}

# field <file> <key>: a top-level scalar, without surrounding quotes.
field() {
  frontmatter "$1" | sed -nE "s/^$2:[[:space:]]*(.*)$/\1/p" | head -n 1 |
    sed -E 's/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/'
}

# list <file> <key>: the items of a top-level list of scalars.
list() {
  frontmatter "$1" | awk -v key="$2:" '
    $0 == key { inside = 1; next }
    inside && /^  - / { sub(/^  - /, ""); gsub(/^["'\'']|["'\'']$/, ""); print; next }
    inside && !/^  / { inside = 0 }'
}

# sources <file>: "id<TAB>resource<TAB>symbol" for each `sources` entry.
sources() {
  frontmatter "$1" | awk '
    function flush() { if (item) print id "\t" res "\t" sym; id = ""; res = ""; sym = ""; item = 0 }
    function value(line) { sub(/^[^:]*:[[:space:]]*/, "", line); gsub(/^["'\'']|["'\'']$/, "", line); return line }
    $0 == "sources:" { inside = 1; next }
    inside && /^  - / { flush(); item = 1; line = $0; sub(/^  - /, "    ", line); $0 = line }
    inside && /^    id:/ { id = value($0); next }
    inside && /^    resource:/ { res = value($0); next }
    inside && /^    symbol:/ { sym = value($0); next }
    inside && !/^  / { flush(); inside = 0 }
    END { flush() }'
}

# matches <glob>: the tracked and new files a `governs` glob matches.
matches() {
  git ls-files --cached --others --exclude-standard -- ":(glob)$1"
}

check() {
  local problems=0 file dir type value glob id res sym target link cited
  fail() {
    echo "✗ $1: $2"
    problems=$((problems + 1))
  }

  while IFS= read -r file; do
    dir=$(dirname "$file")
    if [ -z "$(frontmatter "$file")" ]; then
      fail "$file" "no frontmatter"
      continue
    fi
    type=$(field "$file" type)
    case "$type" in
      Decision | Constraint | Playbook) ;;
      *) fail "$file" "type must be Decision, Constraint or Playbook" ;;
    esac
    [ -n "$(field "$file" title)" ] || fail "$file" "no title"
    [ -n "$(field "$file" description)" ] || fail "$file" "no description"
    case "$(field "$file" agents_md)" in
      always | when-touching | reference) ;;
      *) fail "$file" "agents_md must be always, when-touching or reference" ;;
    esac
    case "$(field "$file" status)" in
      "" | draft | stable | deprecated) ;;
      *) fail "$file" "status must be draft, stable or deprecated" ;;
    esac

    # A plain YAML value can't contain ": " or " #", or start with ` or @: quote it.
    value=$(frontmatter "$file" | grep -nE "^ *(- )?[A-Za-z_]+: ([^\"'[{|> ].*(: | #|:\$)|[\`@%&*!])" | head -n 1)
    [ -z "$value" ] || fail "$file" "frontmatter line $value isn't valid YAML: quote the value"

    # The parsers below read block lists only, so reject anything they would skip.
    if frontmatter "$file" | grep -qE '^(governs|sources):[[:space:]]*[^[:space:]]'; then
      fail "$file" "write governs and sources as block lists, one '  - ' item per line"
    fi
    if frontmatter "$file" | grep -qx 'governs:' && [ -z "$(list "$file" governs)" ]; then
      fail "$file" "governs has no '  - ' items"
    fi
    if frontmatter "$file" | grep -qx 'sources:' && [ -z "$(sources "$file")" ]; then
      fail "$file" "sources has no '  - ' items"
    fi

    while IFS= read -r glob; do
      [ -n "$(matches "$glob")" ] || fail "$file" "governs $glob, which matches no file"
    done < <(list "$file" governs)

    while IFS=$'\t' read -r id res sym; do
      [ -n "$id" ] || fail "$file" "a sources entry has no id: line"
      [ -n "$res" ] || { fail "$file" "a sources entry has no resource: line"; continue; }
      case "$res" in
        http://* | https://*) continue ;;
        /*) target="$KB$res" ;;
        *) target="$dir/$res" ;;
      esac
      if [ ! -e "$target" ]; then
        fail "$file" "source $res doesn't exist"
      elif [ -n "$sym" ] && ! grep -rqF -- "$sym" "$target"; then
        # -r: a directory source checks the symbol anywhere under it.
        fail "$file" "source $res doesn't contain $sym"
      fi
    done < <(sources "$file")

    # Footnotes point at sources, and every repo source is cited by one, so a pointer
    # in the text never comes loose from a checked file and symbol.
    # Definition lines ("[^id]: ...") don't count: a footnote must be referenced in the body.
    cited=$(grep -vE '^\[\^[A-Za-z0-9_.-]+\]:' "$file" | grep -oE '\[\^[A-Za-z0-9_.-]+\]' |
      sed -E 's/^\[\^//; s/\]$//' | sort -u)
    while IFS= read -r id; do
      [ -z "$id" ] || sources "$file" | cut -f1 | grep -qxF -- "$id" ||
        fail "$file" "footnote [^$id] names no source"
    done <<<"$cited"
    while IFS=$'\t' read -r id res sym; do
      case "$res" in http://* | https://*) continue ;; esac
      [ -z "$id" ] || printf '%s\n' "$cited" | grep -qxF -- "$id" ||
        fail "$file" "source $id isn't cited by any footnote"
    done < <(sources "$file")

    # Every code name in a "Where it lives" bullet must be in a file that bullet
    # footnotes, so renaming a pointed-to symbol fails here too.
    while IFS=$'\t' read -r name ids; do
      value=
      for id in $ids; do
        res=$(sources "$file" | awk -F'\t' -v id="$id" '$1 == id { print $2; exit }')
        case "$res" in "" | http://* | https://*) continue ;; /*) target="$KB$res" ;; *) target="$dir/$res" ;; esac
        if [ -e "$target" ] && grep -rqF -- "$name" "$target"; then value=1; break; fi
      done
      [ -n "$value" ] || [ -z "$ids" ] || fail "$file" "Where it lives names $name, which no file it footnotes contains"
    done < <(awk '
      function emit(   i, n, t, parts, ids, seg) {
        ids = ""; rest = bullet
        while (match(rest, /\[\^[^]]+\]/)) { ids = ids " " substr(rest, RSTART + 2, RLENGTH - 3); rest = substr(rest, RSTART + RLENGTH) }
        rest = bullet
        while (match(rest, /`[^`]+`/)) {
          t = substr(rest, RSTART + 1, RLENGTH - 2); rest = substr(rest, RSTART + RLENGTH)
          if (t ~ /\.([cm]?[jt]s|tsx|ya?ml|md|json|sh|txt|html)$/) continue
          paren = sub(/\(\)$/, "", t)
          if (t !~ /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/) continue
          # Code names only: camelCase, PascalCase, ALL_CAPS, _private, a.b or f().
          if (!paren && t !~ /^_/ && t !~ /\./ && t !~ /[A-Z]/) continue
          n = split(t, parts, ".")
          for (i = 1; i <= n; i++) print parts[i] "\t" ids
        }
      }
      /^# Where it lives$/ { inside = 1; next }
      inside && /^# / { if (bullet != "") emit(); bullet = ""; exit }
      inside && /^- / { if (bullet != "") emit(); bullet = $0; next }
      inside && /^  / { bullet = bullet " " $0 }
      END { if (inside && bullet != "") emit() }' "$file")

    while IFS= read -r link; do
      case "$link" in
        /*) target="$KB$link" ;;
        *) target="$dir/$link" ;;
      esac
      [ -e "${target%%#*}" ] || fail "$file" "links to $link, which doesn't exist"
    done < <(grep -oE '\]\([^)#[:space:]]+\.md(#[^)]*)?\)' "$file" | sed -E 's/^\]\(//; s/\)$//' | grep -vE '^https?:')

    # `#123`, `owner/repo#123`, "PR 123" or "issue 123", a pull or issue URL, or a date.
    history='(^|[^&[:alnum:]_])#[0-9]+([^[:alnum:]_-]|$)|[[:alnum:]_.-]+/[[:alnum:]_.-]+#[0-9]+([^[:alnum:]_-]|$)|\b(PR|[Pp]ull request|[Ii]ssue) #?[0-9]+\b|/(pull|issues)/[0-9]|\b20[0-9]{2}-[01][0-9]-[0-3][0-9]\b'
    if grep -qE "$history" "$file"; then
      fail "$file" "cites history (a PR, issue or date): $(grep -nE "$history" "$file" | head -n 1)"
    fi

  done < <(concepts)

  # AGENTS.md links into the bundle, so a moved concept breaks it too.
  while IFS= read -r link; do
    [ -e "${link%%#*}" ] || fail AGENTS.md "links to $link, which doesn't exist"
  done < <(grep -oE '\]\([^)[:space:]]+\)' AGENTS.md | sed -E 's/^\]\(//; s/\)$//' | grep -vE '^(https?:|#)')

  if ! index | cmp -s - "$KB/index.md"; then
    fail "$KB/index.md" "out of date: run ./scripts/knowledge.sh index"
  fi

  echo
  if ((problems > 0)); then
    echo "$problems problem(s) in $KB. Update the concepts to match the code (see $KB/index.md)."
    return 1
  fi
  echo "✓ $KB: $(concepts | wc -l | tr -d ' ') concepts match the repository."
}

# index: index.md as generated from the concepts' frontmatter, one section per
# folder (OKF §8).
index() {
  local file dir previous= title
  printf -- '---\nokf_version: "0.2"\n---\n'
  # Grouped by folder, so a subfolder's concepts don't split its parent's section.
  while IFS= read -r file; do
    file=${file#"$KB/"}
    dir=$(dirname "$file")
    if [ "$dir" != "$previous" ]; then
      printf '\n# %s\n\n' "$(echo "$dir" | tr '/-' '  ' | awk '{
        for (i = 1; i <= NF; i++) $i = ($i == "ci") ? "CI" : (i == 1 ? toupper(substr($i, 1, 1)) substr($i, 2) : $i)
        print
      }')"
      previous=$dir
    fi
    title=$(field "$KB/$file" title)
    [ "$(field "$KB/$file" status)" = deprecated ] && title="$title (deprecated)"
    printf '* [%s](%s) - %s\n' "$title" "$file" "$(field "$KB/$file" description)"
  done < <(concepts | awk '{ dir = $0; sub(/\/[^\/]*$/, "", dir); print dir "\t" $0 }' | sort | cut -f2)
}

# relative <path>: the path relative to the repository root, resolved from the
# caller's directory. It may not exist yet. Fails for a path outside the repo.
relative() {
  local path=$1
  local dir
  case "$path" in
    /*) ;;
    *) path="$CALLER_DIR/$path" ;;
  esac
  # Resolve symlinks in the part that exists, e.g. /tmp → /private/tmp on macOS.
  dir=$path
  while [ ! -d "$dir" ] && [ "$dir" != / ]; do dir=$(dirname "$dir"); done
  path="$(cd "$dir" && pwd -P)${path#"$dir"}"
  path=$(printf '%s\n' "$path" | awk -F/ '{
    n = 0
    for (i = 1; i <= NF; i++) {
      if ($i == "" || $i == ".") continue
      if ($i == "..") { if (n > 0) n--; continue }
      part[++n] = $i
    }
    out = ""
    for (i = 1; i <= n; i++) out = out "/" part[i]
    print out
  }')
  case "$path" in
    "$ROOT") echo . ;;
    "$ROOT"/*) echo "${path#"$ROOT"/}" ;;
    *) return 1 ;;
  esac
}

# for <path>...: the concepts whose `governs` globs match any of the paths. A
# path can be a file that doesn't exist yet, or a directory (every file in it).
for_paths() {
  local arg path file glob kind value pairs paths resolved=0
  pairs=$(mktemp)
  paths=$(mktemp)
  # Expanded now: `pairs` and `paths` are local and gone by the time EXIT fires.
  trap "rm -f '$pairs' '$paths'" EXIT

  while IFS= read -r file; do
    while IFS= read -r glob; do
      printf '%s\t%s\n' "$file" "$glob"
    done < <(list "$file" governs)
  done < <(concepts) >"$pairs"

  for arg in "$@"; do
    if ! path=$(relative "$arg"); then
      echo "✗ $arg is outside the repository." >&2
      continue
    fi
    resolved=$((resolved + 1))
    if [ -d "$path" ]; then
      printf '%s\t%s/\n' "$arg" "${path%/}"
      git ls-files --cached --others --exclude-standard -- "$path" | awk -v arg="$arg" '{ print arg "\t" $0 }'
    else
      printf '%s\t%s\n' "$arg" "$path"
    fi
  done >"$paths"

  if ((resolved == 0)); then
    rm -f "$pairs" "$paths"
    return 2
  fi

  # Globs are matched as git's `:(glob)` pathspecs read them: `**/` is any
  # number of directories, `*` and `?` stop at `/`.
  awk -F'\t' '
    function regex(glob,    out, i, c) {
      out = "^"
      for (i = 1; i <= length(glob); i++) {
        c = substr(glob, i, 1)
        if (substr(glob, i, 3) == "**/") { out = out "(.*/)?"; i += 2 }
        else if (substr(glob, i, 2) == "**") { out = out ".*"; i++ }
        else if (c == "*") out = out "[^/]*"
        else if (c == "?") out = out "[^/]"
        else if (index(".+^$(){}|[]\\", c)) out = out "\\" c
        else out = out c
      }
      return out "$"
    }
    FNR == NR { concept[++n] = $1; pattern[n] = regex($2); next }
    {
      asked[$1] = 1
      for (i = 1; i <= n; i++) {
        if ($2 ~ pattern[i]) { found[concept[i]] = 1; matched[$1] = 1 }
      }
    }
    END {
      for (c in found) print "concept\t" c
      for (a in asked) if (!(a in matched)) print "none\t" a
    }' "$pairs" "$paths" | sort |
    while IFS=$'\t' read -r kind value; do
      if [ "$kind" = concept ]; then
        echo "$value  ($(field "$value" agents_md)): $(field "$value" description)"
        # Where the knowledge lives in the code: the concept's repo sources.
        while IFS=$'\t' read -r _ res sym; do
          case "$res" in http://* | https://* | /*) continue ;; esac
          echo "    $(relative "$ROOT/$(dirname "$value")/$res")${sym:+  ($sym)}"
        done < <(sources "$value")
      else
        echo "No concept governs $value. AGENTS.md's rules still apply."
      fi
    done

  rm -f "$pairs" "$paths"
  echo
  echo "Read the concepts listed before editing. If your change makes one wrong, update it in the same PR."
}

case "${1:-}" in
  check) check ;;
  index) index >"$KB/index.md" && echo "Wrote $KB/index.md." ;;
  for)
    shift
    if (($# == 0)); then
      echo "Usage: $0 for <path>..." >&2
      exit 2
    fi
    for_paths "$@"
    ;;
  *)
    echo "Usage: $0 check | index | for <path>..." >&2
    exit 2
    ;;
esac
