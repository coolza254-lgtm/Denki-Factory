package dev.denki.factory;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import org.json.JSONObject;

/** Offline game shell; networking is used only by the opt-in native updater. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_SAVE = 101, WRITE_SAVE = 102;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;
    private AppUpdater updater;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(255, 248, 232));
        getWindow().setNavigationBarColor(Color.rgb(255, 253, 247));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(255, 248, 232));
        setContentView(web);
        // Android 15 enforces edge-to-edge. Keep HTML outside system/cutout/IME insets.
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets edges = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
                return WindowInsets.CONSUMED;
            });
            web.requestApplyInsets();
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only URIs explicitly selected with the system picker.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new SaveFiles(), "DenkiAndroid");
        updater=new AppUpdater(this,json -> {
            if(web!=null)web.evaluateJavascript("window.dispatchEvent(new CustomEvent('denki-update',{detail:"+json+"}));",null);
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isLocal(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocal(uri) || !"GET".equals(request.getMethod())) return errorResponse(403);
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\")) return errorResponse(403);
                try {
                    InputStream stream = getAssets().open(path.substring(1));
                    String mime = mimeType(path);
                    WebResourceResponse response = new WebResourceResponse(mime,
                        mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "UTF-8" : null, stream);
                    response.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-store"));
                    return response;
                } catch (Exception e) { return errorResponse(404); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try { startActivityForResult(intent, PICK_SAVE); }
                catch (Exception e) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    Toast.makeText(MainActivity.this, "เปิดตัวเลือกไฟล์ไม่ได้", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/");
    }

    private boolean isLocal(Uri uri) { return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()); }
    private static WebResourceResponse errorResponse(int status) {
        return new WebResourceResponse("text/plain", "UTF-8", status, status == 403 ? "Forbidden" : "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private static String mimeType(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    private final class SaveFiles {
        @JavascriptInterface public String getUpdateState() { return updater.getState(); }
        @JavascriptInterface public void checkForUpdate() { updater.check(); }
        @JavascriptInterface public void downloadUpdate() { updater.download(); }
        @JavascriptInterface public void installUpdate() { updater.install(); }
        @JavascriptInterface public void saveJson(String name, String json) {
            if (json == null || json.length() > 2_000_000) return;
            try { new JSONObject(json); } catch (Exception e) { return; }
            final String filename = name == null ? "denki-save.json" : name.replaceAll("[^a-zA-Z0-9._-]", "_");
            runOnUiThread(() -> {
                if (pendingExport != null) return;
                pendingExport = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, filename);
                try { startActivityForResult(intent, WRITE_SAVE); }
                catch (Exception e) { pendingExport = null; exportResult(false, "เปิดตัวเลือกบันทึกไฟล์ไม่ได้"); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if(request==AppUpdater.INSTALL_REQUEST && updater!=null)updater.installReturned();
        if (request == PICK_SAVE && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null
                ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == WRITE_SAVE) {
            String content = pendingExport; pendingExport = null;
            if (result != RESULT_OK || data == null || data.getData() == null || content == null) {
                exportResult(false, "ยกเลิกการส่งออกไฟล์แล้ว"); return;
            }
            try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "wt")) {
                if (out == null) throw new IllegalStateException("No output stream");
                out.write(content.getBytes(StandardCharsets.UTF_8));
                exportResult(true, "ส่งออกไฟล์สำรองแล้ว");
            } catch (Exception e) { exportResult(false, "บันทึกไฟล์ไม่สำเร็จ กรุณาลองใหม่"); }
        }
    }
    private void exportResult(boolean success, String message) {
        try {
            JSONObject detail = new JSONObject(); detail.put("success", success); detail.put("message", message);
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('denki-file-result',{detail:" + detail + "}));", null);
        } catch (Exception ignored) { }
    }
    private void saveBeforeLeaving() {
        if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));", null);
    }
    @Override protected void onPause() { saveBeforeLeaving(); if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'));", null); }
    }
    @Override public void onBackPressed() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("window.denkiHandleBack ? window.denkiHandleBack() : false", handled -> {
            if ("true".equals(handled)) return;
            if (web != null && web.canGoBack()) { web.goBack(); return; }
            new AlertDialog.Builder(this).setTitle("พักกิจการไว้ก่อน?")
                .setMessage("บันทึกอัตโนมัติ และโรงไฟฟ้าจะจำลองต่อเมื่อคุณกลับมา")
                .setNegativeButton("เล่นต่อ", null)
                .setPositiveButton("พักก่อน", (dialog, which) -> { saveBeforeLeaving(); finish(); }).show();
        });
    }
    @Override protected void onDestroy() {
        if(updater!=null)updater.close();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (web != null) { web.removeJavascriptInterface("DenkiAndroid"); web.destroy(); web = null; }
        super.onDestroy();
    }
}
