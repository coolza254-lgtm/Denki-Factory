#!/usr/bin/env bash
# Disposable, signed future-version APKs packaged only into the test APK.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
assets="$1"; signing="$2"; sdk="$3"
tools="$sdk/build-tools/35.0.0"
fixture_root="$(dirname "$assets")/update-fixtures"
mkdir -p "$assets" "$fixture_root"
read -r next_code next_version < <(python3 - "$repo_root/android/app/src/main/AndroidManifest.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
m=ET.parse(sys.argv[1]).getroot();ns='{http://schemas.android.com/apk/res/android}'
v=m.get(ns+'versionName').split('.');v[2]=str(int(v[2])+1)
print(int(m.get(ns+'versionCode'))+1,'.'.join(v))
PY
)
"$tools/aapt2" link -o "$fixture_root/unsigned.apk" --manifest "$repo_root/android/app/src/main/AndroidManifest.xml" \
  -I "$sdk/platforms/android-35/android.jar" --replace-version --version-code "$next_code" --version-name "$next_version" \
  -A "$repo_root/dist-android" "$repo_root/android/build/resources.zip"
python3 - "$fixture_root/unsigned.apk" "$repo_root/android/build/dex/classes.dex" <<'PY'
import sys,zipfile
with zipfile.ZipFile(sys.argv[1],'a',compression=zipfile.ZIP_DEFLATED) as z:z.write(sys.argv[2],'classes.dex')
PY
"$tools/zipalign" -f 4 "$fixture_root/unsigned.apk" "$fixture_root/aligned.apk"
"$tools/apksigner" sign --ks "$signing/personal.p12" --ks-key-alias denki --ks-pass "file:$signing/storepass" --out "$assets/candidate.apk" "$fixture_root/aligned.apk"
if [[ ! -f "$fixture_root/wrong.p12" ]]; then
  (
    umask 077
    python3 - "$fixture_root/password" <<'PY'
import pathlib,secrets,sys
pathlib.Path(sys.argv[1]).write_text(secrets.token_hex(32))
PY
    keytool -genkeypair -keystore "$fixture_root/wrong.p12" -storetype PKCS12 \
      -storepass:file "$fixture_root/password" -keypass:file "$fixture_root/password" \
      -alias fixture -keyalg RSA -keysize 2048 -validity 30 -dname 'CN=Disposable Test Key'
  )
fi
"$tools/apksigner" sign --ks "$fixture_root/wrong.p12" --ks-key-alias fixture --ks-pass "file:$fixture_root/password" --out "$assets/wrong-key.apk" "$fixture_root/aligned.apk"
