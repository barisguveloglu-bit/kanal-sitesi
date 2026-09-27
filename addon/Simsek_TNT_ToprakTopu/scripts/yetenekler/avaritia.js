import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt,
  olayaAbone, varlikKonumu, yukseklikAraligi
} from "../yardimcilar.js";
import { blokIste } from "../butce.js";
import {
  AVA_ACIK, AVA_SIRA_BAS,
  AVA_DIKEN_SURE, AVA_DIKEN_ORAN, AVA_DIKEN_TAVAN, AVA_DIKEN_PARCACIK,
  AVA_AGAC_SURE, AVA_AGAC_ARA, AVA_AGAC_PARTI, AVA_AGAC_TAVAN, AVA_AGAC_TARAMA,
  AVA_AGAC_MENZIL, AVA_AGAC_YAPRAK_UZAK, AVA_AGAC_KUTUK, AVA_AGAC_YAPRAK,
  AVA_BEDROCK_MENZIL, AVA_BEDROCK_SURE, AVA_BEDROCK_PARCACIK,
  AVA_BEDROCK_TIPLER,
  KILIT_ATLA_TIPLER
} from "../ayarlar.js";

/* AVARITIA ULTIMATE'TEN UC MEKANIK              v7.91

   Kullanici: "moddaki her seyi alalim gitsin vallahi zirhi da
   alalim." Zirh v7.90'da alindi. Olcum
   REFERANS_AVARITIA.md'de: 49 script modulunun yarisindan
   cogu tarif/arayuz tesisati; gercek mekanik ~20 ve cogunun
   bizde karsiligi var. Buradaki uc tanesi karsiligi HIC
   olmayanlar.                                              */

let _sira = AVA_SIRA_BAS;
const yeni = (kimlik, ad, olustur) => yetenekKaydet({
  kimlik, ad, esyasiz: true, sira: _sira++, olustur
});

function sureliIs(ad, oyuncu, sure, ara, adim, bitirme) {
  const bas = system.currentTick;
  let sonraki = bas;
  return {
    ad, oyuncuId: oyuncu.id,
    calis() {
      const simdi = system.currentTick;
      if (simdi - bas >= sure) return true;
      if (simdi < sonraki) return false;
      sonraki = simdi + ara;
      try { if (adim() === true) return true; }
      catch (e) { hataYaz(ad + ".adim", e); }
      return false;
    },
    bitir() { try { if (bitirme) bitirme(); } catch (e) { hataYaz(ad + ".bitir", e); } }
  };
}


/* ============================================================
   1. DIKEN ZIRHI  (kaynakta: xtreme_effects thorns surplus)

   Vurana hasarin bir kismi geri donuyor. Kullanicinin
   "tamamen savunmaya yonelik" yonune tam oturuyor: saldiran
   ceza aliyor, sen saldirmiyorsun.
   ============================================================ */

/* oyuncuId -> bitis ticki */
const dikende = new Map();
export function dikenUnut(oyuncuId) {
  if (oyuncuId === undefined) dikende.clear();
  else dikende.delete(oyuncuId);
}
export function dikenAcikMi(oyuncuId) {
  const b = dikende.get(oyuncuId);
  return b !== undefined && system.currentTick < b;
}

export function dikenKur() {
  if (!AVA_ACIK) return false;
  return olayaAbone("entityHurt", (olay) => {
    try {
      const kurban = olay && olay.hurtEntity;
      if (!kurban || kurban.typeId !== "minecraft:player") return;
      if (!dikenAcikMi(kurban.id)) return;

      const hasar = (olay && typeof olay.damage === "number") ? olay.damage : 0;
      if (hasar <= 0) return;

      let vuran;
      try { vuran = olay.damageSource && olay.damageSource.damagingEntity; }
      catch (e) { vuran = undefined; }
      /* Vuran YOKSA (dusme, aclik, zehir) yansitacak kimse
         yok. Kaynakta da ayni denetim var.                 */
      if (!vuran || !gecerliMi(vuran)) return;
      if (vuran.id === kurban.id) return;                 // kendimize asla
      if (KILIT_ATLA_TIPLER.has(vuran.typeId)) return;    // botlarimiza asla

      /* TAVAN: yansima hasarin tamamini gecemiyor. Gecseydi
         vuran kendi vurusundan olurdu ve bu bir savunma
         degil tuzak olurdu.                                */
      const geri = Math.min(AVA_DIKEN_TAVAN, hasar * AVA_DIKEN_ORAN);
      if (geri < 1) return;
      try {
        vuran.applyDamage(geri, { cause: "thorns", damagingEntity: kurban });
      } catch (e) {
        try { vuran.applyDamage(geri); }
        catch (e2) { hataYaz("ava.diken.hasar", e2); return; }
      }
      parcacikAt(kurban.dimension, AVA_DIKEN_PARCACIK,
                 varlikKonumu(vuran) || vuran.location);
    } catch (e) {
      hataYaz("ava.diken", e);
    }
  });
}

