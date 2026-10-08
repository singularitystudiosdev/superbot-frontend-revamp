#!/bin/sh
# superbot bootstrap — one line for mac and linux:
#   curl -fsSL {{ORIGIN}}/bootstrap.sh | sh
# In order: install the Helper (superbot-helper, registered against this
# origin), sign you in with a browser sign-in (superbot signin), wire every
# installed AI client (superbot clients wire), then install the superbot
# desktop app. Nothing here touches node, npm or an rc file. Re-running this
# exact line IS the update: the Helper's install verb is a no-op at the same
# version, and the app just recopies. Sign-in and wiring never fail the line.
# Flags:
#   --no-app        install the Helper only (alias: --helper-only)
#   --helper-app    "use your own harness": the Helper plus the standalone
#                   superbot relay app (a dmg or AppImage from
#                   /download/helper-app/asset/<platform>) in place of the
#                   desktop app (alias: --route=helper-app). Sign-in and wiring
#                   are the same; it conflicts with --no-app/--helper-only and
#                   with --agent
#   --no-launch     install, do not open the app
#   --no-signin     skip the browser sign-in (run superbot signin later)
#   --no-wire       skip wiring AI clients (run superbot clients wire later)
#   --dry-run       print every step it would take, download nothing, exit 0
#   --force         pass through to the Helper's install --force
#   --agent[=VENDOR] a third-party agent's Linux VM (Grok Bot, Muse, dots,
#                   Manus): install and link the Helper there. Implies
#                   --no-app --no-wire --no-signin, never reads /dev/tty, and
#                   prints ONE parseable block on stdout (the agent section
#                   below). Link tier only.
#   --relink        with --agent: link again even though ~/.superbot/key.json
#                   exists (a re-run without it only restarts the Helper)
# Exit codes: 0 ok (the Helper installed, app ok or cleanly skipped; with
# --agent: linked or awaiting approval), 1 the Helper step failed (a five-part
# error; with --agent: the block's SUPERBOT_STATUS=error), 2 usage, 3 --agent
# refused in a session sandbox (the remote-MCP recipe is printed instead).
# Templates: {{ORIGIN}} {{MCP_URL}}, and the DOWNLOAD_AUTH assignment below —
# substituted by the edge on serve (edge/src/desktop-release.ts). POSIX sh
# throughout: the pipe target on Ubuntu is dash.
# The beta form: on a beta host this script and every /download/* byte answer
# only a request that carries a beta grant, and a pasted `curl | sh` carries no
# cookie, so the download page prints the line with the viewer's own download
# token (sbd_...) as a Bearer header:
#   curl -fsSL -H "Authorization: Bearer sbd_XXXX" {{ORIGIN}}/bootstrap.sh | sh
# The edge then bakes that same token into DOWNLOAD_AUTH when it serves this
# script, and every fetch this script makes from {{ORIGIN}}/download/* sends it
# back. Without a token (every other host, or no Bearer on the line that fetched
# this script) DOWNLOAD_AUTH is empty and nothing below differs from a plain run.
# The token is never printed, never put on a command line where curl is the
# downloader (a 0600 curl config in the run's temp dir carries it), and never
# sent to any host but {{ORIGIN}}'s.

set -eu
ORIGIN='{{ORIGIN}}'
MCP_URL='{{MCP_URL}}'
# The viewer's download token, or ''. Only a well-formed one survives: sbd_ and
# then one or more of A-Z a-z 0-9 _ -. An empty value, the placeholder left
# unsubstituted (a raw run of this file) and anything else become '', so what
# follows never sees a value that could carry a space, a quote or a newline.
# The class is spelled out, not written as ranges: a range follows the locale's
# collation in some shells (bash in a UTF-8 locale takes an accented letter for
# A-Za-z), and this one must not.
DOWNLOAD_AUTH='{{DOWNLOAD_AUTH}}'
case "$DOWNLOAD_AUTH" in
  sbd_*[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-]*|sbd_) DOWNLOAD_AUTH='' ;;
  sbd_*) ;;
  *) DOWNLOAD_AUTH='' ;;
esac
# The curl config file that carries the token (dl_conf_init), '' without one.
DL_CONF=''
HELPER_TAP='kek-kek-kek/superbot'
# The Helper's fallback bin: the five-part error and the fix lines name it,
# whatever the gate actually resolved to.
GATE_NAME="$HOME/.superbot/bin/superbot-helper"
# The PATH line the Helper's install --json hands back when its shim dir is
# the fallback one; printed in the final lines when set.
HELPER_ACT=''
# The Helper's CLI (`superbot`), resolved after the gate: `superbot` may not be
# on PATH inside `curl | sh`, so the shim beside the gate binary and the
# fallback bin are tried too.
SB_CLI=''

# --- terminal frontend ---------------------------------------------------------
# Color only when stdout is a terminal and NO_COLOR is unset (https://no-color.org:
# present and non-empty) and TERM is not dumb. Brand accent in a terminal is
# storm teal (256-color index 50, truecolor #00e5c3), muted 245; the old sage
# (108) is gone. Status verbs right-align in a 12-character field (the cargo
# idiom). Every primitive is POSIX.
have_color=0
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != dumb ]; then
  have_color=1
fi
# out <verb> <message> — a right-aligned status verb (Downloading/Verifying...)
out() {
  if [ "$have_color" = 1 ]; then
    printf '\033[38;5;50m%12s\033[0m  %s\n' "$1" "$2"
  else
    printf '%12s  %s\n' "$1" "$2"
  fi
}
# dim <message> — a muted (245) context line
dim() {
  if [ "$have_color" = 1 ]; then printf '\033[38;5;245m  %s\033[0m\n' "$*";
  else printf '  %s\n' "$*"; fi
}
# warn <message> — stderr
warn() {
  printf 'superbot bootstrap: %s\n' "$*" >&2
}

# fail5 <code> <title> <description> <fix> <fix-or-page> <url> — the five-part
# error (code, title, description, how to fix, where to read more): stderr,
# exit 1. The Helper gate is the caller this was built for.
fail5() {
  printf 'superbot bootstrap: [%s] %s\n' "$1" "$2" >&2
  printf '  %s\n' "$3" >&2
  printf '  fix: %s\n' "$4" >&2
  printf '       or: %s\n' "$5" >&2
  printf '  see: %s\n' "$6" >&2
  exit 1
}

