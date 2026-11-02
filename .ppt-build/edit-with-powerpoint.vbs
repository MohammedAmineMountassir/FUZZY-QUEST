Option Explicit
Dim fso, root, working, app, pres, workflow, devices, accessSlide, tempRange, sh, i, j, xs, titles, descs, card, accent, monitor, screen, phone
Set fso = CreateObject("Scripting.FileSystemObject")
root = "C:\Users\ait\FUZZY-QUEST"
working = root & "\.ppt-build\fuzzy-quest-amelioree-com.pptx"
fso.CopyFile root & "\fuzzy-quest.pptx", working, True
On Error Resume Next
Set app = CreateObject("PowerPoint.Application")
If Err.Number <> 0 Then WScript.Echo "PowerPoint is unavailable: " & Err.Description: WScript.Quit 1
Err.Clear
app.Visible = False
Set pres = app.Presentations.Open(working, False, False, False)
If Err.Number <> 0 Then WScript.Echo "Could not open working copy: " & Err.Description: app.Quit: WScript.Quit 1
On Error GoTo 0
' Clarify the activity on the existing introduction without changing its formatting.
For Each sh In pres.Slides(2).Shapes
  On Error Resume Next
  If sh.HasTextFrame And sh.TextFrame.HasText Then
    Set tempRange = sh.TextFrame.TextRange
    tempRange.Replace "Saisir ses questions rapidement", "Cr?er un questionnaire pour une ?tude", 0, 0, 0
    tempRange.Replace "Livrer un logiciel que le LIMOS peut maintenir", "Suivre la participation et consulter les r?ponses", 0, 0, 0
  End If
  Err.Clear
  On Error GoTo 0
Next
' Add a workflow slide by duplicating the existing content slide so its master and number style stay consistent.
Set workflow = pres.Slides(2).Duplicate.Item(1)
ResetDuplicate workflow, "Fuzzy-Quest, de la question au r?sultat"
AddText workflow, "workflow-intro", 36, 78, 648, 34, "La plateforme accompagne le chercheur depuis la cr?ation de son ?tude jusqu?au suivi des r?ponses.", 14, RGB(33,33,33), False, 1, 1
titles = Array("Cr?er", "Diffuser", "R?pondre", "Suivre")
descs = Array("Le chercheur r?dige les questions et choisit les formats de r?ponse.", "Il partage un lien ou un QR code, ou affecte l??tude ? un groupe.", "Les participants ouvrent le questionnaire et transmettent leurs r?ponses.", "Le chercheur suit la participation et consulte les r?ponses recueillies.")
xs = Array(36, 202, 368, 534)
For j = 0 To 3
  card = Empty
  Set card = AddBox(workflow, 5, xs(j), 119, 151.5, 180, RGB(241,239,252), RGB(241,239,252), 0.4)
  If j Mod 2 = 0 Then accent = RGB(81,69,205) Else accent = RGB(214,71,154)
  Set card = AddBox(workflow, 9, xs(j)+14, 133, 31, 31, accent, accent, 0.5)
  AddText workflow, "step-" & (j+1) & "-number", xs(j)+14, 135, 31, 26, CStr(j+1), 15, RGB(255,255,255), True, 2, 3
  AddText workflow, "step-" & (j+1) & "-title", xs(j)+14, 179, 124, 27, titles(j), 18, RGB(81,69,205), True, 1, 1
  AddText workflow, "step-" & (j+1) & "-desc", xs(j)+14, 214, 124, 76, descs(j), 12.5, RGB(33,33,33), False, 1, 1
Next
Set card = AddBox(workflow, 5, 36, 319, 648, 42, RGB(241,239,252), RGB(241,239,252), 0.4)
AddText workflow, "fuzzy-definition", 50, 327, 620, 26, "R?ponse floue : une estimation exprim?e par trois valeurs ? minimum, la plus probable et maximum.", 12.8, RGB(81,69,205), True, 1, 3
' Add the device slide directly after the access slide with editable screenshot placeholders.
Set accessSlide = Nothing
For i = 1 To pres.Slides.Count
  For Each sh In pres.Slides(i).Shapes
    On Error Resume Next
    If sh.HasTextFrame And sh.TextFrame.HasText Then
      If Trim(sh.TextFrame.TextRange.Text) = "Acc?s ? la plateforme" Then Set accessSlide = pres.Slides(i)
    End If
    Err.Clear
    On Error GoTo 0
    If Not accessSlide Is Nothing Then Exit For
  Next
  If Not accessSlide Is Nothing Then Exit For
