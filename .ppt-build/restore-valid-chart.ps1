$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=(Get-Location).Path
$source=[System.IO.Compression.ZipFile]::OpenRead((Join-Path $root 'fuzzy-quest.pptx'))
$candidate=[System.IO.Compression.ZipFile]::Open((Join-Path $root '.ppt-build\fuzzy-quest-amelioree-final-draft.pptx'),[System.IO.Compression.ZipArchiveMode]::Update)
$utf8=New-Object System.Text.UTF8Encoding($false)
function ReadBytes($zip,$name){$e=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing source part $name"};$m=[IO.MemoryStream]::new();$s=$e.Open();try{$s.CopyTo($m);$m.ToArray()}finally{$s.Dispose();$m.Dispose()}}
function ReadText($zip,$name){$e=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing part $name"};$r=[IO.StreamReader]::new($e.Open());try{$r.ReadToEnd()}finally{$r.Dispose()}}
function WriteBytes($zip,$name,[byte[]]$bytes){$old=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if($old){$old.Delete()};$e=$zip.CreateEntry($name,[System.IO.Compression.CompressionLevel]::Optimal);$s=$e.Open();try{$s.Write($bytes,0,$bytes.Length)}finally{$s.Dispose()}}
try {
  $chart=ReadBytes $source 'ppt/charts/chart1.xml'
  $rel=ReadText $source 'ppt/charts/_rels/chart1.xml.rels'
  $rel=$rel.Replace('../embeddings/Microsoft_Excel_Worksheet.xlsx','../../embeddings/Microsoft_Excel_Worksheet.xlsx')
  $wb=[IO.File]::ReadAllBytes((Join-Path $root '.ppt-build\chart-source-fixed.xlsx'))
  WriteBytes $candidate 'ppt/slides/charts/chart1.xml' $chart
  WriteBytes $candidate 'ppt/slides/charts/_rels/chart1.xml.rels' $utf8.GetBytes($rel)
  WriteBytes $candidate 'ppt/embeddings/Microsoft_Excel_Worksheet.xlsx' $wb
  $ct=ReadText $candidate '[Content_Types].xml'
  if($ct -notmatch 'Extension="xlsx"'){$ct=$ct.Replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>')}
  WriteBytes $candidate '[Content_Types].xml' $utf8.GetBytes($ct)
  'ORIGINAL_CHART_RESTORED_WITH_CACHED_EDGE_VALUES'
} finally {$candidate.Dispose();$source.Dispose()}