# app_fail <reason> — the app step's clean partial exit: one reason line, then
# the exact sentinel, then 0. The Helper is what wires the machine; a failed
# app must never turn the whole install into a failure.
app_fail() {
  warn "$*"
  printf 'Helper installed, app skipped\n' >&2
  exit 0
}

# dl_conf_init <dir> — the download token for curl, kept off the command line:
# with a token, write a curl config line (header = "Authorization: Bearer ...")
# to <dir>/dl-auth.conf, mode 0600 (umask 077), and point DL_CONF at it; without
# one DL_CONF stays ''. Every curl to $ORIGIN/download/* below is then written
# `curl ${DL_CONF:+-K "$DL_CONF"} <the arguments it always had>`: -K <file> when
# there is a token, and exactly today's arguments when there is none. printf is a
# builtin, so the token is on no argv here either, and <dir> is removed by the
# EXIT trap that already removes it. Called once the run's temp dir exists (the
# helper steps' $tmp, the --agent path's $agent_tmp). The token is only ever sent
# to $ORIGIN: curl keeps a custom Authorization header across a same-host
# redirect and drops it when a redirect leaves the host (the app and Helper
# assets 302 to the release CDN), and --location-trusted is never used.
dl_conf_init() {
  DL_CONF=''
  if [ -z "$DOWNLOAD_AUTH" ]; then return 0; fi
  if (umask 077; printf 'header = "Authorization: Bearer %s"\n' "$DOWNLOAD_AUTH" >"$1/dl-auth.conf") 2>/dev/null; then
    DL_CONF="$1/dl-auth.conf"
  else
    warn "could not write the download token file, fetching without it"
  fi
  return 0
}

# agent_block <status> [error] [mcp-url] — the one parseable block --agent
# prints on stdout when it answers itself (on success agent-bootstrap.sh
# prints the same shape: SUPERBOT_BOOTSTRAP=v1, SUPERBOT_STATUS=linked|
# awaiting_approval|error, SUPERBOT_LINK_URL, SUPERBOT_LINKED_TO,
# SUPERBOT_ERROR). SUPERBOT_MCP_URL rides only the session-sandbox refusal.
agent_block() {
  printf 'SUPERBOT_BOOTSTRAP=v1\n'
  printf 'SUPERBOT_STATUS=%s\n' "$1"
  if [ -n "${2:-}" ]; then printf 'SUPERBOT_ERROR=%s\n' "$2"; fi
  if [ -n "${3:-}" ]; then printf 'SUPERBOT_MCP_URL=%s\n' "$3"; fi
  return 0
}

# agent_fail <code> <message> [exit] — stderr line, the error block, exit.
agent_fail() {
  warn "$1: $2"
  agent_block error "$1: $2"
  exit "${3:-1}"
}

usage() {
  warn "$1"
  cat >&2 <<'USAGE'
usage: sh bootstrap.sh [--no-app | --helper-app] [--no-launch] [--no-signin] [--no-wire] [--dry-run] [--force]
       sh bootstrap.sh --agent[=VENDOR] [--relink] [--dry-run]
  --no-app       install the Helper only (alias: --helper-only)
  --helper-app   install the Helper plus the superbot relay app, in place of
                 the desktop app (alias: --route=helper-app)
  --no-launch    install, do not open the app
  --no-signin    skip the browser sign-in (run superbot signin later)
  --no-wire      skip wiring AI clients (run superbot clients wire later)
  --dry-run      print every step, download nothing, exit 0
  --force        pass through to the Helper's install --force
  --agent[=V]    install and link the Helper on an agent's Linux VM
                 (V: grok-bot, muse, dots, manus, or any a-z 0-9 . _ - name)
  --relink       with --agent: link again even when already linked
USAGE
  if [ "$AGENT" = 1 ]; then agent_block error "bad_args: $1"; fi
  exit 2
}

# spin <pid> <message> — a one-line spinner for a background job, kept from the
# previous bootstrap. TTY only; piped output gets the plain status lines.
# Color codes are inlined as plain assignments, and the busybox-safe sleep
# keeps this loop from aborting the install under set -e.
spin() {
  _pid=$1
  _msg=$2
  _dim=''
  _off=''
  if [ "$have_color" = 1 ]; then _dim='\033[2m'; _off='\033[0m'; fi
  _i=0
  while kill -0 "$_pid" 2>/dev/null; do
    _f='\-/|'
    _c=$(printf '%s' "$_f" | cut -c$(( _i % 4 + 1 )))
    printf '\r%s  %c %s%s  ' "$_dim" "$_c" "$_msg" "$_off"
    _i=$((_i + 1))
    sleep 0.12 2>/dev/null || sleep 1
  done
  printf '\r\033[K'
}

logo() {
  # The art cat is for humans at a terminal — an agent capturing the install
  # log gets only the facts block. The 11 rows between the ART sentinels are
  # byte-pinned to the CLI banner's default render (cli/scripts/gen-banner-art.mjs
  # --check); the facts block under it mirrors that banner's facts column.
  if [ -t 1 ]; then
  # ART:BEGIN
  cat <<'ART'
  .===:.                  .--:.
 .++**+*+:..............:=+**+*::
 :+*+++*++::==::::=::===*+*+++*=-
 :+*++*+=--====+=====::=+++====
 :=+++=-    --==+=:     .==++==
 =====:       ===+       :===++
 :+=+++:.   --+===-     :++====
 :=+++++:--:===+===::--:+++====
 -==++====+=====+=====+====++=:
  -:===+====++====+=====+==:::
      ..---------------...
ART
  # ART:END
  fi
  if [ "$have_color" = 1 ]; then
    printf ' \033[38;5;50msuperbot bootstrap\033[0m\n'
    printf ' \033[38;5;245morigin  \033[0m%s\n' "$ORIGIN"
    printf ' \033[38;5;245mremote  \033[0m%s\n' "$MCP_URL"
  else
    printf ' superbot bootstrap\n'
    printf ' origin  %s\n' "$ORIGIN"
    printf ' remote  %s\n' "$MCP_URL"
  fi
  printf '\n'
}

