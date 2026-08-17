import { world, system } from "@minecraft/server";
import {
  HATA_SOHBETE, HATA_SOHBET_ARALIK, ANIM_KALDIR, ANIM_INDIR, YUKSEKLIK_TABLO,
  PARCACIK_ACIK, SARSINTI_ACIK
} from "./ayarlar.js";

/* ============================================================
   GUNLUK
   Bos catch yok. Her hata nerede oldugu yazili olarak Content
   Log'a duser, istenirse sohbete de.
   ============================================================ */

export function sohbeteYaz(metin) {
  try {
    world.sendMessage(metin);
  } catch (e) {
    // Dunya henuz hazir degil: Content Log yeterli
  }
}

export function bilgiYaz(mesaj) {
  console.warn("[SimsekTNT] " + mesaj);
}

const sonHataTick = new Map();

export function hataYaz(nerede, e) {
  const mesaj = (e && e.message) ? e.message : String(e);
  const iz = (e && e.stack) ? "\n  " + String(e.stack).split("\n").join("\n  ") : "";
  console.warn("[SimsekTNT] HATA @ " + nerede + ": " + mesaj + iz);

  if (!HATA_SOHBETE) return;

  // Ayni hata her tick tekrarlanabilir; sohbeti bogmasin
  const simdi = system.currentTick;
  const onceki = sonHataTick.get(nerede);
  if (onceki !== undefined && simdi - onceki < HATA_SOHBET_ARALIK) return;
  sonHataTick.set(nerede, simdi);

  sohbeteYaz("§c[SimsekTNT] HATA §f" + nerede + "§7: " + mesaj);
}

/* ============================================================
   API UYUMLULUGU
   Surumler arasi farklar tek yerde toplandi.
   ============================================================ */

/* isValid bazi surumlerde property, bazilarinda metot. Metot oldugu
   surumde "if (e.isValid)" HER ZAMAN dogru doner (fonksiyon truthy),
   yani sessizce yanlis calisir. Ikisini de dogru ele alan tek gecit. */
export function gecerliMi(varlik) {
  if (!varlik) return false;
  try {
    const d = varlik.isValid;
    if (typeof d === "function") return !!varlik.isValid();
    if (typeof d === "boolean") return d;
    return true;   // isValid hic yoksa gecerli varsay
  } catch (e) {
    return false;
  }
}

// Date.now bazi calisma ortamlarinda olmayabilir
const ZAMAN_VAR = (typeof Date !== "undefined" && typeof Date.now === "function");
export function simdiMs() { return ZAMAN_VAR ? Date.now() : 0; }

/* Bir olay adi API surumunde yoksa .subscribe cagrisi script
   YUKLENIRKEN hata firlatir ve tum paket olur. Her abonelik
   buradan gecerse eksik olay sadece o ozelligi kapatir.            */
export function olayaAbone(olayAdi, isleyici) {
  try {
    const olaylar = world.afterEvents;
    const olay = olaylar ? olaylar[olayAdi] : undefined;
    if (!olay || typeof olay.subscribe !== "function") {
      bilgiYaz("UYARI: world.afterEvents." + olayAdi +
               " bu API surumunde yok. Ilgili ozellik devre disi.");
      return false;
    }
    olay.subscribe(isleyici);
    return true;
  } catch (e) {
    hataYaz("olayaAbone(" + olayAdi + ")", e);
    return false;
  }
}

/* Ayni sey system.afterEvents icin. scriptEventReceive bazi eski
   surumlerde yok; oradaki abonelik de paketi oldurmesin.           */
export function sistemOlayaAbone(olayAdi, isleyici) {
  try {
    const olaylar = system.afterEvents;
    const olay = olaylar ? olaylar[olayAdi] : undefined;
    if (!olay || typeof olay.subscribe !== "function") {
      bilgiYaz("UYARI: system.afterEvents." + olayAdi +
               " bu API surumunde yok. Ilgili ozellik devre disi.");
      return false;
    }
    olay.subscribe(isleyici);
    return true;
  } catch (e) {
    hataYaz("sistemOlayaAbone(" + olayAdi + ")", e);
    return false;
  }
}

/* ============================================================
   DUNYA SINIRLARI
   Sinir disina cikinca getBlock her cagrida throw ediyordu.
   Istisna firlatmak normal cagridan cok daha pahali; sinir
   artik onceden kontrol ediliyor.
   ============================================================ */

const yukseklikOnbellek = new Map();

