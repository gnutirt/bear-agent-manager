# Run one headless Claude Code turn on the Intern API (worker account), never the main account.
# Exit codes: 0 ok, 1 task failed on every model, 2 no key, 3 QUOTA/limit hit -> caller must do the job itself.
# Status goes to ~/.bear-agent-manager/workers.jsonl (start/end, short task summary, never the prompt) so the
# Bear Agent Manager hub can show and stop running workers. The hub is optional: if it is down, nothing waits.
param(
    [Parameter(Mandatory)][string]$PromptFile,
    [string]$Model = "auto",
    [string]$Dir = (Get-Location).Path,
    [string]$Tools = "Read,Grep,Glob,Bash",
    [ValidateSet("worker", "osin", "congnhan", "vesinh")][string]$Kind = "worker",
    [string]$Task = "",                                  # <=100-char summary for the board; default: first line of the prompt file
    [string]$By = $env:CLAUDE_CODE_SESSION_ID            # who hired the worker (chat name or session id)
)
$key = $env:INTERN_API_KEY
$kf = Join-Path $HOME ".claude\congnhan.key"
if (-not $key -and (Test-Path $kf)) { $key = (Get-Content -Raw $kf).Trim() }
if (-not $key) { Write-Error "No Intern key: set INTERN_API_KEY or put it in $kf"; exit 2 }

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
    Log-Line @{ event = "end"; exit = $code; model = $model; cost = $cost; error = (Short $err 200); result = $res }
    exit $code
}
# Wait while the hub reports the cap reached; give up waiting after 15 min. Hub down -> run right away.
$tokFile = Join-Path $hubHome "token"
if (Test-Path $tokFile) {
    $tok = (Get-Content -Raw $tokFile).Trim()
    $deadline = (Get-Date).AddMinutes(15)
    while ((Get-Date) -lt $deadline) {
        try {
            $s = Invoke-RestMethod -Uri "http://127.0.0.1:$hubPort/api/workers/slot?self=$PID" -Headers @{ "x-room-token" = $tok } -TimeoutSec 20
        } catch { break }
        if ($s.ok) { break }
        Write-Output "[worker] waiting for a slot ($($s.running)/$($s.cap) workers running)"
        Start-Sleep 15
    }
}
$prompt = Get-Content -Raw $PromptFile
if (-not $Task) { $Task = (($prompt -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -First 1) }
Log-Line @{ event = "start"; pid = $PID; kind = $Kind; dir = $Dir; task = (Short $Task 100); tools = $Tools; by = "$By"; skill = $skill }

# auto: read-only work -> cheap 1M-ctx flash; editing code -> stronger agentic coders. Later entries are fallbacks.
$edits = $Tools -match 'Edit|Write'
$chain = if ($Model -ne "auto") { @($Model) }
         elseif ($edits) { @("kimi-k2.6", "glm-5.3", "deepseek-v4-pro-0813") }
         else { @("deepseek-v4-flash-0731", "glm-5.3", "kimi-k2.6") }

# Env set here lives only in this process; --bare makes the key the sole auth (no OAuth/keychain).
$env:ANTHROPIC_BASE_URL = if ($env:CONGNHAN_BASE_URL) { $env:CONGNHAN_BASE_URL } else { "https://discovery-api.intern-ai.org.cn" }
$env:ANTHROPIC_API_KEY = $key
Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
# Worker transcripts go to the hub's worker-config dir, not ~/.claude/projects/<repo> (they flooded each repo's chat list).
$env:CLAUDE_CONFIG_DIR = Join-Path $hubHome "worker-config"
New-Item -ItemType Directory -Force $env:CLAUDE_CONFIG_DIR | Out-Null
Set-Location $Dir
$quotaRx = '429|402|quota|rate.?limit|insufficient|balance|exceed|限额|余额|额度|墨点'

foreach ($m in $chain) {
    foreach ($v in "ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL") {
        Set-Item "Env:$v" $m
    }
    for ($try = 1; $try -le 2; $try++) {
        $out = $prompt | claude -p --bare --model $m --tools $Tools --allowedTools $Tools --strict-mcp-config --output-format json 2>&1 | Out-String
        $last = ($out.Trim() -split "`r?`n")[-1]
        try { $j = $last | ConvertFrom-Json } catch { $j = $null }
        if ($j -and -not $j.is_error) { Write-Output "[worker] model=$m"; Write-Output $last; Finish 0 $m $j "" }
        $err = if ($j) { "$($j.api_error_status) $($j.result)" } else { $out }
        if ($err -notmatch $quotaRx) { break }          # not a limit problem -> try next model
        if ($try -eq 1 -and $err -match '429|rate.?limit') { Start-Sleep 65; continue }  # RPM window, retry once
        Write-Output "[worker] QUOTA model=$m :: $err"; Finish 3 $m $j "QUOTA $err"   # 墨点 shared by all models: switching won't help
    }
    Write-Output "[worker] model=$m failed :: $err"
}
Finish 1 $m $j $err