# --- flags ---------------------------------------------------------------------
NO_APP=0
NO_APP_FLAG=''
HELPER_APP=0
NO_LAUNCH=0
NO_SIGNIN=0
NO_WIRE=0
DRY_RUN=0
FORCE=0
AGENT=0
AGENT_VENDOR=''
RELINK=0
# --agent first, so a usage error in agent mode still ends in the block.
for arg in "$@"; do
  case "$arg" in --agent|--agent=*) AGENT=1 ;; esac
done
for arg in "$@"; do
  case "$arg" in
    --no-app)      NO_APP=1; NO_APP_FLAG=--no-app ;;
    --helper-only) NO_APP=1; NO_APP_FLAG=--helper-only ;;
    --helper-app|--route=helper-app)
      # an agent's VM gets the Helper only: --agent stays incompatible with an
      # app route, and in agent mode the refusal still ends in the block
      if [ "$AGENT" = 1 ]; then usage "--helper-app does not apply to --agent: an agent VM gets the Helper only"; fi
      HELPER_APP=1 ;;
    --route=*)
      if [ "$AGENT" = 1 ]; then usage "unknown argument (not printed)"; fi
      usage "unknown route: ${arg#--route=}, the only route is helper-app" ;;
    --no-launch)   NO_LAUNCH=1 ;;
    --no-signin)   NO_SIGNIN=1 ;;
    --no-wire)     NO_WIRE=1 ;;
    --dry-run)     DRY_RUN=1 ;;
    --force)       FORCE=1 ;;
    --agent)       AGENT=1 ;;
    --agent=*)     AGENT=1; AGENT_VENDOR=${arg#--agent=} ;;
    --relink)      RELINK=1 ;;
    # A link (lnk_<id>.<s>) is the data-tier grant the Superbot app mints into
    # its own hash-pinned command; nothing pins this script's bytes, so it
    # never carries one. Never echoed: the value is a secret.
    --link|--link=*) usage "--link belongs only to the command the Superbot app gives you; this line links without one (the value was not printed)" ;;
    *)
      if [ "$AGENT" = 1 ]; then usage "unknown argument (not printed)"; fi
      usage "unknown argument: $arg" ;;
  esac
done
if [ "$RELINK" = 1 ] && [ "$AGENT" != 1 ]; then
  usage "--relink needs --agent"
fi
if [ "$HELPER_APP" = 1 ] && [ "$NO_APP" = 1 ]; then
  usage "--helper-app cannot be combined with $NO_APP_FLAG: --helper-app installs the superbot relay app and $NO_APP_FLAG installs no app"
fi

# --- the agent path (--agent[=vendor]) -----------------------------------------
# A third-party agent's own Linux VM (xAI Grok Bot, Meta Muse, OpenAI dots,
# Manus): no terminal, no inbound, often ONE allowed egress host. This path
# installs the Helper there and links it at the LINK tier: the Helper starts
# detached and `superbot-helper link --agent` mints a device code the user
# approves in a browser. It delegates every step to the Helper release's own
# static agent-bootstrap.sh (superbot-helper install/agent-bootstrap.sh):
#   1. GET <origin>/download/helper/asset/sha256sums?via=origin, the release's
#      SHA256SUMS streamed by this origin, for the pins of agent-bootstrap.sh
#      and of the two Linux Helper builds;
#   2. GET <origin>/download/helper/agent-bootstrap.sh and check it against
#      that pin;
#   3. sh agent-bootstrap.sh --origin=<origin> --helper-sha256-x64=<pin>
#      --helper-sha256-arm64=<pin> [--vendor=V] [--relink], whose stdout block
#      is this script's stdout (every progress line goes to stderr).
# Every byte comes from this ONE origin (no redirect is followed), so the pins
# only prove the bytes match what this origin serves: the trust is this
# origin's TLS. That is why this path gets the link tier and never the data
# tier; the data tier is granted only through the hash-pinned command the
# Superbot app mints (it carries --link=lnk_<id>.<s>), which this script never
# accepts. Re-running is idempotent: agent-bootstrap.sh reinstalls only on a
# hash change and, with ~/.superbot/key.json present, only restarts the Helper
# unless --relink. Bounded: the two small fetches take at most ~12 s, then
# agent-bootstrap.sh keeps to its own ~30 s budget.
#
# Session sandboxes are refused (exit 3) with the remote-MCP recipe: a
# per-task container is gone when its session ends, taking the linked Helper
# with it. Detection uses only markers a vendor documents:
#   Claude Code on the web (cloud sessions): CLAUDE_CODE_REMOTE=true, "the
#     session VM's environment carries that variable as `true`, it's never
#     `true` locally" (https://code.claude.com/docs/en/cloud-environments,
#     read 2026-09-30).
#   Codex cloud: no documented environment marker
#     (https://learn.chatgpt.com/docs/environments/cloud-environments, read
#     2026-09-30), so flag only: --agent=codex-cloud.
#   Grok Bot, Muse, dots, Manus: no public environment marker found
#     (2026-09-30), so the vendor rides --agent=<vendor> only.
agent_sandbox=''
case "$(printf '%s' "$AGENT_VENDOR" | tr 'A-Z' 'a-z')" in
  codex-cloud|codex-web) agent_sandbox='Codex cloud' ;;
  claude-web|claude-code-web|claude-cloud) agent_sandbox='Claude Code on the web' ;;
esac
if [ "$AGENT" = 1 ] && [ -z "$agent_sandbox" ] && [ "${CLAUDE_CODE_REMOTE:-}" = true ]; then
  agent_sandbox='Claude Code on the web (CLAUDE_CODE_REMOTE=true)'
fi

