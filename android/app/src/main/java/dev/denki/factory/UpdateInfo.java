package dev.denki.factory;

import java.util.Locale;
import org.json.JSONObject;

/** Public release metadata; download destinations are derived, never supplied by JS. */
public final class UpdateInfo {
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public final int code;
    public final String version, sha256, notes;
    public final long bytes;
    private UpdateInfo(int code, String version, String sha256, long bytes, String notes) {
        this.code=code;this.version=version;this.sha256=sha256;this.bytes=bytes;this.notes=notes;
    }
    public static UpdateInfo parse(String json) throws Exception {
        JSONObject value=new JSONObject(json);
        long code=value.getLong("versionCode"), bytes=value.getLong("bytes");
        String version=value.getString("version"), hash=value.getString("sha256").toLowerCase(Locale.ROOT);
        String notes=value.optString("notes", "");
        if(!(value.get("versionCode") instanceof Number) || !(value.get("bytes") instanceof Number)
            || ((Number)value.get("versionCode")).doubleValue()!=code || ((Number)value.get("bytes")).doubleValue()!=bytes
            || code<1 || code>Integer.MAX_VALUE || bytes<1 || bytes>MAX_BYTES
            || !version.matches("[0-9]{1,5}\\.[0-9]{1,5}\\.[0-9]{1,5}")
            || !hash.matches("[0-9a-f]{64}") || notes.length()>8000)
            throw new IllegalArgumentException("Invalid update metadata");
        return new UpdateInfo((int)code,version,hash,bytes,notes);
    }
    public String downloadUrl() {
        return "https://github.com/coolza254-lgtm/Denki-Factory/releases/download/v"
            +version+"/denki-factory-"+version+".apk";
    }
}
