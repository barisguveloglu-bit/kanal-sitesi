import { world, system } from "@minecraft/server";

import {
  SURUM, BEKLEME, KOL_GECIKME, TICK_BLOK_BUTCESI, OLCUM_ACIK,
  OLCUM_SOHBETE, HATA_SOHBETE, ESYASIZ_ACIK, ESYASIZ_EGILME_SART,
  ESYASIZ_BAKIS_ESIGI, ESYASIZ_TUTMA, ESYASIZ_TARAMA,
  KOL_VER_ACIK, KOL_VER_ESIGI, KOL_VER_TUTMA, CIFT_EL_ACIK, AYNI_ANDA
} from "./ayarlar.js";

import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, sistemOlayaAbone, kollariKaldir,
  kollariIndir, actionbarYaz, eldekiEsya
} from "./yardimcilar.js";

import {
  butceSifirla, olcumSifirla, olcumTickBasla, olcumTickBitir, olcumRaporla
} from "./butce.js";

import {
  esyaninYetenekleri, yetenekAl, esyasizSira, tumYetenekler
} from "./yetenekler/kayit.js";

/* ---------------- Yetenek dosyalari ----------------
   Her yetenek kendini kayit defterine yaziyor. Yeni yetenek
   eklemek icin yetenekler/ altina dosya ac ve buraya bir satir
   ekle. Bedrock'ta klasor tarama yok, import sart.              */
import "./yetenekler/yildirim.js";
import "./yetenekler/yildirim_halkasi.js";
import "./yetenekler/alan_simsegi.js";
import "./yetenekler/tnt_yagmuru.js";
import "./yetenekler/toprak_topu.js";
import "./yetenekler/savur.js";
import "./yetenekler/ucus.js";
import "./yetenekler/guclu_tnt.js";
import "./yetenekler/meteor.js";
import "./yetenekler/can_verme.js";
import "./yetenekler/ors.js";
import "./yetenekler/buz_adam.js";
import "./yetenekler/toprak_ucus.js";
import "./yetenekler/ucurma.js";
import "./yetenekler/yamult.js";
import "./yetenekler/toprak_duvar.js";
import "./yetenekler/iksirler.js";
import "./yetenekler/goz_lazeri.js";
import "./yetenekler/guc_kapat.js";
import "./yetenekler/buz_mizragi.js";
import "./yetenekler/cekme.js";
import "./yetenekler/isinlanma.js";
import "./yetenekler/yetkili.js";
import "./yetenekler/kasirga.js";
import "./yetenekler/kubbe.js";
import "./yetenekler/hapis.js";
import "./yetenekler/dondur.js";

/* DIKKAT -- SIRA ONEMLI.
   kollar.js var olan yeteneklere esya BAGLIYOR, yani bagladigi
   yeteneklerin o an kayitli olmasi gerekiyor. ES modulleri import
   satirlarinin YAZILDIGI SIRADA calisir; bu satir yukaridakilerin
   ustune tasinirsa kollar.js once calisir ve hicbir kol baglanmaz
   (sessizce, sadece Content Log'a uyari duser).                    */
import {
  KOL_ESYALARI, kisaAddanEsya, kolDenetimi, kollariVer, kayitliKollar
} from "./yetenekler/kollar.js";

/* Iksirler de kendi dosyasinda kayit oluyor; buradan sadece
   tarama ve temizlik cagriliyor.                              */
import {
  iksirTara, iksirAktifMi, kademeUnut, iksirSayisi
} from "./yetenekler/iksirler.js";

/* ============================================================
   MERKEZI TICK YONETICISI
   Her yetenek kendi runInterval'ini acmak yerine tek dongu var
   ve butceyi o dagitiyor.
   ============================================================ */

const isler = [];                 // aktif isler
const sonKullanim = new Map();    // oyuncuId -> son tetikleme tick'i