yeni("diken_zirhi", "Diken Zirhi", (oyuncu) => {
  if (!AVA_ACIK) return undefined;
  kollariIndir(oyuncu);
  const bitis = system.currentTick + AVA_DIKEN_SURE;
  dikende.set(oyuncu.id, bitis);
  actionbarYaz(oyuncu, "§c✷ §fDiken Zırhı §8· " +
                       (AVA_DIKEN_SURE / 20).toFixed(0) + " sn");
  return sureliIs("diken_zirhi", oyuncu, AVA_DIKEN_SURE, 20, () => {
    if (gecerliMi(oyuncu)) parcacikAt(oyuncu.dimension, AVA_DIKEN_PARCACIK,
                                      oyuncu.location);
  }, () => {
    dikende.delete(oyuncu.id);
    if (gecerliMi(oyuncu)) actionbarYaz(oyuncu, "§7Diken Zırhı kapandı");
  });
});


/* ============================================================
   2. AGAC DEVIRME  (kaynakta: veinMining.js)

   Kaynagin ADI `veinMining` ama yaptigi is cevher damari
   DEGIL agac: listesi yalniz `_log`, `_stem`, `_leaves`,
   `wart_block`, `mangrove_roots`. Adina bakip "damar
   madenciligi" demek yanlis olurdu; koda bakildi.
   ============================================================ */
function sonEk(tip, liste) {
  if (typeof tip !== "string") return false;
  for (const e of liste) if (tip.endsWith(e)) return true;
  return false;
}

/* Baktigin kutuk. Yoksa undefined.                          */
function bakilanKutuk(oyuncu) {
  try {
    if (typeof oyuncu.getBlockFromViewDirection !== "function") return undefined;
    const v = oyuncu.getBlockFromViewDirection({ maxDistance: AVA_AGAC_MENZIL });
    const b = v && v.block;
    if (!b) return undefined;
    return sonEk(b.typeId, AVA_AGAC_KUTUK) ? b : undefined;
  } catch (e) { return undefined; }
}

/* Bagli kutuk ve yapraklari topla. Kaynaktaki genislik-once
   taramanin aynisi, sinirlari bizim butcemize gore kucuk.

   ---- NEDEN PARCA PARCA (v7.98.2) ----
   Eskiden tarama yetenek BASLARKEN tek karede yapiliyordu:
   160 blokluk bir agacta 303 getBlock -- tick kotasi 56.
   Yazma partilere bolunmustu, okuma bolunmemisti. Kota
   getBlock'u da sayiyor (ayarlar.js TICK_BLOK_BUTCESI), yani
   yarisini butceye sokmak yetmiyordu.

   Artik tarayici durumunu tutuyor: ilerle(n) en fazla n blok
   okuyor ve kaldigi yerden devam ediyor. Bulunan blok hemen
   kirilabilir: komsulari BULUNDUGU anda kuyruga girdi, bir
   daha okunmuyor.                                          */
