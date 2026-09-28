import { system, world } from "@minecraft/server";
import {
  hataYaz, bilgiYaz, olayaAbone, gecerliMi, itmeUygula
} from "../yardimcilar.js";
import {
  WOM_KILIC_ACIK, WOM_KILIC_SERI_UNUTMA, WOM_KILIC_MENZIL, WOM_KILIC_KONI,
  WOM_KILIC_ITME_CARPAN, WOM_KILIC_ITME_ESIK, WOM_KILIC_DURDUR,
  WOM_KILIC_BITIS_GECIS, WOM_KILIC_DENETLEYICI, WOM_KILIC_KUYRUK_HIZ,
  WOM_KILIC_TICK_ARAMA
} from "../ayarlar.js";
import {
  WOM_KILIC_ESYA, WOM_KILIC_SETLER, WOM_BOS_ANIM, WOM_BOS_EL
} from "./_wom_hareket.js";

/* ================================================================
   WoM KILIC VURUSLARI                                        v7.99

   Sol tik (havaya da) -> setin SIRADAKI vurusu. Veri Epic Fight'in
   kendi sabitlerinden (arac/wom_cevir.py):
     sure      animasyonun boyu (oyun zamani, saniye)
     birakma   Epic Fight "recovery": bundan sonra yeni vurus
               baslayabilir; once gelen tik KUYRUGA alinir
     fazlar    [antic, contact] hasar penceresi + DAMAGE_MODIFIER
     iz        tick basina oyuncunun kaymasi [sag, on, yukari] blok

   BOS EL (v7.99.2): Epic Fight'in yumruk seti. Salinimla DEGIL,
   bir canliya VURUNCA basliyor (entityHitEntity): bos elle blok
   kirarken de kol sallaniyor, her tik yumruk serisi olsaydi kazarken
   karakter surekli yumruk atardi. Kayit anahtari WOM_BOS_EL.

   Hangi vurus:
     havadaysan        setin hava vurusu
     kosuyorsan (ilk)  setin kosu vurusu
     yoksa             oto serisi, sirayla; WOM_KILIC_SERI_UNUTMA
                       tick bekleyince basa doner

   ---- NEDEN is LISTESINE GIRMIYOR ----
   Yetenek degil, silahin kendi hareketi: tavan (AYNI_ANDA) ve
   bekleme ona uygulanmamali. Ana dongu her tick womKilicTick'i
   cagiriyor; aktif vurusu olmayan oyuncu icin is yok.

   ---- GOZCU ----
   Hamle oyuncuyu hizla tasiyor. main.js hareket denetimine
   womHareketteMi'yi de soruyor: hamle suresince muaf.
   ================================================================ */

/* oyuncuId -> {
     set, sira, sonBitis,                   seri durumu
     aktif: { s, bas, yon, vurulan[], son }  suren vurus
     kuyruk                                  birakmadan once gelen tik
   } */
const durum = new Map();
const TICK = 0.05;

export function womKilicUnut(oyuncuId) {
  if (oyuncuId === undefined) durum.clear();
  else durum.delete(oyuncuId);
}

export function womKilicDurum(oyuncuId) { return durum.get(oyuncuId); }

/* Hamle suruyor mu: aktif vurusun izi daha bitmedi. */
export function womHareketteMi(oyuncuId) {
  const d = durum.get(oyuncuId);
  if (!d || !d.aktif) return false;
  const t = system.currentTick - d.aktif.bas;
  return t <= d.aktif.s.iz.length + 10;
}

/* Elde tutulan esyanin kilic kaydi, yoksa undefined. */
export function kilicKaydi(typeId) {
  return typeId ? WOM_KILIC_ESYA[typeId] : undefined;
}

function yatayYon(oyuncu) {
  try {
    const v = oyuncu.getViewDirection();
    const n = Math.hypot(v.x, v.z);
    if (n > 1e-6) return { x: v.x / n, z: v.z / n };
  } catch (e) { /* yon yok */ }
  return { x: 0, z: 1 };
}

