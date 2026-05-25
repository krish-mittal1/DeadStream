param(
  [string]$ApiUrl = "http://localhost:8000",
  [string]$FrontendUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Invoke-Json($Method, $Url, $Body = $null, $Token = $null) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }
  if ($Body) {
    Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
  } else {
    Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
  }
}

Write-Host "Checking backend health..."
$health = Invoke-Json GET "$ApiUrl/api/health"
if ($health.status -ne "ok") {
  throw "Backend health failed"
}

Write-Host "Registering or logging in smoke user..."
$username = "smoke_$([int][double]::Parse((Get-Date -UFormat %s)))"
$password = "password123"
$auth = Invoke-Json POST "$ApiUrl/api/auth/register" @{
  username = $username
  password = $password
  display_name = "Smoke User"
}

Write-Host "Creating post..."
$post = Invoke-Json POST "$ApiUrl/api/posts" @{
  body = "Smoke test entering DeadStream at $(Get-Date -Format o)"
} $auth.token

Write-Host "Liking post..."
Invoke-Json POST "$ApiUrl/api/posts/$($post.id)/like" $null $auth.token | Out-Null

Write-Host "Fetching feed, communities, agents, events..."
$feed = Invoke-Json GET "$ApiUrl/api/feed"
$communities = Invoke-Json GET "$ApiUrl/api/communities"
$agents = Invoke-Json GET "$ApiUrl/api/agents"
$events = Invoke-Json GET "$ApiUrl/api/events"

if ($feed.Count -lt 1) { throw "Feed is empty after posting" }
if ($communities.Count -lt 1) { throw "Communities are missing" }
if ($agents.Count -lt 1) { throw "Agents are missing" }
if ($events.Count -lt 1) { throw "Events are missing" }

Write-Host "Checking frontend..."
$frontend = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
if ($frontend.StatusCode -lt 200 -or $frontend.StatusCode -ge 400) {
  throw "Frontend did not respond successfully"
}

Write-Host "Smoke test passed."