agent_main() {
  AGENT_VENDOR=$(printf '%s' "$AGENT_VENDOR" | tr 'A-Z' 'a-z')
  case "$AGENT_VENDOR" in
    *[!a-z0-9._-]*) usage "--agent=<vendor> may hold only a-z 0-9 . _ -" ;;
  esac
  if [ -n "$agent_sandbox" ]; then
    warn "refusing --agent: this is a session sandbox ($agent_sandbox)."
    warn "a Helper installed here is gone when the session ends, so connect the remote MCP server instead:"
    printf '  %s\n' \
      "endpoint:     $MCP_URL" \
      "Claude Code:  claude mcp add --transport http superbot $MCP_URL -s user" \
      "Codex:        [mcp_servers.superbot] url = \"$MCP_URL\" in ~/.codex/config.toml" \
      "other clients: $ORIGIN/llms.txt" >&2
    agent_block error "session_sandbox: use the remote MCP server at $MCP_URL, not a Helper" "$MCP_URL"
    exit 3
  fi
  sums_url="$ORIGIN/download/helper/asset/sha256sums?via=origin"
  sba_url="$ORIGIN/download/helper/agent-bootstrap.sh"
  if [ "$DRY_RUN" = 1 ]; then
    printf 'superbot bootstrap --agent --dry-run\n'
    if [ -n "$DOWNLOAD_AUTH" ]; then printf ' auth    download token (from the line that fetched this script)\n'; fi
    printf ' pins    download %s\n' "$sums_url"
    printf ' script  download %s, check it against the agent-bootstrap.sh line\n' "$sba_url"
    printf ' run     sh agent-bootstrap.sh --origin=%s --helper-sha256-x64=<pin> --helper-sha256-arm64=<pin>%s%s\n' \
      "$ORIGIN" "${AGENT_VENDOR:+ --vendor=$AGENT_VENDOR}" "$(if [ "$RELINK" = 1 ]; then printf ' --relink'; fi)"
    printf ' skipped app, client wiring and the browser sign-in (--agent)\n'
    printf ' result  one SUPERBOT_STATUS=linked|awaiting_approval|error block on stdout\n'
    exit 0
  fi
  # curl, else wget (BusyBox included). No redirect is followed: every byte
  # comes from this origin. wget reads only the lowercase proxy variables.
  if [ -z "${https_proxy:-}" ] && [ -n "${HTTPS_PROXY:-}" ]; then https_proxy=$HTTPS_PROXY; export https_proxy; fi
  if [ -z "${no_proxy:-}" ] && [ -n "${NO_PROXY:-}" ]; then no_proxy=$NO_PROXY; export no_proxy; fi
  if command -v curl >/dev/null 2>&1; then
    agent_dl=curl
  elif command -v wget >/dev/null 2>&1; then
    agent_dl=wget
  else
    agent_fail no_downloader "neither curl nor wget is installed"
  fi
  # With a download token (a beta host) every fetch below sends it as a Bearer
  # header to this origin only: curl reads it from the -K config file
  # (dl_conf_init), wget takes it as --header (GNU wget and BusyBox both have
  # it; a wget on the command line shows the token to `ps`, which curl avoids).
  # GNU wget never leaves the origin (--max-redirect=0). BusyBox wget has no such
  # option and would re-send the header to wherever a redirect pointed, so the
  # only reason that is safe is that these two URLs are streamed by the origin
  # itself (?via=origin, /download/helper/agent-bootstrap.sh): the edge answers
  # 200 or an error for them, never a 3xx. Without a token no header is added and
  # the commands are exactly what they were.
  agent_get() {
    if [ "$agent_dl" = curl ]; then
      # without -L a 3xx is not an error to curl -f, so anything but a 200 is
      _code=$(curl ${DL_CONF:+-K "$DL_CONF"} -fsS --connect-timeout 5 --max-time 6 -w '%{http_code}' -o "$2" "$1" </dev/null) || return 1
      [ "$_code" = 200 ]
    elif wget --version 2>/dev/null | grep -q 'GNU Wget'; then
      wget -q --max-redirect=0 -T 6 ${DOWNLOAD_AUTH:+--header "Authorization: Bearer $DOWNLOAD_AUTH"} -O "$2" "$1" </dev/null
    else
      wget -q -T 6 ${DOWNLOAD_AUTH:+--header "Authorization: Bearer $DOWNLOAD_AUTH"} -O "$2" "$1" </dev/null
    fi
  }
  _hash_bin=$(command -v sha256sum || command -v shasum || true)
  [ -n "$_hash_bin" ] || agent_fail no_sha256_tool "neither sha256sum nor shasum is installed"
  agent_tmp=$(mktemp -d)
  trap 'rm -rf "$agent_tmp" 2>/dev/null || true' EXIT
  if [ "$agent_dl" = curl ]; then dl_conf_init "$agent_tmp"; fi
  _host=${ORIGIN#*://}
  warn "fetching the release pins from $sums_url"
  agent_get "$sums_url" "$agent_tmp/SHA256SUMS" \
    || agent_fail download_failed "could not fetch $sums_url; allow $_host in this computer's network settings (or set HTTPS_PROXY) and run this again"
  pin_of() {
    awk -v n="$1" '{ f = $NF; sub(/^\*/, "", f) } f == n { print tolower($1); exit }' "$agent_tmp/SHA256SUMS"
  }
  pin_x64=$(pin_of superbot-helper-linux-x64)
  pin_arm64=$(pin_of superbot-helper-linux-arm64)
  pin_sba=$(pin_of agent-bootstrap.sh)
  [ -n "$pin_sba" ] || agent_fail release_unsigned "this origin's Helper release carries no agent-bootstrap.sh yet; run this again after the next Helper release"
  [ -n "$pin_x64$pin_arm64" ] || agent_fail no_linux_build "this origin's Helper release carries no Linux Helper build"
  warn "fetching $sba_url"
  agent_get "$sba_url" "$agent_tmp/agent-bootstrap.sh" \
    || agent_fail download_failed "could not fetch $sba_url; allow $_host in this computer's network settings (or set HTTPS_PROXY) and run this again"
  case "$_hash_bin" in
    *shasum) _got=$("$_hash_bin" -a 256 "$agent_tmp/agent-bootstrap.sh") ;;
    *)       _got=$("$_hash_bin" "$agent_tmp/agent-bootstrap.sh") ;;
  esac
  _got=$(printf '%s' "$_got" | cut -d' ' -f1)
  [ "$_got" = "$pin_sba" ] || agent_fail hash_mismatch "agent-bootstrap.sh does not match this origin's SHA256SUMS; nothing was run"
  set -- --origin="$ORIGIN"
  if [ -n "$pin_x64" ]; then set -- "$@" --helper-sha256-x64="$pin_x64"; fi
  if [ -n "$pin_arm64" ]; then set -- "$@" --helper-sha256-arm64="$pin_arm64"; fi
  if [ -n "$AGENT_VENDOR" ]; then set -- "$@" --vendor="$AGENT_VENDOR"; fi
  if [ "$RELINK" = 1 ]; then set -- "$@" --relink; fi
  warn "running agent-bootstrap.sh (install, start, link)"
  _rc=0
  sh "$agent_tmp/agent-bootstrap.sh" "$@" </dev/null || _rc=$?
  exit "$_rc"
}

