package dev.denki.factory.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.pm.PackageInfo;
import android.net.Uri;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.function.Consumer;
import org.json.JSONObject;

/** Real signed APK fixtures, using the same validation path as downloaded updates. */
public final class UpdateChecks {
    private interface Checked { void run() throws Exception; }
    private static void rejected(Checked check) throws Exception {
        try { check.run(); }
        catch(InvocationTargetException e) {
            Throwable cause=e.getCause();
            if(cause instanceof SecurityException || cause instanceof IllegalArgumentException || cause instanceof org.json.JSONException)return;
            throw e;
        }
        throw new AssertionError("Invalid update was accepted");
    }
    private static String hash(InputStream input) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream stream=input) { byte[] buffer=new byte[32768];int count;while((count=stream.read(buffer))!=-1)digest.update(buffer,0,count); }
        StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();
    }
    private static File fixture(Instrumentation test,String name) throws Exception {
        File file=new File(test.getTargetContext().getCacheDir(),name);
        try(InputStream input=test.getContext().getAssets().open(name);FileOutputStream output=new FileOutputStream(file)) {
            byte[] buffer=new byte[32768];int count;while((count=input.read(buffer))!=-1)output.write(buffer,0,count);
        }
        return file;
    }
    private static JSONObject metadata(Activity activity,File apk) throws Exception {
        PackageInfo info=activity.getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(),0);
        if(info==null)throw new AssertionError("Fixture APK did not parse");
        return new JSONObject().put("versionCode",info.versionCode).put("version",info.versionName)
            .put("bytes",apk.length()).put("sha256",hash(new FileInputStream(apk))).put("notes","Test fixture only");
    }
    public static void run(Instrumentation test,Activity activity,Consumer<String> passed) throws Exception {
        ClassLoader loader=activity.getClassLoader();
        Class<?> infoClass=loader.loadClass("dev.denki.factory.UpdateInfo"),updaterClass=loader.loadClass("dev.denki.factory.AppUpdater");
        Method parse=infoClass.getMethod("parse",String.class);
        java.lang.reflect.Field field=activity.getClass().getDeclaredField("updater");field.setAccessible(true);Object updater=field.get(activity);
        Method verify=updaterClass.getMethod("verifyArtifact",File.class,infoClass);
        File candidate=fixture(test,"candidate.apk"), wrongKey=fixture(test,"wrong-key.apk");
        JSONObject metadata=metadata(activity,candidate);
        Object info=parse.invoke(null,metadata.toString());
        verify.invoke(updater,candidate,info);
        JSONObject invalid=new JSONObject(metadata.toString()).put("sha256","bad");
        rejected(() -> parse.invoke(null,invalid.toString()));
        JSONObject oversized=new JSONObject(metadata.toString()).put("bytes",50L*1024*1024+1);
        rejected(() -> parse.invoke(null,oversized.toString()));
        JSONObject badVersion=new JSONObject(metadata.toString()).put("version","../other");
        rejected(() -> parse.invoke(null,badVersion.toString()));
        JSONObject fractional=new JSONObject(metadata.toString()).put("versionCode",4.5);
        rejected(() -> parse.invoke(null,fractional.toString()));
        passed.accept("update metadata rejects malformed hashes, paths, sizes and fractional versions");
        Method trusted=updaterClass.getMethod("trustedUrl",URL.class);
        for(String url:new String[]{"http://github.com/file","https://github.com.evil.test/file","https://user@github.com/file","https://github.com:444/file"})
            if(Boolean.TRUE.equals(trusted.invoke(null,new URL(url))))throw new AssertionError("Untrusted update URL accepted");
        if(!Boolean.TRUE.equals(trusted.invoke(null,new URL("https://github.com/coolza254-lgtm/Denki-Factory/releases/latest"))))throw new AssertionError("GitHub HTTPS not allowed");
        passed.accept("updater permits only expected HTTPS redirect hosts");
        Object badHash=parse.invoke(null,new JSONObject(metadata.toString()).put("sha256",new String(new char[64]).replace('\0','0')).toString());
        rejected(() -> verify.invoke(updater,candidate,badHash));
        Object wrong=parse.invoke(null,metadata(activity,wrongKey).toString());
        rejected(() -> verify.invoke(updater,wrongKey,wrong));
        PackageInfo installed=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
        Object older=parse.invoke(null,new JSONObject(metadata.toString()).put("versionCode",installed.versionCode).toString());
        rejected(() -> verify.invoke(updater,candidate,older));
        passed.accept("real APK verification accepts original key and rejects checksum, wrong key and non-newer version");
        Method stage=updaterClass.getDeclaredMethod("stage",File.class,infoClass);stage.setAccessible(true);stage.invoke(updater,candidate,info);
        Uri uri=Uri.parse("content://dev.denki.factory.updates/apk");
        String actual=hash(test.getTargetContext().getContentResolver().openInputStream(uri));
        if(!actual.equals(metadata.getString("sha256")))throw new AssertionError("Installer content URI changed APK bytes");
        try { test.getTargetContext().getContentResolver().openFileDescriptor(uri,"rw");throw new AssertionError("Writable update URI"); }
        catch(java.io.FileNotFoundException expected) { }
        try { test.getTargetContext().getContentResolver().openInputStream(Uri.parse("content://dev.denki.factory.updates/../files/save.json"));throw new AssertionError("Arbitrary update provider path accepted"); }
        catch(java.io.FileNotFoundException | IllegalArgumentException expected) { }
        passed.accept("private APK provider serves verified bytes read-only and rejects other paths");
        wrongKey.delete();
    }
}
