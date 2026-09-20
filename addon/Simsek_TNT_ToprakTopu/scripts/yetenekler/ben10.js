import { system } from "@minecraft/server";
import { actionbarYaz, eldekiEsya , parcacikHalkasi, varlikKonumu} from "../yardimcilar.js";
import { BEN10_ACIK, BEN10_TARAMA, BEN10_SURE, BEN10 ,
  BEN10_DONUSUM_ACIK, BEN10_DONUSUM_RENK, BEN10_DONUSUM_PARCACIK,
  BEN10_DONUSUM_VARSAYILAN, BEN10_DONUSUM_ADET, BEN10_DONUSUM_YARICAP,
  BEN10_DONUSUM_SES, BEN10_DONUSUM_SES_GERI, BEN10_NIDA} from "../ayarlar.js";
import { beceriEfektleri } from "./beceri.js";
/* TEK YONLU ITHAL. infintrix.js buradan HICBIR SEY almiyor;
   dairesel ithal olsaydi ESM yuklenme sirasina gore biri
   `undefined` gorurdu.                                       */
import { omniIlerlet, yanmaBildir } from "./infintrix.js";

/* ================================================================
   BEN 10 -- YARATIK OLMAK                                 v4.92

   Kullanici: "Elmas kafayi, dort kolu, yuzen ceneyi ve Ates
   topunu ekle SADECE."

   ---- IS BOLUMU ----
   GORUNUS oyuncu modeli paketinde (Simsek_Oyuncu_Modeli):
   elindeki esyaya gore player.entity.json baska bir geometri
   ciziyor. Script'e o is DUSMUYOR -- v4.90'da kurulan makine.

   Bu dosyanin tek isi GUCLER: elinde hangi yaratik varsa onun
   efektlerini vermek.

   ---- NEDEN "ELINDE" ----
   query.get_equipped_item_name yalniz main_hand ve off_hand
   okuyabiliyor (zirh yuvalarini okuyamiyor). Gorunus o sorguya
   bagli oldugu icin GUC de ayni kosula bagli olmali -- yoksa
   "yaratik gibi gorunuyorum ama gucum yok" ya da tersi olurdu.
   Iki taraf TEK kaynaktan besleniyor: elindeki esya.
   ================================================================ */

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen yaratik (mesaj icin) */
const sonYaratik = new Map();
/* oyuncuId -> son ELDE TUTULAN tur. sonYaratik el bosalinca
   `undefined` oluyor (mesaj icin oyle olmali); Usta Denetimi
   ise "elinde olmasa da devam" demek, yani ayri bir hafiza
   gerekiyor.                                                 */
const sonTur = new Map();

export function ben10Unut(oyuncuId) {
  sonraki.delete(oyuncuId);
  sonYaratik.delete(oyuncuId);
  sonTur.delete(oyuncuId);
}

/* Elinde ya da yan elinde hangi yaratik var? */
export function elindekiYaratik(oyuncu) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    bilesen = undefined;
  }

  const adaylar = [];
  try {
    /* eldekiEsya KIMLIK donduruyor, esya degil. Burada da
       `.typeId` okunuyordu ve hep undefined'di; asagidaki
       dongu "typeof kimlik !== string" diye eledigi icin
       GORUNUR bir bozukluk yapmiyordu -- maskelenmis hata. */
    const el = eldekiEsya(oyuncu);
    if (el) adaylar.push(el);
  } catch (e) { /* elde bir sey yok */ }
  if (bilesen && typeof bilesen.getEquipment === "function") {
    for (const yuva of ["Mainhand", "Offhand"]) {
      try {
        const e = bilesen.getEquipment(yuva);
        if (e) adaylar.push(e.typeId);
      } catch (e) { /* yuva okunamadi */ }
    }
  }

  for (const kimlik of adaylar) {
    if (typeof kimlik !== "string") continue;
    const anahtar = kimlik.startsWith("pa:") ? kimlik.slice(3) : kimlik;
    if (BEN10.has(anahtar)) return anahtar;
  }
  return undefined;
}

/* ---- DONUSUM SAHNESI (v7.96) ----
   Tek is: donusum ANINDA bir halka parcacik ve bir ses.
   Mekanige dokunmuyor -- efektler zaten asagida veriliyor.

   Tur rengi kaynaktan OLCULDU (BEN10_DONUSUM_RENK); parcacik
   secimi ise yaklastirma, cunku vanilla parcaciklar renk
   almiyor. Gerekce ayarlar.js'te yazili.

   Ses: depoda vanilla. Kaynagin 11 nidasi ALINMADI (lisans);
   BEN10_NIDA doldurulursa ture ozel ses calar.              */
