param(
    [int]$Port = 8080
)

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
if (-not $scriptDir) { $scriptDir = "e:\kprit hackiton" }

$endpoint = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, $Port)
$listener = [System.Net.Sockets.TcpListener]::new($endpoint)
$listener.Start()
Write-Host "AuraPriv Web Server running at http://localhost:$Port/"
Write-Host "Serving files from: $scriptDir"
Write-Host "Press Ctrl+C to stop."

function Get-MimeType($path) {
    if ($path.EndsWith(".html")) { return "text/html; charset=utf-8" }
    if ($path.EndsWith(".css"))  { return "text/css; charset=utf-8" }
    if ($path.EndsWith(".js"))   { return "application/javascript; charset=utf-8" }
    if ($path.EndsWith(".json")) { return "application/json; charset=utf-8" }
    if ($path.EndsWith(".png"))  { return "image/png" }
    if ($path.EndsWith(".jpg") -or $path.EndsWith(".jpeg")) { return "image/jpeg" }
    if ($path.EndsWith(".svg"))  { return "image/svg+xml" }
    if ($path.EndsWith(".ico"))  { return "image/x-icon" }
    return "application/octet-stream"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 3000
        $client.SendTimeout    = 10000
        $stream = $client.GetStream()

        try {
            # Read all request headers until blank line
            $requestBytes = New-Object System.Collections.Generic.List[byte]
            $buffer = New-Object byte[] 4096
            $headerDone = $false
            $requestText = ""

            while (-not $headerDone) {
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                if ($bytesRead -le 0) { break }
                for ($i = 0; $i -lt $bytesRead; $i++) { $requestBytes.Add($buffer[$i]) }
                $requestText = [System.Text.Encoding]::UTF8.GetString($requestBytes.ToArray())
                if ($requestText -match "`r`n`r`n") { $headerDone = $true }
            }

            # Parse request line
            $requestLine = ($requestText -split "`r`n")[0]
            $tokens = $requestLine.Trim().Split(' ')

            if ($tokens.Length -ge 2) {
                $rawPath   = $tokens[1]
                $cleanPath = ($rawPath -split '\?')[0].TrimStart('/')
                if ([string]::IsNullOrWhiteSpace($cleanPath)) { $cleanPath = "index.html" }

                $localPath = Join-Path $scriptDir $cleanPath

                Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $($tokens[0]) /$cleanPath"

                if (Test-Path $localPath -PathType Leaf) {
                    $body        = [System.IO.File]::ReadAllBytes($localPath)
                    $mime        = Get-MimeType $localPath
                    $headerText  = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($body, 0, $body.Length)
                } else {
                    $body        = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1><p>$cleanPath</p>")
                    $headerText  = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($body, 0, $body.Length)
                }
                $stream.Flush()
            }
        } catch {
            Write-Host "Error: $_"
        } finally {
            try { $stream.Close() } catch {}
            try { $client.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
    Write-Host "Server stopped."
}
