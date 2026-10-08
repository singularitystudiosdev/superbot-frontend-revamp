<#
# superbot bootstrap — one line for windows:
#   irm {{ORIGIN}}/bootstrap.ps1 | iex
# In order: install the Helper (superbot-helper, registered against this
# origin), sign you in with a browser sign-in (superbot signin), wire every
# installed AI client (superbot clients wire), then the superbot desktop app
# (NSIS, per-user). Re-running this exact line IS the update: the Helper's
# install verb is a no-op at the same version. Sign-in and wiring never fail
# the line.
# Flags: -NoApp (alias -HelperOnly), -HelperApp, -NoLaunch, -NoSignin, -NoWire,
# -DryRun, -Force. Switches need the scriptblock form:
#   & ([scriptblock]::Create((irm {{ORIGIN}}/bootstrap.ps1))) -HelperApp
# -HelperApp is "use your own harness": the Helper plus the standalone Superbot
# Helper app (the NSIS exe from /download/helper-app/asset/windows-x64,
# per-user) in place of the desktop app. Sign-in and wiring are the same; it
# conflicts with -NoApp/-HelperOnly.
# Exit codes: 0 ok, 1 the Helper step failed (a five-part error), 2 usage.
# Templates: {{ORIGIN}} {{MCP_URL}}, and the $DownloadAuth assignment below —
# substituted by the edge on serve (edge/src/desktop-release.ts). winget/scoop
# are deferred; the direct asset is the path.
# The beta form: on a beta host this script and every /download/* byte answer
# only a request that carries a beta grant, and a pasted `irm | iex` carries no
# cookie, so the download page prints the line with the viewer's own download
# token (sbd_...) as a Bearer header:
#   irm {{ORIGIN}}/bootstrap.ps1 -Headers @{Authorization='Bearer sbd_XXXX'} | iex
#   & ([scriptblock]::Create((irm {{ORIGIN}}/bootstrap.ps1 -Headers @{Authorization='Bearer sbd_XXXX'}))) -HelperApp
# The edge then bakes that same token into $DownloadAuth when it serves this
# script, and every fetch this script makes from {{ORIGIN}}/download/* sends it
# back. Without a token (every other host, or no Bearer on the line that fetched
# this script) $DownloadAuth is empty, $DlAuth is an empty splat and nothing
# below differs from a plain run. The token is never printed, and is sent to
# {{ORIGIN}} only.
#>
param(
    [switch]$NoApp,
    [switch]$HelperOnly,
    [switch]$HelperApp,
    [switch]$NoLaunch,
    [switch]$NoSignin,
    [switch]$NoWire,
    [switch]$DryRun,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'

$Origin = '{{ORIGIN}}'
$McpUrl = '{{MCP_URL}}'
# The viewer's download token, or ''. Only a well-formed one survives: sbd_ and
# then one or more of A-Z a-z 0-9 _ -. An empty value, the placeholder left
# unsubstituted (a raw run of this file) and anything else become ''. -cnotmatch
# because -notmatch ignores case, and \z because $ would also accept a trailing
# newline.
$DownloadAuth = '{{DOWNLOAD_AUTH}}'
if ($DownloadAuth -cnotmatch '^sbd_[A-Za-z0-9_-]+\z') { $DownloadAuth = '' }
# The one place the token becomes a header: a hashtable every Invoke-WebRequest to
# $Origin/download/* splats (@DlAuth). Empty without a token, so those calls are
# exactly what they were; with one it is -Headers @{ Authorization = 'Bearer ...' }.
# It is never written to the console: the dry-run says only that a token is
# present, and an error here shows the script line, which names the variable.
$DlAuth = @{}
if ($DownloadAuth) { $DlAuth = @{ Headers = @{ Authorization = "Bearer $DownloadAuth" } } }
$HelperPlat = 'windows-x64'
$HelperAsset = 'superbot-helper-windows-x64.exe'
$HelperUrl = "$Origin/download/helper/asset/$HelperPlat"
$SumsUrl = "$Origin/download/helper/asset/sha256sums"
$HelperUrlAsset = "$Origin/download"
# The Helper's fallback bin: the five-part error and the fix lines name it,
# whatever the gate actually resolved to.
$GateName = Join-Path $env:USERPROFILE '.superbot\bin\superbot-helper.cmd'
$HelperPlatDir = Join-Path $env:TEMP ('sb-helper-' + [guid]::NewGuid().ToString('N'))
$HelperAct = ''
# The Helper's CLI (`superbot`), resolved after the gate: it may not be on
# PATH in this session, so the shim beside the gate binary and the fallback
# bin are tried too.
$SbCli = $null
# which switch asked for no app, for the -HelperApp conflict line
$NoAppFlag = ''
if ($NoApp) { $NoAppFlag = '-NoApp' }
if ($HelperOnly) { $NoAppFlag = '-HelperOnly' }
$NoApp = $NoApp -or $HelperOnly

# --- terminal frontend ---------------------------------------------------------
# Color only when the host supports VT: brand accent in a terminal is storm
# teal (truecolor #00e5c3, 256-color index 50), muted 245; no -ForegroundColor
# fallbacks, a legacy conhost just prints plain. Status verbs right-align in a
# 12-character field (the cargo idiom).
$E = [char]27
$VT = $false
try { $VT = [bool]$Host.UI.SupportsVirtualTerminal } catch { $VT = $false }
$AC = "$E[38;5;50m"
$MU = "$E[38;5;245m"
$NO = "$E[0m"

function Out([string]$Verb, [string]$Msg) {
    $padded = '{0,12}' -f $Verb
    if ($VT) { Write-Host ($AC + $padded + $NO + '  ' + $Msg) }
    else { Write-Host ($padded + '  ' + $Msg) }
}
function Dim([string]$Msg) {
    if ($VT) { Write-Host ($MU + '  ' + $Msg + $NO) }
    else { Write-Host ('  ' + $Msg) }
}
function Warn([string]$Msg) {
    Write-Host ('superbot bootstrap: ' + $Msg) -ForegroundColor Red
}

# fail5 <code> <title> <description> <fix> <fix-or-page> <url> — the five-part
# error (code, title, description, how to fix, where to read more): stderr,
# exit 1. The Helper gate is the caller this was built for.
function Fail5([string]$Code, [string]$Title, [string]$Desc, [string]$Fix1, [string]$Fix2, [string]$Url) {
    [Console]::Error.WriteLine("superbot bootstrap: [$Code] $Title")
    [Console]::Error.WriteLine("  $Desc")
    [Console]::Error.WriteLine("  fix: $Fix1")
    [Console]::Error.WriteLine("       or: $Fix2")
    [Console]::Error.WriteLine("  see: $Url")
    exit 1
}

# AppFail <reason> — the app step's clean partial exit: one reason line, then
# the exact sentinel, then 0. The Helper is what wires the machine; a failed
# app must never turn the whole install into a failure.
function AppFail([string]$Reason) {
    [Console]::Error.WriteLine("superbot bootstrap: $Reason")
    [Console]::Error.WriteLine('Helper installed, app skipped')
    exit 0
}

function Usage([string]$Why) {
    Warn $Why
    Write-Host 'usage: irm bootstrap.ps1 | iex   # -NoApp | -HelperApp  -NoLaunch -NoSignin -NoWire -DryRun -Force'
    Write-Host '  -NoApp       install the Helper only (alias: -HelperOnly)'
    Write-Host '  -HelperApp   install the Helper plus the superbot relay app, in place of the desktop app'
    Write-Host '  -NoLaunch    download the app, do not start the installer'
    Write-Host '  -NoSignin    skip the browser sign-in (run superbot signin later)'
    Write-Host '  -NoWire      skip wiring AI clients (run superbot clients wire later)'
    Write-Host '  -DryRun      print every step, download nothing, exit 0'
    Write-Host '  -Force       pass through to the Helper''s install -Force'
    exit 2
}

# gate — install --register may start the Helper asynchronously, so poll the
# status check (exit 3 means not reachable, 0 means up) for up to 15 seconds
# before declaring the install failed.
function GateHelper([string]$Cmd) {
    for ($i = 0; $i -lt 15; $i++) {
        & $Cmd status --json *> $null
        if ($LASTEXITCODE -eq 0) { return $true }
        if ($i -lt 14) { Start-Sleep -Seconds 1 }
    }
    return $false
}

# --- flags ----------------------------------------------------------------------
if ($args.Count -gt 0) { Usage 'positional arguments are not accepted, use the switches above' }
if ($HelperApp -and $NoApp) {
    Usage "-HelperApp cannot be combined with ${NoAppFlag}: -HelperApp installs the superbot relay app and ${NoAppFlag} installs no app"
}

# --- the helper step -----------------------------------------------------------
function HelperStep {
    New-Item -ItemType Directory -Force -Path $HelperPlatDir | Out-Null
    Out 'Downloading' $HelperUrl
    Invoke-WebRequest -UseBasicParsing -Uri $HelperUrl @DlAuth -OutFile (Join-Path $HelperPlatDir $HelperAsset)
    Out 'Downloading' $SumsUrl
    Invoke-WebRequest -UseBasicParsing -Uri $SumsUrl @DlAuth -OutFile (Join-Path $HelperPlatDir 'SHA256SUMS')

    $assetPath = Join-Path $HelperPlatDir $HelperAsset
    $sumsPath = Join-Path $HelperPlatDir 'SHA256SUMS'
    Out 'Verifying' "$HelperAsset against SHA256SUMS"
    $line = Select-String -LiteralPath $sumsPath -Pattern ([regex]::Escape($HelperAsset)) | Select-Object -First 1
    $want = $null
    if ($line) { $want = ($line.Line -split '\s+')[0] }
    if (-not $want) {
        Fail5 'helper-checksum-failed' "no SHA256SUMS line for $HelperAsset" `
            "the sums file at $SumsUrl has no line for $HelperAsset, so the download cannot be verified." `
            'retry the line; if it persists the release may be private' `
            $HelperUrlAsset `
            "$Origin/install"
    }
    $got = (Get-FileHash -Algorithm SHA256 -LiteralPath $assetPath).Hash
    if ($got -ine $want) {
        Fail5 'helper-checksum-failed' 'the superbot-helper download does not match SHA256SUMS' `
            "expected $want, got $got for $HelperAsset." `
            'retry the line; if it persists the release may have moved' `
            $HelperUrlAsset `
            "$Origin/install"
    }

    # the install verb: a no-op at the same version, an upgrade otherwise,
    # -Force when the caller asked. The --json line carries the action, the
    # landed version and (when the shim dir is the fallback) the PATH line.
    # --origin bakes this edge into the registered unit; a Helper released
    # before --origin existed answers exit 2 (usage), and is retried without it.
    $installArgs = @('install', '--register', "--origin=$Origin")
    if ($Force) { $installArgs += '--force' }
    $installArgs += '--json'
    $helperJson = & $assetPath @installArgs
    if ($LASTEXITCODE -eq 2) {
        $installArgs = @('install', '--register')
        if ($Force) { $installArgs += '--force' }
        $installArgs += '--json'
        $helperJson = & $assetPath @installArgs
    }
    if ($LASTEXITCODE -ne 0) {
        Fail5 'helper-install-failed' 'superbot-helper install --register failed' `
            'the Helper''s install verb exited non-zero, so the Helper may not be registered.' `
            'retry with superbot-helper install --register --force' `
            $HelperUrlAsset `
            "$Origin/install"
    }
    $helperText = ($helperJson | Out-String).Trim()
    $action = 'installed'
    $landed = ''
    $activation = $null
    try {
        $j = $helperText | ConvertFrom-Json
        if ($j.action) { $action = [string]$j.action }
        if ($j.landed) { $landed = [string]$j.landed }
        if ($j.shims -and $j.shims.fallback -eq $true) { $activation = $j.shims.activationLine }
    } catch {
        # an older Helper may print no --json line: the status check below is
        # the real gate, so the parse failure is tolerated
    }
    if ($action -eq 'refused') {
        Fail5 'helper-install-failed' 'superbot-helper refused the install' `
            'the Helper''s install verb refused, so the Helper may not be registered.' `
            'retry with superbot-helper install --register --force' `
            $HelperUrlAsset `
            "$Origin/install"
    }
    if ($activation) { $script:HelperAct = [string]$activation }

    # the gate
    Out 'Checking' 'superbot-helper status --json (up to 15s)'
    $gateCmd = $null
    $cmd = Get-Command 'superbot-helper' -ErrorAction SilentlyContinue
    if ($cmd) { $gateCmd = $cmd.Source }
    if (-not $gateCmd -and (Test-Path -LiteralPath $GateName)) { $gateCmd = $GateName }
    $gateOk = $false
    if ($gateCmd -and (GateHelper $gateCmd)) { $gateOk = $true }
    if (-not $gateOk) {
        Fail5 'helper-not-running' 'the Helper is not running' `
            'the install finished but superbot-helper did not answer a status check within 15 seconds, so it cannot route your AI clients yet.' `
            "$GateName run" `
            'superbot-helper install --register --force' `
            "$Origin/install"
    }
    if ($action -eq 'noop') {
        Out 'Installed' "superbot-helper $landed (already current, no-op)".Trim()
    }
    else {
        Out 'Installed' "superbot-helper $landed ($action)".Trim()
    }

    # the CLI: on PATH, else beside the gate binary, else the fallback bin
    $cli = Get-Command 'superbot' -ErrorAction SilentlyContinue
    if ($cli) { $script:SbCli = $cli.Source }
    else {
        $beside = Join-Path (Split-Path -Parent $gateCmd) 'superbot.cmd'
        $fallback = Join-Path $env:USERPROFILE '.superbot\bin\superbot.cmd'
        if (Test-Path -LiteralPath $beside) { $script:SbCli = $beside }
        elseif (Test-Path -LiteralPath $fallback) { $script:SbCli = $fallback }
    }
}

# --- the sign-in step -----------------------------------------------------------
# The browser sign-in. An older Helper without the verb (exit 2), any failure,
# or a non-interactive session prints the later line and carries on: sign-in
# never fails the line.
function SigninStep {
    if (-not $SbCli -or -not [Environment]::UserInteractive) {
        Dim 'sign in later: superbot signin'
        return
    }
    Out 'Signing in' "$Origin (a browser opens)"
    $ok = $false
    try {
        & $SbCli signin "--origin=$Origin"
        $ok = ($LASTEXITCODE -eq 0)
    } catch { $ok = $false }
    if (-not $ok) { Dim 'sign in later: superbot signin' }
}

# --- the wire step --------------------------------------------------------------
# Every installed, unwired AI client, non-interactively. A failure prints one
# dim line and carries on.
function WireStep {
    if (-not $SbCli) {
        Dim 'wire your AI clients later: superbot clients wire'
        return
    }
    Out 'Wiring' 'your AI clients (superbot clients wire)'
    $ok = $false
    try {
        & $SbCli clients wire
        $ok = ($LASTEXITCODE -eq 0)
    } catch { $ok = $false }
    if ($ok) { Write-Host '  restart your AI client to load Superbot' }
    else { Dim 'wiring did not finish, retry later: superbot clients wire' }
}

# --- the app step ---------------------------------------------------------------
# Kept from the previous bootstrap: the NSIS installer downloaded and started
# (per-user). -NoLaunch keeps the previous behaviour: the installer is
# downloaded and left alone. Any failure ends in AppFail: reason, sentinel,
# exit 0.
function AppStep {
    if (-not $NoLaunch) {
        $assetKey = 'windows-x64'
        $appUrl = "$Origin/download/asset/$assetKey"
        $appPath = Join-Path $env:TEMP 'superbot-Setup.exe'
        Out 'Downloading' $appUrl
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $appUrl @DlAuth -OutFile $appPath
        } catch {
            AppFail "could not fetch the app from $Origin, grab it from $Origin/download"
        }
        $size = (Get-Item -LiteralPath $appPath).Length
        if ($size -lt 1024) {
            AppFail "could not fetch the app from $Origin, grab it from $Origin/download"
        }
        Out 'Installing' 'the superbot app (the NSIS installer opens; follow it)'
        Start-Process -FilePath $appPath -Wait
        Out 'Installed' $appPath
    }
    else {
        $assetKey = 'windows-x64'
        $appUrl = "$Origin/download/asset/$assetKey"
        $appPath = Join-Path $env:TEMP 'superbot-Setup.exe'
        Out 'Downloading' $appUrl
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $appUrl @DlAuth -OutFile $appPath
        } catch {
            AppFail "could not fetch the app from $Origin, grab it from $Origin/download"
        }
        Out 'Installed' "$appPath (downloaded and left alone, nothing is started; run it when you are ready)"
    }
}