if [ "$AGENT" = 1 ]; then
  agent_main
fi

# --- platform --------------------------------------------------------------------
# The Helper ships for every build; the desktop app ships fewer. app_note is
# set when the Helper installs but the app has no build here, and the app step
# then ends in the clean app-skip. ha_key is the Helper app's platform key
# (/download/helper-app/asset/<ha_key>); ha_note is the same skip for the
# Helper app, which ships no linux arm64 build.
os=$(uname -s)
arch=$(uname -m)
case "$os/$arch" in
  Darwin/arm64|Darwin/aarch64) kind=dmg;      plat=darwin-arm64; app_key=mac-arm64;   app_note='';                                                          ha_key=mac-arm64; ha_note='' ;;
  Darwin/x86_64)               kind=dmg;      plat=darwin-x64;   app_key=mac-arm64;   app_note='no Intel mac app build yet, the app ships arm64 only';  ha_key=mac-x64;   ha_note='' ;;
  Linux/x86_64|Linux/amd64)    kind=appimage; plat=linux-x64;    app_key=linux-x64;   app_note='';                                                          ha_key=linux-x64; ha_note='' ;;
  Linux/aarch64|Linux/arm64)   kind=appimage; plat=linux-arm64; app_key=linux-x64;   app_note='no linux arm64 app build yet, the app ships x64 only';  ha_key='';        ha_note='no linux arm64 Helper app build yet, the Helper app ships x64 only' ;;
  *)                           usage "no superbot build for $os $arch, grab one from $ORIGIN/download" ;;
esac
helper_asset="superbot-helper-$plat"
helper_url="$ORIGIN/download/helper/asset/$plat"
sums_url="$ORIGIN/download/helper/asset/sha256sums"
# Prefer brew when it exists (the tap resolution itself happens at helper-step
# time, because it downloads). The dry-run cannot know which way resolves.
helper_way=asset
if command -v brew >/dev/null 2>&1; then
  helper_way=brew
fi

# --- the helper step -----------------------------------------------------------
# json_str <key> <text> — the first quoted value for "key", POSIX-only (no jq).
json_str() {
  printf '%s\n' "$2" | sed -n 's/.*"'"$1"'" *: *"\([^"]*\)".*/\1/p' | head -n 1
}

# verify_sum <file> <sums> <name> — the SHA256SUMS line for <name> against
# <file>: sha256sum on linux, shasum -a 256 on mac, whichever exists.
verify_sum() {
  _file=$1
  _sums=$2
  _name=$3
  _want=$(awk -v n="$_name" '$NF==n {print $1; exit}' "$_sums" 2>/dev/null)
  if [ -z "$_want" ]; then
    fail5 helper-checksum-failed "no SHA256SUMS line for $_name" \
      "the sums file at $sums_url has no line for $_name, so the download cannot be verified." \
      "retry the line; if it persists the release may be private" \
      "$ORIGIN/download" \
      "$ORIGIN/install"
  fi
  _hash_bin=$(command -v sha256sum || command -v shasum || true)
  if [ -z "$_hash_bin" ]; then
    fail5 helper-checksum-failed "no sha256 tool found" \
      "the download cannot be verified: this machine has neither sha256sum nor shasum." \
      "install one and retry the line" \
      "$ORIGIN/download" \
      "$ORIGIN/install"
  fi
  case "$_hash_bin" in
    *shasum) _got=$("$_hash_bin" -a 256 "$_file") ;;
    *)       _got=$("$_hash_bin" "$_file") ;;
  esac
  _got=$(printf '%s' "$_got" | cut -d' ' -f1)
  if [ "$_got" != "$_want" ]; then
    fail5 helper-checksum-failed "the superbot-helper download does not match SHA256SUMS" \
      "expected $_want, got $_got for $_name." \
      "retry the line; if it persists the release may have moved" \
      "$ORIGIN/download" \
      "$ORIGIN/install"
  fi
}

# gate — install --register may start the Helper asynchronously, so poll the
# status check (exit 3 means not reachable, 0 means up) for up to 15 seconds
# before declaring the install failed.
gate_helper() {
  _cmd=$1
  _i=0
  while [ "$_i" -lt 15 ]; do
    if "$_cmd" status --json >/dev/null 2>&1; then
      return 0
    fi
    _i=$((_i + 1))
    if [ "$_i" -lt 15 ]; then
      sleep 1
    fi
  done
  return 1
}