export function yukseklikAraligi(boyut) {
  const onceki = yukseklikOnbellek.get(boyut.id);
  if (onceki) return onceki;

  let aralik = YUKSEKLIK_TABLO[boyut.id] || { min: -64, max: 319 };

  // Ozellik tespiti: heightRange bazi surumlerde yok. Buradaki catch
  // hatayi yutmak degil, API varligini sinamak.
  try {
    const r = boyut.heightRange;
    if (r && typeof r.min === "number" && typeof r.max === "number") {
      aralik = { min: r.min, max: r.max };
    }
  } catch (e) {
    bilgiYaz("heightRange okunamadi (" + boyut.id + "), tablo degeri kullaniliyor.");
  }

  yukseklikOnbellek.set(boyut.id, aralik);
  return aralik;
}

/* ============================================================
   OYUNCU YARDIMCILARI
   ============================================================ */

export function kollariKaldir(oyuncu) {
  try {
    oyuncu.runCommand("playanimation @s " + ANIM_KALDIR);
  } catch (e) {
    hataYaz("kollariKaldir", e);
  }
}

export function kollariIndir(oyuncu) {
  try {
    if (gecerliMi(oyuncu)) {
      oyuncu.runCommand("playanimation @s " + ANIM_INDIR);
    }
  } catch (e) {
    hataYaz("kollariIndir", e);
  }
}

/* ============================================================
   GORSEL/ISITSEL TUZ BIBER
   Ikisi de OYNANISI DEGISTIRMEZ, sadece his katar. Ayarlardan
   kapatilabiliyor cunku tablette parcacik pahaliya gelebilir.
   ============================================================ */

let parcacikUyarisi = false;

/* Parcacik efekti. Referans mod bunu "execute @s^^^4 /particle ..."
   diye komutla yapiyordu; script API'sinde dogrudan cagri var,
   komut ayristirma maliyeti yok.                                */
export function parcacikAt(boyut, tip, konum) {
  if (!PARCACIK_ACIK) return;
  try {
    boyut.spawnParticle(tip, konum);
  } catch (e) {
    /* spawnParticle bazi surumlerde yok ya da parcacik tipi
       taninmiyor olabilir. Bir kez uyar, sonra sessizce gec --
       her cagrida log basmak sohbeti bogar.                    */
    if (!parcacikUyarisi) {
      parcacikUyarisi = true;
      bilgiYaz("Parcacik cizilemiyor (" + tip + "): " +
               (e && e.message ? e.message : e) + ". Gorsel eksik, oynanis normal.");
    }
  }
}

let sarsintiUyarisi = false;

/* Ekran sarsintisi. Script API'sinde karsiligi yok, komut sart.
   Referans "camerashake add @s 4" diyordu -- sure vermeyince
   varsayilana dusuyor; biz ikisini de veriyoruz.               */
export function ekraniSars(oyuncu, siddet, sure) {
  if (!SARSINTI_ACIK) return;
  try {
    oyuncu.runCommand(
      "camerashake add @s " + siddet.toFixed(2) + " " + sure.toFixed(2) + " positional"
    );
  } catch (e) {
    if (!sarsintiUyarisi) {
      sarsintiUyarisi = true;
      bilgiYaz("camerashake calismadi: " + (e && e.message ? e.message : e));
    }
  }
}

export function actionbarYaz(oyuncu, metin) {
  try {
    const ekran = oyuncu.onScreenDisplay;
    if (ekran && typeof ekran.setActionBar === "function") {
      ekran.setActionBar(metin);
      return;
    }
  } catch (e) {
    // Actionbar yoksa sohbete dus
  }
  try {
    oyuncu.sendMessage(metin);
  } catch (e) {
    hataYaz("actionbarYaz", e);
  }
}

/* Elde tutulan esyanin tipini dondurur, yoksa undefined.
   slot verilmezse sag el ("Mainhand"); sol el icin "Offhand".
   EquippableComponent bazi surumlerde farkli davraniyor, o yuzden
   duz metin slot adi kullaniliyor.                                */
let ekipmanUyarisi = false;

export function eldekiEsya(oyuncu, slot) {
  try {
    const ekip = oyuncu.getComponent("minecraft:equippable");
    if (!ekip || typeof ekip.getEquipment !== "function") {
      if (!ekipmanUyarisi) {
        ekipmanUyarisi = true;
        bilgiYaz("UYARI: equippable bileseni yok. Kol esyalari elde " +
                 "algilanamaz, jest sistemi calismaya devam eder.");
      }
      return undefined;
    }
    const esya = ekip.getEquipment(slot || "Mainhand");
    return esya ? esya.typeId : undefined;
  } catch (e) {
    if (!ekipmanUyarisi) {
      ekipmanUyarisi = true;
      hataYaz("eldekiEsya", e);
    }
    return undefined;
  }
}

/* Oyuncunun baktigi noktayi bulur. Isin bir seye carpmazsa
   bakis yonunde uzak bir nokta doner.                             */
