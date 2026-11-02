$app = New-Object -ComObject PowerPoint.Application
$app.Visible = 0
$pres = $app.Presentations.Open((Join-Path (Get-Location) '.ppt-build\fuzzy-quest-amelioree-com.pptx'),0,0,0)
"OPENED $($pres.Slides.Count)"
$pres.Close()
$app.Quit()
