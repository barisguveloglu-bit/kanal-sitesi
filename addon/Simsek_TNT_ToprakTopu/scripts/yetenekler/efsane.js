import { world, system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, bilgiYaz, gecerliMi, kollariIndir, actionbarYaz
} from "../yardimcilar.js";
import {
  baconKodla, koordinatiHarfle, sgaTarlasi, sgaGenislik
} from "./_sifre.js";
import {
  EFSANE_ACIK, EFSANE_BLOK, EFSANE_MESALE, EFSANE_ZEMIN,
  EFSANE_SGA_BLOK, EFSANE_BACON_A, EFSANE_BACON_B,
  EFSANE_TABAN, EFSANE_YAZI, EFSANE_DURAK_SAYISI,
  EFSANE_ADIM_X, EFSANE_ADIM_Z,
  EFSANE_IZ_ACIK, EFSANE_IZ_ADET, EFSANE_IZ_EN, EFSANE_IZ_BOY,
  EFSANE_IZ_DERIN, EFSANE_IZ_UZAK, EFSANE_KAYIT_ANAHTAR
} from "../ayarlar.js";

/* ============================================================
   EFSANE YAPISI

   Gerekcenin tamami ayarlar.js'teki EFSANE bolumunde.
   Burada sadece INSAAT var.

   Blok koyma isi butceden geciyor (blokIste) ve isler arasi
   devrediyor: bir durak ~1400 blok ve hepsini tek tick'te
   koymak tableti kilitlerdi.
   ============================================================ */

/* ---------------- Zincir ----------------
   Ilk durak nereye kurulursa zincirin tamami ORADAN
   turetiliyor. Boylece her durak bir sonrakinin koordinatini
   HESAPLAYABILIYOR -- kayit bozulsa bile yazit dogru kalir. */
export function zincirNoktasi(kok, sira) {
  return {
    x: Math.floor(kok.x + EFSANE_ADIM_X * sira),
    z: Math.floor(kok.z + EFSANE_ADIM_Z * sira)
  };
}

