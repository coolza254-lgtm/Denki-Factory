import { useEffect, useState } from "react";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";

type UpdateState = {
  status:
    | "idle"
    | "checking"
    | "available"
    | "current"
    | "downloading"
    | "ready"
    | "permission"
    | "installing"
    | "error";
  message: string;
  currentVersion?: string;
  version?: string;
  bytes?: number;
  notes?: string;
  progress?: number;
};
export function UpdatePanel() {
  const native = !!window.DenkiAndroid?.checkForUpdate;
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    message: "กดตรวจสอบเมื่อต้องการอัปเดต",
  });
  useEffect(() => {
    const onUpdate = (event: Event) =>
      setState((event as CustomEvent<UpdateState>).detail);
    window.addEventListener("denki-update", onUpdate);
    try {
      const initial = window.DenkiAndroid?.getUpdateState?.();
      if (initial) setState(JSON.parse(initial));
    } catch {
      setState({
        status: "error",
        message: "อ่านสถานะไม่ได้ ลองเปิดเมนูนี้ใหม่อีกครั้ง",
      });
    }
    return () => window.removeEventListener("denki-update", onUpdate);
  }, []);
  const busy = ["checking", "downloading", "installing"].includes(state.status);
  const ready = ["ready", "permission"].includes(state.status);
  return (
    <section className="panel update-panel" aria-label="อัปเดตเกม">
      <h3>
        <RefreshCw size={18} /> อัปเดตเกม
      </h3>
      {native ? (
        <>
          {state.currentVersion && (
            <p className="fine">รุ่นที่ติดตั้ง {state.currentVersion}</p>
          )}
          <p role="status">{state.message}</p>
          {state.version && state.status !== "current" && (
            <p>
              <b>รุ่น {state.version}</b>
              {state.bytes ? ` · ${(state.bytes / 1048576).toFixed(1)} MB` : ""}
            </p>
          )}
          {state.notes && (
            <details>
              <summary>มีอะไรใหม่</summary>
              <p className="update-notes">{state.notes}</p>
            </details>
          )}
          {state.status === "downloading" && (
            <progress
              aria-label="ความคืบหน้าดาวน์โหลด"
              max={100}
              value={state.progress ?? 0}
            />
          )}
          {state.status === "available" && (
            <button
              className="btn primary full"
              onClick={() => window.DenkiAndroid?.downloadUpdate?.()}
            >
              <Download size={18} /> ดาวน์โหลดอัปเดต
            </button>
          )}
          {ready && (
            <button
              className="btn primary full"
              onClick={() => window.DenkiAndroid?.installUpdate?.()}
            >
              <ShieldCheck size={18} /> ติดตั้งอัปเดต
            </button>
          )}
          {!ready && state.status !== "available" && (
            <button
              className="btn full"
              disabled={busy}
              onClick={() => window.DenkiAndroid?.checkForUpdate?.()}
            >
              <RefreshCw size={18} />{" "}
              {busy ? "กำลังดำเนินการ…" : "ตรวจสอบอัปเดต"}
            </button>
          )}
          <small className="fine">
            ใช้เน็ตเฉพาะตอนตรวจสอบหรือดาวน์โหลด ตรวจไฟล์ก่อนเปิดหน้าติดตั้งของ
            Android เซฟอยู่ในแอปเดิม
          </small>
        </>
      ) : (
        <>
          <p>
            ดาวน์โหลดแอป Android รุ่นล่าสุดจาก GitHub
            แล้วติดตั้งทับรุ่นเดิมเพื่อใช้เซฟต่อ
          </p>
          <a
            className="btn full"
            href="https://github.com/coolza254-lgtm/Denki-Factory/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={18} /> ดาวน์โหลดรุ่น Android
          </a>
        </>
      )}
    </section>
  );
}