/* Setten hangi vurus. `seri` = oto serisinin sirasi (disaridan
   okunabilsin diye saf). */
export function vurusSec(set, d, havada, kosuyor, simdi) {
  const s = WOM_KILIC_SETLER[set];
  if (!s) return undefined;
  const otolar = s.saldirilar.filter((x) => x.tur === "oto");
  const taze = !(d && d.set === set && d.sonBitis !== undefined &&
                 simdi - d.sonBitis <= WOM_KILIC_SERI_UNUTMA);
  if (havada) {
    const h = s.saldirilar.find((x) => x.tur === "hava");
    if (h) return { vurus: h, sira: taze ? 0 : d.sira };
  }
  if (kosuyor && taze) {
    const k = s.saldirilar.find((x) => x.tur === "kosu");
    if (k) return { vurus: k, sira: 0 };
  }
  const sira = taze ? 0 : d.sira % otolar.length;
  return { vurus: otolar[sira], sira: (sira + 1) % otolar.length };
}

function oynat(oyuncu, ad) {
  try {
    oyuncu.playAnimation(ad, {
      blendOutTime: WOM_KILIC_BITIS_GECIS,
      stopExpression: WOM_KILIC_DURDUR,
      controller: WOM_KILIC_DENETLEYICI
    });
    return true;
  } catch (e) {
    hataYaz("wom_kilic.oynat", e);
    return false;
  }
}

/* Tik geldi. Donus: baslayan vurusun adi, kuyruga alindiysa
   "kuyruk", hic bir sey olmadiysa undefined. */
export function womKilicSalla(oyuncu, esyaTipi, simdi = system.currentTick) {
  if (!WOM_KILIC_ACIK) return undefined;
  const kayit = kilicKaydi(esyaTipi);
  if (!kayit) return undefined;
  let d = durum.get(oyuncu.id);
  if (!d) {
    d = { set: kayit.set, sira: 0, sonBitis: undefined, aktif: null, kuyruk: false };
    durum.set(oyuncu.id, d);
  }
  if (d.aktif && d.set === kayit.set) {
    const gecen = (simdi - d.aktif.bas) * TICK;
    if (gecen < d.aktif.s.birakma) {
      d.kuyruk = true;
      return "kuyruk";
    }
    /* Birakmadan sonra: seri devam ediyor, suren vurus kesiliyor. */
    d.sonBitis = simdi;
  }
  const secim = vurusSec(kayit.set, d, !oyuncu.isOnGround, !!oyuncu.isSprinting, simdi);
  if (!secim) return undefined;
  if (d.set !== kayit.set) d.sonBitis = undefined;
  d.set = kayit.set;
  d.sira = secim.sira;
  d.kuyruk = false;
  d.aktif = {
    s: secim.vurus, bas: simdi, yon: yatayYon(oyuncu), hasar: kayit.hasar,
    vurulan: secim.vurus.fazlar.map(() => new Set()), kesildi: false
  };
  oynat(oyuncu, secim.vurus.anim);
  return secim.vurus.ad;
}

/* ---- tick ---- */

function hamle(oyuncu, a, t) {
  const iz = a.s.iz;
  if (t + 1 >= iz.length) return;
  const sag = iz[t + 1][0] - iz[t][0];
  const on = iz[t + 1][1] - iz[t][1];
  const yuk = iz[t + 1][2] - iz[t][2];
  /* Sag = on x yukari: yon (x, z) icin (-z, x). */
  const dx = on * a.yon.x - sag * a.yon.z;
  const dz = on * a.yon.z + sag * a.yon.x;
  const boy = Math.hypot(dx, dz);
  if (boy < WOM_KILIC_ITME_ESIK && !(a.s.dikey && yuk > WOM_KILIC_ITME_ESIK)) return;
  let dikey;
  if (a.s.dikey && yuk > 0) {
    dikey = yuk * WOM_KILIC_ITME_CARPAN;
  } else {
    /* Dikey hizi ELLEME: yercekimi surmeli. */
    try { dikey = oyuncu.getVelocity().y; } catch (e) { dikey = 0; }
  }
  itmeUygula(oyuncu, dx, dz, boy * WOM_KILIC_ITME_CARPAN, dikey);
}

