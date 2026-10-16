# Run one headless Claude Code turn on a worker provider (free Intern AI first, paid only when allowed), never the main account.
# Exit codes: 0 ok, 1 task failed on every model, 2 no usable provider/key, 3 QUOTA/limit hit, 4 skill turned off
# in settings -> on 1-4 the caller must do the job itself.
# Status goes to ~/.bear-agent-manager/workers.jsonl (start/end, short task summary, never the prompt) so the
# Bear Agent Manager hub can show and stop running workers. The hub is optional: if it is down, nothing waits.
param(
    [Parameter(Mandatory)][string]$PromptFile,
    [string]$Model = "auto",
    [string]$Dir = (Get-Location).Path,
    [string]$Tools = "Read,Grep,Glob,Bash",
    [ValidateSet("worker", "osin", "congnhan", "vesinh")][string]$Kind = "worker",
    [ValidateSet("auto", "free", "paid")][string]$Tier = "auto",
    [string]$Provider = "",                              # pin one provider id from providers.json
    [string]$Task = "",                                  # <=100-char summary for the board; default: first line of the prompt file
    [string]$By = $env:CLAUDE_CODE_SESSION_ID            # who hired the worker (chat name or session id)
)

# --- status log + machine-wide slot gate (Bear Agent Manager) ---
$hubHome = if ($env:BEAR_AGENT_HOME) { $env:BEAR_AGENT_HOME } else { Join-Path $HOME ".bear-agent-manager" }
$hubPort = if ($env:BEAR_AGENT_PORT) { $env:BEAR_AGENT_PORT } else { 7788 }
$logFile = Join-Path $hubHome "workers.jsonl"
$runId = [guid]::NewGuid().ToString("N").Substring(0, 12)
$Kind = if ($Kind -in "osin", "vesinh") { "osin" } else { "worker" }
$skill = $Kind
function Log-Line($obj) {
    try {
        if (-not (Test-Path $hubHome)) { return }
        $obj.id = $runId; $obj.ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $line = ($obj | ConvertTo-Json -Compress) + "`n"
        [IO.File]::AppendAllText($logFile, $line, (New-Object Text.UTF8Encoding($false)))
    } catch { }
}
function Short($s, $n) { $s = "$s" -replace '\s+', ' '; if ($s.Length -gt $n) { $s.Substring(0, $n - 1) + "…" } else { $s.Trim() } }
function Finish($code, $model, $j, $err) {
    $cost = if ($j -and $j.total_cost_usd -ne $null) { $j.total_cost_usd } else { $null }
    $res = if ($j -and $code -eq 0) { Short $j.result 200 } else { "" }
    $u = if ($j -and $j.usage) { $j.usage } else { $null }
    $usage = @{ in = [int]$u.input_tokens; out = [int]$u.output_tokens; cacheRead = [int]$u.cache_read_input_tokens; cacheWrite = [int]$u.cache_creation_input_tokens }
    Log-Line @{ event = "end"; exit = $code; model = $model; provider = "$($prov.id)"; tier = "$($prov.tier)"; cost = $cost; usage = $usage; error = (Short $err 200); result = $res }
    exit $code
}

