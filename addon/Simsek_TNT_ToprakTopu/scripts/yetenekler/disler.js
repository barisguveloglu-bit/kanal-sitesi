import * as api from "@minecraft/server";
import { system, world } from "@minecraft/server";
import { varlikIste } from "../butce.js";
import {
  hataYaz, bilgiYaz, gecerliMi, varlikKonumu, parcacikHalkasi
} from "../yardimcilar.js";
import { botunSahibi, botVarliklari } from "./_bot_defteri.js";
import {
  OKAZOR_DIS_ACIK, DIS_VARLIK, DIS_BEKLEME, DIS_MENZIL, DIS_YAKIN,
  DIS_YEDEK_HASAR, DIS_YEDEK_YARICAP, DIS_YEDEK_PARCACIK, DIS_YEDEK_ADET,
  DIS_CIZGI_ADET, DIS_CIZGI_ARALIK, DIS_HALKA_ADET, DIS_HALKA_YARICAP,
  DIS_DOST_UZAK, DIS_ZEMIN_TARAMA, DIS_TAVAN, botTuruMu
} from "../ayarlar.js";

/* ============================================================
   OKAZOR'UN DISLERI  (v4.85)

   Kullanici: "evoker Minecraft'ta yerden tuzak cikartiyor ve
   ona denk gelirsen hasar veriyor ya, iste o yetenegi Okazor'a
   verelim."

   Vanilla evoker'in dizilimi iki turlu ve ikisi de burada:
     hedef YAKINSA (DIS_YAKIN)  -> etrafinda HALKA
     uzaksa                     -> Okazor'dan hedefe DUZ CIZGI

   ---- NEDEN VANILLA VARLIGI ----
   minecraft:evocation_fang zaten yerden cikma animasyonunu,
   sesini ve hasarini tasiyor. Kendi varligimizi yazmak ayni
   seyi daha kotu taklit etmek olurdu (bkz. v4.28: ozel cizim
   yolu botu uc surum gorunmez yapti).

   Bedeli: dis kimin cikardigini BILMIYOR. Dogal olarak cikan
   disler illager'lara zarar vermiyor ama script'in cikardigi
   disler HERKESI vuruyor. Okazor senin tarafinda oldugu icin
   bu kabul edilemez -- asagidaki dostVar() her noktayi
   koymadan once suzuyor.
   ============================================================ */

/* Son ne zaman dis cikardi: bot basina. */
const sonDis = new Map();

/* ---- DISLER TICK'LERE YAYILIYOR (v4.85) ----
   Ilk yazimda sekiz dis TEK tickte doguruluyordu ve test bunu
   yakaladi: TICK_VARLIK_BUTCESI = 4, yani butun oyuncular
   arasinda paylasilan tick basina dort varlik. Sekiz dis
   butcenin iki katiydi; yarisi sessizce dusuyordu.

   Cozum sayiyi kismak DEGIL, kuyruga almak. Ustelik bu
   VANILLA'YA DAHA YAKIN: evoker'in disleri de birbiri
   ardina, dalga halinde cikiyor -- hepsi ayni anda degil.
   Yani butce kisiti burada gorseli iyilestirdi.            */
const kuyruk = [];

export function dislerUnut(botId) {
  sonDis.delete(botId);
  for (let i = kuyruk.length - 1; i >= 0; i--) {
    if (kuyruk[i].botId === botId) kuyruk.splice(i, 1);
  }
}

/* Merkezi tick'ten cagriliyor (main.js). Kuyruk bosken hic
   donmiyor -- kalp/bot taramalariyla ayni kural.            */
/* ---------------- DIS VARLIGI VAR MI  (v7.9.9) ----------------
   Oyunda su hata alindi:
     disler.spawn: Invalid value passed to argument [0].
     'minecraft:evocation_fang' is not a valid entity type.

   Yani spawnEntity bu varligi kabul etmiyor. DOGRU KIMLIGI
   TAHMIN ETMIYORUZ. Onun yerine oyuna SORULUYOR; kabul
   etmiyorsa ayni isi kendimiz yapiyoruz (asagida).

   Cevap BIR KEZ okunuyor ve saklaniyor: her diste sormak hem
   bosuna hem de hatayi tekrar tekrar gunluge dokerdi -- oyunda
   olan da buydu.                                              */