/* oyuncuId -> [is, ...]

   Eskiden oyuncu basina TEK is vardi. Cift el icin gevsetildi:
   sag ve sol eldeki kollar ayni anda calisabilsin diye en fazla
   AYNI_ANDA is tutuluyor. Bu tick yukunu ARTIRMIYOR -- blok/varlik
   butcesi ortak, iki is onu paylasiyor, toplam tavan ayni.      */
const oyuncununIsleri = new Map();

function oyuncuIsSayisi(oyuncuId) {
  const liste = oyuncununIsleri.get(oyuncuId);
  return liste ? liste.length : 0;
}

function isEkle(is) {
  if (OLCUM_ACIK && isler.length === 0) olcumSifirla();
  isler.push(is);
  const liste = oyuncununIsleri.get(is.oyuncuId);
  if (liste) liste.push(is);
  else oyuncununIsleri.set(is.oyuncuId, [is]);
}

function isSil(indeks) {
  const is = isler[indeks];
  isler.splice(indeks, 1);

  const liste = oyuncununIsleri.get(is.oyuncuId);
  if (liste) {
    const i = liste.indexOf(is);
    if (i !== -1) liste.splice(i, 1);
    if (liste.length === 0) oyuncununIsleri.delete(is.oyuncuId);
  }

  try {
    if (typeof is.bitir === "function") is.bitir();
  } catch (e) {
    hataYaz(is.ad + ".bitir", e);
  }
}

system.runInterval(() => {
  // Esyasiz jest taramasi: aktif is olmasa da calismali
  if (ESYASIZ_ACIK) {
    try {
      esyasizTara();
    } catch (e) {
      hataYaz("esyasizTara", e);
    }
  }

  /* Iksir kademesi is listesine GIRMIYOR. Girseydi "oyuncu basina
     tek efekt" kurali yuzunden 60 saniye boyunca butun yetenekler
     kilitlenirdi. Ayrica Map bosken bu cagri bedava.            */
  if (iksirAktifMi()) {
    try {
      iksirTara(world.getAllPlayers());
    } catch (e) {
      hataYaz("iksirTara", e);
    }
  }

  if (isler.length === 0) return;

  butceSifirla();
  olcumTickBasla();

  for (let i = isler.length - 1; i >= 0; i--) {
    const is = isler[i];
    let bitti;
    try {
      bitti = is.calis();
    } catch (e) {
      // Isin kendi ele alamadigi hata: bozuk durumda donmeye devam etmesin
      hataYaz(is.ad, e);
      bitti = true;
    }
    if (bitti) isSil(i);
  }

  olcumTickBitir();
  if (isler.length === 0) olcumRaporla();
}, 1);

/* ============================================================
   ORTAK TETIKLEME YOLU
   Esya ve jest ayni kapidan geciyor: bekleme suresi ve
   oyuncu basina tek efekt kurali ikisinde de ayni.
   ============================================================ */

/* Bir ya da BIRDEN FAZLA yetenegi tek tetikleme olarak calistirir.

   Cift elde iki yetenek birlikte gidiyor ama bu TEK tetikleme
   sayiliyor: bekleme suresi bir kez isliyor, yoksa sol el sag
   elin beklemesine takilirdi.                                   */
function yetenekTetikle(oyuncu, kimlikler) {
  const liste = Array.isArray(kimlikler) ? kimlikler : [kimlikler];
  if (liste.length === 0) return false;

  if (oyuncuIsSayisi(oyuncu.id) >= AYNI_ANDA) return false;

  const simdi = system.currentTick;
  const onceki = sonKullanim.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < BEKLEME) return false;
  sonKullanim.set(oyuncu.id, simdi);

  kollariKaldir(oyuncu);

  system.runTimeout(() => {
    let acilan = 0;
    for (const kimlik of liste) {
      try {
        if (!gecerliMi(oyuncu)) return;
        if (oyuncuIsSayisi(oyuncu.id) >= AYNI_ANDA) break;

        const tanim = yetenekAl(kimlik);
        if (!tanim) {
          bilgiYaz("UYARI: bilinmeyen yetenek kimligi: " + kimlik);
          continue;
        }

        const is = tanim.olustur(oyuncu);
        if (is) {
          isEkle(is);
          acilan++;
        }
      } catch (e) {
        hataYaz("yetenekTetikle(" + kimlik + ")", e);
      }
    }
    // Hicbiri surekli is acmadiysa kollari indir; acanlar kendi
    // bitir()'inde indiriyor.
    if (acilan === 0) kollariIndir(oyuncu);
  }, KOL_GECIKME);

  return true;
}

