#!/usr/bin/env bash
# Dependency-free Android shell built with official Android SDK tools.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/workspace/android-tools/sdk}}"
tools="$sdk_root/build-tools/35.0.0"
platform="$sdk_root/platforms/android-35/android.jar"
build_root="$repo_root/android/build"
default_signing="$repo_root/.local/android-signing"
if [[ -f /workspace/android-signing/denki/personal.p12 ]]; then default_signing=/workspace/android-signing/denki; fi
signing_dir="${DENKI_SIGNING_DIR:-$default_signing}"
version="$(python3 - "$repo_root/android/app/src/main/AndroidManifest.xml" <<'PYVERSION'
import sys,xml.etree.ElementTree as ET
print(ET.parse(sys.argv[1]).getroot().get('{http://schemas.android.com/apk/res/android}versionName'))
PYVERSION
)"
output="${DENKI_APK_OUTPUT:-$repo_root/artifacts/denki-factory-$version.apk}"
for command_name in java javac jar keytool python3; do
  command -v "$command_name" > /dev/null || { printf 'Missing tool: %s. Install a full JDK 21 and Python 3.\n' "$command_name" >&2; exit 1; }
done
for tool in "$tools/aapt2" "$tools/d8" "$tools/zipalign" "$tools/apksigner" "$platform"; do
  if [[ ! -f "$tool" ]]; then printf 'Missing Android SDK component: %s\nSee docs/ANDROID.md\n' "$tool" >&2; exit 1; fi
done
cd "$repo_root"
npm run build:android:web
rm -rf "$build_root"
mkdir -p "$build_root/classes" "$build_root/dex" "$build_root/generated" "$signing_dir" "$(dirname "$output")"
"$tools/aapt2" compile --dir android/app/src/main/res -o "$build_root/resources.zip"
"$tools/aapt2" link -o "$build_root/unsigned.apk" \
  --manifest android/app/src/main/AndroidManifest.xml -I "$platform" \
  --java "$build_root/generated" -A dist-android "$build_root/resources.zip"
find "$repo_root/android/app/src/main/java" -name '*.java' > "$build_root/sources.txt"
find "$build_root/generated" -name '*.java' >> "$build_root/sources.txt"
javac --release 8 -encoding UTF-8 -classpath "$platform" -d "$build_root/classes" @"$build_root/sources.txt"
jar --create --file "$build_root/classes.jar" -C "$build_root/classes" .
"$tools/d8" --min-api 26 --lib "$platform" --output "$build_root/dex" "$build_root/classes.jar"
python3 - "$build_root" <<'PY'
import pathlib,sys,zipfile
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
    for f in (p/'dex').glob('*.dex'):z.write(f,f.name)
PY
"$tools/zipalign" -f 4 "$build_root/unsigned.apk" "$build_root/aligned.apk"
if [[ ! -f "$signing_dir/personal.p12" ]]; then
  (
    umask 077
    python3 - "$signing_dir/storepass" <<'PY'
import secrets,sys,pathlib
pathlib.Path(sys.argv[1]).write_text(secrets.token_hex(32))
PY
    keytool -genkeypair -keystore "$signing_dir/personal.p12" -storetype PKCS12 \
      -storepass:file "$signing_dir/storepass" -keypass:file "$signing_dir/storepass" \
      -alias denki -keyalg RSA -keysize 3072 -validity 10000 \
      -dname 'CN=Denki Factory Personal Build,O=Denki Factory,C=TH'
  )
fi
"$tools/apksigner" sign --ks "$signing_dir/personal.p12" --ks-key-alias denki \
  --ks-pass "file:$signing_dir/storepass" \
  --out "$output" "$build_root/aligned.apk"
"$tools/apksigner" verify --verbose "$output"
"$tools/zipalign" -c 4 "$output"
(cd "$(dirname "$output")" && sha256sum "$(basename "$output")" > "$(basename "$output").sha256")
printf '\nInstallable APK: %s\n' "$output"
