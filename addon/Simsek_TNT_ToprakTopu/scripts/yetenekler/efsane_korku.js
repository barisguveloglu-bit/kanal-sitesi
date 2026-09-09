import { system, world } from "@minecraft/server";
import { varlikKonumu, gecerliMi, kaliciYaz, hataYaz } from "../yardimcilar.js";
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
  EFSANE_GAZAP_OYUNCU_VURUR,
  EFSANE_404_ACIK,
  EFSANE_SONME_ORNEK, EFSANE_SONME_YAKIN, EFSANE_SONME_UZAK,
  EFSANE_SONME_TAVAN, EFSANE_SONME_SURE, EFSANE_SONME_BLOKLAR,
  EFSANE_SONME_SES,
  EFSANE_KAPI_SES, EFSANE_KAPI_ADET, EFSANE_KAPI_ARALIK,
  EFSANE_KAPI_UZAK,
  EFSANE_KALP_SES, EFSANE_KALP_ADET, EFSANE_KALP_ARALIK,
  EFSANE_NEFES_SES, EFSANE_NEFES_UZAK,
  EFSANE_GOLGE_KIMLIK, EFSANE_GOLGE_UZAK, EFSANE_GOLGE_SURE,
  EFSANE_GOLGE_BAKIS, EFSANE_GOLGE_DENET,
  EFSANE_404_SATIRLAR, EFSANE_GOLGE_KAYIT_ANAHTAR, DEFTER_TAVAN
} from "../ayarlar.js";

/* ================================================================
   EFSANENİN KORKUSU                                v7.71 · v7.74

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
  if (oyuncuId === undefined) {
    durum.clear();
    golgeler.clear();
    mesaleDefteri.length = 0;
    golgeOkundu = false;
    return;
  }
  durum.delete(oyuncuId);
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

/* ================================================================
   ERROR 404 · ANOMALY REPHASED OLAYLARI                    v7.74

   Gerekcenin ve iki modun taramasinin tamami ayarlar.js'teki
   "EFSANENIN SESSIZLIGI" bolumunde. Ozeti: iki modun BUTUN
   varlik siniflari tarandi, hicbirinde saldiri hedefi ya da
   vurusu yok; buraya alinanlarin hicbiri hasar vermiyor.

   Bu dosyanin degismez kurali burada da gecerli:
   HICBIR OLAY OYUNCUYA ZARAR VERMEZ.
   ================================================================ */

/* ---- MESALE DEFTERI ----
   Sondurulen mesalenin nereye geri konacagi. Zamanlayici
   dusserse (dunya kapanip acilirsa, chunk bosalirsa) her
   taramada bu defter de bakiliyor -- ikinci sans.

   Kayit: { boyut, yer, tur, tik }                            */
const mesaleDefteri = [];

export function mesaleDefteriBoyu() {
  return mesaleDefteri.length;
}

/* Bir kaydi geri koy. Yerinde HAVA yoksa dokunulmuyor:
   oyuncu araya girip bir sey koyduysa onunki kalir.          */
function mesaleGeriKoy(kayit) {
  try {
    const b = kayit.boyut.getBlock(kayit.yer);
    if (!b) return false;
    if (b.typeId !== "minecraft:air") return true;   // baskasi doldurmus
    b.setType(kayit.tur);
    return true;
  } catch (e) {
    return false;      // chunk yuklu degil: defterde kalsin, sonra
  }
}

/* Vakti gelenleri geri koy. Her taramanin BASINDA cagriliyor. */
function mesaleleriTazele(simdi) {
  for (let i = mesaleDefteri.length - 1; i >= 0; i--) {
    const k = mesaleDefteri[i];
    if (simdi < k.tik) continue;
    if (mesaleGeriKoy(k)) mesaleDefteri.splice(i, 1);
    /* Geri konamadiysa DEFTERDE KALIYOR: bir dahaki taramada
       yine denenir. Sessizce dusurmek mesaleyi yok ederdi.   */
  }
}

/* ---- 7. SÖNEN MEŞALE ----
   Uc modun ucu de bunu yapiyor (Error404 CheckForTorches,
   Anomaly UnlitTorchOnTickUpdate). Turun cekirdek korkusu.

   KURE TARANMIYOR, ORNEKLENIYOR: 16 yaricapli kureyi taramak
   ~17.000 blok okumasi olurdu. 60 rastgele nokta okunuyor.
   Yan etkisi de iyi -- bazisi soner bazisi sonmez.

   YAKINDAKILER SECILMIYOR: ayaginin dibindeki mesaleyi
   sondurseydik, pencerede onu kirip kaybedebilirdi.          */
