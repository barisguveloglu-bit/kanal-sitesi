import { system } from "@minecraft/server";
import {
  hataYaz, gecerliMi, olayaAbone, sohbeteYaz
} from "../yardimcilar.js";
import {
  GOZCU_ACIK, GOZCU_MENZIL, GOZCU_ACI, GOZCU_HIZ,
  GOZCU_PENCERE, GOZCU_ESIK, GOZCU_SUS, GOZCU_YALNIZ_OYUNCU,
  KILIT_ATLA_TIPLER,
  HAREKET_ACIK, HAREKET_ORNEK, HAREKET_HIZ, HAREKET_SICRAMA,
  HAREKET_YUKSELME, HAREKET_YUKSEK_PAY
} from "../ayarlar.js";

/* GOZCU -- vurus denetimi (menzil + killaura).

   Kullanicinin gonderdigi uc APK'nin kendi ayar listesinden
   cikan tehdit modeline gore yazildi
   (REFERANS_SAVUNMA_PLANI.md). Bu dosya iki aileyi
   denetliyor: DOVUS ailesinden reach ve killaura.

   ---- NEYI DENETLEMIYOR, BILEREK ----
   GORUNTU ailesi (xray, ESP, tracer, minimap, freecam) bu
   dosyada YOK ve olamaz: o ozellikler sunucuya hicbir sey
   gondermiyor, tamamen karsi tarafin ekraninda. Bir davranis
   paketi onlari ne gorur ne engeller. Buraya "xray denetimi"
   eklemek sahte guven uretmek olurdu.

   ---- CEVAP NEDEN SADECE BILDIRIM ----
   Yanlis alarmin bedeli, kacan hilenin bedelinden buyuk: bu
   sistem kendi oyuncusunu suclarsa modun kendisine guven
   kalmaz. O yuzden vurma/atma/oldurme YOK. Isaretler
   sayiliyor, esigi asinca bir kez bildiriliyor, karar
   kullanicinin.                                              */

/* oyuncuId -> { isaretler: [tick], sonBildirim: tick } */
const defter = new Map();

export function gozcuUnut(oyuncuId) {
  if (oyuncuId === undefined) defter.clear();
  else defter.delete(oyuncuId);
}

/* Sinamak icin disari aciliyor: son durumu okumak. */
export function gozcuDurum(oyuncuId) {
  const d = defter.get(oyuncuId);
  return d ? { isaret: d.isaretler.length, sonBildirim: d.sonBildirim } : undefined;
}

