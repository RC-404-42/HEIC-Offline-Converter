Unicode true
ManifestSupportedOS Win10

Name "HEIC 離線轉檔器"
OutFile "../release/HEIC-Offline-Converter-1.0.0-x64.exe"
Icon "icon.ico"
RequestExecutionLevel user

SilentInstall silent
AutoCloseWindow true
ShowInstDetails nevershow
SetCompressor /SOLID lzma
SetDatablockOptimize on
CRCCheck on

Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\app"
  File /r "../release/win-unpacked/*.*"

  ExecWait '"$PLUGINSDIR\app\HEIC Offline Converter.exe"' $0
  SetErrorLevel $0
SectionEnd