helper_step() {
  # brew path: only when the tap resolves; on any brew failure fall through to
  # the direct asset with one dim line (the tap may be private).
  helper_cmd=''
  if [ "$helper_way" = brew ]; then
    if brew tap "$HELPER_TAP" >/dev/null 2>&1; then
      out Installing "superbot-helper (brew, tap $HELPER_TAP)"
      if ! brew install superbot-helper >/dev/null 2>&1; then
        dim "brew install failed, falling through to the direct asset"
      else
        helper_cmd=$(command -v superbot-helper || true)
        if [ -z "$helper_cmd" ]; then
          dim "superbot-helper not found after brew, falling through to the direct asset"
        fi
      fi
    else
      dim "using the direct download"
    fi
  fi
  # direct asset: download, verify against SHA256SUMS, chmod
  if [ -z "$helper_cmd" ]; then
    out Downloading "$helper_url"
    curl ${DL_CONF:+-K "$DL_CONF"} -fsSL "$helper_url" -o "$tmp/helper-asset" &
    _dl=$!
    if [ "$have_color" = 1 ]; then spin "$_dl" "downloading superbot-helper"; fi
    _rc=0
    wait "$_dl" || _rc=$?
    if [ "$_rc" != 0 ]; then
      fail5 helper-download-failed "could not fetch superbot-helper" \
        "the download from $helper_url failed, so the Helper is not installed." \
        "retry the line; a private release or a captive portal can 404 it" \
        "$ORIGIN/download" \
        "$ORIGIN/install"
    fi
    out Downloading "$sums_url"
    curl ${DL_CONF:+-K "$DL_CONF"} -fsSL "$sums_url" -o "$tmp/SHA256SUMS" \
      || fail5 helper-download-failed "could not fetch SHA256SUMS" \
        "the sums file at $sums_url failed to download, so the asset cannot be verified." \
        "retry the line" \
        "$ORIGIN/download" \
        "$ORIGIN/install"
    out Verifying "$helper_asset against SHA256SUMS"
    verify_sum "$tmp/helper-asset" "$tmp/SHA256SUMS" "$helper_asset"
    chmod +x "$tmp/helper-asset"
    helper_cmd="$tmp/helper-asset"
  fi
  # the install verb: a no-op at the same version, an upgrade otherwise,
  # --force when the caller asked. The --json line carries the action, the
  # landed version and (when the shim dir is the fallback) the PATH line.
  # --origin bakes this edge into the registered unit; a Helper released
  # before --origin existed answers exit 2 (usage), and is retried without it.
  out Installing "$helper_cmd install --register --origin=$ORIGIN"
  force_flag=''
  if [ "$FORCE" = 1 ]; then force_flag='--force'; fi
  register_rc=0
  # shellcheck disable=SC2086
  helper_out=$("$helper_cmd" install --register --origin="$ORIGIN" $force_flag --json 2>"$tmp/install.err") || register_rc=$?
  if [ "$register_rc" = 2 ]; then
    register_rc=0
    # shellcheck disable=SC2086
    helper_out=$("$helper_cmd" install --register $force_flag --json 2>"$tmp/install.err") || register_rc=$?
  fi
  if [ "$register_rc" != 0 ]; then
    if [ -s "$tmp/install.err" ]; then
      tail -n 3 "$tmp/install.err" | sed 's/^/  /' >&2
    fi
    fail5 helper-install-failed "superbot-helper install --register failed" \
      "the Helper's install verb exited non-zero, so the Helper may not be registered." \
      "retry with superbot-helper install --register --force" \
      "$ORIGIN/download" \
      "$ORIGIN/install"
  fi
  action=$(json_str action "$helper_out")
  landed=$(json_str landed "$helper_out")
  action=${action:-installed}
  if [ "$action" = refused ]; then
    fail5 helper-install-failed "superbot-helper refused the install" \
      "the Helper's install verb refused, so the Helper may not be registered." \
      "retry with superbot-helper install --register --force" \
      "$ORIGIN/download" \
      "$ORIGIN/install"
  fi
  if [ "$action" = noop ]; then
    out Installed "superbot-helper${landed:+ $landed} (already current, no-op)"
  else
    out Installed "superbot-helper${landed:+ $landed} ($action)"
  fi
  # the fallback shim dir is not on PATH: keep the activation line for the
  # final lines
  if printf '%s\n' "$helper_out" | grep -q '"fallback" *: *true'; then
    HELPER_ACT=$(json_str activationLine "$helper_out")
  fi
  # the gate
  out Checking "superbot-helper status --json (up to 15s)"
  gate_cmd=$(command -v superbot-helper || true)
  if [ -z "$gate_cmd" ] && [ -x "$GATE_NAME" ]; then
    gate_cmd=$GATE_NAME
  fi
  gate_ok=0
  if [ -n "$gate_cmd" ] && gate_helper "$gate_cmd"; then
    gate_ok=1
  fi
  if [ "$gate_ok" != 1 ]; then
    fail5 helper-not-running "the Helper is not running" \
      "the install finished but superbot-helper did not answer a status check within 15 seconds, so it cannot route your AI clients yet." \
      "$GATE_NAME run" \
      "superbot-helper install --register --force" \
      "$ORIGIN/install"
  fi
  # the CLI: on PATH, else beside the gate binary, else the fallback bin
  SB_CLI=$(command -v superbot || true)
  if [ -z "$SB_CLI" ]; then
    _beside="$(dirname "$gate_cmd")/superbot"
    if [ -x "$_beside" ]; then
      SB_CLI=$_beside
    elif [ -x "$HOME/.superbot/bin/superbot" ]; then
      SB_CLI="$HOME/.superbot/bin/superbot"
    fi
  fi
}

# --- the sign-in step -----------------------------------------------------------
# The browser sign-in, read from the terminal even under `curl | sh`. An older
# Helper without the verb (exit 2), any failure, or no terminal prints the
# later line and carries on: sign-in never fails the line.
signin_step() {
  if [ -z "$SB_CLI" ]; then
    dim "sign in later: superbot signin"
    return 0
  fi
  # a subshell: a failed redirect on a special builtin would end this shell
  if ! (: </dev/tty) 2>/dev/null; then
    dim "sign in later: superbot signin"
    return 0
  fi
  out "Signing in" "$ORIGIN (a browser opens)"
  if "$SB_CLI" signin --origin="$ORIGIN" </dev/tty; then
    return 0
  fi
  dim "sign in later: superbot signin"
  return 0
}

# --- the wire step --------------------------------------------------------------
# Every installed, unwired AI client, non-interactively. A failure prints one
# dim line and carries on.
wire_step() {
  if [ -z "$SB_CLI" ]; then
    dim "wire your AI clients later: superbot clients wire"
    return 0
  fi
  out Wiring "your AI clients (superbot clients wire)"
  if "$SB_CLI" clients wire </dev/null; then
    printf '  restart your AI client to load Superbot\n'
  else
    dim "wiring did not finish, retry later: superbot clients wire"
  fi
  return 0
}

