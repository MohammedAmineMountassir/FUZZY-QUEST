$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$working = Join-Path $root '.ppt-build\fuzzy-quest-amelioree-com.pptx'
Copy-Item -LiteralPath (Join-Path $root 'fuzzy-quest.pptx') -Destination $working -Force
function OleRgb([int]$r,[int]$g,[int]$b) { [int]($r + 256*$g + 65536*$b) }
$purple=OleRgb 81 69 205; $pink=OleRgb 214 71 154; $pale=OleRgb 241 239 252; $dark=OleRgb 33 33 33; $muted=OleRgb 115 127 149; $white=OleRgb 255 255 255; $border=OleRgb 189 183 235
function Add-Box($slide,[int]$kind,[double]$x,[double]$y,[double]$w,[double]$h,[int]$fill,[int]$line,[double]$lineWidth=0.8) {
  $s=$slide.Shapes.AddShape($kind,$x,$y,$w,$h)
  $s.Fill.ForeColor.RGB=$fill; $s.Line.ForeColor.RGB=$line; $s.Line.Weight=$lineWidth
  return $s
}
function Add-Text($slide,[string]$name,[double]$x,[double]$y,[double]$w,[double]$h,[string]$text,[double]$size,[int]$color,[bool]$bold=$false,[int]$alignment=1,[int]$vertical=1) {
  $s=$slide.Shapes.AddTextbox(1,$x,$y,$w,$h)
  $s.Name=$name; $s.TextFrame.MarginLeft=0; $s.TextFrame.MarginRight=0; $s.TextFrame.MarginTop=0; $s.TextFrame.MarginBottom=0
  $s.TextFrame.WordWrap=-1; $s.TextFrame.VerticalAnchor=$vertical; $s.TextFrame.TextRange.Text=$text
  $s.TextFrame.TextRange.Font.Name='Calibri'; $s.TextFrame.TextRange.Font.Size=$size; $s.TextFrame.TextRange.Font.Color.RGB=$color
  $s.TextFrame.TextRange.Font.Bold=[int]$bold; $s.TextFrame.TextRange.ParagraphFormat.Alignment=$alignment
  return $s
}
function Reset-Duplicate($slide,[string]$newTitle,[int]$titleColor) {
  for($i=$slide.Shapes.Count; $i -ge 1; $i--) {
    $sh=$slide.Shapes.Item($i); $keep=$false
    try {
      if($sh.HasTextFrame -and $sh.TextFrame.HasText) {
        $t=$sh.TextFrame.TextRange.Text.Trim()
        if($t -eq 'Introduction' -or $t -eq 'Accès à la plateforme') { $keep=$true }
      }
    } catch {}
    if(-not $keep) { $sh.Delete() }
  }
  for($i=1; $i -le $slide.Shapes.Count; $i++) {
    $sh=$slide.Shapes.Item($i); $isTitle=$false
    try {
      if($sh.HasTextFrame -and $sh.TextFrame.HasText) {
        $t=$sh.TextFrame.TextRange.Text.Trim()
        if($t -eq 'Introduction' -or $t -eq 'Accès à la plateforme') { $isTitle=$true }
      }
    } catch {}
    if($isTitle) {
      $sh.TextFrame.TextRange.Text=$newTitle
      $sh.TextFrame.TextRange.Font.Name='Calibri'; $sh.TextFrame.TextRange.Font.Size=28
      $sh.TextFrame.TextRange.Font.Bold=-1; $sh.TextFrame.TextRange.Font.Color.RGB=$titleColor
      break
    }
  }
  try {
    for($i=1; $i -le $slide.NotesPage.Shapes.Count; $i++) {
      $n=$slide.NotesPage.Shapes.Item($i)
      try { if($n.HasTextFrame -and $n.TextFrame.HasText -and $n.PlaceholderFormat.Type -eq 2) { $n.TextFrame.TextRange.Text='' } } catch {}
    }
  } catch {}
}
$app=$null; $pres=$null
try {
  $app=New-Object -ComObject PowerPoint.Application
  $app.Visible=0
  $pres=$app.Presentations.Open($working,0,0,0)
  foreach($sh in $pres.Slides.Item(2).Shapes) {
    try {
      if($sh.HasTextFrame -and $sh.TextFrame.HasText) {
        $r=$sh.TextFrame.TextRange
        [void]$r.Replace('Saisir ses questions rapidement','Créer un questionnaire pour une étude',0,0,0)
        [void]$r.Replace('Livrer un logiciel que le LIMOS peut maintenir','Suivre la participation et consulter les réponses',0,0,0)
      }
    } catch {}
  }
  $workflow=$pres.Slides.Item(2).Duplicate().Item(1)
  Reset-Duplicate $workflow 'Fuzzy-Quest, de la question au résultat' $purple
  [void](Add-Text $workflow 'workflow-intro' 36 78 648 34 'La plateforme accompagne le chercheur depuis la création de son étude jusqu’au suivi des réponses.' 14 $dark)
  $titles=@('Créer','Diffuser','Répondre','Suivre')
  $descs=@('Le chercheur rédige les questions et choisit les formats de réponse.','Il partage un lien ou un QR code, ou affecte l’étude à un groupe.','Les participants ouvrent le questionnaire et transmettent leurs réponses.','Le chercheur suit la participation et consulte les réponses recueillies.')
  $xs=@(36,202,368,534)
  for($j=0; $j -lt 4; $j++) {
    $x=$xs[$j]; $card=Add-Box $workflow 5 $x 119 151.5 180 $pale $pale 0.4; $card.Adjustments.Item(1)=0.1
    $accent=$purple; if($j%2){$accent=$pink}
    [void](Add-Box $workflow 9 ($x+14) 133 31 31 $accent $accent 0.5)
    [void](Add-Text $workflow "step-$($j+1)-number" ($x+14) 135 31 26 "$($j+1)" 15 $white $true 2 3)
    [void](Add-Text $workflow "step-$($j+1)-title" ($x+14) 179 124 27 $titles[$j] 18 $purple $true)
    [void](Add-Text $workflow "step-$($j+1)-desc" ($x+14) 214 124 76 $descs[$j] 12.5 $dark)
  }
  $band=Add-Box $workflow 5 36 319 648 42 $pale $pale 0.4; $band.Adjustments.Item(1)=0.1
  [void](Add-Text $workflow 'fuzzy-definition' 50 327 620 26 'Réponse floue : une estimation exprimée par trois valeurs — minimum, la plus probable et maximum.' 12.8 $purple $true 1 3)
  $access=$null
  foreach($s in $pres.Slides) {
    foreach($sh in $s.Shapes) {
      try { if($sh.HasTextFrame -and $sh.TextFrame.HasText -and $sh.TextFrame.TextRange.Text.Trim() -eq 'Accès à la plateforme') { $access=$s; break } } catch {}
    }
    if($access) { break }
  }
  if(-not $access) { throw 'Could not locate the platform access slide' }
  $devices=$access.Duplicate().Item(1)
  Reset-Duplicate $devices 'La plateforme sur ordinateur et téléphone' $purple
  [void](Add-Text $devices 'desktop-label' 43 88 417 22 'ORDINATEUR' 14 $purple $true 2)
  [void](Add-Text $devices 'phone-label' 506 88 149 22 'TÉLÉPHONE' 14 $pink $true 2)
  $monitor=Add-Box $devices 5 40 113 420 213 $purple $purple 0.6; $monitor.Adjustments.Item(1)=0.06
  [void](Add-Box $devices 1 51 124 398 191 $white $white 0.5)
  $screen=Add-Box $devices 5 61 135 378 169 $pale $border 1; $screen.Adjustments.Item(1)=0.03
  [void](Add-Text $devices 'desktop-placeholder-title' 78 182 344 31 'CAPTURE DU SITE À AJOUTER' 17 $purple $true 2 3)
  [void](Add-Text $devices 'desktop-placeholder-subtitle' 77 218 346 43 'Ex. tableau de bord ou création d’un questionnaire' 12 $muted $false 2 3)
  [void](Add-Box $devices 1 219 326 62 18 $purple $purple 0.4)
  $phone=Add-Box $devices 5 515 113 133 240 $purple $purple 0.6; $phone.Adjustments.Item(1)=0.16
  $phoneScreen=Add-Box $devices 5 524 128 115 213 $white $white 0.5; $phoneScreen.Adjustments.Item(1)=0.12
  $mobile=Add-Box $devices 5 532 147 99 182 $pale $border 1; $mobile.Adjustments.Item(1)=0.08
  [void](Add-Text $devices 'phone-placeholder-title' 540 183 83 98 "CAPTURE`nMOBILE`nÀ AJOUTER" 13 $pink $true 2 3)
  [void](Add-Text $devices 'device-caption' 64 365 592 22 'Ajoutez une capture du site sur ordinateur et une autre en vue mobile.' 12 $muted $false 2)
  $pres.Save(); $pres.Close(); $pres=$null; $app.Quit(); $app=$null
  'POWERPOINT_EDIT_OK'
} finally {
  if($pres) { try { $pres.Close() } catch {} }
  if($app) { try { $app.Quit() } catch {} }
}