/* Dunyada kayitli zincir kokü. Yoksa undefined. */
export function kokAl() {
  try {
    const ham = world.getDynamicProperty(EFSANE_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return undefined;
    const d = JSON.parse(ham);
    if (typeof d.x !== "number" || typeof d.z !== "number") return undefined;
    return d;
  } catch (e) {
    return undefined;
  }
}

function kokYaz(kok) {
  try {
    world.setDynamicProperty(EFSANE_KAYIT_ANAHTAR, JSON.stringify(kok));
  } catch (e) {
    /* Dunya ozelligi yoksa zincir kalici olmaz: yapi yine
       kurulur, sadece "kacinci durak" bilgisi dunya yeniden
       yuklenince kaybolur.                                   */
  }
}

export function efsaneUnut() {
  try {
    world.setDynamicProperty(EFSANE_KAYIT_ANAHTAR, undefined);
  } catch (e) { /* onemsiz */ }
}

/* Oyuncunun bulundugu yer zincirin kacinci duragi?
   Kok yoksa 0 (yeni zincir). Kok varsa en yakin durak. */
export function siraBul(kok, konum) {
  if (!kok) return 0;
  let enIyi = 0, enYakin = Infinity;
  for (let i = 0; i < EFSANE_DURAK_SAYISI; i++) {
    const n = zincirNoktasi(kok, i);
    const d = Math.hypot(n.x - konum.x, n.z - konum.z);
    if (d < enYakin) { enYakin = d; enIyi = i; }
  }
  return enIyi;
}

/* ---------------- Yapi noktalari ----------------
   Once TAMAMI hesaplaniyor, sonra butce kadar koyuluyor.
   Hesaplama ucuz; blok koymak pahali.                       */
function duragiPlanla(merkez, taban, sonrakiNokta, sonMu) {
  const noktalar = [];      // { x, y, z, blok }
  const yari = Math.floor(taban / 2);

  /* --- Piramit --- */
  let k = 0;
  for (let seviye = 0; seviye <= yari; seviye++) {
    const r = yari - seviye;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        /* Sadece KABUK: ici dolu piramit bes kat blok yer ve
           gorunuste hicbir sey degistirmez.                  */
        const kenar = Math.abs(dx) === r || Math.abs(dz) === r;
        if (!kenar && seviye !== yari) continue;
        noktalar.push({
          x: merkez.x + dx, y: merkez.y + seviye, z: merkez.z + dz,
          blok: EFSANE_BLOK
        });
        k++;
      }
    }
  }

  /* --- Kiziltas mesaleleri: tabanin dort kosesi ve kenar
         ortalari. Sekiz tane; daha fazlasi cirkin oluyor. --- */
  const d = yari + 1;
  for (const [dx, dz] of [[-d, -d], [d, -d], [-d, d], [d, d],
                          [0, -d], [0, d], [-d, 0], [d, 0]]) {
    noktalar.push({
      x: merkez.x + dx, y: merkez.y, z: merkez.z + dz,
      blok: EFSANE_MESALE, mesale: true
    });
  }

  /* --- SGA yazisi: yapinin ONUNDE (+z), ortalanmis ---
     Zemin once doseniyor ki harfler cimenin ustunde degil
     bir meydanda dursun.                                    */
  const tarla = sgaTarlasi(EFSANE_YAZI);
  const sgaZ = merkez.z + yari + 3;
  const sgaX = merkez.x - Math.floor(sgaGenislik(EFSANE_YAZI) / 2);
  for (let dy = -1; dy <= tarla.boy; dy++) {
    for (let dx = -1; dx <= tarla.en; dx++) {
      noktalar.push({
        x: sgaX + dx, y: merkez.y - 1, z: sgaZ + dy,
        blok: EFSANE_ZEMIN
      });
    }
  }
  for (const n of tarla.noktalar) {
    noktalar.push({
      x: sgaX + n.x, y: merkez.y - 1, z: sgaZ + n.y,
      blok: EFSANE_SGA_BLOK
    });
  }

  /* --- Baconian bandi: SGA'nin arkasinda, tek sira ---
     Son durakta koordinat yok; onun yerine bitis sozu.     */
  const yuk = sonMu ? "SON" : koordinatiHarfle(sonrakiNokta.x, sonrakiNokta.z);
  const kod = baconKodla(yuk);
  const bandZ = sgaZ + tarla.boy + 2;
  const bandX = merkez.x - Math.floor(kod.length / 2);
  for (let i = -1; i <= kod.length; i++) {
    noktalar.push({
      x: bandX + i, y: merkez.y - 1, z: bandZ - 1, blok: EFSANE_ZEMIN
    });
    noktalar.push({
      x: bandX + i, y: merkez.y - 1, z: bandZ + 1, blok: EFSANE_ZEMIN
    });
  }
  for (let i = 0; i < kod.length; i++) {
    noktalar.push({
      x: bandX + i, y: merkez.y - 1, z: bandZ,
      blok: kod[i] === "A" ? EFSANE_BACON_A : EFSANE_BACON_B
    });
  }

  /* --- Giant Alex ayak izleri: 3x2x2 cukurlar ---
     Lore'dan birebir olcu. Cukur = HAVA, yani blok siliniyor.
     Yer secimi deterministik (merkez koordinatindan turuyor):
     ayni durak iki kez kurulursa izler ayni yerde olsun.    */
  if (EFSANE_IZ_ACIK) {
    let tohum = (Math.abs(merkez.x) * 73856093) ^ (Math.abs(merkez.z) * 19349663);
    const sonraki = (n) => {
      tohum = (tohum * 1103515245 + 12345) & 0x7FFFFFFF;
      return tohum % n;
    };
    for (let i = 0; i < EFSANE_IZ_ADET; i++) {
      const aci = (i / EFSANE_IZ_ADET) * Math.PI * 2;
      const uzak = EFSANE_IZ_UZAK + sonraki(10);
      const ix = Math.floor(merkez.x + Math.cos(aci) * uzak);
      const iz = Math.floor(merkez.z + Math.sin(aci) * uzak);
      for (let dx = 0; dx < EFSANE_IZ_EN; dx++) {
        for (let dz = 0; dz < EFSANE_IZ_BOY; dz++) {
          for (let dy = 0; dy < EFSANE_IZ_DERIN; dy++) {
            noktalar.push({
              x: ix + dx, y: merkez.y - 1 - dy, z: iz + dz,
              blok: "minecraft:air"
            });
          }
        }
      }
    }
  }

  return { noktalar, kod, yuk, piramitBlok: k };
}