# --- the app step ---------------------------------------------------------------
# Kept from the previous bootstrap: dmg mount and copy, AppImage download and
# launch, .desktop entry (now Exec=superbot-desktop: the plain
# `superbot` command belongs to the Helper). Any failure ends in
# app_fail: reason, sentinel, exit 0.
app_step() {
  if [ -n "$app_note" ]; then
    app_fail "$app_note"
  fi
  app_url="$ORIGIN/download/asset/$app_key"
  # The edge answers /download/asset/<key> with a 302 to the release file; curl
  # -L follows it. curl -f turns a non-2xx (404 when the release is private, a
  # captive portal's block page) into an exit code; a captive portal that
  # answers 200 with HTML is caught by the body sniff instead.
  out Downloading "$app_url"
  curl ${DL_CONF:+-K "$DL_CONF"} -fsSL "$app_url" -o "$tmp/superbot-installer" &
  _dl=$!
  if [ "$have_color" = 1 ]; then spin "$_dl" "downloading the app"; fi
  _rc=0
  wait "$_dl" || _rc=$?
  if [ "$_rc" != 0 ]; then
    app_fail "could not fetch the app from $ORIGIN, grab it from $ORIGIN/download"
  fi
  if head -c 1 "$tmp/superbot-installer" 2>/dev/null | grep -q '<'; then
    app_fail "could not fetch the app from $ORIGIN, grab it from $ORIGIN/download"
  fi
  case "$kind" in
    dmg)
      hdiutil imageinfo "$tmp/superbot-installer" >/dev/null 2>&1 \
        || app_fail "the download is not a macOS disk image, grab the installer from $ORIGIN/download"
      mnt="$tmp/mnt"
      mkdir -p "$mnt"
      hdiutil attach -nobrowse -readonly -quiet -mountpoint "$mnt" "$tmp/superbot-installer" \
        || app_fail "mounting the disk image failed, open $tmp/superbot-installer by hand and drag superbot.app to /Applications"
      app=$(find "$mnt" -maxdepth 2 -name 'superbot.app' 2>/dev/null | head -n 1)
      if [ -z "$app" ]; then
        hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
        app_fail "superbot.app not found in the disk image, grab the installer from $ORIGIN/download"
      fi
      if [ -w /Applications ]; then dest=/Applications; else dest="$HOME/Applications"; fi
      mkdir -p "$dest"
      out Installing "superbot.app into $dest"
      rm -rf "$dest/superbot.app"  # a stale copy keeps the old version's wiring alive
      if ! cp -R "$app" "$dest/"; then
        hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
        app_fail "copying superbot.app failed, drag it from the mounted image by hand"
      fi
      hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
      app_path="$dest/superbot.app"
      if [ "$NO_LAUNCH" = 0 ]; then
        out Launching "$app_path"
        open -a "$app_path"
      fi
      ;;
    appimage)
      # the app lands at ~/.local/bin/superbot-desktop: the plain
      # `superbot` command belongs to the Helper
      bin="$HOME/.local/bin/superbot-desktop"
      mkdir -p "$(dirname "$bin")"
      out Installing "the AppImage into $bin"
      cp "$tmp/superbot-installer" "$bin"
      chmod +x "$bin"
      # On systems without FUSE the AppImage cannot mount its own squashfs; the
      # flag --appimage-extract-and-run runs it there. The desktop entry stays
      # plain — the launcher is the normal path, the flag is the escape hatch.
      apps="$HOME/.local/share/applications"
      mkdir -p "$apps"
      printf '%s\n' \
        '[Desktop Entry]' \
        'Type=Application' \
        'Name=superbot' \
        'Comment=your AI clients, routed; the agent on call' \
        "Exec=$bin" \
        'Terminal=false' \
        'Categories=Network;Utility;' \
        > "$apps/superbot.desktop"
      app_path="$bin"
      if [ "$NO_LAUNCH" = 0 ]; then
        out Launching "$app_path"
        # detached: the app must outlive this shell (whose stdout the install
        # log owns), whether or not it was piped in
        nohup setsid "$bin" >/dev/null 2>&1 &
      fi
      ;;
  esac
}

# --- the Helper app step ----------------------------------------------------------
# --helper-app: "use your own harness". The standalone superbot relay app
# (productName "superbot relay", "Superbot Helper" before 2026-10-06; appId
# com.superbot.helper-app) goes in the
# desktop app's place, for people who keep their own harness; helper, sign-in
# and wiring ran before it exactly as on the desktop route. The edge answers
# /download/helper-app/asset/<ha_key> with a 302 to the release file, 404 when
# the newest Helper app release ships no build for this platform and 503 when no
# Helper app release is resolvable: both end in the same one-line "no release yet"
# skip. The curl status line (-w) is read instead of curl -f so those two are
# told apart from a network failure. Same clean partial exit as the app step:
# reason, sentinel, exit 0. The mac app is "superbot relay.app" (an older dmg carries
# "Superbot Helper.app", so the step takes either and clears both), the Linux one
# lands at ~/.local/bin/superbot-helper-app (the plain `superbot` command and
# `superbot-helper` belong to the Helper).
helper_app_step() {
  if [ -n "$ha_note" ]; then
    app_fail "$ha_note"
  fi
  ha_url="$ORIGIN/download/helper-app/asset/$ha_key"
  out Downloading "$ha_url"
  curl ${DL_CONF:+-K "$DL_CONF"} -sSL -w '%{http_code}' -o "$tmp/superbot-helper-app-installer" "$ha_url" >"$tmp/ha-status" &
  _dl=$!
  if [ "$have_color" = 1 ]; then spin "$_dl" "downloading the Helper app"; fi
  _rc=0
  wait "$_dl" || _rc=$?
  _code=$(cat "$tmp/ha-status" 2>/dev/null || true)
  case "$_code" in
    404|503) app_fail "the superbot relay app has no release for this platform yet, see $ORIGIN/download#helper" ;;
  esac
  case "$_code" in
    2??) ;;
    *) _rc=1 ;;
  esac
  if [ "$_rc" != 0 ]; then
    app_fail "could not fetch the superbot relay app from $ORIGIN, grab it from $ORIGIN/download"
  fi
  if head -c 1 "$tmp/superbot-helper-app-installer" 2>/dev/null | grep -q '<'; then
    app_fail "could not fetch the superbot relay app from $ORIGIN, grab it from $ORIGIN/download"
  fi
  case "$kind" in
    dmg)
      hdiutil imageinfo "$tmp/superbot-helper-app-installer" >/dev/null 2>&1 \
        || app_fail "the download is not a macOS disk image, grab the installer from $ORIGIN/download"
      mnt="$tmp/mnt"
      mkdir -p "$mnt"
      hdiutil attach -nobrowse -readonly -quiet -mountpoint "$mnt" "$tmp/superbot-helper-app-installer" \
        || app_fail "mounting the disk image failed, open $tmp/superbot-helper-app-installer by hand and drag superbot relay.app to /Applications"
      app=$(find "$mnt" -maxdepth 2 \( -name 'superbot relay.app' -o -name 'Superbot Helper.app' \) 2>/dev/null | head -n 1)
      if [ -z "$app" ]; then
        hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
        app_fail "superbot relay.app not found in the disk image, grab the installer from $ORIGIN/download"
      fi
      app_name=$(basename "$app")
      if [ -w /Applications ]; then dest=/Applications; else dest="$HOME/Applications"; fi
      mkdir -p "$dest"
      out Installing "$app_name into $dest"
      # a stale copy (under either name) keeps the old version's wiring alive
      rm -rf "$dest/superbot relay.app" "$dest/Superbot Helper.app"
      if ! cp -R "$app" "$dest/"; then
        hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
        app_fail "copying $app_name failed, drag it from the mounted image by hand"
      fi
      hdiutil detach "$mnt" -quiet >/dev/null 2>&1 || true
      app_path="$dest/$app_name"
      if [ "$NO_LAUNCH" = 0 ]; then
        out Launching "$app_path"
        open -a "$app_path"
      fi
      ;;
    appimage)
      bin="$HOME/.local/bin/superbot-helper-app"
      mkdir -p "$(dirname "$bin")"
      out Installing "the Helper app AppImage into $bin"
      cp "$tmp/superbot-helper-app-installer" "$bin"
      chmod +x "$bin"
      # Without FUSE the AppImage cannot mount its own squashfs: the flag
      # --appimage-extract-and-run runs it there. The desktop entry stays plain,
      # as the desktop app's does.
      apps="$HOME/.local/share/applications"
      mkdir -p "$apps"
      printf '%s\n' \
        '[Desktop Entry]' \
        'Type=Application' \
        'Name=superbot relay' \
        'Comment=the superbot relay app, for your own AI harness' \
        "Exec=$bin" \
        'Terminal=false' \
        'Categories=Network;Utility;' \
        > "$apps/superbot-helper-app.desktop"
      app_path="$bin"
      if [ "$NO_LAUNCH" = 0 ]; then
        out Launching "$app_path"
        nohup setsid "$bin" >/dev/null 2>&1 &
      fi
      ;;
  esac
}