Next
If accessSlide Is Nothing Then WScript.Echo "Access slide not found": pres.Close: app.Quit: WScript.Quit 1
Set devices = accessSlide.Duplicate.Item(1)
ResetDuplicate devices, "La plateforme sur ordinateur et t?l?phone"
AddText devices, "desktop-label", 43, 88, 417, 22, "ORDINATEUR", 14, RGB(81,69,205), True, 2, 1
AddText devices, "phone-label", 506, 88, 149, 22, "T?L?PHONE", 14, RGB(214,71,154), True, 2, 1
Set monitor = AddBox(devices, 5, 40, 113, 420, 213, RGB(81,69,205), RGB(81,69,205), 0.6)
Set screen = AddBox(devices, 1, 51, 124, 398, 191, RGB(255,255,255), RGB(255,255,255), 0.5)
Set screen = AddBox(devices, 5, 61, 135, 378, 169, RGB(241,239,252), RGB(189,183,235), 1)
AddText devices, "desktop-placeholder-title", 78, 182, 344, 31, "CAPTURE DU SITE ? AJOUTER", 17, RGB(81,69,205), True, 2, 3
AddText devices, "desktop-placeholder-subtitle", 77, 218, 346, 43, "Ex. tableau de bord ou cr?ation d?un questionnaire", 12, RGB(115,127,149), False, 2, 3
Set screen = AddBox(devices, 1, 219, 326, 62, 18, RGB(81,69,205), RGB(81,69,205), 0.4)
Set phone = AddBox(devices, 5, 515, 113, 133, 240, RGB(81,69,205), RGB(81,69,205), 0.6)
Set phone = AddBox(devices, 5, 524, 128, 115, 213, RGB(255,255,255), RGB(255,255,255), 0.5)
Set phone = AddBox(devices, 5, 532, 147, 99, 182, RGB(241,239,252), RGB(189,183,235), 1)
AddText devices, "phone-placeholder-title", 540, 183, 83, 98, "CAPTURE" & vbCrLf & "MOBILE" & vbCrLf & "? AJOUTER", 13, RGB(214,71,154), True, 2, 3
AddText devices, "device-caption", 64, 365, 592, 22, "Ajoutez une capture du site sur ordinateur et une autre en vue mobile.", 12, RGB(115,127,149), False, 2, 1
pres.Save
pres.Close
app.Quit
Set pres = Nothing
Set app = Nothing
WScript.Echo "POWERPOINT_EDIT_OK"
WScript.Quit 0

Sub ResetDuplicate(slide, newTitle)
  Dim idx, item, titleShape, txt
  For idx = slide.Shapes.Count To 1 Step -1
    Set item = slide.Shapes(idx)
    txt = ""
    On Error Resume Next
    If item.HasTextFrame And item.TextFrame.HasText Then txt = Trim(item.TextFrame.TextRange.Text)
    On Error GoTo 0
    If txt = "Introduction" Or txt = "Acc?s ? la plateforme" Then
      If titleShape Is Nothing Then Set titleShape = item
    Else
      On Error Resume Next
      If item.PlaceholderFormat.Type <> 13 Then item.Delete
      On Error GoTo 0
    End If
  Next
  If Not titleShape Is Nothing Then
    titleShape.TextFrame.TextRange.Text = newTitle
    titleShape.TextFrame.TextRange.Font.Name = "Calibri"
    titleShape.TextFrame.TextRange.Font.Size = 28
    titleShape.TextFrame.TextRange.Font.Bold = True
    titleShape.TextFrame.TextRange.Font.Color.RGB = RGB(81,69,205)
  End If
End Sub

Function AddText(slide, shapeName, x, y, w, h, value, fontSize, colorValue, isBold, alignment, vertical)
  Dim shp
  Set shp = slide.Shapes.AddTextbox(1, x, y, w, h)
  shp.Name = shapeName
  shp.TextFrame.MarginLeft = 0: shp.TextFrame.MarginRight = 0: shp.TextFrame.MarginTop = 0: shp.TextFrame.MarginBottom = 0
  shp.TextFrame.WordWrap = True: shp.TextFrame.VerticalAnchor = vertical
  shp.TextFrame.TextRange.Text = value
  shp.TextFrame.TextRange.Font.Name = "Calibri": shp.TextFrame.TextRange.Font.Size = fontSize
  shp.TextFrame.TextRange.Font.Color.RGB = colorValue: shp.TextFrame.TextRange.Font.Bold = isBold
  shp.TextFrame.TextRange.ParagraphFormat.Alignment = alignment
  Set AddText = shp
End Function

Function AddBox(slide, kind, x, y, w, h, fillColor, lineColor, lineWeight)
  Dim shp
  Set shp = slide.Shapes.AddShape(kind, x, y, w, h)
  shp.Fill.ForeColor.RGB = fillColor: shp.Line.ForeColor.RGB = lineColor: shp.Line.Weight = lineWeight
  Set AddBox = shp
End Function
