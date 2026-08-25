import { system } from "@minecraft/server";
import { blokIste } from "../butce.js";
import { hataYaz, gecerliMi, actionbarYaz, varlikKonumu } from "../yardimcilar.js";
import {
  KILIC_ACIK, KILIC_ESYA, KILIC_YARICAP, KILIC_TAVAN,
  KILIC_IZLEYICI_SURE, KILIC_BEKLEME, KORUNAN_KUME
} from "../ayarlar.js";

/* ============================================================
   RESETTING SWORD  (v4.86)

   Kullanici: "hani bir tane modda inceleme yapmistik, admin
   yetkisi veriyordu ya, onu da ekle."

   ---- REFERANSIN KODUNDAN CIKARILDI ----
   Zabri Studios BoraLo Mod, esyanin kod adi
   proximity_projection. Derlenmis siniflarindan cikan
   komutlar aynen sunlar:

       gamemode spectator / gamemode survival
       fill ~5 ~5 ~5 ~-5 ~-5 ~-5 air

   Yani "admin yetkisi" dedigin sey IZLEYICI MODU, temizlik de
   11x11x11'lik bir fill.

   ---- BEDROCK'A GECERKEN UC SEY DEGISTI ----
   1. FILL YOK. 1331 blogu tek tickte yazmak tableti dondururdu.
      Silme bir IS oldu: tick butcesi kadar ilerliyor.
   2. KORUNAN_KUME gecerli. Referansta koruma YOK -- kilici
      yanlis yerde kullanan sandiklarini kaybediyor. Bizde
      bedrock, sandik, komut blogu duruyor.
   3. IZLEYICI MODU SURELI. Referansta acan komut ayri, kapatan
      ayri; unutursan sonsuza kadar izleyici kalirsin. Burada
      tek yerde ve sureli -- asa.js'teki "kilit hep cift"
      kuralinin aynisi.
   ============================================================ */

/* Kim ne zaman kullandi: bekleme icin. */
const sonKullanim = new Map();
/* Izleyiciye alinanlar: oyuncuId -> geri donus tick'i.
   Modu HATIRLIYORUZ, "survival" diye varsaymiyoruz -- yaratici
   moddaki biri kilici kullaninca survival'a dusmesin.       */
const izleyiciler = new Map();

export function kilicUnut(oyuncuId) {
  sonKullanim.delete(oyuncuId);
  izleyiciler.delete(oyuncuId);
}

function modAl(oyuncu) {
  try {
    return oyuncu.getGameMode ? oyuncu.getGameMode() : oyuncu.gameMode;
  } catch (e) {
    return undefined;
  }
}

function modYaz(oyuncu, mod) {
  if (!mod) return false;
  try {
    if (typeof oyuncu.setGameMode === "function") {
      oyuncu.setGameMode(mod);
      return true;
    }
  } catch (e) { /* API yok: komuta dusuyoruz */ }
  try {
    oyuncu.runCommand("gamemode " + mod);
    return true;
  } catch (e) {
    return false;
  }
}

/* Izleyiciye al. Donen: alindi mi. */
function izleyiciYap(oyuncu) {
  const onceki = modAl(oyuncu);
  if (!modYaz(oyuncu, "spectator")) return false;
  izleyiciler.set(oyuncu.id, {
    oyuncu,
    onceki: onceki || "survival",
    bitis: system.currentTick + KILIC_IZLEYICI_SURE
  });
  return true;
}

/* Merkezi tick'ten cagriliyor. Defter bosken hic donmiyor. */
export function kilicTara() {
  if (izleyiciler.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of izleyiciler) {
    if (!gecerliMi(kayit.oyuncu)) { izleyiciler.delete(id); continue; }
    if (simdi < kayit.bitis) continue;
    izleyiciler.delete(id);
    modYaz(kayit.oyuncu, kayit.onceki);
    try {
      actionbarYaz(kayit.oyuncu, "§7⟲ §fGeri döndün §8· " + kayit.onceki);
    } catch (e) { /* bildirim onemsiz */ }
  }
}

