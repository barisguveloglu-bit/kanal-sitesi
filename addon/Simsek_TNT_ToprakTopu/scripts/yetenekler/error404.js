import { system, world } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, baslikYaz, varlikKonumu
} from "../yardimcilar.js";
import { blokIste } from "../butce.js";
import {
  E404_ACIK, E404_FAZ_KAYIT_ANAHTAR, E404_FAZ_TAVAN, E404_FAZ_ESIK,
  E404_FAZ_SATIRLAR, E404_FAZ_SES,
  E404_BOZULMA_BLOK, E404_BOZULMA_HEDEF, E404_BOZULMA_ORNEK,
  E404_BOZULMA_YAKIN, E404_BOZULMA_UZAK, E404_BOZULMA_TAVAN,
  E404_BOZULMA_SURE, E404_BOZULMA_SES,
  E404_KALDIRMA_YAKIN, E404_KALDIRMA_UZAK, E404_KALDIRMA_EN,
  E404_KALDIRMA_YUKSEK, E404_KALDIRMA_TAVAN, E404_KALDIRMA_SURE,
  E404_SURU_MENZIL, E404_SURU_TAVAN, E404_SURU_SURE, E404_SURU_TIPLER,
  E404_SIRA_BAS, E404_SIKLIK_CARPAN, E404_SIKLIK_VARSAYILAN,
  E404_TELEFON, E404_SIFRE, E404_SIFRE_RET, E404_SIFRE_KABUL,
  E404_BITIS_SATIRLAR, E404_BITIS_SES
} from "../ayarlar.js";

/* ERROR 404 -- IKINCI GECIS                            v7.94

   Modun neyi, neden alindigi/alinmadigi ayarlar.js'teki
   "ERROR 404 -- IKINCI GECIS" bolumunde ve
   REFERANS_ERROR404_EK.md'de olculeriyle yazili.

   ---- DEGISMEZ KURAL, AYNEN DEVAM ----
   HICBIR OLAY OYUNCUYA ZARAR VERMEZ. Ne hasar, ne esya kaybi,
   ne geri alinmayan blok. Kullanicinin sarti: "bu da ayni
   sekilde bana zarar vermesin, onceki korku modlarinda
   ekledigim gibi."

   Bu dosyada:
     - applyDamage / createExplosion / kill YOK
     - envantere dokunulmuyor
     - bozulan her blok DEFTERE yaziliyor ve geri konuyor
     - yukselen zemin hicbir blogu SILMIYOR, yalniz havaya
       blok koyuyor -- en kotu ihtimal havada bir blok kalmasi
     - hayvanlara hasar degil YAVASLIK veriliyor, sureli

   ---- NEDEN AYRI DOSYA ----
   efsane_korku.js zaten 726 satir ve alti olayi tutuyor.
   Faz sistemi, yapilandirma ve sifre zinciri ayri sorular;
   ayni dosyaya yigmak ikisini de okunmaz yapardi.           */

/* ============================================================
   DURUM
   ============================================================ */
/* oyuncuId -> { faz, sayac, satir } */
const fazlar = new Map();
/* Dunya capinda yapilandirma -- kaynakta da dunya capinda. */
const ayar = {
  dogum: true,        // CanSpawn
  blok: true,         // CanChangeBlocks
  zemin: true,        // CanMoveChunks
  siklik: E404_SIKLIK_VARSAYILAN,
  bitti: false        // CodemanDie calisti mi
};

export function e404Unut(oyuncuId) {
  if (oyuncuId === undefined) {
    fazlar.clear();
    bozukDefter.length = 0;
    havaDefter.length = 0;
    ayar.dogum = true; ayar.blok = true; ayar.zemin = true;
    ayar.siklik = E404_SIKLIK_VARSAYILAN; ayar.bitti = false;
    return;
  }
  fazlar.delete(oyuncuId);
}
export function e404Ayar() { return ayar; }
export function e404Faz(oyuncuId) {
  const f = fazlar.get(oyuncuId);
  return f ? f.faz : 0;
}
/* efsane_korku.js bunu okuyor: bitis calistiysa hicbir olay
   olmasin. Tek yonlu -- burasi efsane_korku'dan bir sey
   ithal etmiyor.                                            */
