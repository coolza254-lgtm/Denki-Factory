package dev.denki.factory.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import android.view.MotionEvent;
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
        if (!done.await(120, TimeUnit.SECONDS)) throw new AssertionError("JavaScript response timed out");
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
    private void touchText(String text) throws Exception {
        js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"')).scrollIntoView({block:'center'})");
        JSONObject rect = new JSONObject(js("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('"+text+"'));const r=b.getBoundingClientRect();return {x:(r.left+r.width/2)*devicePixelRatio,y:(r.top+r.height/2)*devicePixelRatio};})()"));
        int[] origin=new int[2];
        runOnMainSync(() -> { web.getLocationOnScreen(origin); origin[0]+=web.getPaddingLeft();origin[1]+=web.getPaddingTop(); });
        float x=(float)rect.getDouble("x")+origin[0],y=(float)rect.getDouble("y")+origin[1];
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
            if(!"true".equals(js("!!window.DenkiAndroid && !navigator.serviceWorker.controller")))throw new AssertionError("Native bridge or worker mode incorrect");
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
            js("location.reload()");waitFor("!!document.querySelector('.bottom-nav')");
            waitFor("JSON.parse(localStorage.getItem('denki.factory.v1')).holdings.SURY.qty===10");
            passed("saved progress survives WebView reload");
            js("document.querySelector('[aria-label=ตั้งค่า]').click()");
            waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('มุมเล็ก')");
            clickText("บันทึกและสำรอง");waitFor("!!document.querySelector('main h2') && document.querySelector('main h2').textContent.includes('เก็บกิจการ')");
            ActivityMonitor exportMonitor=addMonitor(new IntentFilter(Intent.ACTION_CREATE_DOCUMENT),null,false);
            clickText("ส่งออกไฟล์สำรอง");
            Thread.sleep(2500);
            if(exportMonitor.getHits()<1)throw new AssertionError("Android export picker was not launched");
            removeMonitor(exportMonitor);
            getUiAutomation().executeShellCommand("input keyevent 4").close();
            Thread.sleep(2000);
            waitFor("!!document.querySelector('.toast') && document.querySelector('.toast').textContent.includes('ยกเลิก')");
            passed("Android save picker opens and cancellation returns safely");
            ActivityMonitor importMonitor=addMonitor(new IntentFilter(Intent.ACTION_OPEN_DOCUMENT),null,false);
            touchText("นำเข้าไฟล์สำรอง");Thread.sleep(2500);
            if(importMonitor.getHits()<1)throw new AssertionError("Android import picker was not launched");
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