function kalanBekleme(oyuncuId) {
  const onceki = sonKullanim.get(oyuncuId);
  if (onceki === undefined) return 0;
  const gecen = system.currentTick - onceki;
  return gecen < BEKLEME ? (BEKLEME - gecen) : 0;
}

/* ============================================================
   ESYA ILE TETIKLEME
   ============================================================ */

const girisKuruldu = olayaAbone("itemUse", (olay) => {
  try {
    const oyuncu = olay.source;
    const esya = olay.itemStack;
    if (!oyuncu || !esya) return;

    /* Cok yetenekli kolda esyaya dokunmak da SECILI yetenegi
       calistirir; jestle ayni davransin diye.                    */
    const liste = esyaninYetenekleri(esya.typeId);
    if (!liste || liste.length === 0) return;

    const tanim = liste[kolSecimAl(oyuncu.id, esya.typeId, liste.length)];
    yetenekTetikle(oyuncu, tanim.kimlik);
  } catch (e) {
    hataYaz("itemUse", e);
  }
});

if (!girisKuruldu) {
  bilgiYaz("KRITIK: itemUse olayina abone olunamadi, esyalar calismaz.");
}

/* ---- Ikinci giris yolu: elle scriptevent ----
     /scriptevent simsek:kol kol_toprak
   Esya JSON'unda on_use YOK (run_command deneysel ayar
   gerektiriyordu, v3.6'da kaldirildi). Bu dinleyici duruyor cunku
   komutu elle yazmak, esyalar kaydolmadiginda yetenegi denemenin
   en kisa yolu.                                                   */
sistemOlayaAbone("scriptEventReceive", (olay) => {
  try {
    if (olay.id !== "simsek:kol") return;

    const oyuncu = olay.sourceEntity;
    if (!oyuncu || oyuncu.typeId !== "minecraft:player") return;

    const esya = kisaAddanEsya(String(olay.message || "").trim());
    if (!esya) {
      bilgiYaz("UYARI: scriptevent simsek:kol -> tanimsiz kol: " + olay.message);
      return;
    }

    const liste = esyaninYetenekleri(esya);
    if (!liste || liste.length === 0) return;
    const tanim = liste[kolSecimAl(oyuncu.id, esya, liste.length)];
    yetenekTetikle(oyuncu, tanim.kimlik);
  } catch (e) {
    hataYaz("scriptEventReceive", e);
  }
});

/* ============================================================
   ESYASIZ TETIKLEME (JEST)
     egil + tam yukari bak -> yetenek degistir
     egil + zipla          -> secili yetenegi calistir
   ============================================================ */

const esyasizTutma = new Map();   // oyuncuId -> jest kac tick tutuldu
const esyasizSecim = new Map();   // oyuncuId -> sira icindeki indeks
const esyasizZipla = new Map();   // oyuncuId -> onceki taramada zipliyor muydu
const kolVerTutma = new Map();    // oyuncuId -> asagi bakma jesti kac tick tutuldu
const ESYASIZ_TAMAM = -1;         // jest islendi, durus bozulana kadar tekrarlama
let esyasizSayac = 0;

/* Cok yetenekli kollarda (Toprak Kol) hangi yetenegin secili
   oldugu. Secim KOL BASINA tutuluyor: elindeki kolu degistirip
   geri aldiginda o kolun secimi yerinde kalir.
     oyuncuId -> { esya: "pa:kol_toprak", i: 2 }                 */
const kolSecim = new Map();