/* Koni icindeki canlilar. Saf: test ayni fonksiyonu olcuyor. */
export function koniIcinde(merkez, yon, hedef, menzil = WOM_KILIC_MENZIL,
                           yarimAci = WOM_KILIC_KONI) {
  const dx = hedef.x - merkez.x, dy = hedef.y - merkez.y, dz = hedef.z - merkez.z;
  const uz = Math.hypot(dx, dy, dz);
  if (uz > menzil) return false;
  const yat = Math.hypot(dx, dz);
  if (yat < 0.5) return true;                 // dibinde: her yon
  const cos = (dx * yon.x + dz * yon.z) / yat;
  return cos >= Math.cos(yarimAci * Math.PI / 180);
}

/* ---- ARAMA TAVANI (v7.99.3) ----
   Dis inceleme: butce.js blok/varlik DOGURMA/patlamayi sinirliyor,
   varlik ARAMASINI sinirlamiyor. Hasar penceresindeki her vurus her
   tick bir getEntities yapiyordu; kalabalik bir kavgada sinirsizdi.
   Tick basina WOM_KILIC_TICK_ARAMA arama; hakki kalmayan vurus
   aramayi BIR SONRAKI tick'e birakiyor. Pencerenin son tick'i
   tavandan muaf: vurus kaybolmuyor, en fazla gecikiyor.         */
let aramaTick = -1, aramaSay = 0;
export function aramaHakki(simdi) {
  if (simdi !== aramaTick) { aramaTick = simdi; aramaSay = 0; }
  if (aramaSay >= WOM_KILIC_TICK_ARAMA) return false;
  aramaSay++;
  return true;
}

