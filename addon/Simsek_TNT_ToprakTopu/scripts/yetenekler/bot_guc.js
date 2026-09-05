import { yetenekKaydet } from "./kayit.js";
import { yagmurIsi } from "./_yagmur.js";
import { topIsi } from "./toprak_topu.js";
import { botVarliklari, botSayisi } from "./_bot_defteri.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz,
  hedefBul, kilitliHedef, varlikKonumu, basKonumu
} from "../yardimcilar.js";
import {
  BOT_GUC_ACIK, BOT_TOP_TAVAN, BOT_SIMSEK_TAVAN, BOT_SIMSEK_SAYISI,
  BOT_GUC_MENZIL, BOT_SIMSEK_OYUNCU, SIMSEK_OYUNCU_HEDEF,
  KILIT_ACIK, KILIT_MENZIL, KILIT_ACI, SIMSEK_ARALIK, SIMSEK_GRUP,
  TOP_YARICAP
} from "../ayarlar.js";

/* ============================================================
   BOT OZEL GUCLERI  --  simsek yagdirma ve kil (toprak) topu

   Istek: "aynen benim gibi simsek yagdirabilsin ve kil topu
   atabilsin".

   ---- HEDEFI SEN VERIYORSUN ----
   Bota "sunu vur" demenin bir yolu yok. Botun KENDI bakisi
   kullanilamaz: look_at_player yuzunden bot surekli SANA
   bakiyor, yani top dogrudan sana gelirdi.

   Cozum: nisan SENIN. Baktigin nokta (ya da kilitlendigin
   varlik) hesaplaniyor, butun botlar oraya atiyor. "Aynen benim
   gibi" tam olarak bu -- senin yaptigin isi senin nisaninla
   yapiyorlar.

   ---- KOD KOPYALANMADI ----
   Simsek icin _yagmur.js'teki yagmurIsi, top icin
   toprak_topu.js'teki topIsi kullaniliyor. Ikisi de zaten
   butceye uyan, optimize edilmis isler; bota ozel ikinci bir
   surum yazmak ayni hatayi iki yerde duzeltmek demekti.

   Tek fark: isin oyuncuId'si "bot:" onekli (oyuncunun AYNI_ANDA
   yuvasini yemesin) ve kol animasyonu kapali (botun kolu yok).
   ============================================================ */

/* Oyuncunun nisan aldigi hedef. Once kilit (bakis konisindeki
   varlik), yoksa baktigi nokta. yon_simsegi ile ayni mantik --
   oradaki nisan yardimindan bot da faydalansin.               */
function nisanAl(oyuncu) {
  if (KILIT_ACIK) {
    try {
      /* v7.39: bot da oyuncuya kilitlenebiliyor. yon_simsegi
         ile ayni mantik -- bot senin nisanindan faydalaniyor,
         yani duelloda bot da rakibi goruyor.                */
      const kilit = kilitliHedef(oyuncu, {
        menzil: KILIT_MENZIL, aci: KILIT_ACI,
        oyuncuDahil: SIMSEK_OYUNCU_HEDEF
      });
      if (kilit) {
        const k = varlikKonumu(kilit);
        if (k) return { nokta: k, kilit };
      }
    } catch (e) {
      hataYaz("bot_guc.kilit", e);
    }
  }
  try {
    const n = hedefBul(oyuncu, BOT_GUC_MENZIL);
    if (n) return { nokta: n };
  } catch (e) {
    hataYaz("bot_guc.hedefBul", e);
  }
  return undefined;
}

/* Calisacak botlari sec: en yakindakiler once. Tavan var cunku
   yirmi bot birden toprak topu atarsa ortalik kullanilmaz hale
   gelir (butce ortak oldugu icin tablet olmez, sadece her top
   saniyelerce surunur).                                        */
function calisacakBotlar(oyuncu, tavan) {
  const hepsi = botVarliklari(oyuncu.id).filter((c) => gecerliMi(c.varlik));

  const k = oyuncu.location;
  hepsi.sort((a, b) => {
    const ka = a.varlik.location, kb = b.varlik.location;
    return (Math.hypot(ka.x - k.x, ka.y - k.y, ka.z - k.z) -
            Math.hypot(kb.x - k.x, kb.y - k.y, kb.z - k.z));
  });
  return hepsi.slice(0, tavan);
}

/* ---------------- Simsek ---------------- */