let disVarligiVar;

function disVarligiSinali() {
  if (disVarligiVar !== undefined) return disVarligiVar;
  disVarligiVar = false;
  try {
    const EntityTypes = api.EntityTypes;
    if (EntityTypes && typeof EntityTypes.get === "function") {
      disVarligiVar = !!EntityTypes.get(DIS_VARLIK);
    } else {
      /* EntityTypes yoksa denemeye deger: spawnEntity yine de
         calisiyor olabilir. Basarisiz olursa asagida yedege
         gecilir.                                              */
      disVarligiVar = true;
    }
  } catch (e) {
    disVarligiVar = false;
  }
  if (!disVarligiVar) {
    bilgiYaz("Okazor'un disleri: '" + DIS_VARLIK + "' bu surumde " +
             "dogurulamiyor. Disler artik parcacik + hasar olarak " +
             "cikiyor (ayni hasar: " + DIS_YEDEK_HASAR + ").");
  }
  return disVarligiVar;
}

/* Yedek dis: varlik yerine parcacik + cevresine hasar.
   Oynanis ayni -- yerden bir sey cikiyor ve ustundekini
   isiriyor. Hasar vanilla disin verdigiyle AYNI tutuldu ki
   iki yol arasinda guc farki olmasin.                        */
function yedekDis(d) {
  parcacikHalkasi(d.boyut, DIS_YEDEK_PARCACIK, d.yer,
                  DIS_YEDEK_ADET, 0.45);
  let yakin;
  try {
    yakin = d.boyut.getEntities({
      location: d.yer,
      maxDistance: DIS_YEDEK_YARICAP,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    return;
  }
  /* DOST ELEMESI.
     Noktanin KENDISI kuyruga girerken zaten dostVar() ile
     suzulmustu; ama yedek yol HASARI simdi veriyor ve o
     aradan geçen surede biri oraya yurumus olabilir. O yuzden
     hedefler burada bir daha eleniyor:
       - sahip (sen)
       - butun bot turleri (Ilkel Besli dahil, botTuruMu)
     Vanilla disin kendisi de sahibine vurmuyor; davranis ayni
     kalsin diye.                                             */
  let sahipId;
  try { sahipId = botunSahibi(d.botId); } catch (e) { sahipId = undefined; }
  for (const v of yakin) {
    try {
      if (!gecerliMi(v)) continue;
      if (v.id === d.botId) continue;                 // kendini isirmasin
      if (sahipId && v.id === sahipId) continue;      // sahibi
      if (botTuruMu(v.typeId)) continue;              // ekip arkadasi
      /* `cause` ZORUNLU: yoksa "Native variant type conversion
         failed" aliniyor -- v7.9.9'da isinda tam bu yasandi. */
      v.applyDamage(DIS_YEDEK_HASAR, { cause: "entityAttack" });
    } catch (e) {
      /* tek bir hedef vurulamadi; digerleri devam etsin */
    }
  }
}

export function disTara() {
  if (kuyruk.length === 0) return;
  /* Sinal HER DONGUDE yeniden okunuyor, dongunun BASINDA bir
     kez degil. Sebebi olculdu: bir salvoda sekiz dis var ve
     ilk dis dogurulamayinca `disVarligiVar` false'a cekiliyor
     -- ama dongu basinda alinmis eski deger elde kaldigi icin
     kalan yedi dis de tek tek deneniyor ve tek tek atiyordu.
     Testte dort dogurma denemesi sayildi; olmasi gereken bir.  */
  while (kuyruk.length > 0) {
    if (varlikIste(1) < 1) return;          // butce doldu, sonraki tick
    const d = kuyruk.shift();
    if (!disVarligiSinali()) {
      try {
        yedekDis(d);
      } catch (e) {
        hataYaz("disler.yedek", e);
      }
      continue;
    }
    try {
      d.boyut.spawnEntity(DIS_VARLIK, d.yer);
    } catch (e) {
      /* Varlik dogmadi. Bir kere bildir ve KALICI olarak
         yedege gec -- eskiden kuyruk bosaltilip birakiliyordu,
         yani her vuruste yeniden denenip yeniden hata
         yaziliyordu (oyunda gorulen spam buydu) ve disler hic
         cikmiyordu.                                          */
      hataYaz("disler.spawn", e);
      disVarligiVar = false;
      bilgiYaz("Okazor'un disleri yedek yola gecti " +
               "(parcacik + " + DIS_YEDEK_HASAR + " hasar).");
      /* Basarisiz disi KUYRUGA GERI KOY, burada yedekDis()
         cagirma. Ikisi de ayni isi yapardi ama geri koymanin
         iki ustunlugu var:
           1. Tek yol kaliyor -- yedege gecis mantigi bir
              yerde duruyor, iki yerde degil.
           2. Bir sonraki donguda `disVarligiVar` artik false
              oldugu icin bu dis de yedekten cikiyor; hicbir
              dis DUSMUYOR. Eskiden catch icinde ayrica
              cagrilmasaydi tam bu dis kaybolurdu.          */
      kuyruk.unshift(d);
    }
  }
}

/* Testler ve dunya degisimi icin: sinali unut. */
export function disVarligiUnut() {
  disVarligiVar = undefined;
}

/* Bu noktanin yakininda bir DOST var mi?

   Dost = disi cikaran botun sahibi (sen), sahibinin butun
   botlari, ve dis cikaran botun kendisi. Baska bir oyuncu
   dost SAYILMIYOR: "arkadasin da dahil" kurali savas
   hedeflerinde gecerli ama disler alan silahi, orada
   ayrim yapamayiz -- yine de sahip her zaman korunuyor.  */
function dostVar(boyut, nokta, dostlar) {
  for (const d of dostlar) {
    const dx = d.x - nokta.x;
    const dz = d.z - nokta.z;
    const dy = d.y - nokta.y;
    if (dx * dx + dz * dz + dy * dy <= DIS_DOST_UZAK * DIS_DOST_UZAK) {
      return true;
    }
  }
  return false;
}

/* Dostlarin konumlari. Bir kez toplaniyor: her dis icin
   yeniden oyuncu/bot taramak DIS_TAVAN kat maliyet olurdu. */
function dostNoktalari(bot) {
  /* ---- OKAZOR'UN KENDISI DOST LISTESINDE DEGIL ----
     Ilk yazimda vardi ve HALKA dizilimini tamamen olduruyordu:
     hedef yakinken halka Okazor'un da DIS_DOST_UZAK cemberine
     giriyor, butun noktalar eleniyordu. Test "yakin hedef ->
     halka" bolumunde sifir dis gordu.

     Vanilla evoker de kendi halkasinin icinde duruyor. Dis
     hasari 6 ve Okazor'un 2400 cani var -- yani kendi disine
     basmasi oynanista fark etmiyor. Sahibi ve DIGER botlar
     listede kaliyor, korunan sey onlar.                     */
  const liste = [];
  const sahipId = botunSahibi(bot);
  if (!sahipId) return liste;

  try {
    for (const o of world.getAllPlayers()) {
      if (o.id !== sahipId) continue;
      liste.push(varlikKonumu(o));
    }
  } catch (e) { /* oyuncu listesi okunamadi */ }

  /* Sahibin diger botlari: Okazor kendi ekibini bicmesin. */
  try {
    for (const b of botVarliklari(sahipId)) {
      if (!gecerliMi(b)) continue;
      if (b.id === bot.id) continue;          // disleri cikaran kendisi
      if (!botTuruMu(b.typeId)) continue;
      liste.push(varlikKonumu(b));
    }
  } catch (e) { /* defter okunamadi */ }

  return liste.filter((n) => n && typeof n.x === "number");
}

/* Noktanin altindaki SAGLAM zemini bulur. Donen: dis konacak
   y, ya da undefined.

   Disler havada duramaz. Vanilla da ayni sekilde zemini
   ariyor; havadan asagi en fazla DIS_ZEMIN_TARAMA blok.    */
function zeminBul(boyut, x, y, z) {
  const koord = { x: Math.floor(x), y: 0, z: Math.floor(z) };
  for (let d = 1; d <= DIS_ZEMIN_TARAMA; d++) {
    koord.y = Math.floor(y) + 1 - d;
    let alt;
    try {
      alt = boyut.getBlock(koord);
    } catch (e) {
      return undefined;                 // yuklenmemis parca
    }
    if (!alt || alt.isAir) continue;
    /* Ustu bos olmali, yoksa dis duvarin icinde cikar. */
    let ust;
    try {
      ust = boyut.getBlock({ x: koord.x, y: koord.y + 1, z: koord.z });
    } catch (e) {
      return undefined;
    }
    if (!ust || !ust.isAir) continue;
    return koord.y + 1;
  }
  return undefined;
}

/* Dizilim: yakinsa halka, uzaksa cizgi -- vanilla ile ayni. */
function noktalar(bas, hedef) {
  const dx = hedef.x - bas.x;
  const dz = hedef.z - bas.z;
  const uzak = Math.sqrt(dx * dx + dz * dz);
  const liste = [];

  if (uzak <= DIS_YAKIN) {
    /* HALKA: hedefin etrafinda. */
    for (let i = 0; i < DIS_HALKA_ADET; i++) {
      const a = (Math.PI * 2 * i) / DIS_HALKA_ADET;
      liste.push({
        x: hedef.x + Math.cos(a) * DIS_HALKA_YARICAP,
        y: hedef.y,
        z: hedef.z + Math.sin(a) * DIS_HALKA_YARICAP
      });
    }
    return liste;
  }

  /* CIZGI: Okazor'dan hedefe dogru. Ilk dis botun DIBINDE
     cikmiyor -- bir blok ileriden basliyor ki kendi ayagina
     tuzak kurmus gibi olmasin.                              */
  const bx = dx / uzak, bz = dz / uzak;
  for (let i = 1; i <= DIS_CIZGI_ADET; i++) {
    const d = i * DIS_CIZGI_ARALIK;
    liste.push({ x: bas.x + bx * d, y: hedef.y, z: bas.z + bz * d });
  }
  return liste;
}

/* Okazor bir seye vurdu: yerden disleri cikar.
   Donen deger sadece bilgi amacli (kac dis cikti).          */
export function disleriCikar(bot, kurban) {
  if (!OKAZOR_DIS_ACIK) return 0;
  if (!gecerliMi(bot) || !gecerliMi(kurban)) return 0;

  const simdi = system.currentTick;
  const son = sonDis.get(bot.id);
  if (son !== undefined && simdi - son < DIS_BEKLEME) return 0;

  let bas, hedef, boyut;
  try {
    bas = varlikKonumu(bot);
    hedef = varlikKonumu(kurban);
    boyut = bot.dimension;
  } catch (e) {
    return 0;
  }
  if (!bas || !hedef || !boyut) return 0;

  const dx = hedef.x - bas.x, dz = hedef.z - bas.z;
  if (dx * dx + dz * dz > DIS_MENZIL * DIS_MENZIL) return 0;

  /* Bekleme SAYAC dis cikmasa bile isliyor: hedef her
     vuruşta menzil disindaysa her vurusta yeniden
     hesaplamayalim.                                        */
  sonDis.set(bot.id, simdi);

  const dostlar = dostNoktalari(bot);
  let sirada = 0;

  for (const n of noktalar(bas, hedef)) {
    if (sirada >= DIS_TAVAN) break;

    const y = zeminBul(boyut, n.x, n.y, n.z);
    if (y === undefined) continue;

    const yer = { x: Math.floor(n.x) + 0.5, y, z: Math.floor(n.z) + 0.5 };
    if (dostVar(boyut, yer, dostlar)) continue;   // dost atesi yok

    kuyruk.push({ botId: bot.id, boyut, yer });
    sirada++;
  }
  return sirada;
}
