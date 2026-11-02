$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=(Get-Location).Path
$source=[System.IO.Compression.ZipFile]::OpenRead((Join-Path $root 'fuzzy-quest.pptx'))
$candidate=[System.IO.Compression.ZipFile]::Open((Join-Path $root '.ppt-build\fuzzy-quest-amelioree-draft.pptx'),[System.IO.Compression.ZipArchiveMode]::Update)
function ReadEntryText($zip,$name){$e=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing package part $name"};$r=[IO.StreamReader]::new($e.Open());try{$r.ReadToEnd()}finally{$r.Dispose()}}
function ReadEntryBytes($zip,$name){$e=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing package part $name"};$ms=[IO.MemoryStream]::new();$s=$e.Open();try{$s.CopyTo($ms);$ms.ToArray()}finally{$s.Dispose();$ms.Dispose()}}
function WriteEntryBytes($zip,$name,[byte[]]$bytes){$old=$zip.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if($old){$old.Delete()};$e=$zip.CreateEntry($name,[System.IO.Compression.CompressionLevel]::Optimal);$s=$e.Open();try{$s.Write($bytes,0,$bytes.Length)}finally{$s.Dispose()}}
try {
  $chart=ReadEntryBytes $source 'ppt/charts/chart1.xml'
  $workbook=ReadEntryBytes $source 'ppt/embeddings/Microsoft_Excel_Worksheet.xlsx'
  $rels=ReadEntryText $source 'ppt/charts/_rels/chart1.xml.rels'
  $rels=$rels.Replace('../embeddings/Microsoft_Excel_Worksheet.xlsx','../../embeddings/Microsoft_Excel_Worksheet.xlsx')
  $utf8=New-Object System.Text.UTF8Encoding($false)
  WriteEntryBytes $candidate 'ppt/slides/charts/chart1.xml' $chart
  WriteEntryBytes $candidate 'ppt/slides/charts/_rels/chart1.xml.rels' $utf8.GetBytes($rels)
  WriteEntryBytes $candidate 'ppt/embeddings/Microsoft_Excel_Worksheet.xlsx' $workbook
  $ct=ReadEntryText $candidate '[Content_Types].xml'
  if($ct -notmatch 'Extension="xlsx"'){$ct=$ct.Replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>')}
  WriteEntryBytes $candidate '[Content_Types].xml' $utf8.GetBytes($ct)
  'CHART_AND_WORKBOOK_RESTORED'
} finally {$candidate.Dispose();$source.Dispose()}