function sonenMesale(oyuncu, boyut, konum, simdi) {
  if (!EFSANE_404_ACIK) return false;
  let sondu = 0;
  for (let i = 0; i < EFSANE_SONME_ORNEK; i++) {
    if (sondu >= EFSANE_SONME_TAVAN) break;
    const aci = Math.random() * Math.PI * 2;
    const uz = EFSANE_SONME_YAKIN +
               Math.random() * (EFSANE_SONME_UZAK - EFSANE_SONME_YAKIN);
    const yer = {
      x: Math.floor(konum.x + Math.cos(aci) * uz),
      y: Math.floor(konum.y + (Math.random() * 6 - 2)),
      z: Math.floor(konum.z + Math.sin(aci) * uz)
    };
    let blok;
    try { blok = boyut.getBlock(yer); } catch (e) { continue; }
    if (!blok || EFSANE_SONME_BLOKLAR.indexOf(blok.typeId) < 0) continue;
    if (blokIste(1) === 0) break;                    // butce
    const tur = blok.typeId;
    try { blok.setType("minecraft:air"); } catch (e) { continue; }
    sondu++;
    /* Defter ONCE, zamanlayici SONRA: sirasi onemli. Defter
       yazilmadan zamanlayici kurulsaydi ve arada bir istisna
       olsaydi mesale hicbir yerde kayitli olmazdi.           */
    const kayit = { boyut, yer, tur, tik: simdi + EFSANE_SONME_SURE };
    mesaleDefteri.push(kayit);
    system.runTimeout(() => {
      const j = mesaleDefteri.indexOf(kayit);
      if (j < 0) return;                             // defter zaten koydu
      if (mesaleGeriKoy(kayit)) mesaleDefteri.splice(j, 1);
    }, EFSANE_SONME_SURE);
    try {
      boyut.playSound
        ? boyut.playSound(EFSANE_SONME_SES, yer)
        : komut(oyuncu, "playsound " + EFSANE_SONME_SES + " @s");
    } catch (e) { /* ses onemli degil */ }
  }
  return sondu > 0;
}

/* ---- 8. KAPI TIKLATMA ----
   Kaynakta uykuya bagli (SleepEvent1 -> door_knock,
   SleepEvent2 -> door_knockfast). Bedrock'ta yatak kullanimina
   kanca yok, o yuzden GECEYE baglandi. Sapma bilerek.        */
function kapiTiklat(oyuncu) {
  if (!EFSANE_404_ACIK) return false;
  let saat;
  try { saat = world.getTimeOfDay ? world.getTimeOfDay() : 0; }
  catch (e) { return false; }
  if (saat < EFSANE_ISIK_GECE_BAS || saat > EFSANE_ISIK_GECE_SON) return false;

  const aci = Math.random() * Math.PI * 2;
  const dx = (Math.cos(aci) * EFSANE_KAPI_UZAK).toFixed(1);
  const dz = (Math.sin(aci) * EFSANE_KAPI_UZAK).toFixed(1);
  let oldu = false;
  for (let i = 0; i < EFSANE_KAPI_ADET; i++) {
    const gecikme = i * EFSANE_KAPI_ARALIK;
    if (gecikme === 0) {
      oldu = komut(oyuncu,
        "playsound " + EFSANE_KAPI_SES + " @s ~" + dx + " ~ ~" + dz + " 1 0.6");
    } else {
      system.runTimeout(() => {
        if (!gecerliMi(oyuncu)) return;
        komut(oyuncu,
          "playsound " + EFSANE_KAPI_SES + " @s ~" + dx + " ~ ~" + dz + " 1 0.6");
      }, gecikme);
    }
  }
  return oldu;
}

/* ---- 9. KALP ATIŞI ----
   Kaynak: PlayerCanSeeAnomaly (toggle_heartbeat/heartbeat).
   Orada "anomaliyi goruyorken" caliyor; burada olay suresince
   caliyor -- Bedrock'ta "gorus alaninda mi" ucuz degil.      */
function kalpAtisi(oyuncu) {
  if (!EFSANE_404_ACIK) return false;
  const oldu = komut(oyuncu, "playsound " + EFSANE_KALP_SES + " @s ~ ~ ~ 1 1");
  for (let i = 1; i < EFSANE_KALP_ADET; i++) {
    system.runTimeout(() => {
      if (!gecerliMi(oyuncu)) return;
      komut(oyuncu, "playsound " + EFSANE_KALP_SES + " @s ~ ~ ~ 1 1");
    }, i * EFSANE_KALP_ARALIK);
  }
  return oldu;
}

/* ---- 10. ENSENDE NEFES ----
   Kaynak: AHuntOnEntityTickUpdate (a_breath). Ses oyuncunun
   ARKASINDAN geliyor -- bakis yonunun tersi.                 */