function simsekIsleri(oyuncu, nisan) {
  const isler = [];
  for (const { varlik } of calisacakBotlar(oyuncu, BOT_SIMSEK_TAVAN)) {
    try {
      /* Kilit varsa hedef PESINDEN gidiyor (yagmurIsi merkezi her
         partide yeniden okuyor). Kacan mob kurtulmasin diye.

         BOT_SIMSEK_OYUNCU false: yildirim yangin cikariyor ve
         alan etkisi var; botun kendi kararyla arkadasina
         yildirim indirmesi istenmez. Oyunculari sen vurursun. */
      const kilit = (nisan.kilit &&
                     (BOT_SIMSEK_OYUNCU || nisan.kilit.typeId !== "minecraft:player"))
        ? nisan.kilit : undefined;

      const is = yagmurIsi({
        ad: "bot_simsek",
        oyuncu: varlik,               // dimension + id buradan
        hedef: nisan.nokta,
        kilit: kilit,
        varlik: "minecraft:lightning_bolt",
        toplam: BOT_SIMSEK_SAYISI,
        yukseklik: 0,
        aralik: SIMSEK_ARALIK,
        grup: SIMSEK_GRUP,
        halka: null,
        oyuncuId: "bot:" + oyuncu.id,
        kolIndir: false
      });
      if (is) isler.push(is);
    } catch (e) {
      hataYaz("bot_guc.simsek", e);
    }
  }
  return isler;
}

/* ---------------- Toprak (kil) topu ---------------- */

function topIsleri(oyuncu, nisan) {
  const isler = [];
  for (const { varlik } of calisacakBotlar(oyuncu, BOT_TOP_TAVAN)) {
    try {
      /* Yon: BOTTAN nisan noktasina. Botun kendi bakisi
         kullanilsaydi top sana gelirdi (look_at_player).      */
      const b = basKonumu(varlik);
      if (!b) continue;
      const dx = nisan.nokta.x - b.x;
      const dy = nisan.nokta.y - b.y;
      const dz = nisan.nokta.z - b.z;
      const u = Math.hypot(dx, dy, dz);
      if (u < TOP_YARICAP + 3) continue;    // cok yakin: kendini gomer

      const is = topIsi(varlik, {
        ad: "bot_top",
        yon: { x: dx / u, y: dy / u, z: dz / u },
        oyuncuId: "bot:" + oyuncu.id,
        kolIndir: false
      });
      if (is) isler.push(is);
    } catch (e) {
      hataYaz("bot_guc.top", e);
    }
  }
  return isler;
}

/* ---------------- Yetenek kayitlari ----------------

   DIKKAT: olustur() TEK is dondurebiliyor ama burada bot basina
   bir is var. Merkezi yonetici birden fazla is alabilsin diye
   DIZI donduruluyor; main.js bunu ayrica ele aliyor.          */

function kaydet(kimlik, ad, sira, uret, tavan, isim) {
  yetenekKaydet({
    kimlik, ad, esyasiz: true, sira,

    olustur(oyuncu) {
      if (!BOT_GUC_ACIK) {
        actionbarYaz(oyuncu, "§cBot gucleri kapali (BOT_GUC_ACIK).");
        kollariIndir(oyuncu);
        return undefined;
      }
      if (botSayisi(oyuncu.id) === 0) {
        actionbarYaz(oyuncu, "§eBotun yok. §7Once 'bot' yaz.");
        kollariIndir(oyuncu);
        return undefined;
      }

      const nisan = nisanAl(oyuncu);
      if (!nisan) {
        actionbarYaz(oyuncu, "§eNereye atacaklarini bilmiyorlar. §7Bir yere bak.");
        kollariIndir(oyuncu);
        return undefined;
      }

      let isler;
      try {
        isler = uret(oyuncu, nisan);
      } catch (e) {
        hataYaz(kimlik, e);
        kollariIndir(oyuncu);
        return undefined;
      }

      if (!isler || isler.length === 0) {
        actionbarYaz(oyuncu, "§eBotlar cok yakin ya da uygun degil.");
        kollariIndir(oyuncu);
        return undefined;
      }

      const toplam = botSayisi(oyuncu.id);
      actionbarYaz(oyuncu, "§b" + isler.length + " bot " + isim +
        (toplam > tavan ? " §8(tavan " + tavan + "/" + toplam + ")" : ""));
      kollariIndir(oyuncu);
      return isler;
    }
  });
}

kaydet("bot_simsek", "Bot: Simsek Yagdir", 260, simsekIsleri,
       BOT_SIMSEK_TAVAN, "simsek yagdiriyor");
kaydet("bot_top", "Bot: Kil Topu At", 265, topIsleri,
       BOT_TOP_TAVAN, "kil topu atiyor");
