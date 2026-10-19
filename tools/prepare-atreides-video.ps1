param([string]$InputVideo = 'C:\Users\Admin\Downloads\gemini_generated_video_c86f6336.mp4')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskVideo = Join-Path $taskRoot 'web/public/video/mentat-atreides-alpha.webm'
$taskIdle = Join-Path $taskRoot 'web/public/video/mentat-atreides-idle.png'
$taskScratch = Join-Path $taskRoot 'scratch/mentat-atreides-video'
New-Item -ItemType Directory -Force -Path $taskScratch | Out-Null
& ffmpeg -hide_banner -v error -y -i $InputVideo -filter_complex_script (Join-Path $PSScriptRoot 'atreides-cutout.ffgraph') -map '[out]' -an -c:v libvpx-vp9 -b:v 0 -crf 25 -pix_fmt yuva420p -auto-alt-ref 0 -row-mt 1 -deadline good -cpu-used 4 $taskVideo *> (Join-Path $taskScratch 'encode.log')
if ($LASTEXITCODE -ne 0) { throw 'Video encoding failed; inspect scratch/mentat-atreides-video/encode.log' }
& ffmpeg -v error -y -c:v libvpx-vp9 -i $taskVideo -frames:v 1 $taskIdle
if ($LASTEXITCODE -ne 0) { throw 'Portrait extraction failed' }
& ffmpeg -v error -y -c:v libvpx-vp9 -i $taskVideo -ss 2.5 -frames:v 1 (Join-Path $taskScratch 'speaking.png')
if ($LASTEXITCODE -ne 0) { throw 'Speaking preview extraction failed' }
& ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height:stream_tags=alpha_mode -show_entries format=duration,size -of json $taskVideo | Set-Content -Encoding utf8 (Join-Path $taskScratch 'media-info.json')
Write-Output "Saved silent alpha video and portrait: $taskVideo"