function ensendeNefes(oyuncu) {
  if (!EFSANE_404_ACIK) return false;
  let yon = null;
  try {
    yon = typeof oyuncu.getViewDirection === "function"
      ? oyuncu.getViewDirection() : null;
  } catch (e) { yon = null; }
  /* Yon okunamadiysa rastgele bir yon: nefes yine gelsin.    */
  let dx, dz;
  if (yon && typeof yon.x === "number") {
    dx = -yon.x * EFSANE_NEFES_UZAK;
    dz = -yon.z * EFSANE_NEFES_UZAK;
  } else {
    const aci = Math.random() * Math.PI * 2;
    dx = Math.cos(aci) * EFSANE_NEFES_UZAK;
    dz = Math.sin(aci) * EFSANE_NEFES_UZAK;
  }
  return komut(oyuncu,
    "playsound " + EFSANE_NEFES_SES + " @s ~" + dx.toFixed(1) +
    " ~ ~" + dz.toFixed(1) + " 0.7 0.6");
}

/* ---- 11. KAÇAN GÖLGE ----
   Uzakta bir sey belirir; BAKINCA kaybolur. Iki modun
   ikisinde de var (ErrorStareDespawn, APeekTick).

   Kilik `pa:carpik_kilik`: o varlik tanimindaki bilesenler
   yalniz fizik/saglik/carpisma kutusu -- HICBIR AI hedefi yok.
   Yani saldiramaz, yuruyemez, hedef alamaz. Sartin kod
   tarafindaki garantisi bu, yorum degil.                     */
function bakiyorMu(oyuncu, yer) {
  let k, yon;
  try {
    k = varlikKonumu(oyuncu) || oyuncu.location;
    yon = typeof oyuncu.getViewDirection === "function"
      ? oyuncu.getViewDirection() : null;
  } catch (e) { return false; }
  if (!k || !yon || typeof yon.x !== "number") return false;
  const dx = yer.x - k.x, dz = yer.z - k.z;
  const uz = Math.sqrt(dx * dx + dz * dz);
  if (uz < 0.001) return true;
  const yuz = Math.sqrt(yon.x * yon.x + yon.z * yon.z);
  if (yuz < 0.001) return false;
  /* Yatay duzlemde aci: dikey bakis gozardi ediliyor, cunku
     "ona dondun mu" sorusunun cevabi yatayda.                */
  const nokta = (dx * yon.x + dz * yon.z) / (uz * yuz);
  const derece = Math.acos(Math.max(-1, Math.min(1, nokta))) * 180 / Math.PI;
  return derece <= EFSANE_GOLGE_BAKIS / 2;
}

/* ---- GÖLGE DEFTERİ ----
   Kilik KALICI bir varlik. Zamanlayici zinciri dunya kapaninca
   duser ve golge orada kalir -- donusum.js'te YASANMIS tuzak,
   cozumu de orada: kimlikler dunya ozelligine yaziliyor,
   acilista taranip temizleniyor. Ayni cozum.

   Bu defter donusum.js'inkinden AYRI: oradaki kilikler CANLI
   birer donusum, buradakiler cop. Tek deftere yazsaydik acilis
   supurmesi oyuncunun gercek kiligini de silerdi.            */
const golgeler = new Set();

export function golgeSayisi() {
  return golgeler.size;
}

function golgeKaydet() {
  try {
    kaliciYaz(EFSANE_GOLGE_KAYIT_ANAHTAR, [...golgeler],
              (d, oran) => {
                const at = Math.max(1, Math.ceil(d.length * oran));
                return d.length > at ? d.slice(at) : undefined;
              }, DEFTER_TAVAN);
  } catch (e) {
    hataYaz("efsane_korku.golgeKaydet", e);
  }
}

function golgeSil(golgeId) {
  try {
    const v = world.getEntity ? world.getEntity(golgeId) : null;
    if (v && gecerliMi(v)) v.remove();
    return true;
  } catch (e) {
    /* Chunk yuklu degil: bir sonraki acilista yine denenir.
       Hata degil, bekleme.                                   */
    return false;
  }
}

let golgeOkundu = false;
export function golgeleriSupur() {
  if (golgeOkundu) return;
  golgeOkundu = true;
  try {
    const ham = world.getDynamicProperty
      ? world.getDynamicProperty(EFSANE_GOLGE_KAYIT_ANAHTAR) : "";
    if (typeof ham !== "string" || ham.length === 0) return;
    /* Eski oturumdan kalan golgeler: sahipsiz, hepsi cop.    */
    for (const id of JSON.parse(ham)) golgeSil(id);
    world.setDynamicProperty(EFSANE_GOLGE_KAYIT_ANAHTAR, "");
  } catch (e) {
    hataYaz("efsane_korku.golgeleriSupur", e);
  }
}

