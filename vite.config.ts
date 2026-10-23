import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "denki-offline",
      generateBundle(_, bundle) {
        const assets = [
          "/",
          "/index.html",
          "/icon.svg",
          "/icon-192.png",
          "/icon-512.png",
          "/manifest.webmanifest",
          ...Object.keys(bundle).map((f) => "/" + f),
        ];
        const version = createHash("sha256")
          .update(JSON.stringify(assets))
          .digest("hex")
          .slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `const CACHE='denki-${version}';const FILES=${JSON.stringify(assets)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('denki-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return;}e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request)));});`,
        });
      },
    },
  ],
});
