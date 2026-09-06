import { system, world } from "@minecraft/server";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, olayaAbone, actionbarYaz, varlikKonumu, parcacikAt
} from "../yardimcilar.js";
import {
  TAS_ACIK, TAS_ESYA, TAS_BLOK, TAS_SURE, TAS_BEKLEME,
  TAS_ANAHTAR_ADET, TAS_KAYIT_ANAHTAR, TAS_TAVAN,
  DISMONT_ESYA, DONDUR_GIRDI_KILIT, DONDUR_KAMERA_KILIT,
  SERSEM_YAVASLIK, SERSEM_GUCSUZ
} from "../ayarlar.js";

/* ============================================================
   TASA CEVIRME  (v4.86)

   Kullanici: "tasa cevirme de olsun kanka."

   ---- REFERANSIN MEKANIGI (derlenmis siniflardan cozuldu) ----
   Zabri Studios BoraLo Mod'da Stone Converterer ile birine
   vurunca:
     - kurbana "Stoned" efekti biniyor
     - bulundugu yere bir HEYKEL BLOGU konuyor
     - zirh yuvalarina tas kaplamasi giydiriliyor
     - efekt bitince blok kalkiyor, kurban serbest

   ---- BIZDE UC SEY FARKLI, ucu de bilincli ----
   1. SURE VAR ve IKI cikis yolu var. Referansin en can sikici
      huyu suresiz etkiydi. Burada hem sure doluyor hem de
      Freedom Stone ile kirilabiliyor -- mezar sistemiyle
      birebir ayni kural, "kilit hep cift".

   2. ZIRH YUVASINA DOKUNMUYORUZ. Referans kurbanin zirhini
      cikarip yerine tas kaplamasi koyuyor. Oyuncunun zirhini
      calmak geri alinamaz bir hata olurdu (bu depoda esya
      kaybettiren hicbir sey yok). Gorunumu blok sagliyor:
      kurban blogun ICINE isinlaniyor, disaridan tas gorunuyor.

   3. KILIT ASA.JS'IN MAKINESI. Oyuncuda inputpermission,
      mobda yavaslik+gucsuzluk. Ikinci bir kopya yazilmadi;
      ayarlari da oradan okunuyor.
   ============================================================ */

/* varlikId -> { varlik, blok: {x,y,z}, boyut, bitis } */
const heykeller = new Map();
/* Kim ne zaman tasa cevirdi: bekleme icin. */
const sonKullanim = new Map();

export function tasUnut(oyuncuId) {
  sonKullanim.delete(oyuncuId);
}

export function tasMi(varlik) {
  try {
    return !!varlik && heykeller.has(varlik.id);
  } catch (e) {
    return false;
  }
}

/* ---------------- Kalicilik ----------------
   Dunya yeniden yuklenince heykel bloklari YERINDE kalir ama
   defter bosalir -- yani blok sonsuza kadar durur ve kimse
   kurtulamaz. Mezar defterinde ayni sebeple kayit var; burada
   da SADECE blok konumlari saklaniyor.

   Varligin kendisi saklanmiyor: yeniden yuklendiginde varlik
   nesnesi gecersiz olur. Blok kirilinca kilit zaten acilmis
   sayiliyor (kurban da o sirada serbest kalmis oluyor).     */
function kaydet() {
  try {
    const liste = [];
    for (const [id, k] of heykeller) {
      liste.push([id, k.boyutId, k.blok.x, k.blok.y, k.blok.z]);
    }
    world.setDynamicProperty(TAS_KAYIT_ANAHTAR, JSON.stringify(liste));
  } catch (e) {
    hataYaz("tas.kaydet", e);
  }
}

