package dev.denki.factory;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

/** Opt-in GitHub updates. Gameplay and WebView resources stay entirely offline. */
public final class AppUpdater {
    public interface Listener { void changed(String json); }
    public static final int INSTALL_REQUEST=103;
    private static final String FEED="https://github.com/coolza254-lgtm/Denki-Factory/releases/latest/download/update.json";
    private final Activity activity;
    private final Listener listener;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final int currentCode;
    private final String currentVersion;
    private volatile String state;
    private volatile boolean busy, closed;
    private volatile UpdateInfo candidate;

    public AppUpdater(Activity activity,Listener listener) {
        this.activity=activity;this.listener=listener;
        try {
            PackageInfo installed=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
            currentCode=installed.versionCode;currentVersion=installed.versionName;
        } catch(Exception e) { throw new IllegalStateException(e); }
        emit("idle","กดตรวจสอบเมื่อต้องการอัปเดต",-1);
    }
    public String getState() { return state; }
    private synchronized boolean start() { if(busy || closed)return false;busy=true;return true; }
    private void emit(String status,String message,int progress) {
        try {
            JSONObject value=new JSONObject().put("status",status).put("message",message)
                .put("currentVersion",currentVersion).put("currentCode",currentCode).put("progress",progress);
            UpdateInfo info=candidate;
            if(info!=null)value.put("version",info.version).put("versionCode",info.code).put("bytes",info.bytes).put("notes",info.notes);
            state=value.toString();String snapshot=state;
            activity.runOnUiThread(() -> { if(!closed)listener.changed(snapshot); });
        } catch(Exception ignored) { }
    }
    public static boolean trustedUrl(URL url) {
        String host=url.getHost();
        return "https".equals(url.getProtocol()) && (url.getPort()==-1 || url.getPort()==443)
            && url.getUserInfo()==null && ("github.com".equals(host) || "release-assets.githubusercontent.com".equals(host)
                || "objects.githubusercontent.com".equals(host));
    }
    private HttpsURLConnection open(String address) throws Exception {
        URL url=new URL(address);
        for(int redirect=0;redirect<6;redirect++) {
            if(!trustedUrl(url))throw new SecurityException("Untrusted update host");
            HttpsURLConnection connection=(HttpsURLConnection)url.openConnection();
            connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
            connection.setInstanceFollowRedirects(false);connection.setRequestProperty("User-Agent","Denki-Factory/"+currentVersion);
            int status=connection.getResponseCode();
            if(status==200)return connection;
            String location=connection.getHeaderField("Location");connection.disconnect();
            if((status==301 || status==302 || status==303 || status==307 || status==308) && location!=null) { url=new URL(url,location);continue; }
            throw new java.io.IOException("Update server unavailable");
        }
        throw new java.io.IOException("Too many redirects");
    }
    public void check() {
        if(!start())return;
        candidate=null;emit("checking","กำลังตรวจสอบรุ่นล่าสุด…",-1);
        worker.execute(() -> {
            HttpsURLConnection connection=null;
            try {
                connection=open(FEED);
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream input=connection.getInputStream()) {
                    byte[] buffer=new byte[4096];int count;
                    while((count=input.read(buffer))!=-1) {
                        if(closed || Thread.currentThread().isInterrupted())return;
                        if(bytes.size()+count>65536)throw new SecurityException("Metadata too large");
                        bytes.write(buffer,0,count);
                    }
                }
                UpdateInfo info=UpdateInfo.parse(new String(bytes.toByteArray(),java.nio.charset.StandardCharsets.UTF_8));
                if(info.code>currentCode) { candidate=info;emit("available","มีรุ่นใหม่พร้อมดาวน์โหลด",-1); }
                else emit("current","คุณใช้รุ่นล่าสุดแล้ว",-1);
            } catch(Exception e) { emit("error","ตรวจสอบไม่ได้ กรุณาเช็กอินเทอร์เน็ตแล้วลองใหม่",-1); }
            finally { if(connection!=null)connection.disconnect();busy=false; }
        });
    }
    public void download() {
        UpdateInfo info=candidate;
        if(info==null || info.code<=currentCode || !start())return;
        emit("downloading","กำลังดาวน์โหลดอัปเดต…",0);
        worker.execute(() -> {
            HttpsURLConnection connection=null;
            File partial=new File(activity.getCacheDir(),"denki-update.part");
            try {
                File ready=UpdateProvider.apkFile(activity);
                if(ready.isFile()) {
                    try { verifyArtifact(ready,info);emit("ready","ตรวจสอบไฟล์แล้ว พร้อมติดตั้ง",100);return; }
                    catch(Exception ignored) { ready.delete(); }
                }
                connection=open(info.downloadUrl());
                long length=connection.getContentLengthLong();
                if(length>0 && length!=info.bytes)throw new SecurityException("Unexpected APK size");
                try(InputStream input=connection.getInputStream();FileOutputStream output=new FileOutputStream(partial)) {
                    byte[] buffer=new byte[32768];int count,last=-1;long total=0;
                    while((count=input.read(buffer))!=-1) {
                        if(closed || Thread.currentThread().isInterrupted())return;
                        total+=count;if(total>info.bytes)throw new SecurityException("APK exceeds expected size");
                        output.write(buffer,0,count);int progress=(int)(total*100/info.bytes);
                        if(progress!=last) { emit("downloading","กำลังดาวน์โหลดอัปเดต…",progress);last=progress; }
                    }
                }
                stage(partial,info);
            } catch(SecurityException e) { emit("error","ไฟล์อัปเดตตรวจสอบไม่ผ่าน กรุณาดาวน์โหลดใหม่",-1); }
              catch(Exception e) { emit("error","ดาวน์โหลดไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่",-1); }
            finally { partial.delete();if(connection!=null)connection.disconnect();busy=false; }
        });
    }
    private int signatureFlags() { return Build.VERSION.SDK_INT>=28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES; }
    private Signature[] signers(PackageInfo info) {
        return Build.VERSION.SDK_INT>=28 ? info.signingInfo.getApkContentsSigners() : info.signatures;
    }
    public void verifyArtifact(File file,UpdateInfo info) throws Exception {
        if(info.code<=currentCode || file.length()!=info.bytes)throw new SecurityException("Invalid APK version or size");
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream input=new FileInputStream(file)) {
            byte[] buffer=new byte[32768];int count;while((count=input.read(buffer))!=-1)digest.update(buffer,0,count);
        }
        StringBuilder hash=new StringBuilder();for(byte value:digest.digest())hash.append(String.format(Locale.ROOT,"%02x",value&255));
        if(!hash.toString().equals(info.sha256))throw new SecurityException("APK checksum mismatch");
        PackageManager pm=activity.getPackageManager();
        PackageInfo apk=pm.getPackageArchiveInfo(file.getAbsolutePath(),signatureFlags());
        PackageInfo installed=pm.getPackageInfo(activity.getPackageName(),signatureFlags());
        if(apk==null || !activity.getPackageName().equals(apk.packageName) || apk.versionCode!=info.code
            || !info.version.equals(apk.versionName))throw new SecurityException("APK identity mismatch");
        Signature[] incoming=signers(apk),existing=signers(installed);
        if(incoming==null || incoming.length==0 || existing==null || !new HashSet<>(Arrays.asList(incoming)).equals(new HashSet<>(Arrays.asList(existing))))
            throw new SecurityException("APK signing certificate mismatch");
    }
    private void stage(File file,UpdateInfo info) throws Exception {
        verifyArtifact(file,info);
        File ready=UpdateProvider.apkFile(activity);
        if(!file.equals(ready) && !file.renameTo(ready))throw new java.io.IOException("Cannot stage APK");
        candidate=info;emit("ready","ตรวจสอบไฟล์แล้ว พร้อมติดตั้ง",100);
    }
    public void install() {
        UpdateInfo info=candidate;
        if(info==null || !start())return;
        worker.execute(() -> {
            try {
                verifyArtifact(UpdateProvider.apkFile(activity),info);
                activity.runOnUiThread(() -> {
                    try {
                        if(closed)return;
                        if(!activity.getPackageManager().canRequestPackageInstalls()) {
                            emit("permission","อนุญาตติดตั้งจาก Denki Factory แล้วกลับมากดติดตั้งอีกครั้ง",100);
                            activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())));
                        } else {
                            Intent intent=new Intent(Intent.ACTION_INSTALL_PACKAGE).setDataAndType(UpdateProvider.APK_URI,"application/vnd.android.package-archive")
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION).putExtra(Intent.EXTRA_RETURN_RESULT,true);
                            emit("installing","ยืนยันติดตั้งในหน้าต่าง Android ได้เลย",100);
                            activity.startActivityForResult(intent,INSTALL_REQUEST);
                        }
                    } catch(Exception e) { emit("ready","เปิดหน้าติดตั้งไม่ได้ กรุณาลองอีกครั้ง",100); }
                    finally { busy=false; }
                });
            } catch(Exception e) { busy=false;emit("error","ไฟล์อัปเดตตรวจสอบไม่ผ่าน กรุณาดาวน์โหลดใหม่",-1); }
        });
    }
    public void installReturned() { emit("ready","หากยังไม่ได้ติดตั้ง สามารถกดติดตั้งอีกครั้งได้",100); }
    public void close() { closed=true;worker.shutdownNow(); }
}