export function e404Duruyor() { return !!(E404_ACIK && ayar.bitti); }
export function e404SiklikCarpani() {
  return E404_SIKLIK_CARPAN[ayar.siklik - 1] || 1;
}

/* ---- KALICILIK ----
   Faz ve yapilandirma KALICI: "ne kadar ilerledim" ve "neyi
   kapattim" dunya kapaninca unutulmamali. Defterler kalici
   DEGIL -- onlar anlik ve zaten her taramada bosaltiliyor.
   (efsane_korku.js'te ayni ayrim ayni gerekceyle yazili.)    */
function kayitOku() {
  try {
    if (typeof world.getDynamicProperty !== "function") return;
    const ham = world.getDynamicProperty(E404_FAZ_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    const k = JSON.parse(ham);
    for (const [id, f] of Object.entries(k.f || {})) {
      const n = Number(f);
      if (n >= 1 && n <= E404_FAZ_TAVAN) fazlar.set(id, { faz: n, sayac: 0, satir: 0 });
    }
    if (k.a) {
      ayar.dogum = k.a.d !== false;
      ayar.blok  = k.a.b !== false;
      ayar.zemin = k.a.z !== false;
      ayar.bitti = !!k.a.t;
      const s = Number(k.a.s);
      if (s >= 1 && s <= E404_SIKLIK_CARPAN.length) ayar.siklik = s;
    }
  } catch (e) { hataYaz("e404.kayitOku", e); }
}
function kayitYaz() {
  try {
    if (typeof world.setDynamicProperty !== "function") return;
    const f = {};
    for (const [id, d] of fazlar) if (d.faz > 0) f[id] = d.faz;
    world.setDynamicProperty(E404_FAZ_KAYIT_ANAHTAR, JSON.stringify({
      f,
      a: { d: ayar.dogum, b: ayar.blok, z: ayar.zemin,
           s: ayar.siklik, t: ayar.bitti }
    }));
  } catch (e) { hataYaz("e404.kayitYaz", e); }
}
kayitOku();
/* Dunya kaydini yeniden okur. Testin kayittan yuklenen fazi
   olcebilmesi icin disa aciliyor; kod icinde de dunya
   degisirse cagrilabilir.                                    */
export function e404Yukle() { kayitOku(); }

function sec(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}
function sohbet(oyuncu, metin) {
  try {
    if (typeof oyuncu.sendMessage === "function") oyuncu.sendMessage(metin);
  } catch (e) { /* mesaj onemli degil */ }
}
function ses(oyuncu, ad) {
  try {
    const b = oyuncu.dimension;
    if (b && typeof b.playSound === "function") b.playSound(ad, oyuncu.location);
  } catch (e) { /* ses onemsiz */ }
}

/* ============================================================
   1. FAZ SISTEMI                (RandomStageGiverProcedure)
   ============================================================
   Kaynakta faz `STAGE` niteliginde tutuluyor ve rastgele
   yukseliyor. Bizde DURAKTA GECIRILEN SURE yukseltiyor:
   rastgelelik "hicbir sey yapmadan faz atlamak" demek olurdu
   ve oyuncu neden ilerledigini anlayamazdi.                  */
export function fazIlerlet(oyuncu, duraktaMi) {
  if (!E404_ACIK || ayar.bitti) return 0;
  let d = fazlar.get(oyuncu.id);
  if (!d) { d = { faz: 0, sayac: 0, satir: 0 }; fazlar.set(oyuncu.id, d); }
  if (!duraktaMi) return d.faz;

  d.sayac++;
  /* Esikleri gecen EN YUKSEK faz. Ilk yazilista burada bir de
     `Math.max(yeni, ...)` vardi; mutasyon onu kaldirdi ve
     HICBIR test dusmedi -- cunku gercekten olu bir korumaydi:
     `yeni` zaten `d.faz` ile basliyor ve asagidaki
     `yeni > d.faz` kapisi fazin dusmesini ayrica engelliyor.
     Olu koruma okuyana "burada bir sey koruniyor" diye yalan
     soyler; kaldirildi, korumayi yapan gercek kapi asagida ve
     testi de ona bakiyor (kayittan yuklenen faz dusmuyor).  */
  let yeni = d.faz;
  for (let i = 0; i < E404_FAZ_ESIK.length; i++) {
    if (d.sayac >= E404_FAZ_ESIK[i]) yeni = i + 1;
  }
  if (yeni > d.faz) {
    d.faz = yeni;
    try {
      baslikYaz(oyuncu, "§8§lERROR §4404", "§7faz " + d.faz);
      ses(oyuncu, E404_FAZ_SES);
    } catch (e) { /* gorsel onemsiz */ }
    kayitYaz();
  }
  return d.faz;
}

/* Faz satiri: o fazin kendi cumlelerinden biri. */
export function fazSatiri(oyuncu) {
  if (!E404_ACIK || ayar.bitti) return false;
  const f = fazlar.get(oyuncu.id);
  if (!f || f.faz < 1) return false;
  const liste = E404_FAZ_SATIRLAR.get(f.faz);
  if (!liste || liste.length === 0) return false;
  sohbet(oyuncu, sec(liste));
  return true;
}

/* ============================================================
   2. BOZULAN BLOK               (ReplaceBlocksCodeProcedure)
   ============================================================
   Mesale defterinin BIREBIR ayni disiplini: defter once,
   zamanlayici sonra; geri koyarken "yerinde hala bizimki mi"
   diye bakiliyor.                                            */
const bozukDefter = [];
export function bozukDefterBoyu() { return bozukDefter.length; }

function bozukGeriKoy(kayit) {
  try {
    const b = kayit.boyut.getBlock(kayit.yer);
    if (!b) return false;
    /* Oyuncu araya girip kirdiysa ya da baska bir sey
       koyduysa DOKUNMUYORUZ -- onunki kalir.                 */
    if (b.typeId !== E404_BOZULMA_BLOK) return true;
    b.setType(kayit.tur);
    return true;
  } catch (e) {
    return false;     // chunk yuklu degil: defterde kalsin
  }
}
export function bozuklariTazele(simdi) {
  for (let i = bozukDefter.length - 1; i >= 0; i--) {
    const k = bozukDefter[i];
    if (simdi < k.tik) continue;
    if (bozukGeriKoy(k)) bozukDefter.splice(i, 1);
  }
}

export function bozulanBlok(oyuncu, boyut, konum, simdi) {
  if (!E404_ACIK || !ayar.blok || ayar.bitti) return false;
  let n = 0;
  for (let i = 0; i < E404_BOZULMA_ORNEK; i++) {
    if (n >= E404_BOZULMA_TAVAN) break;
    const aci = Math.random() * Math.PI * 2;
    const uz = E404_BOZULMA_YAKIN +
               Math.random() * (E404_BOZULMA_UZAK - E404_BOZULMA_YAKIN);
    const yer = {
      x: Math.floor(konum.x + Math.cos(aci) * uz),
      y: Math.floor(konum.y + (Math.random() * 6 - 3)),
      z: Math.floor(konum.z + Math.sin(aci) * uz)
    };
    let blok;
    try { blok = boyut.getBlock(yer); } catch (e) { continue; }
    if (!blok || E404_BOZULMA_HEDEF.indexOf(blok.typeId) < 0) continue;
    if (blokIste(1) === 0) break;
    const tur = blok.typeId;
    try { blok.setType(E404_BOZULMA_BLOK); } catch (e) { continue; }
    n++;
    const kayit = { boyut, yer, tur, tik: simdi + E404_BOZULMA_SURE };
    bozukDefter.push(kayit);
    system.runTimeout(() => {
      const j = bozukDefter.indexOf(kayit);
      if (j < 0) return;
      if (bozukGeriKoy(kayit)) bozukDefter.splice(j, 1);
    }, E404_BOZULMA_SURE);
  }
  if (n > 0) ses(oyuncu, E404_BOZULMA_SES);
  return n > 0;
}

/* ============================================================
   3. YUKSELEN ZEMIN             (LiftChunksProcedure, tersine)
   ============================================================
   Kaynak zemini yukari itiyor -- yani zeminden blok EKSILIYOR.
   Burada hicbir blok silinmiyor: zeminin bir parcasi havada
   YANKILANIYOR ve sonra siliniyor.

   Neden tersine: "her kalici etkinin cikisi olacak" kurali bu
   depoda en sert kural ve zemini silip geri koyma sozu chunk
   bosalirsa tutulamaz. Havaya blok koymak ise en kotu ihtimalde
   havada bir blok birakir -- oyuncunun evinden bir sey
   eksilmez. Korku ayni, risk yok.                            */
const havaDefter = [];
export function havaDefterBoyu() { return havaDefter.length; }

function havaSil(kayit) {
  try {
    const b = kayit.boyut.getBlock(kayit.yer);
    if (!b) return false;
    if (b.typeId !== kayit.tur) return true;   // biri degistirmis
    b.setType("minecraft:air");
    return true;
  } catch (e) { return false; }
}
export function havaTazele(simdi) {
  for (let i = havaDefter.length - 1; i >= 0; i--) {
    const k = havaDefter[i];
    if (simdi < k.tik) continue;
    if (havaSil(k)) havaDefter.splice(i, 1);
  }
}

export function yukselenZemin(oyuncu, boyut, konum, simdi) {
  if (!E404_ACIK || !ayar.zemin || ayar.bitti) return false;
  const aci = Math.random() * Math.PI * 2;
  const uz = E404_KALDIRMA_YAKIN +
             Math.random() * (E404_KALDIRMA_UZAK - E404_KALDIRMA_YAKIN);
  const mx = Math.floor(konum.x + Math.cos(aci) * uz);
  const mz = Math.floor(konum.z + Math.sin(aci) * uz);
  const y  = Math.floor(konum.y) + E404_KALDIRMA_YUKSEK;
  const yari = Math.floor(E404_KALDIRMA_EN / 2);

  let n = 0;
  for (let dx = -yari; dx <= yari; dx++) {
    for (let dz = -yari; dz <= yari; dz++) {
      if (n >= E404_KALDIRMA_TAVAN) break;
      const yer = { x: mx + dx, y, z: mz + dz };
      let hedef, zemin;
      try {
        hedef = boyut.getBlock(yer);
        zemin = boyut.getBlock({ x: yer.x, y: Math.floor(konum.y) - 1, z: yer.z });
      } catch (e) { continue; }
      /* YALNIZ HAVAYA. Dolu bir yere koymak birinin yapisini
         bozmak olurdu.                                       */
      if (!hedef || hedef.typeId !== "minecraft:air") continue;
      const tur = (zemin && zemin.typeId && zemin.typeId !== "minecraft:air")
        ? zemin.typeId : "minecraft:stone";
      if (blokIste(1) === 0) break;
      try { hedef.setType(tur); } catch (e) { continue; }
      n++;
      const kayit = { boyut, yer, tur, tik: simdi + E404_KALDIRMA_SURE };
      havaDefter.push(kayit);
      system.runTimeout(() => {
        const j = havaDefter.indexOf(kayit);
        if (j < 0) return;
        if (havaSil(kayit)) havaDefter.splice(j, 1);
      }, E404_KALDIRMA_SURE);
    }
  }
  return n > 0;
}

/* ============================================================
   4. BOZULMUS SURU              (ChangeMobTextures'in yarisi)
   ============================================================
   Bedrock'ta calisma aninda vanilla mob DOKUSU degistirilemiyor
   -- v7.74'teki bu olcum hala dogru. Degistirebildigimiz sey
   DAVRANIS: suru duruyor ve sana donuyor.

   Hayvan OLMUYOR, kaybolmuyor, hasar almiyor. Yavaslik sureli.*/
export function bozulmusSuru(oyuncu, boyut, konum) {
  if (!E404_ACIK || ayar.bitti) return false;
  let yakin;
  try {
    yakin = boyut.getEntities({
      location: konum, maxDistance: E404_SURU_MENZIL,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:player"]
    });
  } catch (e) { return false; }

  let n = 0;
  for (const v of yakin) {
    if (n >= E404_SURU_TAVAN) break;
    try {
      if (!gecerliMi(v)) continue;
      if (E404_SURU_TIPLER.indexOf(v.typeId) < 0) continue;
      /* Yavaslik: "durdu" hissinin hasarsiz karsiligi.       */
      if (typeof v.addEffect === "function") {
        v.addEffect("slowness", E404_SURU_SURE,
                    { amplifier: 5, showParticles: false });
      }
      /* Sana DONSUN. setRotation her surumde yok; olmazsa
         yavaslik tek basina da is goruyor.                   */
      try {
        if (typeof v.setRotation === "function") {
          const k = varlikKonumu(v) || v.location;
          const aci = Math.atan2(konum.x - k.x, konum.z - k.z) * 180 / Math.PI;
          v.setRotation({ x: 0, y: aci });
        }
      } catch (e) { /* donemedi, onemli degil */ }
      n++;
    } catch (e) { hataYaz("e404.suru", e); }
  }
  return n > 0;
}

/* ============================================================
   5. YAPILANDIRMA               (kaynaktaki config GUI)
   ============================================================ */
let _sira = E404_SIRA_BAS;

function ayarYetenegi(kimlik, ad, uygula) {
  yetenekKaydet({
    kimlik, ad, esyasiz: true, sira: _sira++,
    olustur(oyuncu) {
      if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
      try { uygula(oyuncu); } catch (e) { hataYaz("e404." + kimlik, e); }
      kayitYaz();
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}

/* Kaynakta "Can Spawn: Enabled/Disabled" diye sohbete yaziyor;
   biz action bar kullaniyoruz (sohbeti korku satirlari icin
   ayri tutmak istiyoruz).                                    */
const acikKapali = (a) => (a ? "§aAçık" : "§cKapalı");

ayarYetenegi("korku_dogum", "404: Beliriş Aç/Kapa", (o) => {
  ayar.dogum = !ayar.dogum;
  /* Kaynakta CanSpawn kapaliyken hicbir sey belirmiyor;
     bitisi de geri alabilen tek dugme bu (CodemanDie'nin
     "unless activated in the config menu" satiri).           */
  if (ayar.dogum) ayar.bitti = false;
  actionbarYaz(o, "§8404 §7· Beliriş: " + acikKapali(ayar.dogum));
});
ayarYetenegi("korku_blok", "404: Blok Bozma Aç/Kapa", (o) => {
  ayar.blok = !ayar.blok;
  actionbarYaz(o, "§8404 §7· Blok Bozma: " + acikKapali(ayar.blok));
});
ayarYetenegi("korku_zemin", "404: Zemin Oynatma Aç/Kapa", (o) => {
  ayar.zemin = !ayar.zemin;
  actionbarYaz(o, "§8404 §7· Zemin: " + acikKapali(ayar.zemin));
});
ayarYetenegi("korku_siklik", "404: Sıklık 1-2-3", (o) => {
  ayar.siklik = (ayar.siklik % E404_SIKLIK_CARPAN.length) + 1;
  actionbarYaz(o, "§8404 §7· Sıklık: §f" + ayar.siklik +
    " §8(×" + e404SiklikCarpani() + ")");
});

/* ClearEntitiesProcedure: "No more entities in your world! :D"
   Kaynakta MODUN varliklarini siliyor. Bizde karsiligi
   defterleri bosaltmak ve olaylari durdurmak -- vanilla
   hayvanlari silmek OYUNCUNUN MALINI silmek olurdu.          */
yetenekKaydet({
  kimlik: "korku_temizle", ad: "404: Ortalığı Temizle",
  esyasiz: true, sira: _sira++,
  olustur(oyuncu) {
    if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
    const simdi = system.currentTick;
    /* Vakti gelmemis olsalar bile HEPSINI geri koy. */
    for (const k of bozukDefter) k.tik = simdi;
    for (const k of havaDefter) k.tik = simdi;
    bozuklariTazele(simdi);
    havaTazele(simdi);
    actionbarYaz(oyuncu, "§a404 §7· Dünyanda başka bir şey kalmadı :D");
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* IsThereEntityProcedure + durum okumasi tek yerde. */
yetenekKaydet({
  kimlik: "korku_durum", ad: "404: Durum",
  esyasiz: true, sira: _sira++,
  olustur(oyuncu) {
    if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
    const f = e404Faz(oyuncu.id);
    actionbarYaz(oyuncu,
      "§8404 §7faz §f" + f +
      " §8· §7beliriş " + acikKapali(ayar.dogum) +
      " §8· §7blok " + acikKapali(ayar.blok) +
      " §8· §7zemin " + acikKapali(ayar.zemin) +
      " §8· §7sıklık §f" + ayar.siklik +
      (ayar.bitti ? " §8· §aetkisiz" : ""));
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ============================================================
   6. SIFRE ZINCIRI              (PasswordScript + CodemanDie)
   ============================================================
   Kaynakta dizustu/PC menusunde tuslaniyor. Bizde jest listesi
   var, o yuzden nefes/meyve secimindeki ayni kalip: dogru kod
   AYRI BIR YETENEK KIMLIGI.

   Iki dal da kuruldu, cunku kaynakta ikisi de var:
     `korku_sifre`         -> "> Sifre Reddedildi"
     `korku_sifre_334303`  -> "> Sifre Kabul Edildi" + bitis    */
yetenekKaydet({
  kimlik: "korku_not", ad: "404: Eski Not",
  esyasiz: true, sira: _sira++,
  olustur(oyuncu) {
    if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
    sohbet(oyuncu, "§8— eski not —");
    sohbet(oyuncu, "§7" + E404_TELEFON);
    actionbarYaz(oyuncu, "§7Not okundu §8· sohbete bak");
    kollariIndir(oyuncu);
    return undefined;
  }
});

function bitir(oyuncu) {
  ayar.bitti = true;
  for (const satir of E404_BITIS_SATIRLAR) sohbet(oyuncu, satir);
  ses(oyuncu, E404_BITIS_SES);
  /* Bitis defterleri de bosaltiyor: "artik hicbir sey yok"
     derken ortada bozulmus blok kalmasin.                    */
  const simdi = system.currentTick;
  for (const k of bozukDefter) k.tik = simdi;
  for (const k of havaDefter) k.tik = simdi;
  bozuklariTazele(simdi);
  havaTazele(simdi);
  /* Faz da sifirlaniyor: varlik etkisiz hale getirildi. */
  fazlar.clear();
  kayitYaz();
}

yetenekKaydet({
  kimlik: "korku_sifre", ad: "404: Şifre (yanlış)",
  esyasiz: true, sira: _sira++,
  olustur(oyuncu) {
    if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
    sohbet(oyuncu, "§7> Şifre Okunuyor");
    sohbet(oyuncu, E404_SIFRE_RET);
    kollariIndir(oyuncu);
    return undefined;
  }
});
yetenekKaydet({
  kimlik: "korku_sifre_" + E404_SIFRE, ad: "404: Şifre",
  esyasiz: true, sira: _sira++,
  olustur(oyuncu) {
    if (!E404_ACIK) { kollariIndir(oyuncu); return undefined; }
    sohbet(oyuncu, "§7> Şifre Okunuyor");
    sohbet(oyuncu, E404_SIFRE_KABUL);
    try { bitir(oyuncu); } catch (e) { hataYaz("e404.bitir", e); }
    kollariIndir(oyuncu);
    return undefined;
  }
});
