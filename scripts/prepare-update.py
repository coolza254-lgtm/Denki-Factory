#!/usr/bin/env python3
"""Generate the public update asset from the signed APK, never from CI test builds."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
manifest = ET.parse(root / 'android/app/src/main/AndroidManifest.xml').getroot()
version = json.loads((root / 'package.json').read_text())['version']
assert manifest.get('{http://schemas.android.com/apk/res/android}versionName') == version
apk = root / 'releases' / f'denki-factory-{version}.apk'
data = {
    'version': version,
    'versionCode': int(manifest.get('{http://schemas.android.com/apk/res/android}versionCode')),
    'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
    'bytes': apk.stat().st_size,
    'notes': (root / 'releases' / f'v{version}.md').read_text()[:8000],
}
assert 0 < data['bytes'] <= 50 * 1024 * 1024
(root / 'releases/update.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f"Update metadata prepared for {version}")