function kolSecimAl(oyuncuId, esya, uzunluk) {
  const kayit = kolSecim.get(oyuncuId);
  if (!kayit || kayit.esya !== esya) return 0;
  return kayit.i % uzunluk;
}

/* Bir eldeki kolun yetenek listesi, yoksa undefined.
   slot: "Mainhand" (sag) ya da "Offhand" (sol).                */
function eldekiKol(oyuncu, slot) {
  const esya = eldekiEsya(oyuncu, slot);
  if (!esya) return undefined;
  const liste = esyaninYetenekleri(esya);
  if (!liste || liste.length === 0) return undefined;
  return { esya, liste };
}

/* Kolun O AN secili yetenegi. */
function koldakiSecim(oyuncuId, kol) {
  return kol.liste[kolSecimAl(oyuncuId, kol.esya, kol.liste.length)];
}

// isJumping bazi surumlerde olmayabilir; bir kez sinanip onbellege alinir
let ziplamaVar;

function ziplamaOkunabilir(oyuncu) {
  if (ziplamaVar === undefined) {
    ziplamaVar = (typeof oyuncu.isJumping === "boolean");
    if (!ziplamaVar) {
      bilgiYaz("UYARI: player.isJumping yok. Esyasiz CALISTIRMA jesti " +
               "kullanilamiyor, sadece yetenek degistirme calisir.");
    }
  }
  return ziplamaVar;
}

function egilmeTamam(oyuncu) {
  return !ESYASIZ_EGILME_SART || oyuncu.isSneaking === true;
}

function degistirmeDurusu(oyuncu) {
  if (!egilmeTamam(oyuncu)) return false;
  return oyuncu.getViewDirection().y >= ESYASIZ_BAKIS_ESIGI;
}

function secimAl(oyuncuId) {
  const i = esyasizSecim.get(oyuncuId);
  return (i === undefined) ? 0 : i;
}

function esyasizTara() {
  if (++esyasizSayac < ESYASIZ_TARAMA) return;
  esyasizSayac = 0;

  const sira = esyasizSira();
  if (sira.length === 0) return;

  let oyuncular;
  try {
    oyuncular = world.getAllPlayers();
  } catch (e) {
    hataYaz("esyasizTara.getAllPlayers", e);
    return;
  }
  if (!oyuncular || oyuncular.length === 0) return;

  for (const oyuncu of oyuncular) {
    try {
      esyasizOyuncu(oyuncu, sira);
    } catch (e) {
      hataYaz("esyasizTara.oyuncu", e);
    }
  }
}

/* --- Jest 3: egil + tam ASAGI bak -> butun kollari envantere koy ---
   Kollari almak icin "/give pa:kol_top" yazmak zorunda kalmayasin
   diye. Tablette komut yazmak zaten eziyet; ustelik esya kayitli
   degilse komut satiri sadece "soz dizimi hatasi" diyor, sebebini
   soylemiyor. Bu yol dogrudan API kullaniyor ve eksik esyayi ADIYLA
   raporluyor.                                                       */
function kolVerDurusu(oyuncu) {
  if (!egilmeTamam(oyuncu)) return false;
  return oyuncu.getViewDirection().y <= -KOL_VER_ESIGI;
}

function kolVerJesti(oyuncu, id) {
  const durum = kolVerTutma.get(id);

  if (!kolVerDurusu(oyuncu)) {
    if (durum !== undefined) kolVerTutma.delete(id);
    return false;
  }

  if (durum === ESYASIZ_TAMAM) return true;   // durus bozulana kadar tekrarlama

  const tutulan = (durum || 0) + ESYASIZ_TARAMA;
  if (tutulan < KOL_VER_TUTMA) {
    kolVerTutma.set(id, tutulan);
    return true;
  }

  kolVerTutma.set(id, ESYASIZ_TAMAM);
  kollariVer(oyuncu);
  return true;
}