export function hedefBul(oyuncu, menzil) {
  try {
    const vurus = oyuncu.getBlockFromViewDirection({ maxDistance: menzil });
    if (vurus && vurus.block) {
      const k = vurus.block.location;
      return { x: k.x + 0.5, y: k.y + 1, z: k.z + 0.5 };
    }
  } catch (e) {
    hataYaz("hedefBul.raycast", e);
  }

  try {
    const yon = oyuncu.getViewDirection();
    const bas = oyuncu.getHeadLocation();
    return {
      x: bas.x + yon.x * menzil,
      y: bas.y + yon.y * menzil,
      z: bas.z + yon.z * menzil
    };
  } catch (e) {
    hataYaz("hedefBul.yon", e);
    return undefined;
  }
}

/* Bakis konisindeki varliklar, yakindan uzaga sirali.

   Referans mod bu isi "execute @s^^^2 /... @e[r=2,c=1]" diye
   AYRI MESAFELERDE tek tek yapiyordu: tam o noktalarda duranlar
   vuruluyor, arasindakiler kurtuluyordu. Burada koninin tamami
   bir kez taraniyor.

   secenek: { menzil, aci, tavan, oyuncuDahil }
     aci: 1 = tam dar koni, 0 = her yon. Iki vektorun nokta
          carpimiyla olculuyor; getViewDirection birim vektor
          donduruguu icin dogrudan kosinus.                      */
export function koniHedefleri(oyuncu, secenek) {
  const menzil = secenek.menzil;
  let yakin, merkez, yon;

  try {
    merkez = oyuncu.location;
    yon = oyuncu.getViewDirection();
    yakin = oyuncu.dimension.getEntities({
      location: merkez,
      maxDistance: menzil,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    hataYaz("koniHedefleri.getEntities", e);
    return [];
  }

  const bulunan = [];
  for (const varlik of yakin) {
    try {
      if (varlik.id === oyuncu.id) continue;      // kendimizi asla
      if (!gecerliMi(varlik)) continue;
      if (varlik.typeId === "minecraft:player" && !secenek.oyuncuDahil) continue;

      const k = varlik.location;
      const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
      const uzaklik = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (uzaklik < 0.001) continue;
      if ((dx * yon.x + dy * yon.y + dz * yon.z) / uzaklik < secenek.aci) continue;

      bulunan.push({ varlik, uzaklik });
    } catch (e) {
      hataYaz("koniHedefleri.tarama", e);
    }
  }

  // Tavan asilirsa EN YAKINLAR kalsin -- rastgele degil
  bulunan.sort((a, b) => a.uzaklik - b.uzaklik);
  const tavan = secenek.tavan || bulunan.length;
  return bulunan.slice(0, tavan).map((x) => x.varlik);
}

/* Baktigin yondeki EN YAKIN tek varlik, yoksa undefined.

   Referans mod bunu "@e[r=10,c=1]" ile yapiyordu: yaricap icindeki
   en yakin varlik. Iki sorunu vardi --
     1. @e oyuncunun KENDISINI de kapsiyor, yani mod cogu zaman
        kullaniciyi hedefliyordu
     2. yon bakmiyordu; arkandaki mob da "en yakin" sayilabiliyordu

   Burasi koniHedefleri'ni kullaniyor: kendini disliyor, bakis
   konisini gozetiyor ve zaten yakindan uzaga sirali donuyor, yani
   ilk eleman "karsindaki hedef".                                  */
export function kilitliHedef(oyuncu, secenek) {
  const liste = koniHedefleri(oyuncu, {
    menzil: secenek.menzil,
    aci: secenek.aci,
    tavan: 1,
    oyuncuDahil: secenek.oyuncuDahil === true
  });
  return liste.length > 0 ? liste[0] : undefined;
}

/* Varligin GUNCEL konumu, varlik kaybolduysa undefined.
   Kilitli hedef kacarken pesinden gitmek icin.                   */
export function varlikKonumu(varlik) {
  try {
    if (!gecerliMi(varlik)) return undefined;
    const k = varlik.location;
    return { x: k.x, y: k.y, z: k.z };
  } catch (e) {
    return undefined;   // varlik bu tick icinde yok oldu: hata degil
  }
}

/* ============================================================
   KURE GEOMETRISI
   Blok yazan yeteneklerin ortak altyapisi.
   ============================================================ */

export function kureNoktalari(r) {
  const noktalar = [];
  const t = Math.ceil(r);
  for (let x = -t; x <= t; x++) {
    for (let y = -t; y <= t; y++) {
      for (let z = -t; z <= t; z++) {
        if (x * x + y * y + z * z <= r * r + 0.5) noktalar.push({ x, y, z });
      }
    }
  }
  return noktalar;
}

// Kucuk tam sayi koordinatlarini tek sayiya paketle (-16..15 guvenli)
export function kureAnahtar(x, y, z) {
  return (x + 16) * 1024 + (y + 16) * 32 + (z + 16);
}
