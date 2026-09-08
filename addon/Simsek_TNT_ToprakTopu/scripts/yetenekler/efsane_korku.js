import { system, world } from "@minecraft/server";
import { varlikKonumu, gecerliMi } from "../yardimcilar.js";
import { blokIste, varlikIste, patlamaIste } from "../butce.js";
import { kokAl, zincirNoktasi } from "./efsane.js";
import {
  EFSANE_ACIK, EFSANE_DURAK_SAYISI,
  EFSANE_KORKU_ACIK, EFSANE_KORKU_TARAMA, EFSANE_KORKU_MENZIL,
  EFSANE_KORKU_ARA, EFSANE_KORKU_SANS,
  EFSANE_BAKIS_YARICAP, EFSANE_BAKIS_TAVAN, EFSANE_BAKIS_SURE,
  EFSANE_HAYALET_SESLER, EFSANE_HAYALET_UZAK,
  EFSANE_KAZMA_SESLER, EFSANE_KAZMA_DERINLIK,
  EFSANE_KAZMA_UZAK_MIN, EFSANE_KAZMA_UZAK_MAX,
  EFSANE_ISIK_BLOK, EFSANE_ISIK_UZAK, EFSANE_ISIK_SURE,
  EFSANE_ISIK_GECE_BAS, EFSANE_ISIK_GECE_SON,
  EFSANE_GAZAP_ACIK, EFSANE_GAZAP_GUVENLI, EFSANE_GAZAP_UZAK,
  EFSANE_GAZAP_TNT_ADET, EFSANE_GAZAP_TNT_YUKSEK,
  EFSANE_GAZAP_TNT_FITIL, EFSANE_GAZAP_TNT_GUC,
  EFSANE_GAZAP_TNT_KIRAR, EFSANE_GAZAP_YILDIRIM_ADET,
  EFSANE_GAZAP_OYUNCU_VURUR
} from "../ayarlar.js";

/* ================================================================
   EFSANENİN KORKUSU                                        v7.71

   Gerekcenin ve kaynak incelemesinin tamami ayarlar.js'teki
   "EFSANENIN KORKUSU" bolumunde. Ozeti: cosmichorror modunun
   21 olay sinifi tarandi, 20'sinde saldiri izi yok; buraya
   alinanlarin HICBIRI hasar vermiyor.

   ---- BU DOSYANIN DEGISMEZ KURALI ----
   HICBIR OLAY OYUNCUYA ZARAR VERMEZ. Ne hasar, ne esya kaybi,
   ne kalici blok. Kullanicinin sarti aynen: "bu yaratiklar bana
   saldirmasin, saldirirsa efsane kendi olusturdugu yaratiklar
   tarafindan saldirildi gibi olur."

   Bu yuzden:
     - applyDamage / createExplosion / kill YOK
     - envantere dokunulmuyor
     - konan tek blok (uzak isik) SURELI ve geri aliniyor
     - yaratiklara setTarget denmiyor; sadece DONDURULUYORLAR

   ---- NEDEN AYRI DOSYA ----
   efsane.js insaat, efsane_muzik.js "gordun mu", burasi
   "icindesin". Ucu de ayri sorulari cevapliyor.

   ---- DEFTER BOSKEN HIC DONMEME ----
   Zincir kurulmamissa tarama TEK SATIRDA cikiyor. Deponun
   kurali: calismayan bir ozellik tick butcesinden yemez.
   ================================================================ */

let sonraki = 0;

/* oyuncuId -> { bitis, ara } · bitis = bakis olayinin sonu */
const durum = new Map();

export function efsaneKorkuUnut(oyuncuId) {
  if (oyuncuId === undefined) durum.clear();
  else durum.delete(oyuncuId);
}

export function efsaneKorkuDurum(oyuncuId) {
  return durum.get(oyuncuId);
}