function vur(oyuncu, a, faz, i) {
  let pvp = true;
  try { pvp = world.gameRules.pvp !== false; } catch (e) { /* kural yok */ }
  let adaylar;
  try {
    adaylar = oyuncu.dimension.getEntities({
      location: oyuncu.location, maxDistance: WOM_KILIC_MENZIL + 1,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    return;
  }
  const miktar = a.hasar * faz.hasar;
  for (const h of adaylar) {
    if (h.id === oyuncu.id || a.vurulan[i].has(h.id) || !gecerliMi(h)) continue;
    if (h.typeId === "minecraft:player" && !pvp) continue;
    let can;
    try { can = h.getComponent("minecraft:health"); } catch (e) { can = undefined; }
    if (!can) continue;
    if (!koniIcinde(oyuncu.location, a.yon, h.location)) continue;
    a.vurulan[i].add(h.id);
    try {
      h.applyDamage(miktar, { cause: "entityAttack", damagingEntity: oyuncu });
    } catch (e) {
      hataYaz("wom_kilic.vur", e);
    }
  }
}

function bitir(oyuncu, d, simdi, kes) {
  d.aktif = null;
  d.sonBitis = simdi;
  if (kes) oynat(oyuncu, WOM_BOS_ANIM);
}

/* Ana dongu her tick cagiriyor. Donus: aktif vurus sayisi. */
export function womKilicTick(simdi = system.currentTick) {
  if (!WOM_KILIC_ACIK || durum.size === 0) return 0;
  let sayi = 0;
  for (const [id, d] of durum) {
    if (!d.aktif) continue;
    let oyuncu;
    try { oyuncu = world.getEntity(id); } catch (e) { oyuncu = undefined; }
    if (!oyuncu || !gecerliMi(oyuncu)) { d.aktif = null; continue; }
    const a = d.aktif;
    const t = simdi - a.bas;
    const sn = t * TICK;
    sayi++;
    try {
      hamle(oyuncu, a, t);
      a.s.fazlar.forEach((f, i) => {
        if (sn < f.antic - 1e-6 || sn > f.contact + TICK) return;
        /* Pencerenin SON tick'i tavandan muaf: ertelenen vurus
           pencereyi kacirmasin (kilic ve yumruk pencereleri iki
           tick kadar kisa olabiliyor).                          */
        const son = sn + TICK > f.contact + TICK - 1e-6;
        if (son || aramaHakki(simdi)) vur(oyuncu, a, f, i);
      });
    } catch (e) {
      hataYaz("wom_kilic.tick", e);
    }
    if (sn >= a.s.birakma && d.kuyruk) {
      d.kuyruk = false;
      let tip;
      try {
        const ekip = oyuncu.getComponent("minecraft:equippable");
        const y = ekip && ekip.getEquipment("Mainhand");
        tip = y ? y.typeId : WOM_BOS_EL;
      } catch (e) { tip = undefined; }
      if (kilicKaydi(tip)) { womKilicSalla(oyuncu, tip, simdi); continue; }
    }
    if (sn >= a.s.sure) { bitir(oyuncu, d, simdi, false); continue; }
    /* Kuyruk: birakmadan sonra yuruyorsa kalanini kes. Hamle izi
       bittiyse hiz oyuncunun kendisinden geliyor.              */
    if (sn >= a.s.birakma && t >= a.s.iz.length) {
      let v;
      try { v = oyuncu.getVelocity(); } catch (e) { v = undefined; }
      if (v && Math.hypot(v.x, v.z) > WOM_KILIC_KUYRUK_HIZ) bitir(oyuncu, d, simdi, true);
    }
  }
  return sayi;
}

/* Bos elle bir canliya vuruldu mu: yumruk serisinin siradaki adimi.
   Saf olmasa da disari acik: test olayi dogrudan veriyor.        */
export function womYumrukVurus(olay) {
  const vuran = olay && olay.damagingEntity;
  if (!vuran || vuran.typeId !== "minecraft:player") return undefined;
  let elde;
  try {
    const ekip = vuran.getComponent("minecraft:equippable");
    elde = ekip && typeof ekip.getEquipment === "function"
      ? ekip.getEquipment("Mainhand") : undefined;
  } catch (e) {
    return undefined;       // eli okuyamadik: silahli olabilir, dokunma
  }
  if (elde) return undefined;
  return womKilicSalla(vuran, WOM_BOS_EL);
}

export function womKilicKur() {
  if (!WOM_KILIC_ACIK) return false;
  if (Object.keys(WOM_KILIC_SETLER).length === 0) {
    bilgiYaz("WoM kilic verisi bos: vuruslar kapali (kol_uret.py uretmedi).");
    return false;
  }
  const kuruldu = olayaAbone("playerSwingStart", (olay) => {
    try {
      if (olay.swingSource !== undefined && olay.swingSource !== "Attack") return;
      const tip = olay.heldItemStack ? olay.heldItemStack.typeId : undefined;
      if (!kilicKaydi(tip)) return;
      womKilicSalla(olay.player, tip);
    } catch (e) {
      hataYaz("wom_kilic.salla", e);
    }
  });
  if (!kuruldu) {
    bilgiYaz("playerSwingStart yok (@minecraft/server < 2.5.0): WoM kilic " +
             "vuruslari kapali. Silahlar normal vuruyor.");
  }
  if (kilicKaydi(WOM_BOS_EL)) {
    olayaAbone("entityHitEntity", (olay) => {
      try { womYumrukVurus(olay); } catch (e) { hataYaz("wom_kilic.yumruk", e); }
    });
  }
  return kuruldu;
}