function oku() {
  try {
    const ham = world.getDynamicProperty(TAS_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return [];
    const v = JSON.parse(ham);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

/* Sadece testler icin: defteri sifirla.

   `bekleyenTemizlik` de sifirlaniyor: oturum basina BIR KEZ
   okunuyor (uretimde dogrusu bu), ama test ikinci bir senaryo
   kurdugunda liste zaten tukenmis oluyor ve tarama hicbir sey
   yapmiyordu. Sifirlamadan yazilan bir madde BOSUNA GECER --
   nitekim "baskasinin bloguna dokunmuyor" maddesi tam boyle
   bosuna geciyordu ve mutasyon denemesinde yakalandi.       */
export function defteriUnut() {
  heykeller.clear();
  sonKullanim.clear();
  bekleyenTemizlik = null;
}

/* ---------------- Kilit (asa.js ile ayni kural) ---------------- */
function girdiKilidi(hedef, acikMi) {
  if (!DONDUR_GIRDI_KILIT) return;
  if (hedef.typeId !== "minecraft:player") return;   // moblarda komut yok
  if (typeof hedef.runCommand !== "function") return;
  const deger = acikMi ? "enabled" : "disabled";
  try {
    hedef.runCommand("inputpermission set @s movement " + deger);
    if (DONDUR_KAMERA_KILIT) {
      hedef.runCommand("inputpermission set @s camera " + deger);
    }
  } catch (e) {
    /* Komut eski surumlerde yok; yavaslik yine uygulaniyor. */
  }
}

function kilitle(kurban) {
  try {
    kurban.addEffect("slowness", TAS_SURE,
                     { amplifier: SERSEM_YAVASLIK, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  try {
    kurban.addEffect("weakness", TAS_SURE,
                     { amplifier: SERSEM_GUCSUZ, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  girdiKilidi(kurban, false);
}

function coz(kayit) {
  const v = kayit.varlik;
  if (!gecerliMi(v)) return;
  girdiKilidi(v, true);
  try { v.removeEffect("slowness"); } catch (e) { /* onemsiz */ }
  try { v.removeEffect("weakness"); } catch (e) { /* onemsiz */ }
}

/* Heykeli kaldirir ve kurbani serbest birakir. */
function heykeliKaldir(id, kayit) {
  heykeller.delete(id);
  try {
    const b = kayit.boyut.getBlock(kayit.blok);
    /* SADECE kendi blogumuz sokuluyor: araya biri bir sey
       koyduysa ona dokunma (mezar defterinde ayni kural). */
    if (b && b.typeId === TAS_BLOK) b.setType("minecraft:air");
  } catch (e) {
    /* Parca yuklu degil: blok kirilinca zaten gidecek. */
  }
  coz(kayit);
  kaydet();
}

/* ============================================================
   SAHIPSIZ HEYKELLERI TEMIZLE  (v7.40)

   ---- BULUNAN OLU KOD ----
   `oku()` yaziliydi ama HICBIR YERDEN CAGRILMIYORDU. Dosyanin
   sonundaki yorum "dunya acilinca eski heykelleri temizle"
   diyordu; altindaki tasKancalari() ise yalnizca olay
   aboneligi kuruyordu. Yani `kaydet()` her seferinde yaziyor,
   kimse okumuyordu.

   Sonuc tam olarak yorumda korkulan seydi: yeniden yuklemeden
   sonra tas heykel bloklari dunyada SAHIPSIZ kaliyor ve
   `heykeller` Map'i bos oldugu icin kimse onlari kaldiramiyor.

   ---- NEDEN ACILISTA HEPSI BIRDEN SILINMIYOR ----
   Blok yazmak icin parcanin YUKLU olmasi lazim; dunya acilirken
   cogu yuklu degil. Ustelik bu depoda "bosta duran mod blok
   okumaz" bir kural ve her tick butun listeyi denemek onu
   cignerdi.

   Yol: liste acilista bir kez okunuyor, taramada TICK BASINA
   BIR TANE deneniyor. Liste birkac saniyede tukeniyor ve
   sonrasinda maliyet SIFIR. Temizlenemeyen (parca yuklu degil)
   kayit dunya defterinde KALIYOR -- o parcanin yuklu oldugu bir
   sonraki oturumda temizlenir.
   ============================================================ */
let bekleyenTemizlik = null;      // null = daha okunmadi

function temizlikSirasi() {
  if (bekleyenTemizlik === null) bekleyenTemizlik = oku();
  return bekleyenTemizlik;
}

/* Tek bir sahipsiz kaydi dener. Doner: kayit defterden dussun mu. */
function sahipsiziDene(kayit) {
  try {
    const [id, boyutId, x, y, z] = kayit;
    /* Kurban hala heykelse dokunma: bu oturumda yeniden
       kuruldu demektir, sahipsiz degil.                    */
    if (heykeller.has(id)) return true;
    const boyut = world.getDimension(boyutId);
    if (!boyut) return true;                 // boyut yok: kayit anlamsiz
    const b = boyut.getBlock({ x, y, z });
    if (!b) return false;                    // okunamadi: sonraya birak
    /* SADECE kendi blogumuz sokuluyor -- heykeliKaldir'daki
       ayni kural: araya biri bir sey koyduysa ona dokunma. */
    if (b.typeId === TAS_BLOK) b.setType("minecraft:air");
    return true;
  } catch (e) {
    /* Parca yuklu degil ya da dunya sinirinin disi.
       Kayit KALIYOR: baska bir oturumda temizlenir.        */
    return false;
  }
}

/* ---------------- Merkezi tarama ----------------
   Suresi dolan heykeli cozuyor. Defter bosken hic donmiyor.  */
export function tasTara() {
  /* Sahipsiz temizligi: tick basina EN FAZLA BIR kayit.
     Liste bitince bu dal hic calismiyor.                  */
  const sira = temizlikSirasi();
  if (sira.length > 0) {
    const kayit = sira.shift();
    if (sahipsiziDene(kayit)) {
      const kalan = oku().filter((s) => !(s[0] === kayit[0] &&
        s[2] === kayit[2] && s[3] === kayit[3] && s[4] === kayit[4]));
      try {
        world.setDynamicProperty(TAS_KAYIT_ANAHTAR,
          kalan.length ? JSON.stringify(kalan) : undefined);
      } catch (e) {
        hataYaz("tas.sahipsizYaz", e);
      }
    }
  }

  if (heykeller.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of heykeller) {
    if (!gecerliMi(kayit.varlik)) {
      /* Kurban oldu ya da yok oldu: blogu birakmayalim. */
      heykeliKaldir(id, kayit);
      continue;
    }
    if (simdi >= kayit.bitis) {
      heykeliKaldir(id, kayit);
      continue;
    }
    /* Kurban blogun icinde durmali: mob yurumeye calisirsa
       geri cekiliyor. Oyuncuda gerek yok, girdi kilidi tutuyor. */
    if (kayit.varlik.typeId === "minecraft:player") continue;
    try {
      const s = varlikKonumu(kayit.varlik);
      const dx = s.x - (kayit.blok.x + 0.5);
      const dz = s.z - (kayit.blok.z + 0.5);
      if (dx * dx + dz * dz > 0.25) {
        kayit.varlik.teleport({
          x: kayit.blok.x + 0.5, y: kayit.blok.y, z: kayit.blok.z + 0.5
        });
      }
    } catch (e) { /* isinlanamadi: efektler yine gecerli */ }
  }
}

/* ---------------- Tasa cevir ---------------- */
export function tasaCevir(vuran, kurban) {
  if (!TAS_ACIK) return false;
  if (!gecerliMi(kurban)) return false;
  if (heykeller.has(kurban.id)) return false;      // zaten tas
  if (heykeller.size >= TAS_TAVAN) return false;

  let boyut, k;
  try {
    boyut = kurban.dimension;
    k = varlikKonumu(kurban);
  } catch (e) {
    return false;
  }
  if (!boyut || !k) return false;

  const blok = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };

  /* SADECE HAVAYA konuyor: oyuncunun evini heykele cevirmek
     geri alinamaz olurdu. Mezar ve buz kafesinde ayni kural. */
  try {
    if (blokIste(1) < 1) return false;
    const b = boyut.getBlock(blok);
    if (!b || !b.isAir) return false;
    b.setType(TAS_BLOK);
  } catch (e) {
    return false;
  }

  kilitle(kurban);
  try {
    kurban.teleport({ x: blok.x + 0.5, y: blok.y, z: blok.z + 0.5 },
                    { dimension: boyut });
  } catch (e) { /* isinlanamadi: heykel yine kuruldu */ }

  heykeller.set(kurban.id, {
    varlik: kurban, blok, boyut, boyutId: boyut.id,
    bitis: system.currentTick + TAS_SURE
  });
  kaydet();

  try {
    parcacikAt(boyut, "minecraft:large_explosion", varlikKonumu(kurban));
  } catch (e) { /* parcacik yoksa onemsiz */ }

  if (vuran && vuran.typeId === "minecraft:player") {
    actionbarYaz(vuran, "§7▣ §fTaşa çevrildi §8· " +
                 (TAS_SURE / 20) + " sn ya da " +
                 TAS_ANAHTAR_ADET + " Freedom Stone");
  }
  return true;
}

/* ---------------- Freedom Stone ile kirma ----------------
   Mezarla AYNI yol: blogu kirmak tetikliyor, tasi yetmeyenin
   kirdigi blok geri konuyor.                                 */
function tasSayisi(oyuncu) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return 0;
    let toplam = 0;
    for (let i = 0; i < kutu.size; i++) {
      const e = kutu.getItem(i);
      if (e && e.typeId === DISMONT_ESYA) toplam += e.amount;
    }
    return toplam;
  } catch (e) {
    return 0;
  }
}

function tasHarca(oyuncu, adet) {
  let kalan = adet;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return 0;
    for (let i = 0; i < kutu.size && kalan > 0; i++) {
      const e = kutu.getItem(i);
      if (!e || e.typeId !== DISMONT_ESYA) continue;
      if (e.amount <= kalan) {
        kalan -= e.amount;
        kutu.setItem(i, undefined);
      } else {
        e.amount -= kalan;
        kutu.setItem(i, e);
        kalan = 0;
      }
    }
  } catch (e) {
    hataYaz("tas.harca", e);
  }
  return adet - kalan;
}

/* Bu konumdaki heykeli bulur. */
function heykeliBul(boyutId, konum) {
  const x = Math.floor(konum.x), y = Math.floor(konum.y), z = Math.floor(konum.z);
  for (const [id, k] of heykeller) {
    if (k.boyutId !== boyutId) continue;
    if (k.blok.x === x && k.blok.y === y && k.blok.z === z) return [id, k];
  }
  return undefined;
}

let kirmaUyarisi = false;

export function tasKancalari() {
  if (!TAS_ACIK) return;

  const kirma = olayaAbone("playerBreakBlock", (olay) => {
    try {
      const oyuncu = olay.player;
      const konum = olay.block ? olay.block.location : olay.blockLocation;
      if (!oyuncu || !konum) return;
      const boyut = oyuncu.dimension;

      const bulunan = heykeliBul(boyut.id, konum);
      if (!bulunan) return;                    // bizim heykelimiz degil

      const eldeki = tasSayisi(oyuncu);
      if (eldeki < TAS_ANAHTAR_ADET) {
        try {
          const b = boyut.getBlock(konum);
          if (b) b.setType(TAS_BLOK);          // geri koy
        } catch (e) { /* geri konamadi */ }
        try {
          oyuncu.sendMessage(
            "§7▣ §fHeykel direniyor. §b" + TAS_ANAHTAR_ADET +
            " Freedom Stone§7 gerekiyor — sende §f" + eldeki + "§7 var.");
        } catch (e) { /* mesaj gonderilemedi */ }
        return;
      }

      tasHarca(oyuncu, TAS_ANAHTAR_ADET);
      heykeliKaldir(bulunan[0], bulunan[1]);
      try {
        oyuncu.sendMessage("§b▣ §fHeykel kırıldı. §7" + TAS_ANAHTAR_ADET +
                           " Freedom Stone harcandı.");
      } catch (e) { /* mesaj gonderilemedi */ }
    } catch (e) {
      hataYaz("tas.playerBreakBlock", e);
    }
  });

  if (!kirma && !kirmaUyarisi) {
    kirmaUyarisi = true;
    hataYaz("tas.kirma", new Error(
      "playerBreakBlock yok. Heykel Freedom Stone ile kirilamaz; " +
      "sadece suresi dolunca cozulur."));
  }

  /* Tas Donusturucu ile VURUNCA tasa cevirir. Asanin oyuncu
     kancasiyla ayni kalip: vuranin ELINE bakiliyor.         */
  const vurus = olayaAbone("entityHitEntity", (olay) => {
    try {
      const vuran = olay.damagingEntity;
      const kurban = olay.hitEntity;
      if (!vuran || !kurban) return;
      if (vuran.typeId !== "minecraft:player") return;

      let elde;
      try {
        const e = vuran.getComponent("minecraft:equippable");
        elde = e && typeof e.getEquipment === "function"
          ? e.getEquipment("Mainhand") : undefined;
      } catch (e) { elde = undefined; }
      if (!elde || elde.typeId !== TAS_ESYA) return;

      const simdi = system.currentTick;
      const son = sonKullanim.get(vuran.id);
      if (son !== undefined && simdi - son < TAS_BEKLEME) return;
      sonKullanim.set(vuran.id, simdi);

      tasaCevir(vuran, kurban);
    } catch (e) {
      hataYaz("tas.vurus", e);
    }
  });

  if (!vurus) {
    hataYaz("tas.vurus", new Error(
      "entityHitEntity yok. Tas Donusturucu vurusu tasa ceviremez."));
  }
}

/* Vurus kancasini kur.

   ---- YORUM DUZELTILDI (v7.40) ----
   Burasi eskiden "dunya acilinca eski heykelleri temizle"
   diyordu ve BU SATIR ONU YAPMIYORDU -- yalnizca olay
   aboneligi kuruyor. Yorum bir sure kodun yapmadigi seyi
   anlatti; asil temizlik simdi tasTara() icinde
   (sahipsiziDene), tick basina bir kayit.                 */
tasKancalari();