# --- the Helper app step --------------------------------------------------------
# -HelperApp: "use your own harness". The standalone superbot relay app (productName
# "superbot relay", "Superbot Helper" before 2026-10-06; appId com.superbot.helper-app,
# NSIS per-user)
# goes in the desktop app's place; helper, sign-in and wiring ran before it
# exactly as on the desktop route. The edge answers
# /download/helper-app/asset/windows-x64 with a 302 to the release file, 404
# when the newest Helper app release ships no Windows build and 503 when no
# Helper app release is resolvable: both end in the same one-line "no release
# yet" skip. -NoLaunch downloads the installer and leaves it alone, as the app
# step does. Same clean partial exit: reason, sentinel, exit 0.
function HelperAppStep {
    $assetKey = 'windows-x64'
    $appUrl = "$Origin/download/helper-app/asset/$assetKey"
    $appPath = Join-Path $env:TEMP 'superbot-helper-app-Setup.exe'
    Out 'Downloading' $appUrl
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $appUrl @DlAuth -OutFile $appPath
    } catch {
        $code = 0
        try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
        if ($code -eq 404 -or $code -eq 503) {
            AppFail "the superbot relay app has no release for this platform yet, see $Origin/download#helper"
        }
        AppFail "could not fetch the superbot relay app from $Origin, grab it from $Origin/download"
    }
    $size = (Get-Item -LiteralPath $appPath).Length
    if ($size -lt 1024) {
        AppFail "could not fetch the superbot relay app from $Origin, grab it from $Origin/download"
    }
    if ($NoLaunch) {
        Out 'Installed' "$appPath (downloaded and left alone, nothing is started; run it when you are ready)"
    }
    else {
        Out 'Installing' 'the superbot relay app (the NSIS installer opens; follow it)'
        Start-Process -FilePath $appPath -Wait
        Out 'Installed' $appPath
    }
}