/* Temizlenecek noktalar: merkez etrafinda dolu kup.
   Sirali degil MERKEZDEN DISA: butce yetmezse en azindan
   yakin cevre temizlenmis olur, delik delik degil.         */
function noktalar(merkez) {
  const r = KILIC_YARICAP;
  const liste = [];
  for (let d = 0; d <= r; d++) {
    for (let x = -d; x <= d; x++) {
      for (let y = -d; y <= d; y++) {
        for (let z = -d; z <= d; z++) {
          /* Sadece BU kabuk: icerisi onceki turlarda islendi. */
          if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== d) continue;
          if (liste.length >= KILIC_TAVAN) return liste;
          liste.push({ x: merkez.x + x, y: merkez.y + y, z: merkez.z + z });
        }
      }
    }
  }
  return liste;
}

/* Temizlik isi: butce kadar, sonraki tick'e devrederek. */
function temizlikIsi(oyuncu, merkez) {
  const boyut = oyuncu.dimension;
  const liste = noktalar(merkez);
  let i = 0;
  let silinen = 0;
  const koord = { x: 0, y: 0, z: 0 };

  return {
    ad: "resetting_sword",
    oyuncuId: oyuncu.id,
    calis() {
      while (i < liste.length) {
        if (blokIste(1) < 1) return false;       // butce doldu
        const n = liste[i++];
        try {
          koord.x = n.x; koord.y = n.y; koord.z = n.z;
          const b = boyut.getBlock(koord);
          if (!b || b.isAir) continue;
          /* Referansta bu koruma yok; burada var. */
          if (KORUNAN_KUME.has(b.typeId)) continue;
          b.setType("minecraft:air");
          silinen++;
        } catch (e) {
          /* Yuklenmemis parca ya da dunya siniri: atla. */
        }
      }
      return true;
    },
    bitir() {
      try {
        actionbarYaz(oyuncu, "§7⟲ §fSıfırlandı §8· " + silinen + " blok");
      } catch (e) { /* bildirim onemsiz */ }
    }
  };
}

/* ============================================================
   GIRIS NOKTASI

   Kendi itemUse kancasini ACMIYORUZ: main.js'te zaten bir tane
   var ve is kuyruguna ekleme (isEkle) orada, ozel. Ikinci bir
   kanca hem kopya olurdu hem is kuyruguna ulasamazdi -- bu
   depodaki "her yetenek kendi runInterval'ini acmasin" kurali
   ayni sebeple var.

   Kilic HAVAYA sallaninca calisiyor, bir seye VURUNCA degil.
   Vurunca calissaydi dovusurken cevreyi silerdi ve "reset"
   bir kaza olurdu; havaya sallamak bilincli bir hareket.

   Donen: is (main.js kuyruga ekliyor) ya da undefined.      */
export function kilicKullan(oyuncu) {
  if (!KILIC_ACIK) return undefined;
  if (!gecerliMi(oyuncu)) return undefined;

  const simdi = system.currentTick;
  const son = sonKullanim.get(oyuncu.id);
  if (son !== undefined && simdi - son < KILIC_BEKLEME) {
    const kalan = ((KILIC_BEKLEME - (simdi - son)) / 20).toFixed(1);
    actionbarYaz(oyuncu, "§8⟲ §7Kılıç dinleniyor §8· " + kalan + " sn");
    return undefined;
  }
  sonKullanim.set(oyuncu.id, simdi);

  let k;
  try {
    k = varlikKonumu(oyuncu);
  } catch (e) {
    return undefined;
  }
  if (!k) return undefined;
  const merkez = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };

  /* ONCE izleyici, SONRA temizlik: silinen bloklarin icinde
     kalip bogulmayasin. Referansta da sira boyle.           */
  const izleyici = izleyiciYap(oyuncu);
  actionbarYaz(oyuncu,
    "§7⟲ §fSıfırlanıyor" + (izleyici ? " §8· izleyici modu" : ""));
  return temizlikIsi(oyuncu, merkez);
}
