#!/bin/sh
# scripts/compliance/check.sh
# Mechanical Development-Practices compliance checker.
#
# Usage:
#   scripts/compliance/check.sh                 # whole project (git ls-files)
#   scripts/compliance/check.sh path/to/dir     # one directory (recursive)
#   scripts/compliance/check.sh path/to/file    # one file
#   scripts/compliance/check.sh f1 f2 ...       # multiple files/dirs
#
# Exit code: 0 if clean, 1 if any violations found.
#
# Checks (mechanical, no LLM):
#   C80    line longer than 80 columns
#   ASCII  non-ASCII byte (rule: File Encoding in development-practices.txt)
#   WS     trailing whitespace
#   EOF    missing final newline
#   BLANK  two or more consecutive blank lines (cap is 1)
#   HDR    .js header missing path, copyright, or licence reference
#          (scans the WHOLE leading comment block, not a fixed window --
#          see hdr_block)
#   BTICK  backtick in .js source (Pluma editor workaround)

set -u

TEXT_EXTS="js css html md txt cld"
# licence/emscripten.txt is Emscripten's LICENSE verbatim: third-party
# text keeps its own line lengths and trailing space, and is never
# re-wrapped to fit (Brian 2026-11-11, "not our work").
SKIP_RE='\.git/\|node_modules/\|\.claude/\|icons/\|Screenshots/\|LICENCE\.TXT\|notes/archive/\|lib/sqlite/\|tests/lib/playwright-core/\|lib/cose-base\.js\|lib/cytoscape-fcose\.js\|lib/cytoscape\.min\.js\|lib/layout-base\.js\|lib/cytoscape-layers\.js\|lib/d3-dispatch\.js\|lib/d3-quadtree\.js\|lib/d3-timer\.js\|lib/d3-force\.js\|licence/emscripten\.txt'

# The file's leading comment block, however long it runs.
#
# Was `head -n 20`. A fixed window truncated any header whose @details ran
# past line 20, so its copyright/licence lines fell outside the window and
# were reported MISSING -- on exactly the files whose headers were richest.
# The cheapest way to silence that is to SHORTEN the header, so the checker
# was quietly teaching contributors to strip the documentation that
# development-practices.txt asks for ("a longer description is encouraged
# when there is more to say"). Found by Brian 2026-07-26 from memory of
# having done it; lib/graph-cache.js was live proof, with 22 lines of real
# design prose and its copyright at line 24.
#
# Skips a leading shebang, requires the block to actually START the file
# (so a headerless file yields nothing and still reports every HDR rule),
# and ends on the first line closing with */ -- which is the house Doxygen
# closer and the plain-comment closer both, while never matching the
# /***...***//** opening line. Capped at 200 lines against a pathological
# file.
hdr_block() {
  awk '
    NR == 1 && /^#!/ { next }
    !seen {
      if ($0 !~ /^[ \t]*\/\*/) exit
      seen = 1
    }
    { print }
    /\*\/[ \t]*$/ { exit }
    NR >= 200 { exit }
  ' "$1"
}

OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

note() {
  # note <RULE> <file> <line-or--> <message>
  printf '%-5s  %s:%s  %s\n' "$1" "$2" "$3" "$4" >> "$OUT"
}

ext_of() {
  case "$1" in
    *.*) printf '%s' "${1##*.}" ;;
    *)   printf '%s' "" ;;
  esac
}

is_text_ext() {
  e=$(ext_of "$1")
  for x in $TEXT_EXTS; do
    [ "$e" = "$x" ] && return 0
  done
  return 1
}

check_file() {
  f="$1"
  [ -f "$f" ] || return 0
  printf '%s' "$f" | grep -q "$SKIP_RE" && return 0
  is_text_ext "$f" || return 0

  # .cld files are for Claude, not humans -- skip 80-col on them.
  if [ "$(ext_of "$f")" != "cld" ]; then
    awk 'length($0) > 80 { print NR }' "$f" | while read -r ln; do
      note C80 "$f" "$ln" "line over 80 columns"
    done
  fi

  LC_ALL=C awk '/[^\t -~]/ { print NR }' "$f" | while read -r ln; do
    note ASCII "$f" "$ln" "non-ASCII byte"
  done

  awk '/[ \t]+$/ { print NR }' "$f" | while read -r ln; do
    note WS "$f" "$ln" "trailing whitespace"
  done

  if [ -s "$f" ]; then
    last=$(tail -c 1 "$f" | od -An -tx1 | tr -d ' \n')
    [ "$last" != "0a" ] && note EOF "$f" "-" "missing final newline"
  fi

  awk '
    /^[[:space:]]*$/ { run++; if (run == 2) print NR; next }
    { run = 0 }
  ' "$f" | while read -r ln; do
    note BLANK "$f" "$ln" "consecutive blank lines (cap is 1)"
  done

  if [ "$(ext_of "$f")" = "js" ]; then
    head=$(hdr_block "$f")
    base=${f##*/}
    printf '%s\n' "$head" | grep -qF "$base" \
      || note HDR "$f" 1 "header missing path/filename reference"
    printf '%s\n' "$head" | grep -q '@brief' \
      || note HDR "$f" 1 "header missing @brief"
    # Two licence cases (Brian 2026-08-21, "a second licence case for
    # this section of code"): DNA Tools code carries a copyright line
    # plus the MIT Licence pointer; the vendored spacewar section
    # carries the original public-domain credit paragraph ONLY -- its
    # licence case lives in licence/spacewar.txt via NOTICE, so no
    # per-file MIT/LICENCE.TXT pointer (Brian 2026-08-23, "just there
    # name and yours").
    case "$f" in
      *Apps/spacewar/*)
        printf '%s\n' "$head" | grep -qi 'public domain' \
          || note HDR "$f" 1 \
            "header missing public-domain credit (spacewar licence case)"
        ;;
      *)
        printf '%s\n' "$head" | grep -qi 'copyright' \
          || note HDR "$f" 1 "header missing copyright"
        printf '%s\n' "$head" | grep -qi 'mit licen[cs]e' \
          || note HDR "$f" 1 "header missing MIT Licence mention"
        printf '%s\n' "$head" | grep -q 'LICENCE\.TXT' \
          || note HDR "$f" 1 "header missing LICENCE.TXT reference"
        ;;
    esac

    awk '/`/ { print NR }' "$f" | while read -r ln; do
      note BTICK "$f" "$ln" "backtick in .js (use string concatenation)"
    done
  fi
}

collect_targets() {
  if [ "$#" -eq 0 ]; then
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
      git ls-files
    else
      find . -type f
    fi
    return
  fi
  for t in "$@"; do
    if [ -d "$t" ]; then
      find "$t" -type f
    elif [ -f "$t" ]; then
      printf '%s\n' "$t"
    fi
  done
}

collect_targets "$@" | while IFS= read -r f; do
  check_file "$f"
done

count=$(wc -l < "$OUT" | tr -d ' ')
if [ "$count" -gt 0 ]; then
  cat "$OUT"
  echo ""
  echo "compliance: $count violation(s) found"
  exit 1
fi

echo "compliance: clean"
exit 0