# --- dry-run: every step it would take, downloads nothing, exits 0 --------------
if ($DryRun) {
    Write-Host 'superbot bootstrap --dry-run'
    if ($DownloadAuth) { Write-Host ' auth    download token (from the line that fetched this script)' }
    Write-Host " helper  download $HelperUrl and $SumsUrl"
    Write-Host " helper  verify $HelperAsset against SHA256SUMS (Get-FileHash)"
    Write-Host " helper  install --register --origin=$Origin (a no-op at the same version)"
    Write-Host " helper  gate $GateName status --json, up to 15s"
    if ($NoSignin) { Write-Host ' signin  skipped (-NoSignin)' }
    else { Write-Host " signin  superbot signin --origin=$Origin (a browser sign-in, when the session is interactive)" }
    if ($NoWire) { Write-Host ' wire    skipped (-NoWire)' }
    else { Write-Host ' wire    superbot clients wire (every installed AI client)' }
    if ($NoApp) {
        Write-Host ' app     skipped (-NoApp)'
    }
    elseif ($HelperApp) {
        Write-Host " app     download $Origin/download/helper-app/asset/windows-x64 (the superbot relay app, in place of the desktop app)"
        Write-Host ' app     run the NSIS installer (per-user), or download only with -NoLaunch'
    }
    else {
        Write-Host " app     download $Origin/download/asset/windows-x64"
        Write-Host ' app     run the NSIS installer (per-user), or download only with -NoLaunch'
    }
    Write-Host ' final   try: superbot status'
    exit 0
}

Write-Host ''
if ($VT) { Write-Host ($AC + 'superbot bootstrap' + $NO) }
else { Write-Host 'superbot bootstrap' }
if ($VT) {
    Write-Host ($MU + 'origin  ' + $NO + $Origin)
    Write-Host ($MU + 'remote  ' + $NO + $McpUrl)
}
else {
    Write-Host "origin  $Origin"
    Write-Host "remote  $McpUrl"
}
Write-Host ''

HelperStep

if ($NoSignin) { Out 'Skipped' 'sign-in (-NoSignin)' }
else { SigninStep }

if ($NoWire) { Out 'Skipped' 'wiring AI clients (-NoWire)' }
else { WireStep }

if ($NoApp) {
    Out 'Skipped' 'app step (-NoApp)'
}
elseif ($HelperApp) {
    HelperAppStep
}
else {
    AppStep
}

# --- final lines ----------------------------------------------------------------
Out 'Finished' 'the Helper is ready'
Write-Host '  try: superbot status'
if ($HelperAct) {
    Dim "the Helper's CLI is not on your PATH yet; run the activation line below"
    Write-Host "  $HelperAct"
}
