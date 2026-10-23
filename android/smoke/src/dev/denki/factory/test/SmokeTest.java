package dev.denki.factory.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.InputDevice;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Runs only on a disposable emulator. Never run against a player's live save. */
public final class SmokeTest extends Instrumentation {
    private WebView web;
    private boolean liveUpdates;
    private final StringBuilder report = new StringBuilder();
    @Override public void onCreate(Bundle args) { super.onCreate(args);liveUpdates=args!=null && "true".equals(args.getString("liveUpdates"));start(); }
    private void shell(String command) throws Exception {
        try(java.io.InputStream input=new ParcelFileDescriptor.AutoCloseInputStream(getUiAutomation().executeShellCommand(command))) {
            byte[] buffer=new byte[1024];while(input.read(buffer)!=-1) { }
        }
    }
    private void waitSystem(ActivityMonitor monitor,String packagePart) throws Exception {
        long end=SystemClock.uptimeMillis()+20000;
        String lastPackage="none";
        while(SystemClock.uptimeMillis()<end) {
            AccessibilityNodeInfo root=getUiAutomation().getRootInActiveWindow();
            boolean found=root!=null && root.getPackageName()!=null && root.getPackageName().toString().contains(packagePart);
            if(root!=null && root.getPackageName()!=null)lastPackage=root.getPackageName().toString();
            if(root!=null)root.recycle();
            if(found && (monitor==null || monitor.getHits()>0))return;
            Thread.sleep(100);
        }
        throw new AssertionError("System screen not visible: "+packagePart+"; active="+lastPackage);
    }
    private void cancelInstaller() throws Exception {
        long deadline=SystemClock.uptimeMillis()+20000;
        while(SystemClock.uptimeMillis()<deadline) {
        AccessibilityNodeInfo root=getUiAutomation().getRootInActiveWindow();
        boolean clicked=false;
        if(root!=null) {
            for(AccessibilityNodeInfo node:root.findAccessibilityNodeInfosByText("Cancel")) {
                CharSequence text=node.getText();
                if(text!=null && "cancel".equalsIgnoreCase(text.toString().trim()) && node.isVisibleToUser()) {
                    clicked=node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    if(!clicked) { AccessibilityNodeInfo parent=node.getParent();if(parent!=null){clicked=parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);parent.recycle();} }
                }
                node.recycle();if(clicked)break;
            }
            root.recycle();
        }
        if(clicked)return;
        Thread.sleep(100);
        }
        throw new AssertionError("Android installer Cancel button was not available");
    }
    private void fireClick(String text) {
        runOnMainSync(() -> web.evaluateJavascript("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"')).click()",null));
    }
    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        runOnMainSync(() -> web.evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        if (!done.await(30, TimeUnit.SECONDS)) throw new AssertionError("JavaScript response timed out: "+script);
        return result.get();
    }
    private void waitFor(String script) throws Exception {
        waitFor(script,120000);
    }
    private void waitFor(String script,long timeout) throws Exception {
        long deadline=SystemClock.uptimeMillis()+timeout;
        while(SystemClock.uptimeMillis()<deadline){if("true".equals(js(script)))return;Thread.sleep(1000);}
        throw new AssertionError("Not ready: "+script);
    }
    private void passed(String label) { report.append("PASS ").append(label).append('\n'); }
    private void clickText(String text) throws Exception {
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"')).click()");
    }
    private ActivityMonitor watchPicker(String action) throws Exception {
        // An action-only filter does not match an intent with a MIME type and
        // CATEGORY_OPENABLE, even when DocumentsUI actually opens correctly.
        IntentFilter filter=new IntentFilter(action);
        filter.addCategory(Intent.CATEGORY_OPENABLE);
        filter.addDataType("application/json");
        return addMonitor(filter,null,false);
    }
    private void waitForPicker(ActivityMonitor monitor, String label) throws Exception {
        long deadline=SystemClock.uptimeMillis()+15000;
        while(SystemClock.uptimeMillis()<deadline) {
            AccessibilityNodeInfo root=getUiAutomation().getRootInActiveWindow();
            boolean visible=root!=null && root.getPackageName()!=null
                && root.getPackageName().toString().contains("documentsui");
            if(root!=null) root.recycle();
            if(monitor.getHits()>0 && visible) return;
            Thread.sleep(100);
        }
        throw new AssertionError("Android "+label+" picker did not become visible (matched intents: "+monitor.getHits()+")");
    }
    private void touchText(String text) throws Exception {
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"')).scrollIntoView({block:'center'});window.__denkiPointer=null;window.__denkiInput=[];['pointerdown','pointerup','pointercancel','click'].forEach(type=>document.addEventListener(type,e=>{const d={type,text:e.target.closest('button')?.textContent||e.target.tagName,trusted:e.isTrusted};window.__denkiInput.push(d);if(type==='pointerdown')window.__denkiPointer=d;},{once:true,capture:true}))");
        CountDownLatch painted=new CountDownLatch(1);
        runOnMainSync(() -> web.postVisualStateCallback(SystemClock.uptimeMillis(),new WebView.VisualStateCallback(){@Override public void onComplete(long id){painted.countDown();}}));
        if(!painted.await(15,TimeUnit.SECONDS))throw new AssertionError("WebView scroll did not paint");
        JSONObject rect = new JSONObject(js("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"'));const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:innerWidth};})()"));
        int[] geometry=new int[3];
        runOnMainSync(() -> { web.getLocationOnScreen(geometry);geometry[2]=web.getWidth(); });
        // WebView CSS coordinates map from its screen origin. Adding the View's
        // padding again moves the touch below the button on edge-to-edge APIs.
        float scale=(float)(geometry[2]/rect.getDouble("width"));
        float x=(float)rect.getDouble("x")*scale+geometry[0];
        float y=(float)rect.getDouble("y")*scale+geometry[1];
        long now=SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(now,now,MotionEvent.ACTION_DOWN,x,y,0);
        down.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        boolean downSent=getUiAutomation().injectInputEvent(down,true);
        Thread.sleep(60);
        MotionEvent up=MotionEvent.obtain(now,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,x,y,0);
        up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        boolean upSent=getUiAutomation().injectInputEvent(up,true);
        down.recycle();up.recycle();
        if(!downSent || !upSent) throw new AssertionError("Native touch injection was rejected");
    }
    @Override public void onStart() {
        Bundle result=new Bundle();
        try {
            // Establish accessibility/input automation before WebView is created,
            // rather than changing that service state in the middle of a tap.
            getUiAutomation();
            Intent intent=new Intent(Intent.ACTION_MAIN).setClassName("dev.denki.factory","dev.denki.factory.MainActivity")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            Activity activity=startActivitySync(intent);
            runOnMainSync(() -> web=(WebView)activity.findViewById(android.R.id.content).findViewWithTag("denki-webview"));
            waitFor("document.readyState==='complete' && !!document.querySelector('.welcome .btn.primary')");
            passed("embedded HTML/JS/CSS loads from offline APK assets");
            if(!"true".equals(js("!navigator.serviceWorker.controller")))throw new AssertionError("Unexpected service worker in native build");
            passed("native build has no controlling service worker");
            js("document.querySelector('.welcome .btn.primary').click()");
            waitFor("!!document.querySelector('.bottom-nav')");
            passed("start company and render game");
            touchText("แตะปั่นไฟ");
            try {
                waitFor("(()=>{const s=JSON.parse(localStorage.getItem('denki.factory.v1'));return !!window.__denkiPointer?.trusted && window.__denkiPointer.text.includes('แตะปั่นไฟ') && Number.isFinite(s.pedalLastAt) && s.cash>0;})()",5000);
            } catch(Exception | AssertionError error) {
                throw new AssertionError("Bike tap did not commit: "+js("JSON.stringify({events:window.__denkiInput,toast:document.querySelector('.toast')?.textContent,state:JSON.parse(localStorage.getItem('denki.factory.v1')),now:Date.now()})"));
            }
            passed("touchscreen pedaling earns and saves electricity sales");
            js("document.querySelectorAll('.bottom-nav button')[1].click()");
            waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('ดูแลเงิน')");
            clickText("สินเชื่อธุรกิจ");
            waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('เงินทุน')");
            clickText("ตรวจสอบและกู้เงิน");waitFor("!!document.querySelector('.dialog')");
            js("document.querySelector('.dialog .btn.primary').click()");
            waitFor("JSON.parse(localStorage.getItem('denki.factory.v1')).loans.length===1");
            passed("native localStorage and confirmed loan transaction");
            js("document.querySelectorAll('.bottom-nav button')[2].click()");waitFor("!!document.querySelector('.stock-row')");
            js("document.querySelector('.stock-row').click()");waitFor("!!document.querySelector('.stock-price')");
            clickText("ซื้อหุ้น");waitFor("!!document.querySelector('input[type=number]')");
            clickText("ตรวจสอบการซื้อ");waitFor("!!document.querySelector('.dialog')");
            js("document.querySelector('.dialog .btn.primary').click()");
            waitFor("JSON.parse(localStorage.getItem('denki.factory.v1')).holdings.SURY.qty===10");
            passed("stock trade changes and saves game state");
            // A reload request can return while the previous DOM still exists.
            // Require a new window before checking persistence or navigating.
            js("window.__denkiSmokeBeforeReload=true");
            runOnMainSync(() -> web.reload());
            waitFor("!window.__denkiSmokeBeforeReload && document.readyState==='complete' && !!document.querySelector('.bottom-nav')");
            waitFor("JSON.parse(localStorage.getItem('denki.factory.v1')).holdings.SURY.qty===10");
            passed("saved progress survives WebView reload");
            js("document.querySelector('[aria-label=ตั้งค่า]').click()");
            waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('มุมเล็ก')");
            clickText("บันทึกและสำรอง");waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('เก็บกิจการ')");
            // Exercise the bridge from the save screen after a complete page
            // load, as users do, rather than during initial WebView startup.
            if(!"true".equals(js("!!window.DenkiAndroid && typeof window.DenkiAndroid.saveJson === 'function'")))throw new AssertionError("Native save bridge missing");
            passed("native save bridge is exposed");
            ActivityMonitor exportMonitor=watchPicker(Intent.ACTION_CREATE_DOCUMENT);
            // Opening DocumentsUI pauses WebView; do not wait for a JavaScript
            // callback which can be deferred until that activity returns.
            runOnMainSync(() -> web.evaluateJavascript("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('ส่งออกไฟล์สำรอง')).click()",null));
            waitForPicker(exportMonitor,"export");
            removeMonitor(exportMonitor);
            getUiAutomation().executeShellCommand("input keyevent 4").close();
            Thread.sleep(2000);
            waitFor("!!document.querySelector('.toast') && document.querySelector('.toast').textContent.includes('ยกเลิก')");
            passed("Android save picker opens and cancellation returns safely");
            ActivityMonitor importMonitor=watchPicker(Intent.ACTION_OPEN_DOCUMENT);
            touchText("นำเข้าไฟล์สำรอง");waitForPicker(importMonitor,"import");
            removeMonitor(importMonitor);
            getUiAutomation().executeShellCommand("input keyevent 4").close();Thread.sleep(2000);
            passed("Android open-document picker returns safely");
            js("document.querySelector('[aria-label=ตั้งค่า]').click()");
            waitFor("!!document.querySelector('.update-panel')");
            if(liveUpdates) {
                clickText("ตรวจสอบอัปเดต");
                waitFor("['current','available'].includes(JSON.parse(window.DenkiAndroid.getUpdateState()).status)");
                passed("native HTTPS check reads published GitHub update metadata successfully");
            }
            UpdateChecks.run(this,activity,this::passed);
            waitFor("JSON.parse(window.DenkiAndroid.getUpdateState()).status==='ready'");
            shell("appops set dev.denki.factory REQUEST_INSTALL_PACKAGES deny");
            IntentFilter permissionFilter=new IntentFilter(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            permissionFilter.addDataScheme("package");
            ActivityMonitor permission=addMonitor(permissionFilter,null,false);
            fireClick("ติดตั้งอัปเดต");waitSystem(permission,"settings");removeMonitor(permission);
            shell("input keyevent 4");waitSystem(null,"dev.denki.factory");
            passed("update permission request opens Android settings and returns safely");
            shell("appops set dev.denki.factory REQUEST_INSTALL_PACKAGES allow");
            IntentFilter installerFilter=new IntentFilter(Intent.ACTION_INSTALL_PACKAGE);
            installerFilter.addDataScheme("content");installerFilter.addDataType("application/vnd.android.package-archive");
            ActivityMonitor installer=addMonitor(installerFilter,null,false);
            fireClick("ติดตั้งอัปเดต");waitSystem(installer,"packageinstaller");removeMonitor(installer);
            cancelInstaller();waitSystem(null,"dev.denki.factory");
            waitFor("JSON.parse(window.DenkiAndroid.getUpdateState()).status==='ready'");
            waitFor("JSON.parse(localStorage.getItem('denki.factory.v1')).holdings.SURY.qty===10");
            passed("Android installer opens a signed update and cancellation preserves progress");
            js("document.querySelectorAll('.bottom-nav button')[0].click()");
            waitFor("!!document.querySelector('.home-intro')");
            if(!"true".equals(js("document.documentElement.scrollWidth<=innerWidth")))throw new AssertionError("Horizontal overflow");
            passed("phone layout has no horizontal overflow");
            result.putString("stream",report.toString()+"ANDROID_SMOKE_PASS\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable error){while(error.getCause()!=null)error=error.getCause();result.putString("stream",report.toString()+"ANDROID_SMOKE_FAIL: "+error+"\n");finish(Activity.RESULT_CANCELED,result);}
    }
}
