import { world, system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikHalkasi
} from "../yardimcilar.js";
import {
  DONUSUM_ACIK, SEY_KILIK_KIMLIK, DONUSUM_TAZELEME, DONUSUM_SURE,
  DONUSUM_KAYIT_ANAHTAR, DONUSUM_Y_KAYMA, SEY_AD,
  DONUSUM_PARCACIK, DONUSUM_PARCACIK_ADET, DONUSUM_PARCACIK_YARICAP,
  KILIK_ONDELEME, KILIK_ONDELEME_TAVAN,
  KILIK_DONUS_ONDELEME, KILIK_DONUS_TAVAN
} from "../ayarlar.js";

/* ================================================================
   DONUSUM -- OYUNCU O SEY OLUYOR                           v4.89

   Kullanici: "buna donusebiliyor olmam lazim... 2 tane skin
   yapman lazim, ikincisi that thing halim, ayni geometriyi
   kullan fakat SKIN olmalidir."

   ---- ONCE DURUSTCE: SKIN OLARAK YAPILAMIYOR ----
   Mojang skin paketlerinde OZEL GEOMETRIYI KALDIRDI (kotuye
   kullanildigi icin). Resmi istemcide skins.json sadece iki
   degeri kabul ediyor:
       geometry.humanoid.custom      (Steve)
       geometry.humanoid.customSlim  (Alex)
   Yani alti kollu bir govde SKIN olarak yuklenemiyor. Dolasan
   "4D skin" paketleri ya Marketplace imzali ya da yamali
   istemci (LeviLauncher + Lib4dskin) istiyor. Script'ten de
   oyuncu modeli degistirilemiyor -- oyle bir API yok.

   ---- BEDROCK'TA GERCEKTEN CALISAN YOL: KILIK ----
     1. oyuncu gorunmez olur
     2. yerine pa:o_sey_kilik varligi ciziliyor
     3. her tick oyuncunun konumuna ve donusune isinlaniyor
   Birinci sahista kendini zaten gormuyorsun; F5'e basinca ve
   BASKA OYUNCULAR icin O Sey gorunuyorsun. Yuruyorsun,
   ziplayorsun, vuruyorsun -- hepsi SENIN bedenin; kilik sadece
   ustune ciziliyor.

   ---- UC TUZAK, ucu de burada cozuldu ----
   1. GORUNMEZLIK SILINIYOR. Efekt olunce, sure dolunca ve SUT
      ICINCE gidiyor. Kalp sistemindeki cozumun aynisi: defter
      kaynak, efekt onun goruntusu; DONUSUM_TAZELEME'de bir
      geri veriliyor. Tazelenmeseydi oyuncu bir anda IKI
      bedenli gorunurdu.

   2. KILIK ORTADA KALIYOR. Oyuncu cikarsa, olurse ya da dunya
      yeniden yuklenirse varlik yerinde duruyordu. Defter dunya
      ozelligine yaziliyor ve acilista TARANIP temizleniyor;
      playerLeave da kendi kiligini kaldiriyor.

   3. KILIK OYUNCUYU ITIYOR. Varligin yercekimi ve carpismasi
      KAPALI (o_sey_kilik_varligi), ayrica vurulamiyor. Acik
      kalsaydi ikisi birbirini iteler ve titrerlerdi.

   ---- TUTULAN ESYA ----
   Bedrock'ta gorunmez bir oyuncunun ELINDEKI ESYA ve ZIRHI
   yine cizilir. Yani elin doluyken havada suzulen bir kilic
   gorunur. Bu oyunun davranisi, bizim hatamiz degil; menude
   uyarisi yaziyor.
   ================================================================ */

/* oyuncuId -> { kilikId, boyutId } */
const kilikler = new Map();
/* oyuncuId -> bir sonraki gorunmezlik tazelemesi */
const sonraki = new Map();

export function donusukMu(oyuncuId) {
  return kilikler.has(oyuncuId);
}

export function donusukSayisi() {
  return kilikler.size;
}

/* ---------------- Kalicilik ----------------
   SADECE varlik kimlikleri saklaniyor. Amac donusumu geri
   yuklemek DEGIL -- acilista ortada kalmis kiliklari
   TEMIZLEMEK. Donusum bilincli bir secim; dunyaya girince
   kendiliginden O Sey olmak istenmez.                         */
function kaydet() {
  try {
    const liste = [];
    for (const [oyuncuId, k] of kilikler) liste.push([oyuncuId, k.kilikId]);
    world.setDynamicProperty(DONUSUM_KAYIT_ANAHTAR, JSON.stringify(liste));
  } catch (e) {
    hataYaz("donusum.kaydet", e);
  }
}

