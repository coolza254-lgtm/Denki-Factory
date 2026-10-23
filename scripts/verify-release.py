#!/usr/bin/env python3
"""Verify published APK bytes and embedded assets; no signing key is required."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
manifest = ET.parse(root / 'android/app/src/main/AndroidManifest.xml').getroot()
assert manifest.get('{http://schemas.android.com/apk/res/android}versionName') == version, 'Version mismatch'
artifact = root / 'releases' / f'denki-factory-{version}.apk'
lines = (root / 'releases/SHA256SUMS').read_text().splitlines()
expected = next(line.split()[0] for line in lines if line.split()[-1] == artifact.name)
actual = hashlib.sha256(artifact.read_bytes()).hexdigest()
assert actual == expected, 'Published APK checksum mismatch'
metadata = json.loads((root / 'releases/update.json').read_text())
assert metadata['version'] == version
assert metadata['versionCode'] == int(manifest.get('{http://schemas.android.com/apk/res/android}versionCode'))
assert metadata['sha256'] == actual and metadata['bytes'] == artifact.stat().st_size
with zipfile.ZipFile(artifact) as archive:
    assert archive.testzip() is None, 'Corrupt ZIP entry'
    names = set(archive.namelist())
    assert {'AndroidManifest.xml', 'classes.dex', 'assets/index.html'} <= names
    html = archive.read('assets/index.html').decode()
    for path in re.findall(r'(?:src|href)="(/[^"?#]+)', html):
        assert 'assets' + path in names, f'Missing bundled resource: {path}'
    assert any(name.endswith('.woff2') for name in names), 'Missing bundled fonts'
    assert not any(name.endswith(('.p12','.jks','.keystore','.key','.pem')) for name in names), 'Private key in APK'
print(f'PASS: {artifact.name}: checksum, archive integrity, embedded assets and source version')
