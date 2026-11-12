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
     0. DURUST OYUN: hicbir yetenek kullanmadan yurur, kosar,
        ziplar, kosarak ziplar, ikiserli yakin dovusur (gercek
        geri itilme), basamak cikip dusertir. Bu asamada Gozcu'nun
        yazdigi HER uyari yanlis alarmdir.
     1. kayitli her yetenegi bir kez calistirir (olustur),
     2. ayni oyuncularla BIR KEZ DAHA calistirir: ac-kapa
        yeteneklerinin kapatma yolu ve "durum dolu" dallari
        (uslup secili, eldiven acik, kilik giyili),
     3. her sohbet komutunu /scriptevent ile gonderir,
     4. bota dokunur (playerInteractWithEntity),
     5. her esyayi verir, kullanir, bir kez vurur,
     6. oyunculari oldurup yeniden dogurur (olum, mezar, playerSpawn),
     7. oyunculari cikarir (playerLeave yolu).
   Her satir "[TARAMA] ..." diye kayda duser; hataYaz'in yazdigi
   "HATA @" satirlarini ve Gozcu'nun sohbete yazdiklarini
   ("[TARAMA-SOHBET]", tarama_dene.py yardimcilar.js kopyasina
   ekliyor) tarama_dene.py sayar.
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
    let gecis = 1, tick = 0, bosTick = 0, asama = "durust", tur = 1;
    let durustTick = 0, etkTick = 0, olumTick = 0;
    const sonAtis = new Map();
    const komutlar = __KOMUTLAR;
    let komutSira = 0, esyaSira = 0;
    const esyalar = __TUM_ESYALAR;

    const bakim = () => {
      /* Durust asamada oyunculara DOKUNULMAZ: efekt, isinlama ve
         hedef yaratik hareket olcumunu kirletirdi.               */
      if (asama === "durust" || asama === "olum") return;
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

    /* ---- 0. DURUST OYUN ----
       Sahne: duz bedrock zemin (y 290), oyuncular y 291'de. Kuzey
       ucta dort basamak ve bir sahanlik var; ustunden atlaninca
       4 blok dusulur. Her adim gercek girdiyle: move / jump /
       attackEntity. Isinlama ve efekt YOK.                        */
    const gec = (p) => { try { return p.isValid; } catch (e) { return false; } };
    /* "0 uyari" ancak oyuncular GERCEKTEN oynadiysa bir sey soyler.
       Yol, en yuksek hiz, zirve ve oyuncudan oyuncuya vurus sayisi
       olculup kayda yaziliyor; tarama_dene.py alt sinirlari soruyor. */
    const olcu = oy.map(() => ({ son: null, yol: 0, hiz: 0, zirve: 0 }));
    let durustVurus = 0;
    try {
      world.afterEvents.entityHurt.subscribe((olay) => {
        try {
          if (asama !== "durust") return;
          const vuran = olay.damageSource && olay.damageSource.damagingEntity;
          if (vuran && vuran.typeId === "minecraft:player" &&
              olay.hurtEntity && olay.hurtEntity.typeId === "minecraft:player") durustVurus++;
        } catch (e) { /* olcum onemsiz */ }
      });
    } catch (e) { __T("vurus sayaci kurulamadi: " + e); }
    const durustAdim = () => {
      const d = durustTick++;
      for (let i = 0; i < oy.length; i++) {
        if (!gec(oy[i])) continue;
        try {
          const l = oy[i].location, m = olcu[i];
          if (m.son) {
            const adim = Math.hypot(l.x - m.son.x, l.z - m.son.z);
            m.yol += adim;
            if (adim * 20 > m.hiz) m.hiz = adim * 20;
          }
          if (l.y - 291 > m.zirve) m.zirve = l.y - 291;
          m.son = { x: l.x, z: l.z };
        } catch (e) { /* bu tick okunamadi */ }
      }
      if (d === 0) {
        __T("ASAMA durust");
        try {
          boyut.runCommand("fill 1 291 1 40 300 40 air");
          for (let b = 0; b < 4; b++) {
            boyut.runCommand("fill 4 " + (291 + b) + " " + (26 + b) + " 37 " + (291 + b) + " " + (26 + b) + " stone");
          }
          boyut.runCommand("fill 4 294 30 37 294 32 stone");
        } catch (e) { __T("durust sahne kurulamadi: " + e); }
      }
      for (let i = 0; i < oy.length; i++) {
        const p = oy[i];
        if (!gec(p)) continue;
        const k = yer(i);
        try {
          if (d === 20) p.moveToLocation({ x: k.x, y: 291, z: 22.5 });                 // yuru
          if (d === 120) p.moveToLocation({ x: k.x, y: 291, z: 6.5 });
          if (d === 220) { p.isSprinting = true; p.moveToLocation({ x: k.x, y: 291, z: 22.5 }); }  // kos
          if (d === 300) p.moveToLocation({ x: k.x, y: 291, z: 6.5 });
          if (d >= 380 && d < 520) {                                                   // kosarak zipla
            if (d === 380) p.moveToLocation({ x: k.x, y: 291, z: 22.5 });
            if (d === 450) p.moveToLocation({ x: k.x, y: 291, z: 6.5 });
            if (d % 12 === 0) p.jump();
          }
          if (d === 520) { p.stopMoving(); p.isSprinting = false; }
          if (d >= 540 && d < 620 && d % 14 === 0) p.jump();                           // yerinde zipla
          if (d === 620) {                                                             // ikiserli karsilas
            const es = i % 2 === 0 ? i + 1 : i - 1;
            const orta = (yer(i).x + yer(es).x) / 2;
            p.moveToLocation({ x: orta + (i % 2 === 0 ? -1.2 : 1.2), y: 291, z: 14.5 });
          }
          if (d >= 700 && d < 900 && d % 13 === (i % 2) * 6) {                          // yakin dovus
            /* attack() GERCEK vurus: nisangahtaki hedefe, oyunun
               kendi menzilinde. attackEntity kullanilmiyor -- o her
               mesafeden vurur, yani kendisi bir menzil hilesi olurdu.
               Geri itilince rakibe YURUYEREK donuluyor.            */
            const es = oy[i % 2 === 0 ? i + 1 : i - 1];
            if (gec(es)) {
              const a = p.location, c = es.location;
              const uzak = Math.hypot(a.x - c.x, a.z - c.z);
              p.lookAtEntity(es);
              if (uzak > 2.6) p.moveToLocation({ x: c.x, y: c.y, z: c.z });
              else { p.stopMoving(); p.attack(); }
            }
          }
          if (d === 900) p.navigateToLocation({ x: k.x, y: 295, z: 31.5 });             // basamak
          if (d === 1100) p.moveToLocation({ x: k.x, y: 291, z: 36.5 });                // dus
          if (d === 1200) p.stopMoving();
        } catch (e) { __T("durust adim atti (" + d + "): " + e); }
      }
      if (d === 1260) {
        const enAz = (f) => Math.min(...olcu.map(f)), enCok = (f) => Math.max(...olcu.map(f));
        __T("DURUST olcum yol=" + enAz((m) => m.yol).toFixed(1) +
            " hiz=" + enCok((m) => m.hiz).toFixed(2) +
            " zirve=" + enCok((m) => m.zirve).toFixed(2) +
            " vurus=" + durustVurus);
        try { boyut.runCommand("fill 1 291 1 40 300 40 air"); } catch (e) {}
        for (const p of oy) { if (gec(p)) { try { p.teleport(yer(p.__yuva), { dimension: boyut }); } catch (e) {} } }
        __T("ASAMA yetenek");
        asama = "yetenek";
      }
    };

    const id = system.runInterval(() => {
      tick++;
      if (tick % 40 === 0) bakim();
      if (asama === "durust") { durustAdim(); return; }
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
          if (tur === 1) {
            __T("HIC CALISMAYAN: " + olmayan.join(","));
            /* 2. TUR: ayni oyuncular, ayni liste. Durum artik dolu. */
            tur = 2; gecis = 3; bosTick = 0;
            kalan = tanimlar.map((t) => t.kimlik);
            __T("ASAMA yetenek2");
            return;
          }
          __T("ASAMA komut");
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
        __T("ASAMA etkilesim");
        asama = "etkilesim"; etkTick = 0; return;
      }
      if (asama === "etkilesim") {
        /* Bota dokun: playerInteractWithEntity -> bot menusu. Bot
           yoksa (cagirma butceye takildiysa) once "bot" yazilir.  */
        const e = etkTick++;
        if (e === 0) { for (const p of oy) { if (gec(p)) { try { p.runCommand("scriptevent s:k bot"); } catch (x) {} } } }
        if (e === 60) {
          let n = 0;
          try {
            const botlar = boyut.getEntities({ type: "pa:bot" });
            for (const p of oy) {
              if (!gec(p)) continue;
              for (const b of botlar) { try { if (p.interactWithEntity(b)) n++; } catch (x) { __T("dokunma atti: " + x); } }
            }
            __T("bota dokunma: " + botlar.length + " bot, " + n + " etkilesim");
          } catch (x) { __T("etkilesim atti: " + x); }
        }
        if (e === 120) { __T("ASAMA esya"); asama = "esya"; }
        return;
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
        __T("ASAMA olum");
        asama = "olum"; olumTick = 0; return;
      }
      if (asama === "olum") {
        /* Oldur, yeniden dogur: olum isleyicileri, mezar, kalp
           defteri ve playerSpawn (ilk dogus DEGIL) yolu.          */
        const o = olumTick++;
        if (o === 0) {
          for (const p of oy) {
            if (!gec(p)) continue;
            try { p.removeEffect("resistance"); p.removeEffect("regeneration"); } catch (x) {}
            try { p.giveItem(new __Esya("minecraft:diamond", 3), false); } catch (x) {}
            try { p.kill(); } catch (x) { __T("oldurme atti: " + x); }
          }
        }
        if (o === 60) {
          let n = 0;
          for (const p of oy) { try { if (p.respawn()) n++; } catch (x) { __T("yeniden dogus atti: " + x); } }
          __T("yeniden dogan: " + n);
        }
        if (o === 160) { __T("ASAMA cikis"); asama = "cikis"; bosTick = 0; }
        return;
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