function esyasizOyuncu(oyuncu, sira) {
  const id = oyuncu.id;

  // Asagi bakma jesti once bakilir: yukari bakma jestiyle cakismaz
  // (biri +y, digeri -y) ama ziplamayla ayni anda olabilir.
  if (KOL_VER_ACIK && kolVerJesti(oyuncu, id)) return;

  /* --- Jest 1: egil + zipla -> secili yetenegi calistir ---
     Ziplama anlik bir durum; basili tutuldugu surece tekrar
     tetiklenmesin diye yalnizca gecis aninda calisiyor.        */
  if (ziplamaOkunabilir(oyuncu)) {
    const simdiZipliyor = (oyuncu.isJumping === true) && egilmeTamam(oyuncu);
    const oncekiZipliyor = esyasizZipla.get(id) === true;

    if (simdiZipliyor !== oncekiZipliyor) esyasizZipla.set(id, simdiZipliyor);

    if (simdiZipliyor && !oncekiZipliyor) {
      /* Elde kol varsa KOLUN yetenegi calisir -- "kolu takinca o
         guce sahip olursun" mantigi. Kolda birden fazla yetenek
         varsa (Toprak Kol) o kolun SECILI olani calisir.

         CIFT EL: sag ve sol elde ayri kollar varsa IKISI BIRDEN
         calisiyor (BoraLo videolarindaki gibi: hem ors yagiyor
         hem buz gidiyor). Tek tetikleme sayiliyor, yani sol el
         sag elin beklemesine takilmiyor.                        */
      const sagKol = eldekiKol(oyuncu, "Mainhand");
      const solKol = CIFT_EL_ACIK ? eldekiKol(oyuncu, "Offhand") : undefined;

      const secimler = [];
      if (sagKol) secimler.push(koldakiSecim(id, sagKol));
      if (solKol && (!sagKol || solKol.esya !== sagKol.esya)) {
        secimler.push(koldakiSecim(id, solKol));
      }
      if (secimler.length === 0) {
        const genel = sira[secimAl(id) % sira.length];
        if (genel) secimler.push(genel);
      }

      if (secimler.length > 0) {
        const kimlikler = secimler.map((t) => t.kimlik);
        if (!yetenekTetikle(oyuncu, kimlikler)) {
          const kalan = kalanBekleme(id);
          if (kalan > 0) {
            actionbarYaz(oyuncu, "§7" + secimler.map((t) => t.ad).join(" + ") +
                         " §8· §c" + (kalan / 20).toFixed(1) + " sn");
          }
        } else if (secimler.length > 1) {
          actionbarYaz(oyuncu, "§b⚔ " + secimler.map((t) => t.ad).join(" §7+ §b"));
        }
      }
      return;
    }
  }

  /* --- Jest 2: egil + tam yukari bak -> yetenek degistir --- */
  const durum = esyasizTutma.get(id);

  if (!degistirmeDurusu(oyuncu)) {
    if (durum !== undefined) esyasizTutma.delete(id);
    return;
  }

  if (durum === ESYASIZ_TAMAM) return;   // durus bozulana kadar tekrarlama

  const tutulan = (durum || 0) + ESYASIZ_TARAMA;
  if (tutulan < ESYASIZ_TUTMA) {
    esyasizTutma.set(id, tutulan);
    return;
  }

  esyasizTutma.set(id, ESYASIZ_TAMAM);

  /* Elde COK yetenekli bir kol varsa geçiş o kolun icinde olur;
     genel sirayi karistirmaz. Tek yetenekli kolda degistirecek
     bir sey yok, o yuzden genel siraya dusuluyor.               */
  /* Degistirme SAG eldeki kolu hedefler; sag elde kol yoksa
     sol eldekini. Boylece iki kol takiliyken once sag eli
     ayarlayip sonra sag eli bosaltmadan sola gecmek yerine,
     sag eli bosaltip solu ayarlayabiliyorsun.                 */
  const kol = eldekiKol(oyuncu, "Mainhand")
           || (CIFT_EL_ACIK ? eldekiKol(oyuncu, "Offhand") : undefined);
  if (kol && kol.liste.length > 1) {
    const yeni = (kolSecimAl(id, kol.esya, kol.liste.length) + 1) % kol.liste.length;
    kolSecim.set(id, { esya: kol.esya, i: yeni });
    actionbarYaz(oyuncu, "§6» §e" + kol.liste[yeni].ad +
                 " §8(" + (yeni + 1) + "/" + kol.liste.length + " · egil + zipla)");
    return;
  }

  const yeni = (secimAl(id) + 1) % sira.length;
  esyasizSecim.set(id, yeni);
  actionbarYaz(oyuncu, "§6» §e" + sira[yeni].ad + " §8(egil + zipla)");
}