# --- settings + providers (both written by the hub; both optional) ---
function Read-Json($f) { try { if (Test-Path $f) { return (Get-Content -Raw $f | ConvertFrom-Json) } } catch { } return $null }
$settings = Read-Json (Join-Path $hubHome "settings.json")
if ($settings -and $settings.skills -and $settings.skills.$Kind -and $settings.skills.$Kind.enabled -eq $false) {
    Write-Output "[worker] skill '$Kind' is turned off in Bear Agent Manager settings: do the task yourself"; exit 4
}
$allowPaid = [bool]($settings -and $settings.allowPaidFallback)
$defaultModels = [pscustomobject]@{ read = @("deepseek-v4-flash-0731", "glm-5.3", "kimi-k2.6"); edit = @("kimi-k2.6", "glm-5.3", "deepseek-v4-pro-0813") }
# Without providers.json: the built-in free provider + legacy key file / env.
$providers = @(Read-Json (Join-Path $hubHome "providers.json"))
if (-not $providers -or -not $providers[0]) {
    $providers = @([pscustomobject]@{ id = "intern"; tier = "free"; enabled = $true; auth = "api-key"; key = "";
        baseUrl = $(if ($env:WORKER_BASE_URL) { $env:WORKER_BASE_URL } elseif ($env:CONGNHAN_BASE_URL) { $env:CONGNHAN_BASE_URL } else { "https://discovery-api.intern-ai.org.cn" });
        models = $defaultModels })
}
foreach ($p in $providers) {
    if ($p.id -eq "intern" -and -not $p.key) {
        $kf = Join-Path $HOME ".claude\congnhan.key"
        $p.key = if ($env:INTERN_API_KEY) { $env:INTERN_API_KEY } elseif (Test-Path $kf) { (Get-Content -Raw $kf).Trim() } else { "" }
    }
}
$usable = { param($t) $providers | Where-Object { $_.enabled -and $_.key -and $_.tier -eq $t -and (-not $Provider -or $_.id -eq $Provider) } }
$plan = switch ($Tier) {
    "free" { @(& $usable "free") }
    "paid" { @(& $usable "paid") }
    default { @(& $usable "free") + $(if ($allowPaid) { @(& $usable "paid") } else { @() }) }
}
if (-not $plan) { Write-Output "[worker] No usable provider for tier '$Tier' (add a key in Bear Agent Manager > Cài đặt)"; exit 2 }
$prov = $null
# Wait while the hub reports the cap reached; give up waiting after 15 min. Hub down -> run right away.
$tokFile = Join-Path $hubHome "token"
if (Test-Path $tokFile) {
    $tok = (Get-Content -Raw $tokFile).Trim()
    $deadline = (Get-Date).AddMinutes(15)
    while ((Get-Date) -lt $deadline) {
        try {
            $s = Invoke-RestMethod -Uri "http://127.0.0.1:$hubPort/api/workers/slot?self=$PID&kind=$Kind" -Headers @{ "x-room-token" = $tok } -TimeoutSec 20
        } catch { break }
        if ($s.ok) { break }
        if ($s.disabled) { Write-Output "[worker] skill '$Kind' is off in Bear Agent Manager settings: do the task yourself"; exit 4 }
        Write-Output "[worker] waiting for a slot ($($s.running)/$($s.cap) workers running)"
        Start-Sleep 15
    }
}
$prompt = Get-Content -Raw $PromptFile
if (-not $Task) { $Task = (($prompt -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -First 1) }
Log-Line @{ event = "start"; pid = $PID; kind = $Kind; dir = $Dir; task = (Short $Task 100); tools = $Tools; by = "$By"; skill = $skill; tier = $Tier }

# auto: read-only work -> cheap 1M-ctx flash; editing code -> stronger agentic coders. Later entries are fallbacks.
$edits = $Tools -match 'Edit|Write'
# -Tools none: no tools at all (jobs whose whole input is in the prompt, e.g. the hub's automatic runs).
# PowerShell 5.1 drops "" arguments to native programs, so the empty list is passed as a literal "".
$toolArgs = if ($Tools -eq "none") { @("--tools", '""') } else { @("--tools", $Tools, "--allowedTools", $Tools) }
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
# PowerShell 5.1 pipes text to native programs as us-ascii: every non-ASCII prompt (Vietnamese, CJK) reached
# the worker as '?'. UTF-8 without BOM for the prompt we pipe into claude.
$OutputEncoding = New-Object Text.UTF8Encoding($false)
# ...and reads claude's stdout with [Console]::OutputEncoding, an OEM code page when started without a console (the hub).
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
# Worker transcripts go to the hub's worker-config dir, not ~/.claude/projects/<repo> (they flooded each repo's chat list).
$env:CLAUDE_CONFIG_DIR = Join-Path $hubHome "worker-config"
New-Item -ItemType Directory -Force $env:CLAUDE_CONFIG_DIR | Out-Null
Set-Location $Dir
$quotaRx = '429|402|quota|rate.?limit|insufficient|balance|exceed|限额|余额|额度|墨点'

$j = $null; $err = ""; $m = ""; $quota = $false
foreach ($prov in $plan) {
    # Env set here lives only in this process. auth-token providers (OpenRouter) must not also send x-api-key:
    # assigning "" removes ANTHROPIC_API_KEY in PowerShell 5.1, which is what we want (--bare + own config dir: no OAuth to fall back to).
    $env:ANTHROPIC_BASE_URL = $prov.baseUrl
    if ($prov.auth -eq "auth-token") { $env:ANTHROPIC_AUTH_TOKEN = $prov.key; $env:ANTHROPIC_API_KEY = "" }
    else { $env:ANTHROPIC_API_KEY = $prov.key; Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue }
    $models = $prov.models
    if (-not ($models -and (@($models.read).Count -or @($models.edit).Count))) {
        if ($prov.baseUrl -notmatch 'intern-ai\.org\.cn') { Write-Output "[worker] provider=$($prov.id) has no models configured: skipped"; continue }
        $models = $defaultModels                            # the built-in chains are Intern model ids
    }
    $chain = if ($Model -ne "auto") { @($Model) } elseif ($edits) { @($models.edit) } else { @($models.read) }
    $quota = $false
    foreach ($m in $chain) {
        foreach ($v in "ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL") { Set-Item "Env:$v" $m }
        for ($try = 1; $try -le 2; $try++) {
            $out = $prompt | claude -p --bare --model $m @toolArgs --strict-mcp-config --output-format json 2>&1 | Out-String
            $last = ($out.Trim() -split "`r?`n")[-1]
            try { $j = $last | ConvertFrom-Json } catch { $j = $null }
            # The JSON line goes out as pure ASCII (\uXXXX escapes): a caller reading our stdout with an OEM code page
            # (a plain PowerShell 5.1 console, Start-Job) would otherwise turn Vietnamese into mojibake.
            $ascii = [regex]::Replace($last, '[^\x00-\x7F]', { param($c) '\u{0:x4}' -f [int][char]$c.Value })
            if ($j -and -not $j.is_error) { Write-Output "[worker] provider=$($prov.id) model=$m"; Write-Output $ascii; Finish 0 $m $j "" }
            $err = if ($j) { "$($j.api_error_status) $($j.result)" } else { $out }
            if ($err -notmatch $quotaRx) { break }          # not a limit problem -> try next model
            if ($try -eq 1 -and $err -match '429|rate.?limit') { Start-Sleep 65; continue }  # RPM window, retry once
            $quota = $true; break
        }
        if ($quota) { break }                               # 墨点 quota is per provider/key: switching model won't help
        Write-Output "[worker] provider=$($prov.id) model=$m failed :: $err"
    }
    if ($quota) { Write-Output "[worker] QUOTA provider=$($prov.id) :: $err" }   # next provider (another free key, then paid)
}
if ($quota) { Finish 3 $m $j "QUOTA $err" }
Finish 1 $m $j $err