export function agacTarayici(boyut, kok) {
  const kuyruk = [{ k: kok.location, d: 0 }];
  let bas = 0;                                   // shift yerine: O(1)
  const gorulen = new Set();
  const bulunan = [];
  const anahtar = (k) => k.x + "," + k.y + "," + k.z;
  const bitti = () => bas >= kuyruk.length || bulunan.length >= AVA_AGAC_TAVAN;

  /* En fazla `izin` blok okur, okudugu sayiyi dondurur. Gorulmus
     konum okuma harcamaz -- butce yalniz getBlock'a gidiyor.  */
  function ilerle(izin) {
    let okunan = 0;
    while (okunan < izin && !bitti()) {
      const { k, d } = kuyruk[bas++];
      const a = anahtar(k);
      if (gorulen.has(a)) continue;
      gorulen.add(a);

      okunan++;
      let blok;
      try { blok = boyut.getBlock(k); } catch (e) { continue; }
      if (!blok) continue;
      const tip = blok.typeId;

      const kutuk = sonEk(tip, AVA_AGAC_KUTUK);
      const yaprak = sonEk(tip, AVA_AGAC_YAPRAK);
      if (!kutuk && !yaprak) continue;
      /* Yaprak yalniz kutuge YAKINSA aliniyor -- kaynakta da
         `distance <= 6`. Yoksa komsu agacin yapraklari da
         gelirdi.                                           */
      if (yaprak && d > AVA_AGAC_YAPRAK_UZAK) continue;

      bulunan.push({ x: k.x, y: k.y, z: k.z });
      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        kuyruk.push({ k: { x: k.x + dx, y: k.y + dy, z: k.z + dz },
                      d: kutuk ? 0 : d + 1 });
      }
    }
    return okunan;
  }
  return { bulunan, bitti, ilerle };
}

/* Tamamini bir kerede tara. BUTCESIZ: yalniz test ve olcum
   icin. Yetenek bunu cagirmiyor, agacTarayici'yi partiyle
   kullaniyor.                                              */
export function agaciTara(boyut, kok) {
  const t = agacTarayici(boyut, kok);
  while (!t.bitti()) t.ilerle(Infinity);
  return t.bulunan;
}

yeni("agac_devir", "Agac Devir", (oyuncu) => {
  if (!AVA_ACIK) return undefined;
  kollariIndir(oyuncu);
  const kok = bakilanKutuk(oyuncu);
  if (!kok) {
    actionbarYaz(oyuncu, "§7Bir kütüğe bak");
    return undefined;
  }
  /* "Agac bulunamadi" dali artik yok: kok bir kutuk
     (bakilanKutuk sordu), taramanin ilk bulgusu o.         */
  const boyut = oyuncu.dimension;
  const tarayici = agacTarayici(boyut, kok);
  const liste = tarayici.bulunan;

  let i = 0;
  actionbarYaz(oyuncu, "§2🪓 §fAğaç devriliyor");
  return sureliIs("agac_devir", oyuncu, AVA_AGAC_SURE, AVA_AGAC_ARA, () => {
    /* BUTCE: tick basina blok kotasi bu depoda kural ve
       getBlock'u da sayiyor. Once okuma, sonra yazma; ikisi
       de kendi payini istiyor.                             */
    /* Okuma payi TEK TEK isteniyor (ftech.js ile ayni):
       iade yolu yok, toplu istenip okunmayan pay o tick baska
       isten eksilirdi. Kuyrugun boyu da is yol almadan
       bilinmiyor -- okudukca buyuyor. v7.98.2'nin ilk
       yazilisi kuyruk boyuyla sinirliyordu ve tarama cagri
       basina 1-6 blok ilerliyordu.                          */
    for (let n = 0; n < AVA_AGAC_TARAMA && !tarayici.bitti(); n++) {
      if (blokIste(1) < 1) break;
      tarayici.ilerle(1);
    }
    if (i >= liste.length) return tarayici.bitti();  // is bitti mi
    const izin = blokIste(Math.min(AVA_AGAC_PARTI, liste.length - i));
    if (izin === 0) return false;
    for (let k = 0; k < izin; k++) {
      const p = liste[i++];
      try {
        /* `setblock ... destroy` DUSURSUN diye: agac devirmenin
           anlami odunu almak. (Kafeste ayni komut BILEREK
           reddedilmisti -- orada dusurmek onu bir kazma
           aletine cevirirdi; burada dusurmek isin kendisi.) */
        boyut.runCommand("setblock " + p.x + " " + p.y + " " + p.z +
                         " air destroy");
      } catch (e) { hataYaz("ava.agac.kir", e); }
    }
    return false;
  }, () => {
    if (gecerliMi(oyuncu)) {
      actionbarYaz(oyuncu, "§2🪓 §f" + i + " blok devrildi");
    }
  });
});