/* ---------------- Yetenek ---------------- */
yetenekKaydet({
  kimlik: "efsane_yapisi",
  ad: "Efsane Yapisi",
  esyasiz: true,
  sira: 270,

  olustur(oyuncu) {
    if (!EFSANE_ACIK) {
      actionbarYaz(oyuncu, "§7Efsane yapisi kapali.");
      kollariIndir(oyuncu);
      return undefined;
    }

    let konum, boyut;
    try {
      konum = oyuncu.location;
      boyut = oyuncu.dimension;
    } catch (e) {
      hataYaz("efsane.konum", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Kok yoksa BURASI kok olur; varsa en yakin durak
       kuruluyor. Boylece "efsane kur" ayni dugme kaliyor:
       ilk basista zincir baslar, sonrakinde gittigin duragi
       diker.                                                 */
    let kok = kokAl();
    let sira;
    if (!kok) {
      kok = { x: Math.floor(konum.x), z: Math.floor(konum.z) };
      kokYaz(kok);
      sira = 0;
    } else {
      sira = siraBul(kok, konum);
    }

    const hedef = zincirNoktasi(kok, sira);
    const merkez = { x: hedef.x, y: Math.floor(konum.y), z: hedef.z };
    const sonMu = (sira >= EFSANE_DURAK_SAYISI - 1);
    const sonraki = zincirNoktasi(kok, sira + 1);

    const plan = duragiPlanla(merkez, EFSANE_TABAN, sonraki, sonMu);

    const uzaklik = Math.hypot(merkez.x - konum.x, merkez.z - konum.z);
    actionbarYaz(oyuncu, "§b◆ §fEfsane duragi §7" + (sira + 1) + "/" +
                 EFSANE_DURAK_SAYISI +
                 (uzaklik > 32 ? " §8· " + Math.round(uzaklik) + " blok oteye" : ""));

    let i = 0;
    const _k = { x: 0, y: 0, z: 0 };

    return {
      ad: "efsane_yapisi",
      oyuncuId: oyuncu.id,

      calis() {
        while (i < plan.noktalar.length) {
          if (blokIste(2) < 2) return false;      // butce dolu
          const n = plan.noktalar[i++];
          try {
            _k.x = n.x; _k.y = n.y; _k.z = n.z;
            const b = boyut.getBlock(_k);
            if (!b) continue;                     // yuklenmemis chunk
            b.setType(n.blok);
          } catch (e) {
            /* Dunya siniri disi ya da korumali: atla, yapiyi
               yarim birakma.                                 */
          }
        }
        return true;
      },

      bitir() {
        try {
          const satir = [
            "§b◆ §fEfsane duragi §b" + (sira + 1) + "§7/" + EFSANE_DURAK_SAYISI +
              " §8kuruldu §7(" + merkez.x + ", " + merkez.z + ")",
            "§8· §7SGA yazisi: §f" + EFSANE_YAZI +
              " §8(buyu masasi dili)",
            "§8· §7Bacon bandi: §f" + plan.kod.length + " blok §8-> §f" + plan.yuk,
            sonMu
              ? "§8· §7Bu SON durak."
              : "§8· §7Sonraki durak: §f" + sonraki.x + ", " + sonraki.z +
                " §8(yazitta sifreli)"
          ];
          oyuncu.sendMessage(satir.join("\n"));
        } catch (e) {
          hataYaz("efsane.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});

/* Menuden/testten cagrilabilsin diye disari aciliyor. */
export function efsaneOzeti(kok) {
  if (!kok) return undefined;
  const duraklar = [];
  for (let i = 0; i < EFSANE_DURAK_SAYISI; i++) duraklar.push(zincirNoktasi(kok, i));
  return duraklar;
}

export { duragiPlanla };
