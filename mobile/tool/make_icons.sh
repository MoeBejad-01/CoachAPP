#!/bin/sh
# Regenerates the iOS and Android app icons from the website's logo mark.
# Run from mobile/:  sh tool/make_icons.sh
set -e
cd "$(dirname "$0")/.."
master="$(mktemp -d)/icon.png"
swift tool/make_icon.swift "$master"

ios=ios/Runner/Assets.xcassets/AppIcon.appiconset
for spec in 20x20@1x:20 20x20@2x:40 20x20@3x:60 29x29@1x:29 29x29@2x:58 29x29@3x:87 40x40@1x:40 40x40@2x:80 40x40@3x:120 \
  60x60@2x:120 60x60@3x:180 76x76@1x:76 76x76@2x:152 83.5x83.5@2x:167 1024x1024@1x:1024; do
  name=${spec%%:*}; px=${spec##*:}
  sips -z "$px" "$px" "$master" --out "$ios/Icon-App-$name.png" >/dev/null
done

for spec in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d=${spec%%:*}; px=${spec##*:}
  sips -z "$px" "$px" "$master" --out "android/app/src/main/res/mipmap-$d/ic_launcher.png" >/dev/null
done
echo "Icons updated."
