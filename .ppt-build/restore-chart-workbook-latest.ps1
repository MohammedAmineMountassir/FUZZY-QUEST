$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root=(Get-Location).Path
$source=[System.IO.Compression.ZipFile]::OpenRead((Join-Path $root 'fuzzy-quest.pptx'))
$candidate=[System.IO.Compression.ZipFile]::Open((Join-Path $root '.ppt-build\participant-slide9-draft.pptx'),[System.IO.Compression.ZipArchiveMode]::Update)
$utf8=New-Object System.Text.UTF8Encoding($false)
function ReadSourceText($name){$e=$source.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing source part $name"};$r=[IO.StreamReader]::new($e.Open());try{$r.ReadToEnd()}finally{$r.Dispose()}}
function ReadCandidateText($name){$e=$candidate.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if(-not $e){throw "Missing candidate part $name"};$r=[IO.StreamReader]::new($e.Open());try{$r.ReadToEnd()}finally{$r.Dispose()}}
function WriteBytes($name,[byte[]]$bytes){$old=$candidate.Entries|Where-Object FullName -CEQ $name|Select-Object -First 1;if($old){$old.Delete()};$e=$candidate.CreateEntry($name,[System.IO.Compression.CompressionLevel]::Optimal);$s=$e.Open();try{$s.Write($bytes,0,$bytes.Length)}finally{$s.Dispose()}}
try {
  $chart=ReadSourceText 'ppt/charts/chart1.xml'
  if($chart -notmatch '<c:externalData\b'){$chart=$chart.Replace('</c:chartSpace>','<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>')}
  if($chart -notmatch '<c:externalData\b'){throw 'Could not attach the embedded workbook relationship to the preserved chart'}
  WriteBytes 'ppt/slides/charts/chart1.xml' $utf8.GetBytes($chart)
  $rel='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../../embeddings/Microsoft_Excel_Worksheet.xlsx"/></Relationships>'
  WriteBytes 'ppt/slides/charts/_rels/chart1.xml.rels' $utf8.GetBytes($rel)
  $wb=[IO.File]::ReadAllBytes((Join-Path $root '.ppt-build\chart-source-fixed-latest.xlsx'))
  WriteBytes 'ppt/embeddings/Microsoft_Excel_Worksheet.xlsx' $wb
  $ct=ReadCandidateText '[Content_Types].xml'
  if($ct -notmatch 'Extension="xlsx"'){$ct=$ct.Replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>')}
  WriteBytes '[Content_Types].xml' $utf8.GetBytes($ct)
  'PRESERVED_CHART_CACHE_VALUES_BACKED_BY_WORKBOOK'
} finally {$candidate.Dispose();$source.Dispose()}

