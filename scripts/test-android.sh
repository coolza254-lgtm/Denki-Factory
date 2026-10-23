#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sdk="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/workspace/android-tools/sdk}}"
adb="$sdk/platform-tools/adb"
serial="${DENKI_EMULATOR_SERIAL:-emulator-5554}"
# Tests start a new game. Refuse physical devices to protect player saves.
[[ "$serial" == emulator-* ]] || { printf 'Disposable emulator required\n' >&2; exit 1; }
build="$repo_root/android/build/smoke"
mkdir -p "$build/classes" "$build/dex"
platform="$sdk/platforms/android-35/android.jar"
tools="$sdk/build-tools/35.0.0"
default_signing="$repo_root/.local/android-signing"
if [[ -f /workspace/android-signing/denki/personal.p12 ]]; then default_signing=/workspace/android-signing/denki; fi
signing="${DENKI_SIGNING_DIR:-$default_signing}"
bash "$repo_root/scripts/prepare-android-update-fixtures.sh" "$build/assets" "$signing" "$sdk"
"$tools/aapt2" link --manifest "$repo_root/android/smoke/AndroidManifest.xml" -I "$platform" -A "$build/assets" -o "$build/test-unsigned.apk"
find "$repo_root/android/smoke/src" -name '*.java' > "$build/sources.txt"
javac --release 8 -encoding UTF-8 -classpath "$platform" -d "$build/classes" @"$build/sources.txt"
jar --create --file "$build/classes.jar" -C "$build/classes" .
"$tools/d8" --min-api 26 --lib "$platform" --output "$build/dex" "$build/classes.jar"
python3 - "$build" <<'PY'
import pathlib,sys,zipfile
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p/'test-unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:z.write(p/'dex/classes.dex','classes.dex')
PY
"$tools/zipalign" -f 4 "$build/test-unsigned.apk" "$build/test-aligned.apk"
"$tools/apksigner" sign --ks "$signing/personal.p12" --ks-key-alias denki --ks-pass "file:$signing/storepass" --out "$build/test.apk" "$build/test-aligned.apk"
version="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$repo_root/package.json")"
"$adb" -s "$serial" install --no-incremental --no-streaming -r "${DENKI_APK_OUTPUT:-$repo_root/artifacts/denki-factory-$version.apk}"
"$adb" -s "$serial" install --no-incremental --no-streaming -r "$build/test.apk"
# This disposable emulator must not contain an actual player's save.
"$adb" -s "$serial" shell pm clear dev.denki.factory
set +e
"$adb" -s "$serial" shell am instrument -w -e liveUpdates "${DENKI_LIVE_UPDATES:-false}" dev.denki.factory.test/dev.denki.factory.test.SmokeTest | tee "$build/result.txt"
instrument_exit="${PIPESTATUS[0]}"
set -e
python3 - "$build/result.txt" "$instrument_exit" <<'PYRESULT'
from pathlib import Path
import sys
result = Path(sys.argv[1]).read_text()
if sys.argv[2] != '0' or 'ANDROID_SMOKE_PASS' not in result or 'ANDROID_SMOKE_FAIL' in result:
    # Surface the instrumentation report in the check's annotations as well as
    # its log/artifact, so the failed native step is visible on the run page.
    message = result.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print(f'::error title=Android instrumentation failed::{message}', flush=True)
    raise SystemExit('Android smoke test did not complete successfully')
PYRESULT