function sec(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function komut(oyuncu, metin) {
  try {
    if (typeof oyuncu.runCommand !== "function") return false;
    oyuncu.runCommand(metin);
    return true;
  } catch (e) {
    /* Tek komut patlarsa OTEKILER YINE CALISSIN -- arinma.js
       ile ayni gerekce.                                      */
    return false;
  }
}

/* ---- 1. BAKIŞ (kaynakta: Paranoya) ----
   Yakindaki yaratiklar donup oyuncuya bakiyor.

   setTarget DEMIYORUZ. Bedrock script'te varliga "suraya bak"
   dedirten API yok; /tp ... facing var ve yaptigi tam bu:
   varligin YONU degisiyor, hedefi degil. Zombi zaten
   saldiriyorsa saldirmaya devam eder, saldirmiyorsa bu komut
   onu saldirtmaz.                                             */
function bakis(oyuncu, ayaMi) {
  const r = EFSANE_BAKIS_YARICAP;
  const hedef = ayaMi
    /* Aya bakis: gokyuzunde bir nokta. Oyuncunun 40 blok
       ustu -- "yukari bakiyorlar" hissi icin yeterli.       */
    ? "~ ~40 ~"
    : "@s";
  /* type=!player: oyuncular dondurulmuyor. Baska bir oyuncunun
     bakisini zorla cevirmek v7.65'te savunma yazdigimiz
     griefing kaliplarindan biri -- kendi eklentimiz onu
     yapmayacak.                                              */
  return komut(oyuncu,
    "execute as @e[r=" + r + ",type=!player,c=" + EFSANE_BAKIS_TAVAN +
    "] at @s run tp @s ~ ~ ~ facing " + hedef);
}

/* ---- 2. HAYALET SES (kaynakta: PhantomAnimals) ----
   Yakinda hayvan sesi cikiyor, ortada hayvan yok.            */
function hayaletSes(oyuncu) {
  const aci = Math.random() * Math.PI * 2;
  const dx = Math.cos(aci) * EFSANE_HAYALET_UZAK;
  const dz = Math.sin(aci) * EFSANE_HAYALET_UZAK;
  return komut(oyuncu,
    "playsound " + sec(EFSANE_HAYALET_SESLER) + " @s ~" + dx.toFixed(1) +
    " ~ ~" + dz.toFixed(1) + " 1 1");
}

/* ---- 3. UZAK KAZMA (kaynakta: EchoMining) ----
   Yalniz yer altinda. Yuzeydeyken "uzaktan kazma sesi" tuhaf
   degil, siradan olurdu.                                     */
function uzakKazma(oyuncu, y) {
  if (y > EFSANE_KAZMA_DERINLIK) return false;
  const aci = Math.random() * Math.PI * 2;
  const uz = EFSANE_KAZMA_UZAK_MIN +
             Math.random() * (EFSANE_KAZMA_UZAK_MAX - EFSANE_KAZMA_UZAK_MIN);
  const dx = Math.cos(aci) * uz;
  const dz = Math.sin(aci) * uz;
  return komut(oyuncu,
    "playsound " + sec(EFSANE_KAZMA_SESLER) + " @s ~" + dx.toFixed(1) +
    " ~ ~" + dz.toFixed(1) + " 0.7 0.8");
}

/* ---- 4. UZAK IŞIK (kaynakta: DistantBeacon) ----
   Gece uzakta bir mesale yaniyor, sonra soner.

   BLOK GECICI. Sure dolunca kaldiriliyor ve KALDIRMA ISI
   konmadan ONCE planlaniyor -- "her kalici etkinin suresi ve
   cikisi olmali" kurali. Yoksa dunya zamanla mesale tarlasina
   donerdi.                                                    */
function uzakIsik(oyuncu, boyut, konum) {
  let saat;
  try { saat = world.getTimeOfDay ? world.getTimeOfDay() : 0; }
  catch (e) { return false; }
  if (saat < EFSANE_ISIK_GECE_BAS || saat > EFSANE_ISIK_GECE_SON) return false;
  if (blokIste(1) === 0) return false;      // butce

  const aci = Math.random() * Math.PI * 2;
  const yer = {
    x: Math.floor(konum.x + Math.cos(aci) * EFSANE_ISIK_UZAK),
    y: Math.floor(konum.y),
    z: Math.floor(konum.z + Math.sin(aci) * EFSANE_ISIK_UZAK)
  };

  let blok;
  try { blok = boyut.getBlock(yer); } catch (e) { return false; }
  /* Yalniz HAVANIN yerine konuyor: kimsenin blogu silinmesin.
     Bu, Kafes'teki kararin aynisi.                           */
  if (!blok || (blok.typeId && blok.typeId !== "minecraft:air")) return false;

  try { blok.setType(EFSANE_ISIK_BLOK); } catch (e) { return false; }

  system.runTimeout(() => {
    try {
      const b = boyut.getBlock(yer);
      /* Araya giren bir sey silinmesin: yalniz BIZIM koydugumuz
         mesale kaldiriliyor.                                  */
      if (b && b.typeId === EFSANE_ISIK_BLOK) b.setType("minecraft:air");
    } catch (e) { /* onemsiz */ }
  }, EFSANE_ISIK_SURE);
  return true;
}

/* ---- GÜVENLİ HALKA ----
   Tehlikenin dusebilecegi tek yer: efsanenin GAZAP_GUVENLI ile
   GAZAP_UZAK arasi. Ic yaricap TNT'nin hasar menzilinin iki
   katindan fazla.                                             */
function halkadaNokta(konum) {
  const aci = Math.random() * Math.PI * 2;
  const uz = EFSANE_GAZAP_GUVENLI +
             Math.random() * (EFSANE_GAZAP_UZAK - EFSANE_GAZAP_GUVENLI);
  return {
    x: konum.x + Math.cos(aci) * uz,
    y: konum.y,
    z: konum.z + Math.sin(aci) * uz
  };
}

/* Efsaneye yeterince uzak mi -- PATLAMA ANINDA sorulan soru.

   Dogus anina bakmak yetmiyordu: TNT havada iki saniye kaliyor
   ve oyuncu o sirada halkanin icine YURUYEBILIR. Bu fonksiyon
   tam patlamadan once cagriliyor ve yakinsa patlama HIC
   yapilmiyor -- "muhtemelen guvenli" yerine "kesin guvenli".  */
function gazapGuvenliMi(oyuncu, yer) {
  let k;
  try { k = varlikKonumu(oyuncu) || oyuncu.location; } catch (e) { return false; }
  if (!k) return false;
  const dx = k.x - yer.x, dy = k.y - yer.y, dz = k.z - yer.z;
  return (dx * dx + dy * dy + dz * dz) >=
         EFSANE_GAZAP_GUVENLI * EFSANE_GAZAP_GUVENLI;
}

/* Diger oyuncular da halkanin disinda mi (ayar kapaliyken).
   Acikken bu denetim atlaniyor ve bunu acan kisi ne yaptigini
   bilerek aciyor.                                             */
function otekilerGuvenliMi(boyut, yer) {
  if (EFSANE_GAZAP_OYUNCU_VURUR) return true;
  let liste;
  try { liste = boyut.getPlayers ? boyut.getPlayers() : []; }
  catch (e) { return false; }        // okuyamadiysak patlatma
  for (const p of liste) {
    let k;
    try { k = p.location; } catch (e) { return false; }
    const dx = k.x - yer.x, dy = k.y - yer.y, dz = k.z - yer.z;
    if ((dx * dx + dy * dy + dz * dz) <
        EFSANE_GAZAP_GUVENLI * EFSANE_GAZAP_GUVENLI) return false;
  }
  return true;
}

/* ---- 5. TNT YAĞMURU (kaynakta: TntRain) ----
   Gorunum vanilla TNT, patlama BIZIM: guclu_tnt.js'teki ayni
   teknik. Boylece hem gucu hem breaksBlocks'u biz belirliyoruz
   -- yoksa Efsane yapisinin kendisi havaya ucardi.            */
function tntYagmuru(oyuncu, boyut, konum) {
  if (!EFSANE_GAZAP_ACIK) return false;
  let dustu = 0;
  for (let i = 0; i < EFSANE_GAZAP_TNT_ADET; i++) {
    const hedef = halkadaNokta(konum);
    const dogum = { x: hedef.x, y: hedef.y + EFSANE_GAZAP_TNT_YUKSEK, z: hedef.z };
    if (varlikIste(1) === 0) break;
    let tnt = null;
    try { tnt = boyut.spawnEntity("minecraft:tnt", dogum); } catch (e) { continue; }
    dustu++;
    system.runTimeout(() => {
      let yer = dogum;
      try { if (tnt && gecerliMi(tnt)) yer = tnt.location; } catch (e) { /* dustu */ }
      /* Vanilla TNT kendi patlamasini yapmadan kaldiriliyor,
         yoksa iki patlama olur ve BIZIM sinirlarimiz gecersiz
         kalirdi.                                              */
      try { if (tnt && gecerliMi(tnt)) tnt.remove(); } catch (e) { /* onemsiz */ }
      if (!gazapGuvenliMi(oyuncu, yer)) return;        // efsane yaklasti: iptal
      if (!otekilerGuvenliMi(boyut, yer)) return;
      if (patlamaIste(1) === 0) return;
      try {
        boyut.createExplosion(yer, EFSANE_GAZAP_TNT_GUC, {
          breaksBlocks: EFSANE_GAZAP_TNT_KIRAR,
          causesFire: false, allowUnderwater: true
        });
      } catch (e) { /* onemsiz */ }
    }, EFSANE_GAZAP_TNT_FITIL);
  }
  return dustu > 0;
}

/* ---- 6. YILDIRIM (kaynakta: Trap1) ----
   Kaynakta yildirim OYUNCUNUN konumuna dusuyor. Burada
   halkaya dusuyor -- fark tam da kullanicinin istedigi fark. */
function yildirim(oyuncu, boyut, konum) {
  if (!EFSANE_GAZAP_ACIK) return false;
  let dustu = 0;
  for (let i = 0; i < EFSANE_GAZAP_YILDIRIM_ADET; i++) {
    /* ONCE YUVARLA, SONRA OLC.

       Ilk yazilista mesafe yuvarlanmamis noktada olculuyor ama
       yildirim Math.floor edilmis noktaya dusuyordu. Yuvarlama
       mesafeyi bir bucuk bloga kadar KISALTABILIYOR ve test
       tam bunu yakaladi: sinir 16 iken 15.5 blokta bir
       yildirim. Olculen nokta ile kullanilan nokta AYNI
       olmali.                                                */
    const ham = halkadaNokta(konum);
    const yer = {
      x: Math.floor(ham.x), y: Math.floor(ham.y), z: Math.floor(ham.z)
    };
    if (!gazapGuvenliMi(oyuncu, yer)) continue;
    if (!otekilerGuvenliMi(boyut, yer)) continue;
    if (varlikIste(1) === 0) break;
    try {
      boyut.spawnEntity("minecraft:lightning_bolt", yer);
      dustu++;
    } catch (e) { /* onemsiz */ }
  }
  return dustu > 0;
}

/* Duraga yakin mi. Blok OKUNMUYOR: duraklarin koordinati
   zincirden hesaplanabiliyor (efsane_muzik.js'teki ayni karar). */
function duraktaMi(kok, konum) {
  const m2 = EFSANE_KORKU_MENZIL * EFSANE_KORKU_MENZIL;
  for (let i = 0; i < EFSANE_DURAK_SAYISI; i++) {
    const n = zincirNoktasi(kok, i);
    const dx = n.x - konum.x, dz = n.z - konum.z;
    if (dx * dx + dz * dz <= m2) return true;
  }
  return false;
}

export function efsaneKorkuTara(oyuncular) {
  if (!EFSANE_ACIK || !EFSANE_KORKU_ACIK) return;
  const simdi = system.currentTick;
  if (simdi < sonraki) return;
  sonraki = simdi + EFSANE_KORKU_TARAMA;

  const kok = kokAl();
  if (!kok) return;                 // zincir yok: tek satirda cik

  for (const oyuncu of oyuncular) {
    let konum;
    try { konum = varlikKonumu(oyuncu) || oyuncu.location; } catch (e) { continue; }
    if (!konum) continue;

    const d = durum.get(oyuncu.id) || { bitis: 0, ara: 0 };

    /* Suren bakis olayi varsa YENIDEN dondur: tek karelik bir
       donus fark edilmezdi.                                   */
    if (simdi < d.bitis) {
      bakis(oyuncu, d.aya);
      continue;
    }

    if (!duraktaMi(kok, konum)) { durum.delete(oyuncu.id); continue; }
    if (simdi < d.ara) continue;                       // olaylar arasi bosluk
    if (Math.random() > EFSANE_KORKU_SANS) continue;   // seyrek olsun

    let boyut;
    try { boyut = oyuncu.dimension; } catch (e) { continue; }

    /* Hangi olay: yer altindaysa kazma sesi de masada.       */
    const secenekler = ["bakis", "aya", "hayalet", "isik"];
    if (konum.y <= EFSANE_KAZMA_DERINLIK) secenekler.push("kazma");
    /* Gazap olaylari yalniz ACIK HAVADA: yer altinda gokten TNT
       dusemez, tavana carpip oyuncunun basina inerdi.         */
    if (EFSANE_GAZAP_ACIK && konum.y > EFSANE_KAZMA_DERINLIK) {
      secenekler.push("tnt", "yildirim");
    }
    const olay = sec(secenekler);

    let oldu = false;
    if (olay === "bakis" || olay === "aya") {
      const aya = (olay === "aya");
      oldu = bakis(oyuncu, aya);
      if (oldu) {
        durum.set(oyuncu.id,
          { bitis: simdi + EFSANE_BAKIS_SURE, ara: simdi + EFSANE_KORKU_ARA, aya });
        continue;
      }
    } else if (olay === "hayalet") {
      oldu = hayaletSes(oyuncu);
    } else if (olay === "kazma") {
      oldu = uzakKazma(oyuncu, konum.y);
    } else if (olay === "isik") {
      oldu = uzakIsik(oyuncu, boyut, konum);
    } else if (olay === "tnt") {
      oldu = tntYagmuru(oyuncu, boyut, konum);
    } else if (olay === "yildirim") {
      oldu = yildirim(oyuncu, boyut, konum);
    }

    if (oldu) durum.set(oyuncu.id, { bitis: 0, ara: simdi + EFSANE_KORKU_ARA });
  }
}
