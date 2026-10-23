package dev.denki.factory.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Runs only on a disposable emulator. Never run against a player's live save. */
public final class SmokeTest extends Instrumentation {
    private WebView web;
    private final StringBuilder report = new StringBuilder();
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        runOnMainSync(() -> web.evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        if (!done.await(30, TimeUnit.SECONDS)) throw new AssertionError("JavaScript response timed out: "+script);
        return result.get();
    }
    private void waitFor(String script) throws Exception {
        long deadline=System.currentTimeMillis()+120000;
        while(System.currentTimeMillis()<deadline){if("true".equals(js(script)))return;Thread.sleep(1000);}
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
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"')).scrollIntoView({block:'center'})");
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
        MotionEvent up=MotionEvent.obtain(now,now+60,MotionEvent.ACTION_UP,x,y,0);
        getUiAutomation().injectInputEvent(down,true);getUiAutomation().injectInputEvent(up,true);
        down.recycle();up.recycle();
    }
    @Override public void onStart() {
        Bundle result=new Bundle();
        try {
            Intent intent=new Intent(Intent.ACTION_MAIN).setClassName("dev.denki.factory","dev.denki.factory.MainActivity")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            Activity activity=startActivitySync(intent);
            runOnMainSync(() -> web=(WebView)((ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0));
            waitFor("!!document.querySelector('.welcome .btn.primary')");
            passed("embedded HTML/JS/CSS loads without Internet permission");
            if(!"true".equals(js("!!window.DenkiAndroid && typeof window.DenkiAndroid.saveJson === 'function'")))throw new AssertionError("Native save bridge missing");
            passed("native save bridge is exposed");
            if(!"true".equals(js("!navigator.serviceWorker.controller")))throw new AssertionError("Unexpected service worker in native build");
            passed("native build has no controlling service worker");
            js("document.querySelector('.welcome .btn.primary').click()");
            waitFor("!!document.querySelector('.bottom-nav')");
            passed("start company and render game");
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
            js("document.querySelectorAll('.bottom-nav button')[0].click()");
            waitFor("!!document.querySelector('.home-intro')");
            if(!"true".equals(js("document.documentElement.scrollWidth<=innerWidth")))throw new AssertionError("Horizontal overflow");
            passed("phone layout has no horizontal overflow");
            result.putString("stream",report.toString()+"ANDROID_SMOKE_PASS\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable error){result.putString("stream",report.toString()+"ANDROID_SMOKE_FAIL: "+error+"\n");finish(Activity.RESULT_CANCELED,result);}
    }
}