/* ============================================================
   OYUNCU OLAYLARI
   ============================================================ */

olayaAbone("playerLeave", (olay) => {
  esyasizTutma.delete(olay.playerId);
  esyasizSecim.delete(olay.playerId);
  esyasizZipla.delete(olay.playerId);
  kolVerTutma.delete(olay.playerId);
  kolSecim.delete(olay.playerId);
  kademeUnut(olay.playerId);

  // Oyuncunun butun isleri durdurulmali, sadece birincisi degil
  const acikIsler = oyuncununIsleri.get(olay.playerId);
  if (acikIsler) {
    for (const is of acikIsler.slice()) {
      const indeks = isler.indexOf(is);
      if (indeks !== -1) isSil(indeks);
    }
  }
  sonKullanim.delete(olay.playerId);
});

/* Paketin gercekten calistigini dunyaya girer girmez gormek icin.
   Bu satiri gormuyorsan paket ya etkin degil ya da script hic
   calismamis demektir.                                            */
olayaAbone("playerSpawn", (olay) => {
  if (!olay.initialSpawn) return;
  if (!OLCUM_SOHBETE && !HATA_SOHBETE) return;
  try {
    const eksik = kayitliKollar();
    const kolDurum = (eksik === undefined)
      ? "§7" + KOL_ESYALARI.length + " kol"
      : (eksik.length === 0
          ? "§a" + KOL_ESYALARI.length + " kol hazir"
          : "§c" + eksik.length + "/" + KOL_ESYALARI.length + " kol EKSIK");

    olay.player.sendMessage(
      "§a[SimsekTNT " + SURUM + "] yuklendi §7· " + tumYetenekler().length +
      " yetenek §7· " + kolDurum +
      " §7· butce " + TICK_BLOK_BUTCESI + "/tick" +
      " §7· olcum " + (OLCUM_ACIK ? "§aacik" : "§7kapali")
    );

    if (KOL_VER_ACIK) {
      olay.player.sendMessage("§7Kollari almak icin: §fegil + yere bak, bekle");
    }

    /* Behavior pack RESOURCE pack'i goremez -- Bedrock'ta boyle bir
       API yok. O yuzden tespit edemiyoruz, ama kullanicinin kendi
       bakabilmesi icin nereye bakacagini soyluyoruz. Ikonlarin ve
       3B kol gorunumunun tamami resource pack'te.                */
    olay.player.sendMessage(
      "§7Esyalar gorunmuyorsa: dunya ayarlari > §fKaynak Paketleri§7 " +
      "listesinde §fSimsek Kol§7 etkin mi bak."
    );
    if (eksik && eksik.length > 0) {
      olay.player.sendMessage(
        "§cEksik kol esyasi: §f" + eksik.join(", ") +
        "\n§7Kollar gorunmuyor ama butun yetenekler §fesyasiz§7 calisir: " +
        "§fegil + zipla§7. Yetenek degistirmek icin §fegil + yukari bak§7."
      );
    }
  } catch (e) {
    hataYaz("playerSpawn", e);
  }
});

kolDenetimi();

bilgiYaz(
  SURUM + " yuklendi | yetenek: " + tumYetenekler().length +
  " (esyasiz sirada " + esyasizSira().length + ")" +
  " | kol esyasi: " + KOL_ESYALARI.length +
  " | blok butcesi: " + TICK_BLOK_BUTCESI + "/tick" +
  " | olcum: " + (OLCUM_ACIK ? "acik" : "kapali")
);