function kacanGolge(oyuncu, boyut, konum) {
  if (!EFSANE_404_ACIK) return false;
  if (varlikIste(1) === 0) return false;

  /* ARKAYA dogurulyor: onune cikip "buradayim" demek korku
     degil surpriz olurdu. Bakis yonu okunamazsa rastgele.    */
  let aci;
  try {
    const yon = typeof oyuncu.getViewDirection === "function"
      ? oyuncu.getViewDirection() : null;
    aci = (yon && typeof yon.x === "number")
      ? Math.atan2(-yon.z, -yon.x)
      : Math.random() * Math.PI * 2;
  } catch (e) { aci = Math.random() * Math.PI * 2; }

  const yer = {
    x: konum.x + Math.cos(aci) * EFSANE_GOLGE_UZAK,
    y: konum.y,
    z: konum.z + Math.sin(aci) * EFSANE_GOLGE_UZAK
  };
  let golge = null;
  try { golge = boyut.spawnEntity(EFSANE_GOLGE_KIMLIK, yer); }
  catch (e) { return false; }

  let golgeId = null;
  try { golgeId = golge.id; } catch (e) { golgeId = null; }
  if (golgeId) { golgeler.add(golgeId); golgeKaydet(); }

  const sil = () => {
    try { if (golge && gecerliMi(golge)) golge.remove(); }
    catch (e) { /* zaten gitmis */ }
    if (golgeId && golgeler.delete(golgeId)) golgeKaydet();
  };

  /* Bakinca kaybolsun diye periyodik denetim. Kendi kendini
     ZINCIRLIYOR (setInterval degil): boylece silinince zincir
     de biter, bosuna tik yenmez.                             */
  const denetle = (kalan) => {
    if (kalan <= 0) { sil(); return; }
    if (!golge || !gecerliMi(golge)) return;
    if (!gecerliMi(oyuncu)) { sil(); return; }
    let y;
    try { y = golge.location; } catch (e) { sil(); return; }
    if (bakiyorMu(oyuncu, y)) { sil(); return; }
    system.runTimeout(() => denetle(kalan - EFSANE_GOLGE_DENET),
                      EFSANE_GOLGE_DENET);
  };
  system.runTimeout(() => denetle(EFSANE_GOLGE_SURE), EFSANE_GOLGE_DENET);
  return true;
}

/* ---- 12. 404 KAYDI ----
   Kaynak: SeenScript ("MobID:404 left the game") ve
   PlayerSendsMessage ("wsserver 00.000.00.000:⛥∅✞∞").

   Kaynaktaki `kick @p` ALINMADI: Bedrock davranis paketinde
   yok, sahte bir baglanti kopmasi uretmek de olsa yapmazdik.
   Geriye satirin kendisi kaliyor -- korkusu ayni, yalani yok.

   Ad UYDURMA DEGIL: gercek bir oyuncu adini taklit etmiyor. */
function kayit404(oyuncu) {
  if (!EFSANE_404_ACIK) return false;
  return komut(oyuncu,
    "tellraw @s {\"rawtext\":[{\"text\":\"" + sec(EFSANE_404_SATIRLAR) + "\"}]}");
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

  /* Defter ONCE: zincir kurulmamis olsa bile sondurulmus bir
     mesale varsa geri konmali. Yoksa EFSANE_ACIK kapatilinca
     mesale sonsuza kadar sonuk kalirdi.                      */
  golgeleriSupur();                 // ilk taramada bir kez
  mesaleleriTazele(simdi);

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
    /* v7.74 olaylari: hepsi hasarsiz, her yerde gecerli.     */
    if (EFSANE_404_ACIK) {
      secenekler.push("sonme", "kapi", "kalp", "nefes", "golge", "kayit");
    }
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
    } else if (olay === "sonme") {
      oldu = sonenMesale(oyuncu, boyut, konum, simdi);
    } else if (olay === "kapi") {
      oldu = kapiTiklat(oyuncu);
    } else if (olay === "kalp") {
      oldu = kalpAtisi(oyuncu);
    } else if (olay === "nefes") {
      oldu = ensendeNefes(oyuncu);
    } else if (olay === "golge") {
      oldu = kacanGolge(oyuncu, boyut, konum);
    } else if (olay === "kayit") {
      oldu = kayit404(oyuncu);
    }

    if (oldu) durum.set(oyuncu.id, { bitis: 0, ara: simdi + EFSANE_KORKU_ARA });
  }
}