let okundu = false;
function oku() {
  if (okundu) return;
  okundu = true;
  try {
    const ham = world.getDynamicProperty(DONUSUM_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    /* Eski oturumdan kalan kilikleri SIL. Oyuncu nesneleri
       artik yok, yani bunlarin sahibi de yok.                 */
    for (const [, kilikId] of JSON.parse(ham)) {
      kiligiSil(kilikId);
    }
    world.setDynamicProperty(DONUSUM_KAYIT_ANAHTAR, "");
  } catch (e) {
    hataYaz("donusum.oku", e);
  }
}

function kiligiSil(kilikId) {
  try {
    const v = world.getEntity(kilikId);
    if (v && gecerliMi(v)) v.remove();
  } catch (e) {
    /* Chunk yuklu degil: varlik kalir ama kalici degil --
       bir sonraki acilista yine denenecek. Sessiz gecmek
       dogru, cunku bu bir hata degil bir bekleme.            */
  }
}

/* Testler ve dunya degisimi icin: yalniz bellegi temizler. */
export function donusumUnut() {
  kilikler.clear();
  sonraki.clear();
  okundu = false;
}

/* ---------------- Gorunmezlik ---------------- */
function gorunmezVer(oyuncu) {
  try {
    oyuncu.addEffect("invisibility", DONUSUM_SURE, {
      amplifier: 0,
      /* Parcacik YOK: gorunmezligin kendi puf puflari kiligin
         icinden tasip "burada biri var" diye bagiriyordu.    */
      showParticles: false
    });
    return true;
  } catch (e) {
    hataYaz("donusum.gorunmez", e);
    return false;
  }
}

function gorunmezSil(oyuncu) {
  try {
    oyuncu.removeEffect("invisibility");
  } catch (e) {
    /* Efekt zaten yoksa API atabiliyor; onemli degil. */
  }
}

/* ---------------- Donusum ---------------- */

/* Donen deger: {hata} ya da {donustu:true} / {cikti:true} */
export function donus(oyuncu) {
  if (!DONUSUM_ACIK) return { hata: "Dönüşüm kapalı (DONUSUM_ACIK)." };
  oku();

  if (kilikler.has(oyuncu.id)) return cikis(oyuncu);

  let kilik;
  try {
    kilik = oyuncu.dimension.spawnEntity(SEY_KILIK_KIMLIK, {
      x: oyuncu.location.x,
      y: oyuncu.location.y + DONUSUM_Y_KAYMA,
      z: oyuncu.location.z
    });
  } catch (e) {
    hataYaz("donusum.dogur", e);
    return { hata: "Kılık doğurulamadı — davranış paketi etkin mi?" };
  }
  if (!kilik) return { hata: "Kılık doğdu ama varlığa ulaşılamadı." };

  kilikler.set(oyuncu.id, { kilikId: kilik.id });
  sonraki.set(oyuncu.id, 0);          // ilk taramada hemen verilsin
  kaydet();

  gorunmezVer(oyuncu);
  hizala(oyuncu, kilik);
  try {
    parcacikHalkasi(oyuncu.dimension, DONUSUM_PARCACIK, oyuncu.location,
                    DONUSUM_PARCACIK_ADET, DONUSUM_PARCACIK_YARICAP);
  } catch (e) {
    hataYaz("donusum.parcacik", e);
  }
  return { donustu: true };
}

export function cikis(oyuncu) {
  oku();
  const k = kilikler.get(oyuncu.id);
  if (!k) return { hata: "Zaten insan halindesin." };

  kilikler.delete(oyuncu.id);
  sonraki.delete(oyuncu.id);
  kaydet();

  kiligiSil(k.kilikId);
  gorunmezSil(oyuncu);
  return { cikti: true };
}

/* Oyuncu cikinca kiligi da gitsin: ortada duran bir O Sey
   kalmasin.                                                  */
export function donusumUnutOyuncu(oyuncuId) {
  const k = kilikler.get(oyuncuId);
  if (!k) return;
  kilikler.delete(oyuncuId);
  sonraki.delete(oyuncuId);
  kaydet();
  kiligiSil(k.kilikId);
}

/* Iki aci arasindaki EN KISA fark, -180..180.
   Duz cikarma yanlis olurdu: 350 dereceden 10 dereceye donmek
   +20 derecelik kucuk bir donus ama duz cikarma -340 der ve
   kilik ters yone firlardi.                                  */
function aciFarki(yeni, eski) {
  return ((yeni - eski + 540) % 360) - 180;
}

function hizAl(oyuncu) {
  try {
    const h = oyuncu.getVelocity ? oyuncu.getVelocity() : undefined;
    if (!h || typeof h.x !== "number" || typeof h.z !== "number") return null;
    return h;
  } catch (e) {
    return null;
  }
}

/* Kiligi oyuncunun uzerine oturt. Yalniz GOVDE donusu (y)
   veriliyor: modelin kafa kemigi vanilla bakis animasyonuna
   bagli degil, yani x'i vermek govdeyi one egerdi.

   ---- ONDELEME  (v7.9.2) ----
   Kullanici: "bildiğin arkamdan geliyor... benimle aynı
   derecede koşamıyor." Kilik ZATEN her tick hizalaniyordu;
   gecikme iki yerden geliyor: script tick N'de okudugu konumu
   veriyor (oyuncu o tick icinde ilerledi) ve istemci varliklari
   guncellemeler ARASINDA yumusatarak ciziyor.

   Bu yuzden kiligi oyuncunun BULUNDUGU yere degil, GIDECEGI
   yere koyuyoruz: konum + hiz x onceleme. Ayni sey yaw icin de
   yapiliyor -- "saga sola donunce geride kaliyor" tam o.

   Onceleme YALNIZ YATAY (x/z). Y bilerek disarida: ziplamada
   hiz tepe noktasinda isaret degistiriyor, dikey onceleme
   kiligi once havaya firlatir sonra yere gomerdi. Yatay
   hareket zaten sikayetin konusu.                            */
function hizala(oyuncu, kilik, oncekiYaw) {
  try {
    const d = oyuncu.getRotation();
    const k = oyuncu.location;
    let ix = 0, iz = 0;

    const h = KILIK_ONDELEME > 0 ? hizAl(oyuncu) : null;
    if (h) {
      ix = h.x * KILIK_ONDELEME;
      iz = h.z * KILIK_ONDELEME;
      /* TAVAN: firlatilinca (ucurma, telekinez, TNT) hiz bir
         anda buyuyor. Kesilmeseydi kilik metrelerce ileri
         giderdi. Tavana carpinca en kotu ihtimal ONCEKI
         davranis -- yani hata degil, geri cekilme.           */
      const uzunluk = Math.sqrt(ix * ix + iz * iz);
      if (uzunluk > KILIK_ONDELEME_TAVAN) {
        const o = KILIK_ONDELEME_TAVAN / uzunluk;
        ix *= o; iz *= o;
      }
    }

    let yaw = d.y;
    if (typeof oncekiYaw === "number" && KILIK_DONUS_ONDELEME > 0) {
      let fark = aciFarki(d.y, oncekiYaw) * KILIK_DONUS_ONDELEME;
      if (fark > KILIK_DONUS_TAVAN) fark = KILIK_DONUS_TAVAN;
      else if (fark < -KILIK_DONUS_TAVAN) fark = -KILIK_DONUS_TAVAN;
      yaw = d.y + fark;
    }

    kilik.teleport({
      x: k.x + ix,
      y: k.y + DONUSUM_Y_KAYMA,
      z: k.z + iz
    }, {
      dimension: oyuncu.dimension,
      rotation: { x: 0, y: yaw },
      keepVelocity: false
    });
    return d.y;
  } catch (e) {
    return undefined;
  }
}

/* ---------------- Tarama ----------------
   main.js'teki merkezi tick'ten cagriliyor. Defter BOSKEN
   hicbir sey yapmiyor -- bot defterindeki kural.              */
export function donusumTara(oyuncular) {
  if (kilikler.size === 0) return;
  oku();

  const simdi = system.currentTick;
  for (const oyuncu of oyuncular) {
    const k = kilikler.get(oyuncu.id);
    if (!k) continue;

    let kilik;
    try {
      kilik = world.getEntity(k.kilikId);
    } catch (e) {
      kilik = undefined;
    }

    /* Kilik kaybolduysa (chunk bosaldi, biri /kill attı)
       donusumu sessizce bitir: gorunmez ve bedensiz kalmak
       en kotu sonuc olurdu.                                  */
    if (!kilik || !gecerliMi(kilik)) {
      kilikler.delete(oyuncu.id);
      sonraki.delete(oyuncu.id);
      kaydet();
      gorunmezSil(oyuncu);
      try {
        actionbarYaz(oyuncu, "§7Kılık kayboldu — insan halindesin.");
      } catch (e) { /* mesaj onemli degil */ }
      continue;
    }

    /* Onceki tick'in yaw'i onceleme icin lazim; kiligin kendi
       defterinde duruyor ki oyuncu basina ayri olsun.        */
    k.sonYaw = hizala(oyuncu, kilik, k.sonYaw);

    if (simdi >= (sonraki.get(oyuncu.id) || 0)) {
      gorunmezVer(oyuncu);
      sonraki.set(oyuncu.id, simdi + DONUSUM_TAZELEME);
    }
  }
}

yetenekKaydet({
  kimlik: "donusum",
  ad: "O Şey'e dönüş",
  esyasiz: true,
  sira: 251,          // o_sey (249) ile bot_teslim (250) arasi dolu

  olustur(oyuncu) {
    let sonuc;
    try {
      sonuc = donus(oyuncu);
    } catch (e) {
      hataYaz("donusum", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      if (sonuc.hata) {
        oyuncu.sendMessage("§c" + sonuc.hata);
      } else if (sonuc.donustu) {
        oyuncu.sendMessage(
          "§8☗ §f" + SEY_AD + "§7 oldun.\n" +
          "§8F5'e bas — kendini gör. Diğer oyuncular da seni böyle görür.\n" +
          "§8Elindeki eşya ve zırhın yine çizilir (oyunun davranışı); " +
          "tam görüntü için ellerini boşalt.\n" +
          "§7Geri dönmek: menüde aynı satır."
        );
      } else {
        actionbarYaz(oyuncu, "§7İnsan haline döndün.");
      }
    } catch (e) {
      hataYaz("donusum.mesaj", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
