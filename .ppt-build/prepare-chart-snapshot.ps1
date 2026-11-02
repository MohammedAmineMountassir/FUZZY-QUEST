$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=(Get-Location).Path
$zip=[System.IO.Compression.ZipFile]::Open((Join-Path $root '.ppt-build\fuzzy-quest-amelioree-draft.pptx'),[System.IO.Compression.ZipArchiveMode]::Update)
$utf8=New-Object System.Text.UTF8Encoding($false)
function ReadText($name){$e=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing $name"};$r=[IO.StreamReader]::new($e.Open());try{$r.ReadToEnd()}finally{$r.Dispose()}}
function WriteBytes($name,[byte[]]$bytes){$old=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if($old){$old.Delete()};$e=$zip.CreateEntry($name,[System.IO.Compression.CompressionLevel]::Optimal);$s=$e.Open();try{$s.Write($bytes,0,$bytes.Length)}finally{$s.Dispose()}}
function RemovePart($name){$old=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if($old){$old.Delete()}}
try {
  $chart=ReadText 'ppt/slides/charts/chart1.xml'
  $chart=[regex]::Replace($chart,'(?s)<c:externalData\b.*?</c:externalData>','')
  if($chart -match '<c:externalData\b'){throw 'Chart externalData could not be removed'}
  WriteBytes 'ppt/slides/charts/chart1.xml' $utf8.GetBytes($chart)
  RemovePart 'ppt/slides/charts/_rels/chart1.xml.rels'
  RemovePart 'ppt/embeddings/Microsoft_Excel_Worksheet.xlsx'
  $ct=ReadText '[Content_Types].xml'
  $ct=[regex]::Replace($ct,'<Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"\s*/>','')
  WriteBytes '[Content_Types].xml' $utf8.GetBytes($ct)
  'CHART_SET_TO_CACHED_VALUES'
} finally {$zip.Dispose()}
