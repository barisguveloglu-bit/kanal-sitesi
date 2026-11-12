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
import { GameMode as __Kip, ItemStack as __Esya, InputPermissionCategory as __Girdi } from "@minecraft/server";
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
    let durustTick = 0, etkTick = 0, olumTick = 0, hileTick = 0;
    const sonAtis = new Map();
    const komutlar = __KOMUTLAR;
    let komutSira = 0, esyaSira = 0;
    const esyalar = __TUM_ESYALAR;

    const bakim = () => {
      /* Durust asamada oyunculara DOKUNULMAZ: efekt, isinlama ve
         hedef yaratik hareket olcumunu kirletirdi.               */
      if (asama === "durust" || asama === "hile" || asama === "olum") return;
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
        /* Savunma Kipi DURUST oyunda da acik: kati blok, su ustu ve
           havada asili olcumleri yalniz o acikken blok okuyor. Kapali
           kalsaydi bu uc olcumun yanlis alarmi gercek motorda hic
           sinanmazdi (ilk yazilista boyleydi). Hile asamasi sonunda
           kapaniyor; Savunma Kipi ac-kapa.                         */
        if (gec(oy[3])) sor(oy[3], "scriptevent s:k savunma");
        try {
          boyut.runCommand("fill 1 291 1 40 300 40 air");
          /* Yarim basamakli rampa: oyuncu 0,5 blogu ziplamadan cikar,
             yani cikis yol bulmaya bagli degil. Ilk yazilista tam
             basamaklardi ve navigateToLocation cogu kosuda cikamadi
             (zirve 1,6) -- dusus hic sinanmiyordu.                 */
          for (let b = 0; b < 8; b++) {
            const z = 24 + b, tam = Math.floor((b + 1) / 2);
            if (tam > 0) boyut.runCommand("fill 4 291 " + z + " 37 " + (290 + tam) + " " + z + " stone");
            if ((b + 1) % 2 === 1) boyut.runCommand("fill 4 " + (291 + tam) + " " + z + " 37 " + (291 + tam) + " " + z + " smooth_stone_slab");
          }
          boyut.runCommand("fill 4 291 32 37 294 34 stone");
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
          if (d >= 700 && d < 830 && d % 13 === (i % 2) * 6) {                          // yakin dovus
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
          if (d === 900) p.moveToLocation({ x: k.x, y: 295, z: 33.5 });                 // rampa
          if (d === 1100) p.moveToLocation({ x: k.x, y: 291, z: 38.5 });                // 4 blok dus
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
        __T("ASAMA hile");
        asama = "hile";
      }
    };

    /* ---- 0b. SAVUNMA DUVARI: HILE TAKLIDI ----
       Tablodaki "kapali" maddeler gercek motorda yakalaniyor mu?
       Her turda her oyuncunun TEK rolu var; Gozcu'nun uyarisi
       oyuncu adini tasidigi icin hangi rolun yakalandigi belli.
       tarama_dene.py rol tablosunu "HILE-ROL" satirindan okuyor.

       SINIR: bu bir TAKLIT. Vurus tarafi gercek (entityHitEntity,
       gercek konum ve bakis); komut tarafi gercek (komutlarin
       kendisi). Hareket tarafi ISINLAMA ile kuruluyor: gercek bir
       hileli istemci konumu paketle yollar, sunucunun gordugu
       konum ayni olsa da isFalling / isFlying gibi durum bayraklari
       farkli olabilir. "yoklama" diye isaretli roller bir iddiayi
       sinamiyor, yalniz ne oldugunu kayda yaziyor.               */
    const TUR = 320;
    const capa = oy.map(() => null);
    const isinla = (p, x, y, z) => p.teleport({ x, y, z }, { dimension: boyut });
    const sor = (p, k) => { try { p.runCommand(k); } catch (e) { __T("HILE komut atti [" + k + "]: " + e); } };
    const blokTip = (x, y, z) => { try { const b = boyut.getBlock({ x, y, z }); return b ? b.typeId : "?"; } catch (e) { return "?"; } };
    const kipi = (p) => { try { return String(p.getGameMode()); } catch (e) { return "?"; } };
    const girdiAcik = (p, tur) => { try { return p.inputPermissions.isPermissionCategoryEnabled(tur); } catch (e) { return "okunamadi:" + e; } };
    const bastaki = (p) => { try { const e = p.getComponent("minecraft:equippable").getEquipment("Head"); return e ? e.typeId : "bos"; } catch (e) { return "okunamadi"; } };
    const elmas = (p) => {
      try {
        const kap = p.getComponent("inventory").container; let n = 0;
        for (let s = 0; s < kap.size; s++) { const e = kap.getItem(s); if (e && e.typeId === "minecraft:diamond") n += e.amount; }
        return n;
      } catch (e) { return -1; }
    };
    const ROLLER = [
      ["hiz", "isinlanma", "menzil", "kurban", "bakmadan", "kurban"],
      ["cps", "kurban", "aynitick", "kurban", "kip", "kati"],
      ["geriitme", "vuran", "yukselme", "asili", "kafes", "komut"],
      ["hiz_efekt", "kurban", "kurban", "kurban", "kurban", "kurban"],
    ];
    /* Motor bir oyuncunun vuruslarindan kacini OLAY olarak veriyor?
       Gozcu'nun CPS ve "ayni tick" olcumleri entityHitEntity sayiyor;
       motor fazla vuruslari yutuyorsa o olcumler hic tetiklenmez.   */
    const vurusDefteri = new Map();           // ad -> tick listesi
    try {
      world.afterEvents.entityHitEntity.subscribe((olay) => {
        try {
          if (asama !== "hile") return;
          const v = olay.damagingEntity;
          if (!v || v.typeId !== "minecraft:player") return;
          const l = vurusDefteri.get(v.name) || [];
          l.push(system.currentTick); vurusDefteri.set(v.name, l);
        } catch (e) { /* olcum onemsiz */ }
      });
    } catch (e) { __T("vurus defteri kurulamadi: " + e); }
    const vurusOzeti = (tur) => {
      const parca = [];
      for (const [ad, l] of vurusDefteri) {
        let enSn = 0, enTick = 0;
        for (let a = 0; a < l.length; a++) {
          let sn = 0, tk = 0;
          for (let b = a; b < l.length && l[b] - l[a] < 20; b++) { sn++; if (l[b] === l[a]) tk++; }
          if (sn > enSn) enSn = sn; if (tk > enTick) enTick = tk;
        }
        parca.push(ad + "=" + l.length + "/" + enSn + "/" + enTick);
      }
      __T("HILE-VURUS tur=" + tur + " (toplam/enCokSn/enCokTick) " + parca.join(" "));
      vurusDefteri.clear();
    };
    const hileAdim = () => {
      const h = hileTick++;
      const tur = Math.floor(h / TUR), r = h % TUR;
      if (r === TUR - 1 && tur < ROLLER.length) vurusOzeti(tur + 1);
      if (tur >= ROLLER.length) {
        if (r === 0) { if (gec(oy[3])) sor(oy[3], "scriptevent s:k savunma"); }
        if (r === 20) {
          try { boyut.runCommand("fill 1 291 1 40 300 40 air"); } catch (e) {}
          for (const p of oy) {
            if (!gec(p)) continue;
            try { p.setGameMode(__Kip.Survival); p.teleport(yer(p.__yuva), { dimension: boyut }); } catch (e) {}
          }
          /* --asama hile: yalniz durust oyun + savunma duvari (~3 dk). */
          if (__SON_ASAMA === "hile") { __T("BITTI"); system.clearRun(id); asama = "bitti"; return; }
          __T("ASAMA yetenek");
          asama = "yetenek";
        }
        return;
      }
      const rol = ROLLER[tur];
      if (r === 0) {
        __T("HILE-ROL tur=" + (tur + 1) + " " + oy.map((p, i) => (gec(p) ? p.name : "?") + "=" + rol[i]).join(" "));
        try { boyut.runCommand("fill 1 291 1 40 300 40 air"); } catch (e) {}
        for (let i = 0; i < oy.length; i++) {
          const p = oy[i]; if (!gec(p)) continue;
          const k = yer(i);
          try {
            /* Durust dovuste olen oyuncu vuramaz ve vurulamaz: ilk
               kosuda iki "kacti" sonucu boyle cikti (olu oyuncu).   */
            try { p.respawn(); } catch (e2) { /* zaten hayatta */ }
            p.stopMoving();
            sor(p, "effect @s instant_health 1 20 true");
            p.addEffect("resistance", TUR + 40, { amplifier: 4, showParticles: false });
            isinla(p, k.x, 291, k.z);
            capa[i] = { x: k.x, y: 291, z: k.z };
          } catch (e) { __T("HILE kurulum atti: " + e); }
        }
        return;
      }
      if (r < 40) return;                       // af pencereleri kapansin
      const d = r - 40;
      for (let i = 0; i < oy.length; i++) {
        const p = oy[i]; if (!gec(p)) continue;
        const k = yer(i), es = oy[i % 2 === 0 ? i + 1 : i - 1];
        try {
          switch (rol[i]) {
            case "hiz": {                        // 20 blok/sn, yerde
              const s = d % 40; const z = k.z + (s < 20 ? s : 40 - s) * 1.0;
              if (d < 220) isinla(p, k.x, 291, z);
              break;
            }
            case "hiz_efekt": {                  // Hiz I iksiri + 20 blok/sn (iksirin aciklayamayacagi hiz)
              if (d === 0) p.addEffect("speed", TUR, { amplifier: 0, showParticles: false });
              const s = d % 40; const z = k.z + (s < 20 ? s : 40 - s) * 1.0;
              if (d > 2 && d < 220) isinla(p, k.x, 291, z);
              break;
            }
            case "isinlanma":                    // 20 blokluk sicrama
              if (d < 220 && d % 15 === 0) isinla(p, k.x, 291, (Math.floor(d / 15) % 2) ? k.z + 20 : k.z);
              break;
            case "menzil":                       // 7 bloktan vurus
              if (d === 0) { isinla(p, k.x, 291, k.z); isinla(es, k.x, 291, k.z + 7); }
              if (d > 10 && d < 220 && d % 10 === 0 && gec(es)) { p.lookAtEntity(es); p.attackEntity(es); }
              break;
            case "bakmadan":                     // hedefe arkasi donuk vurus
              if (d === 0) { isinla(p, k.x, 291, k.z); isinla(es, k.x, 291, k.z + 2); }
              if (d > 10 && d < 220 && d % 10 === 0 && gec(es)) { p.setRotation({ x: 0, y: 180 }); p.attackEntity(es); }
              break;
            case "cps":                          // saniyede 20 vurus
              if (d === 0) { isinla(p, k.x, 291, k.z); isinla(es, k.x, 291, k.z + 2); }
              if (d > 10 && d < 220 && gec(es)) { p.lookAtEntity(es); p.attackEntity(es); }
              break;
            case "aynitick":                     // tek tickte uc vurus
              if (d === 0) { isinla(p, k.x, 291, k.z); isinla(es, k.x, 291, k.z + 2); }
              if (d > 10 && d < 220 && d % 20 === 0 && gec(es)) {
                p.lookAtEntity(es); p.attackEntity(es); p.attackEntity(es); p.attackEntity(es);
              }
              break;
            case "kip":                          // yaratici kipe gec
              if (d === 10) p.setGameMode(__Kip.Creative);
              if (d === 80) __T("HILE-SONUC kip sonra=" + kipi(p));
              break;
            case "kati":                         // kati blogun icinde dur
              if (d === 0) boyut.runCommand("fill " + Math.floor(k.x) + " 291 " + Math.floor(k.z + 6) + " " + Math.floor(k.x) + " 292 " + Math.floor(k.z + 6) + " stone");
              /* Blogun ICINDE yavasca kayiyor: olcum "kimildadi mi" diye
                 soruyor ve ornekler 10 tickte bir -- iki ornek arasinda
                 ayni yere donen bir salinim hareketsiz gorunur.        */
              if (d > 5 && d < 220) isinla(p, k.x + ((d % 14) / 14 - 0.5) * 0.3, 291, k.z + 6);
              break;
            case "geriitme": {                   // vurulunca itilmiyor, yana kayiyor
              /* Velocity hilesi acik biri kosmaya devam eder: 5 sn'de
                 bir yon degistiren, 1,2 blok/sn'lik yana kayma. Ilk
                 yazilista 1 sn'de bir donen bir salinimdi; donus
                 noktalarinda olcumun "kimildadi" esigi (0,3 blok)
                 tutmuyor ve sonuc rastlantiya kaliyordu.            */
              if (d === 0) { isinla(p, k.x, 291, k.z); isinla(es, k.x + 1.5, 291, k.z + 2.2); }
              if (d > 5 && d < 220) { const s = d % 100; isinla(p, k.x + (s < 50 ? s : 100 - s) * 0.06, 291, k.z); }
              break;
            }
            case "vuran":                        // geriitme rolunun rakibi: gercek vurus
              /* 7 tickte bir: Gozcu geri itmeyi vurustan 6-10 tick sonra,
                 10 tickte bir kosan taramada olcuyor. 10 tickte bir vuran
                 taklit hep ayni evreye dusup ya hep olculuyor ya hic.    */
              if (d > 10 && d < 220 && d % 7 === 0 && gec(es)) { p.lookAtEntity(es); p.attack(); }
              break;
            case "yukselme":                     // kesintisiz yukselme
              /* 12 saniye KESINTISIZ: olcum 6 ornekte bir isaret veriyor,
                 bildirim 4 isaret istiyor.                            */
              if (d < 250) isinla(p, k.x, 291 + d * 0.055, k.z);
              if (d === 150) __T("HILE-DURUM yukselme dusuyor=" + p.isFalling + " ucuyor=" + p.isFlying + " yerde=" + p.isOnGround);
              break;
            case "asili":                        // YOKLAMA: havada sabit yukseklikte yuru
              if (d < 200) isinla(p, k.x + (d % 40 < 20 ? d % 40 : 40 - d % 40) * 0.15, 294.5, k.z);
              if (d === 150) __T("HILE-DURUM asili dusuyor=" + p.isFalling + " ucuyor=" + p.isFlying + " yerde=" + p.isOnGround);
              break;
            case "kafes": {                      // bloklarla hapsedilme -> Kafes Kir
              const bx = Math.floor(k.x), bz = Math.floor(k.z);
              if (d === 0) boyut.runCommand("fill " + (bx - 1) + " 290 " + (bz - 1) + " " + (bx + 1) + " 293 " + (bz + 1) + " obsidian hollow");
              if (d === 20) __T("HILE-SONUC kafes once=" + blokTip(bx + 1, 291, bz));
              if (d === 30) sor(p, "scriptevent s:k kafes");
              if (d === 120) __T("HILE-SONUC kafes sonra=" + blokTip(bx + 1, 291, bz) + " ust=" + blokTip(bx, 293, bz));
              break;
            }
            case "komut":                        // komut saldirisi -> Arinma / Savunma Kipi / Yedek
              if (d === 0) {
                sor(p, "inputpermission set @s movement disabled");
                sor(p, "inputpermission set @s camera disabled");
                sor(p, "effect @s blindness 600 1 true");
                sor(p, "effect @s slowness 600 5 true");
                sor(p, 'replaceitem entity @s slot.armor.head 0 carved_pumpkin 1 0 {"item_lock":{"mode":"lock_in_slot"}}');
                sor(p, 'fog @s push minecraft:fog_hell "13"');
                sor(p, "title @s title kapali");
              }
              if (d === 10) __T("HILE-SONUC komut once hareket=" + girdiAcik(p, __Girdi.Movement) + " kamera=" + girdiAcik(p, __Girdi.Camera) +
                                " korluk=" + !!p.getEffect("blindness") + " yavaslik=" + !!p.getEffect("slowness") + " bas=" + bastaki(p));
              if (d === 12) sor(p, "scriptevent s:k arin");
              if (d === 40) __T("HILE-SONUC komut arin hareket=" + girdiAcik(p, __Girdi.Movement) + " kamera=" + girdiAcik(p, __Girdi.Camera) +
                                " korluk=" + !!p.getEffect("blindness") + " yavaslik=" + !!p.getEffect("slowness") + " bas=" + bastaki(p));
              /* Dongu halinde kilit: Savunma Kipi kendiliginden acmali. */
              /* Savunma Kipi acilirken envanteri KENDISI yedekliyor
                 (YEDEK_OTOMATIK) ve elle yedek 5 dk bekliyor. Elmaslar
                 o yedege girsin diye ONCE veriliyor.                  */
              if (d === 45) { p.giveItem(new __Esya("minecraft:diamond", 5), false); }
              if (d === 50) sor(p, "scriptevent s:k savunma");
              if (d === 70) { sor(p, "inputpermission set @s movement disabled"); sor(p, "effect @s blindness 600 1 true"); }
              if (d === 72) __T("HILE-SONUC komut dongu once hareket=" + girdiAcik(p, __Girdi.Movement) + " korluk=" + !!p.getEffect("blindness"));
              if (d === 150) __T("HILE-SONUC komut dongu sonra hareket=" + girdiAcik(p, __Girdi.Movement) + " korluk=" + !!p.getEffect("blindness"));
              if (d === 152) sor(p, "scriptevent s:k savunma");
              /* /clear -> Envanter Yedegi */
              if (d === 175) { __T("HILE-SONUC komut yedek once elmas=" + elmas(p)); sor(p, "clear @s"); }
              if (d === 180) { __T("HILE-SONUC komut yedek silindi elmas=" + elmas(p)); sor(p, "scriptevent s:k yukle"); }
              if (d === 200) __T("HILE-SONUC komut yedek sonra elmas=" + elmas(p));
              break;
            default: break;                      // kurban: yerinde durur
          }
        } catch (e) { __T("HILE adim atti (" + rol[i] + "," + d + "): " + e); }
      }
    };

    const id = system.runInterval(() => {
      tick++;
      if (tick % 40 === 0) bakim();
      if (asama === "durust") { durustAdim(); return; }
      if (asama === "hile") { hileAdim(); return; }
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
