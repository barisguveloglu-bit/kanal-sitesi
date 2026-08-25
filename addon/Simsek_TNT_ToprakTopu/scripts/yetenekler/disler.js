import { system, world } from "@minecraft/server";
import { varlikIste } from "../butce.js";
import { hataYaz, gecerliMi, varlikKonumu } from "../yardimcilar.js";
import { botunSahibi, botVarliklari } from "./_bot_defteri.js";
import {
  OKAZOR_DIS_ACIK, DIS_VARLIK, DIS_BEKLEME, DIS_MENZIL, DIS_YAKIN,
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
export function disTara() {
  if (kuyruk.length === 0) return;
  while (kuyruk.length > 0) {
    if (varlikIste(1) < 1) return;          // butce doldu, sonraki tick
    const d = kuyruk.shift();
    try {
      d.boyut.spawnEntity(DIS_VARLIK, d.yer);
    } catch (e) {
      /* Varlik dogmadi: kimlik yok ya da parca yuklu degil.
         Bir kere bildir, kuyrugun kalanini bosalt -- ayni
         hata her dis icin tekrarlanmasin.                  */
      hataYaz("disler.spawn", e);
      kuyruk.length = 0;
      return;
    }
  }
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
