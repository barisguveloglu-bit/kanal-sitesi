/* ==================================================================
   TARAMA EKI                                               v7.99.17

   BU DOSYA PAKETE GIRMEZ. tarama_dene.py onu DENEME sunucusundaki
   main.js KOPYASININ sonuna ekler, kosu bitince kopyayi geri alir.
   Ayni modulun icinde calistigi icin main.js'in kendi adlarini
   (tumYetenekler, yetenekTetikle, oyuncuIsSayisi, AYNI_ANDA)
   dogrudan kullaniyor. __KOMUTLAR ve __TUM_ESYALAR'i tarama_dene.py
   bu metnin ONUNE yaziyor.

   Ne yapiyor: @minecraft/server-gametest ile alti sahte oyuncu
   dogurur ve GERCEK MOTORDA sirayla
     1. kayitli her yetenegi bir kez calistirir (olustur),
     2. her sohbet komutunu /scriptevent ile gonderir,
     3. her esyayi verir, kullanir, bir kez vurur,
     4. oyunculari cikarir (playerLeave yolu).
   Her satir "[TARAMA] ..." diye kayda duser; hataYaz'in yazdigi
   "HATA @" satirlarini tarama_dene.py sayar.
   ================================================================== */
import { spawnSimulatedPlayer as __dogur } from "@minecraft/server-gametest";
import { GameMode as __Kip, ItemStack as __Esya } from "@minecraft/server";
import { enerjiVer as __enerjiVer } from "./enerji.js";
const __T = (m) => console.warn("[TARAMA] " + m);
world.afterEvents.worldLoad.subscribe(() => system.runTimeout(__basla, 100));
function __basla() {
  try {
    const boyut = world.getDimension("overworld");
    const N = 6;
    const yer = (i) => ({ x: 6.5 + i * 6, y: 291, z: 10.5 });
    let sayac = 0;
    const yeniOyuncu = (i) => {
      const k = yer(i);
      const p = __dogur({ dimension: boyut, x: k.x, y: k.y, z: k.z }, "tarama" + (sayac++), __Kip.Survival);
      p.__yuva = i;
      return p;
    };
    const oy = [];
    for (let i = 0; i < N; i++) oy.push(yeniOyuncu(i));
    __T("oyuncular: " + oy.length);

    const tanimlar = tumYetenekler();
    const durum = new Map();
    for (const t of tanimlar) {
      const eski = t.olustur, kimlik = t.kimlik;
      durum.set(kimlik, "bekliyor");
      t.olustur = function (o) {
        try {
          const s = eski.call(t, o);
          durum.set(kimlik, "calisti");
          __T("calisti " + kimlik + " -> " + (Array.isArray(s) ? "is x" + s.length : (s ? "is" : "anlik")));
          return s;
        } catch (e) {
          durum.set(kimlik, "istisna");
          __T("ISTISNA " + kimlik + ": " + (e && e.message) + " || " + String(e && e.stack).split("\n").join(" | "));
          throw e;
        }
      };
    }
    __T("yetenek: " + tanimlar.length);

    let kalan = tanimlar.map((t) => t.kimlik);
    let gecis = 1, tick = 0, bosTick = 0, asama = "yetenek";
    const sonAtis = new Map();
    const komutlar = __KOMUTLAR;
    let komutSira = 0, esyaSira = 0;
    const esyalar = __TUM_ESYALAR;

    const bakim = () => {
      try { boyut.runCommand("fill 0 290 0 41 290 41 bedrock"); } catch (e) { /* yuklu degil */ }
      try { boyut.runCommand("fill 1 291 1 40 300 40 air replace water"); } catch (e) {}
      try { boyut.runCommand("fill 1 291 1 40 300 40 air replace lava"); } catch (e) {}
      let husk = 0;
      try { husk = boyut.getEntities({ type: "minecraft:husk" }).length; } catch (e) {}
      for (let i = 0; i < oy.length; i++) {
        let p = oy[i];
        let gecerli = false;
        try { gecerli = p.isValid; } catch (e) {}
        if (!gecerli) { try { oy[i] = p = yeniOyuncu(i); } catch (e) { __T("oyuncu dogmadi: " + e); continue; } }
        const k = yer(p.__yuva);
        try {
          const l = p.location;
          if (Math.abs(l.x - k.x) > 4 || Math.abs(l.z - k.z) > 4 || l.y < 290 || l.y > 300) {
            p.teleport(k, { dimension: boyut, rotation: { x: 0, y: 0 } });
          }
          p.addEffect("resistance", 400, { amplifier: 4, showParticles: false });
          p.addEffect("regeneration", 400, { amplifier: 4, showParticles: false });
          p.addEffect("fire_resistance", 400, { amplifier: 0, showParticles: false });
          p.setRotation({ x: 0, y: 0 });
        } catch (e) { /* olmus olabilir */ try { p.respawn(); } catch (e2) {} }
        if (husk < N * 2) {
          try { boyut.spawnEntity("minecraft:husk", { x: k.x, y: 291, z: k.z + 4 }); husk++; } catch (e) {}
        }
      }
    };
    bakim();

    const id = system.runInterval(() => {
      tick++;
      if (tick % 40 === 0) bakim();
      if (asama === "yetenek") {
        if (kalan.length === 0) {
          bosTick++;
          if (bosTick < 300) return;          // suren isler bitsin
          const olmayan = [...durum].filter(([, d]) => d === "bekliyor").map(([k]) => k);
          __T("gecis " + gecis + " bitti: calismayan " + olmayan.length);
          if (olmayan.length > 0 && gecis < 3) {
            gecis++; kalan = olmayan; bosTick = 0;
            /* taze oyuncular: takili isler ve bekleme defterleri sifirlansin */
            for (let i = 0; i < oy.length; i++) { try { oy[i].disconnect(); } catch (e) {} }
            return;
          }
          __T("HIC CALISMAYAN: " + olmayan.join(","));
          asama = "komut"; bosTick = 0;
          return;
        }
        for (const p of oy) {
          let gecerli = false;
          try { gecerli = p.isValid; } catch (e) {}
          if (!gecerli) continue;
          const son = sonAtis.get(p.id);
          if (son !== undefined && tick - son < 8) continue;
          if (oyuncuIsSayisi(p.id) > 0 && son !== undefined && tick - son < 160) continue;
          if (oyuncuIsSayisi(p.id) >= AYNI_ANDA) {
            /* takildi: cik, yerine yenisi dogacak (playerLeave yolu da sinaniyor) */
            try { p.disconnect(); } catch (e) {}
            continue;
          }
          const k = kalan.shift();
          __enerjiVer(p.id, 1000);
          sonAtis.set(p.id, tick);
          let oldu = false;
          try { oldu = yetenekTetikle(p, k); }
          catch (e) { __T("TETIK ISTISNA " + k + ": " + e + " || " + String(e && e.stack).split("\n").join(" | ")); }
          if (!oldu) __T("reddedildi " + k);
          break;
        }
        return;
      }
      if (asama === "komut") {
        if (tick % 6 !== 0) return;
        const p = oy[komutSira % oy.length];
        if (komutSira < komutlar.length) {
          const k = komutlar[komutSira++];
          __T("komut: " + k);
          try { p.runCommand("scriptevent s:k " + k); } catch (e) { __T("komut atti " + k + ": " + e); }
          return;
        }
        asama = "esya"; return;
      }
      if (asama === "esya") {
        if (tick % 4 !== 0) return;
        const p = oy[esyaSira % oy.length];
        if (esyaSira < esyalar.length) {
          const k = esyalar[esyaSira++];
          try {
            const e = new __Esya(k, 1);
            try { p.getComponent("inventory").container.clearAll(); } catch (e3) {}
            p.giveItem(e, true);
            p.useItem(e);
            p.attack();
            p.stopUsingItem();
          }
          catch (e) { __T("esya atti " + k + ": " + e); }
          return;
        }
        asama = "cikis"; bosTick = 0; return;
      }
      if (asama === "cikis") {
        bosTick++;
        if (bosTick === 100) { for (const p of oy) { try { p.disconnect(); } catch (e) {} } }
        if (bosTick === 200) {
          const c = { calisti: 0, istisna: 0, bekliyor: 0 };
          for (const [, d] of durum) c[d]++;
          __T("OZET calisti=" + c.calisti + " istisna=" + c.istisna + " hic=" + c.bekliyor);
          __T("BITTI");
          system.clearRun(id);
        }
      }
    }, 1);
  } catch (e) { __T("KURULAMADI " + e + " || " + String(e && e.stack).split("\n").join(" | ")); }
}