/* ============================================================
   3. BEDROCK KIRICI  (kaynakta: bedrock_breaker.js)

   Kaynakta neutronium kazmasiyla 188 tick suruyor. Sure
   aynen alindi; kazma yerine yetenek.
   ============================================================ */
yeni("bedrock_kir", "Bedrock Kir", (oyuncu) => {
  if (!AVA_ACIK) return undefined;
  kollariIndir(oyuncu);
  let blok;
  try {
    if (typeof oyuncu.getBlockFromViewDirection !== "function") {
      actionbarYaz(oyuncu, "§7Bakılan blok okunamıyor");
      return undefined;
    }
    const v = oyuncu.getBlockFromViewDirection({ maxDistance: AVA_BEDROCK_MENZIL });
    blok = v && v.block;
  } catch (e) { hataYaz("ava.bedrock.bak", e); return undefined; }
  if (!blok || AVA_BEDROCK_TIPLER.indexOf(blok.typeId) === -1) {
    actionbarYaz(oyuncu, "§7Bedrock'a bak");
    return undefined;
  }

  /* ---- EN ALT KATMAN KIRILMIYOR ----
     Kaynakta boyle bir sinir YOK. Burada var: dunyanin en alt
     katmani kirilirsa altinda BOSLUK kalir. Kullanicinin
     "Efsanenin Dunyasi" dunyasi TEK KAT bedrock -- orada bu
     yetenek zemini delip dunyayi kullanilamaz yapardi. Bir
     yetenek kullanicinin dunyasini geri alinamaz bicimde
     bozmamali.                                             */
  const sinir = yukseklikAraligi(oyuncu.dimension);
  const taban = sinir && typeof sinir.min === "number" ? sinir.min : undefined;
  const y = blok.location.y;
  if (taban !== undefined && y <= taban) {
    actionbarYaz(oyuncu, "§c✖ §7En alt katman kırılmıyor §8· zemin delinir");
    return undefined;
  }

  const boyut = oyuncu.dimension;
  const yer = { x: blok.location.x, y, z: blok.location.z };
  const bas = system.currentTick;
  actionbarYaz(oyuncu, "§8⛏ §fBedrock kırılıyor §8· " +
                       (AVA_BEDROCK_SURE / 20).toFixed(1) + " sn");

  /* ---- SURE TAVANI GENIS, BILEREK  (v7.91) ----
     Ilk yazilista `AVA_BEDROCK_SURE + 2` idi ve blok HIC
     kirilmiyordu. Sebebi olculur: `sureliIs` once "sure doldu
     mu" diye bakip `true` donuyor, adim ONDAN SONRA
     calisiyor. Adim araligi 10 tick oldugu icin son adim
     190. tickte gelecekti ama is 190'da zaten bitmis
     oluyordu -- yani kirma adimina hic sira gelmiyordu.

     Tavan artik genis: isi BITIREN sey adimin kendisi
     (`return true`), tavan yalniz emniyet.                 */
  return sureliIs("bedrock_kir", oyuncu, AVA_BEDROCK_SURE + 60, 10, () => {
    const gecen = system.currentTick - bas;
    if (gecen < AVA_BEDROCK_SURE) {
      parcacikAt(boyut, AVA_BEDROCK_PARCACIK, yer);
      if (gecerliMi(oyuncu)) {
        actionbarYaz(oyuncu, "§8⛏ §7" +
          Math.ceil((AVA_BEDROCK_SURE - gecen) / 20) + " sn");
      }
      return false;
    }
    if (blokIste(1) === 0) return false;
    try { boyut.getBlock(yer).setType("minecraft:air"); }
    catch (e) { hataYaz("ava.bedrock.kir", e); }
    if (gecerliMi(oyuncu)) actionbarYaz(oyuncu, "§a⛏ §fBedrock kırıldı");
    return true;
  });
});