function uzaklik(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/* Vurus anindaki uc olcum. Sebep listesi donuyor -- bos ise
   vurus temiz.                                               */
export function vurusuOlc(vuran, kurban, simdi, gecmis) {
  const sebep = [];

  let goz, yon, hedef;
  try {
    goz = typeof vuran.getHeadLocation === "function"
      ? vuran.getHeadLocation() : vuran.location;
    yon = typeof vuran.getViewDirection === "function"
      ? vuran.getViewDirection() : undefined;
    hedef = kurban.location;
  } catch (e) {
    hataYaz("gozcu.konum", e);
    return sebep;               // okuyamiyorsak suclamiyoruz
  }
  if (!goz || !hedef) return sebep;

  /* 1. MENZIL */
  const d = uzaklik(goz, hedef);
  if (d > GOZCU_MENZIL) {
    sebep.push("menzil " + d.toFixed(1) + " blok");
  }

  /* 2. BAKIS ACISI -- killaura'nin asil izi.
     Hedefe BAKMADAN vuruyor; insan vuramaz.                 */
  if (yon) {
    const vx = hedef.x - goz.x, vy = hedef.y - goz.y, vz = hedef.z - goz.z;
    const boy = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (boy > 0.001) {
      const kosinus = (yon.x * vx + yon.y * vy + yon.z * vz) / boy;
      if (kosinus < GOZCU_ACI) {
        const derece = Math.acos(Math.max(-1, Math.min(1, kosinus))) * 180 / Math.PI;
        sebep.push("bakmadan vurus " + derece.toFixed(0) + "°");
      }
    }
  }

  /* 3. VURUS HIZI -- son saniyedeki vurus sayisi. */
  const birSaniye = gecmis.filter((t) => simdi - t < 20).length;
  if (birSaniye > GOZCU_HIZ) {
    sebep.push("saniyede " + birSaniye + " vurus");
  }

  return sebep;
}

function isaretle(vuran, kurban, sebep) {
  const simdi = system.currentTick;
  let d = defter.get(vuran.id);
  if (!d) { d = { isaretler: [], sonBildirim: -99999, vurus: [] }; defter.set(vuran.id, d); }

  d.isaretler.push(simdi);
  /* Pencere disinda kalanlar dusuyor: tek bir gecikme
     sicramasi saatler sonra birikip suclama uretmesin.      */
  d.isaretler = d.isaretler.filter((t) => simdi - t < GOZCU_PENCERE);

  if (d.isaretler.length < GOZCU_ESIK) return;
  if (simdi - d.sonBildirim < GOZCU_SUS) return;
  d.sonBildirim = simdi;

  let ad = "?";
  try { ad = vuran.name || vuran.typeId || "?"; } catch (e) { /* onemsiz */ }
  sohbeteYaz("§c⚠ Gözcü: §f" + ad + " §7· " + d.isaretler.length +
             " işaret §8· son sebep: " + sebep.join(", "));
}

export function gozcuKur() {
  if (!GOZCU_ACIK) return false;
  return olayaAbone("entityHitEntity", (olay) => {
    try {
      const vuran = olay.damagingEntity;
      const kurban = olay.hitEntity;
      if (!vuran || !kurban) return;
      if (!gecerliMi(vuran) || !gecerliMi(kurban)) return;
      /* Yalniz OYUNCU vuruslari denetleniyor. Kendi botlarimiz
         bu satirda eleniyor: onlarin typeId'si "pa:bot" gibi,
         "minecraft:player" degil.

         Burada bir zamanlar ayrica
             if (KILIT_ATLA_TIPLER.has(vuran.typeId)) return;
         yaziliydi. Mutasyon testi onu OLU KOD olarak gosterdi:
         ustteki satiri gecen her sey zaten oyuncu, yani o
         kume denetimine hicbir zaman ulasilmiyordu. Silindi.
         (Kurban tarafindaki ayni denetim ELENMEDI -- orada
         gercekten ise yariyor, asagiya bak.)                */
      if (vuran.typeId !== "minecraft:player") return;
      if (GOZCU_YALNIZ_OYUNCU && kurban.typeId !== "minecraft:player" &&
          KILIT_ATLA_TIPLER.has(kurban.typeId)) return;

      const simdi = system.currentTick;
      let d = defter.get(vuran.id);
      if (!d) { d = { isaretler: [], sonBildirim: -99999, vurus: [] }; defter.set(vuran.id, d); }
      const gecmis = d.vurus;

      const sebep = vurusuOlc(vuran, kurban, simdi, gecmis);

      /* Vurus gecmisi HER vuruşta buyuyor, sebepli sebepsiz --
         hiz olcumu zaten temiz vuruslari da saymak zorunda. */
      gecmis.push(simdi);
      d.vurus = gecmis.filter((t) => simdi - t < 40);

      if (sebep.length > 0) isaretle(vuran, kurban, sebep);
    } catch (e) {
      hataYaz("gozcu.vurus", e);
    }
  });
}


/* ============================================================
   HAREKET DENETIMI  --  ucma / hiz / isinlanma

   ---- EN SONA BIRAKILDI, SEBEBI VAR ----
   Bu modda konum sicratan KENDI yeteneklerimiz var: Ucurma,
   Isinlanma, Atilim, Kasirga, Meteor, ucus katmani. Bunlari
   tanimayan bir denetim savunmayi kendi oyuncusuna cevirir.

   ---- MUAFIYET YETENEK LISTESI DEGIL ----
   Muafiyet "su su yetenekler haric" diye yazilmadi; oyle bir
   liste eskir ve yeni yetenek eklendiginde kimse guncellemeyi
   hatirlamaz. Tek soru soruluyor: bu oyuncunun MERKEZI IS
   LISTESINDE calisan isi var mi? Varsa denetlenmiyor. Yeni
   yetenek geldiginde muafiyet kendiliginden gecerli.

   Bu yuzden main.js taramayi cagirirken "isi var mi" sorusunu
   cevaplayan bir fonksiyon veriyor (isVarMi).
   ============================================================ */

// oyuncuId -> { konum, tick, yukselme }
const izler = new Map();

export function hareketUnut(oyuncuId) {
  if (oyuncuId === undefined) izler.clear();
  else izler.delete(oyuncuId);
}

export function hareketDurum(oyuncuId) { return izler.get(oyuncuId); }

/* Denetimden MUAF olma sebepleri. Bos donerse denetlenebilir. */
export function hareketMuaf(oyuncu, isVarMi) {
  try {
    if (typeof isVarMi === "function" && isVarMi(oyuncu.id)) return "kendi isi";
    if (oyuncu.isGliding) return "suzuluyor";
    if (oyuncu.isFlying) return "ucus kipi";
    if (oyuncu.isInWater) return "suda";
    if (oyuncu.isClimbing) return "tirmaniyor";
    if (oyuncu.isFalling) return "dusuyor";
    if (typeof oyuncu.getEffect === "function") {
      for (const ad of ["levitation", "speed", "slow_falling", "jump_boost"]) {
        if (oyuncu.getEffect(ad)) return ad;
      }
    }
    /* Bir seye biniyorsa hizi bizim degil, bindigi seyin. */
    if (typeof oyuncu.getComponent === "function" &&
        oyuncu.getComponent("minecraft:riding")) return "biniyor";
  } catch (e) {
    hataYaz("gozcu.muaf", e);
    return "okunamadi";      // suphede kalirsa SUCLAMIYORUZ
  }
  return undefined;
}

/* main.js her HAREKET_ORNEK tickte cagiriyor. */
export function hareketTara(oyuncular, isVarMi) {
  if (!GOZCU_ACIK || !HAREKET_ACIK) return;
  const simdi = system.currentTick;
  for (const o of oyuncular) {
    try {
      if (!gecerliMi(o)) continue;
      const k = o.location;
      if (!k) continue;
      const onceki = izler.get(o.id);
      izler.set(o.id, { konum: { x: k.x, y: k.y, z: k.z }, tick: simdi,
                        yukselme: onceki ? onceki.yukselme : 0 });
      if (!onceki) continue;

      const gecen = simdi - onceki.tick;
      if (gecen <= 0) continue;

      /* MUAFIYET once bakiliyor: olcumu bile yapmaya gerek yok
         ve iz yine de guncellendi (yukarida), yani muafiyet
         bitince olcum dogru yerden devam ediyor.             */
      const muaf = hareketMuaf(o, isVarMi);
      const iz = izler.get(o.id);
      if (muaf) { iz.yukselme = 0; continue; }

      const dx = k.x - onceki.konum.x;
      const dy = k.y - onceki.konum.y;
      const dz = k.z - onceki.konum.z;
      const yatay = Math.sqrt(dx * dx + dz * dz);
      const toplam = Math.sqrt(dx * dx + dy * dy + dz * dz);

      /* Uc olcum de yapiliyor ve sebepler BIRLIKTE bildiriliyor.
         Ilk yazilista isinlanma bulununca "continue" ediliyordu;
         o zaman gercek bir hiz hilesi (30 blok/sn) siçrama
         esigini de astigi icin "isinlanma" diye etiketleniyordu.
         Yanlis etiket, yanlis teshis demek -- olcum dogru olsa
         bile. Test bunu gosterdi.                              */
      const sebep = [];

      /* 1. ISINLANMA -- tek ornekte kocaman siçrama. */
      if (toplam > HAREKET_SICRAMA) {
        sebep.push("ışınlanma " + toplam.toFixed(0) + " blok");
      }

      /* 2. YATAY HIZ */
      const hizSn = yatay / (gecen / 20);
      if (hizSn > HAREKET_HIZ) {
        sebep.push("hız " + hizSn.toFixed(1) + " blok/sn");
      }

      /* 3. SUREKLI YUKSELME -- ucmanin izi. Tek ziplama
         yukselir ve biter; ucma ust uste yukselir.          */
      if (dy > HAREKET_YUKSEK_PAY) iz.yukselme = (iz.yukselme || 0) + 1;
      else iz.yukselme = 0;
      if (iz.yukselme >= HAREKET_YUKSELME) {
        sebep.push("kesintisiz yükselme " + iz.yukselme + " örnek");
        iz.yukselme = 0;
      }

      if (sebep.length > 0) isaretle(o, o, sebep);
    } catch (e) {
      hataYaz("gozcu.hareket", e);
    }
  }
}