# --- dry-run: every step it would take, downloads nothing, exits 0 --------------
if [ "$DRY_RUN" = 1 ]; then
  printf 'superbot bootstrap --dry-run\n'
  if [ -n "$DOWNLOAD_AUTH" ]; then printf ' auth    download token (from the line that fetched this script)\n'; fi
  if [ "$helper_way" = brew ]; then
    printf ' helper  brew tap %s && brew install superbot-helper (or the direct asset when the tap is private)\n' "$HELPER_TAP"
  else
    printf ' helper  download %s and %s\n' "$helper_url" "$sums_url"
    printf ' helper  verify %s against SHA256SUMS\n' "$helper_asset"
  fi
  printf ' helper  install --register --origin=%s (a no-op at the same version)\n' "$ORIGIN"
  printf ' helper  gate %s status --json, up to 15s\n' "$GATE_NAME"
  if [ "$NO_SIGNIN" = 1 ]; then
    printf ' signin  skipped (--no-signin)\n'
  else
    printf ' signin  superbot signin --origin=%s (a browser sign-in, when a terminal is attached)\n' "$ORIGIN"
  fi
  if [ "$NO_WIRE" = 1 ]; then
    printf ' wire    skipped (--no-wire)\n'
  else
    printf ' wire    superbot clients wire (every installed AI client)\n'
  fi
  if [ "$NO_APP" = 1 ]; then
    printf ' app     skipped (--no-app)\n'
  elif [ "$HELPER_APP" = 1 ]; then
    if [ -n "$ha_note" ]; then
      printf ' app     skipped: %s\n' "$ha_note"
    else
      printf ' app     download %s (the superbot relay app, in place of the desktop app)\n' "$ORIGIN/download/helper-app/asset/$ha_key"
      case "$kind" in
        dmg)      printf ' app     /Applications/superbot relay.app (or ~/Applications when /Applications is read-only)\n' ;;
        appimage) printf ' app     %s/.local/bin/superbot-helper-app + a .desktop entry\n' "$HOME" ;;
      esac
      printf ' app     launch unless --no-launch\n'
    fi
  elif [ -n "$app_note" ]; then
    printf ' app     skipped: %s\n' "$app_note"
  else
    printf ' app     download %s\n' "$ORIGIN/download/asset/$app_key"
    case "$kind" in
      dmg)      printf ' app     /Applications/superbot.app (or ~/Applications when /Applications is read-only)\n' ;;
      appimage) printf ' app     %s/.local/bin/superbot-desktop + a .desktop entry\n' "$HOME" ;;
    esac
    printf ' app     launch unless --no-launch\n'
  fi
  printf ' final   try: superbot status\n'
  exit 0
fi

logo

# --- the run --------------------------------------------------------------------
tmp=$(mktemp -d)
trap 'rm -rf "$tmp" 2>/dev/null || true' EXIT
dl_conf_init "$tmp"

helper_step

if [ "$NO_SIGNIN" = 1 ]; then
  out Skipped "sign-in (--no-signin)"
else
  signin_step
fi

if [ "$NO_WIRE" = 1 ]; then
  out Skipped "wiring AI clients (--no-wire)"
else
  wire_step
fi

if [ "$NO_APP" = 1 ]; then
  out Skipped "app step (--no-app)"
elif [ "$HELPER_APP" = 1 ]; then
  helper_app_step
else
  app_step
fi

# --- final lines ----------------------------------------------------------------
if [ "$NO_APP" = 1 ]; then
  out Finished "the Helper is ready"
else
  out Installed "$app_path"
fi
printf '  try: superbot status\n'
if [ -n "$HELPER_ACT" ]; then
  dim "the Helper's CLI is not on your PATH yet; run the activation line below"
  printf '  %s\n' "$HELPER_ACT"
fi