function donusumSahnesi(oyuncu, anahtar) {
  if (!BEN10_DONUSUM_ACIK) return;
  const t = anahtar ? BEN10.get(anahtar) : undefined;
  const kaynak = t ? t.kaynak : undefined;

  try {
    const k = varlikKonumu(oyuncu);
    const p = (kaynak && BEN10_DONUSUM_PARCACIK.get(kaynak)) ||
              BEN10_DONUSUM_VARSAYILAN;
    parcacikHalkasi(oyuncu.dimension, p, k,
                    BEN10_DONUSUM_ADET, BEN10_DONUSUM_YARICAP);
  } catch (e) {
    /* Cizim sus: donusumun kendisi calisti. */
  }

  try {
    const ses = t
      ? ((kaynak && BEN10_NIDA.get(kaynak)) || BEN10_DONUSUM_SES)
      : BEN10_DONUSUM_SES_GERI;
    oyuncu.dimension.playSound(ses, varlikKonumu(oyuncu));
  } catch (e) {
    /* playSound bu surumde yoksa donusum yine oldu. */
  }
}


export function ben10Tara(oyuncular) {
  if (!BEN10_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let anahtar;
    try {
      anahtar = elindekiYaratik(oyuncu);
    } catch (e) {
      continue;
    }

    const onceki = sonYaratik.get(oyuncu.id);
    if (onceki !== anahtar) {
      sonYaratik.set(oyuncu.id, anahtar);
      /* Ilk taramada (onceki undefined) ve elin bosalinca
         degil, sadece DEGISIMDE yaz.                        */
      if (onceki !== undefined || anahtar) {
        const t = anahtar ? BEN10.get(anahtar) : undefined;
        try {
          actionbarYaz(oyuncu, t
            ? "§a⌚ §f" + t.ad + " §8· " + t.tur
            : "§7⌚ İnsan halindesin");
        } catch (e) { /* mesaj onemli degil */ }
      }
      /* Yaratik degisince efektleri HEMEN ver: bir tarama
         beklemek "aldim ama bir sey olmadi" hissi verirdi.  */
      sonraki.set(oyuncu.id, 0);
      /* v7.96: DONUSUM ANI. Buraya kadar donusum sessiz ve
         gorselsizdi; kaynakta (alienevo + shout) uc katman
         vardi. Ayrinti ayarlar.js'teki blokta.              */
      donusumSahnesi(oyuncu, anahtar);
    }
    if (anahtar) sonTur.set(oyuncu.id, anahtar);

    /* ---- KISITLAMA ARTIK EL BOSKEN DE ISLIYOR (v7.93) ----
       Eskiden burada `if (!anahtar) continue;` vardi ve sayac
       hic donmezdi. Omnitrix sayaci ile Usta Denetimi el
       bosken de ilerlemek zorunda, o yuzden kisitlama yukari
       alindi. Davranis degismiyor: yaratik DEGISINCE
       `sonraki` zaten 0'a cekiliyor, yani eline alir almaz
       efektler yine aninda geliyor.                          */
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + BEN10_TARAMA);

    /* Sonsuzluk Eldiveni takili degilse bu cagri hemen
       `{engelle:false, usta:false}` donuyor -- eldivensiz
       oyuncu icin hicbir sey degismiyor.                     */
    let karar;
    try {
      karar = omniIlerlet(oyuncu.id, anahtar, BEN10_TARAMA);
    } catch (e) {
      karar = { engelle: false, usta: false };
    }
    if (karar.yandi) yanmaBildir(oyuncu);

    /* Usta Denetimi: yaratik elde olmasa da son turun gucleri
       devam ediyor -- kaynaktaki MasterControl'un karsiligi. */
    const kullan = anahtar || (karar.usta ? sonTur.get(oyuncu.id) : undefined);
    if (!kullan || karar.engelle) continue;

    const t = BEN10.get(kullan);
    /* v4.98: acilmis BECERI dugumlerinin katkisi. Agac TURE
       ait (t.taban), bicime degil -- Prototip'le kazandigin
       puani 10K'da harciyorsun, modda da oyle.

       Katkilar taban tablonun USTUNE biniyor: ayni efekt iki
       kez veriliyorsa Bedrock yuksek seviyeyi tutuyor, o
       yuzden once taban sonra beceri sirasi dogru.          */
    let ekEfektler = [];
    try {
      ekEfektler = beceriEfektleri(oyuncu.id, t.taban);
    } catch (e) {
      /* beceri defteri okunamadi: taban efektler yine gitsin */
    }
    for (const [ad, , seviye] of t.efektler.concat(ekEfektler)) {
      try {
        oyuncu.addEffect(ad, BEN10_SURE, {
          amplifier: seviye,
          /* Parcacik KAPALI: bes efekt birden acikken oyuncu
             parcacik bulutuna donuyor (zirh sistemindeki
             dersin aynisi).                                 */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa digerleri yine verilsin. */
      }
    }
  }
}

/* Menu icin: yaratik listesi. */
export function yaratikListesi(oyuncuId, secili) {
  const liste = [];
  for (const [anahtar, t] of BEN10) {
    liste.push({
      anahtar, ad: t.ad, tur: t.tur, ozet: t.ozet,
      secili: anahtar === secili
    });
  }
  return liste;
}
