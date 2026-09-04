import { world } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, kollariIndir, actionbarYaz
} from "../yardimcilar.js";
import {
  baconKodla, koordinatiHarfle, sgaBlok, rakamHarfle
} from "./_sifre.js";
import {
  EFSANE_ACIK, EFSANE_BLOK, EFSANE_MESALE, EFSANE_ZEMIN,
  EFSANE_SGA_BLOK, EFSANE_BACON_A, EFSANE_BACON_B,
  EFSANE_TABAN, EFSANE_YAZI, EFSANE_SATIR_HARF, EFSANE_TOHUM,
  EFSANE_DURAK_SAYISI,
  EFSANE_ADIM_X, EFSANE_ADIM_Z,
  EFSANE_IZ_ACIK, EFSANE_IZ_ADET, EFSANE_IZ_EN, EFSANE_IZ_BOY,
  EFSANE_IZ_DERIN, EFSANE_IZ_UZAK, EFSANE_KAYIT_ANAHTAR,
  EFSANE_TABELA_AYAK, EFSANE_TABELA_UZAK, EFSANE_TABELA_CERCEVE,
  EFSANE_TABELA_DIREK, EFSANE_TABELA_MEYDAN
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

  /* --- YAZIT: DIKILI TABELA (v6.6) ---
     Kullanici: "o kadar yaziyi neden yere yazdin, bloklarla
     tabela yapsaydin ya."

     Yazit 116x41 blok. Yere serilince yerden bakan hicbir sey
     goremiyordu -- ancak ucarak okunuyordu. Ayni harf tarlasi
     artik DIKEY duruyor: XZ duzleminden XY duzlemine gecti.

     Panelin ic duzeni (asagidan yukari):
       0            Bacon bandi
       1            bosluk
       2..2+boy-1   SGA satirlari   (satir 0 EN USTTE)
     Cevrede 1 blok cerceve, altinda ayaklar, onunde meydan.  */
  const tarla = sgaBlok(EFSANE_YAZI, EFSANE_SATIR_HARF);

  /* Bandin yuku once hesaplaniyor: panel genisligi hem
     yaziya hem banda yetmeli.                               */
  /* Son durakta koordinat degil TOHUM: cozen kisi elinde bir
     seed'le kaliyor ve aratinca Giant Alex efsanesi cikiyor.
     Bkz. ayarlar.js EFSANE_TOHUM.                            */
  const yuk = sonMu
    ? rakamHarfle(EFSANE_TOHUM)
    : koordinatiHarfle(sonrakiNokta.x, sonrakiNokta.z);
  const kod = baconKodla(yuk);

  const icEn  = Math.max(tarla.en, kod.length) + 2;   // yanlarda birer bosluk
  const icBoy = tarla.boy + 2;                        // bacon + bosluk
  const icX0  = merkez.x - Math.floor(icEn / 2);
  /* Ayak yuksekligi PIRAMIDE gore: ayarki deger yalnizca bir
     ALT SINIR. Cizdirince goruldu ki panel alcak kalinca
     piramit (tepesi merkez.y + yari) Bacon bandinin tam
     onune geliyor ve bandin orta ~11 blogunu KAPATIYOR --
     yani sifre cozulemez hale geliyordu. Panel piramidin
     tepesini iki blok asiyor.

     Ayari degil piramidi olcmenin sebebi: EFSANE_TABAN
     buyutulurse bu hata sessizce geri gelirdi.             */
  const ayak  = Math.max(EFSANE_TABELA_AYAK, yari + 2);
  const icY0  = merkez.y + ayak;                     // en alt ic sira
  /* Tabela piramidin KUZEYINDE (-z). Iki sebep, ikisi de
     olculdu:

     1) OKUNURLUK. Bedrock'ta kuzey -z'dir ve KUZEYE BAKAN
        birinin sagi dogudur (+x). Yani harfler soldan saga
        ancak kuzeye bakan bir okuyucuda dogru dizilir.
        Tabelayi guneye koysaydik okuyan kisi guneye bakar
        ve butun yazi AYNALANIRDI -- sifre okunmaz olurdu.
     2) KOMPOZISYON. Ilk halinde tabela piramidin onune
        geliyordu ve 120x50'lik levha 11 bloklu piramidi
        TAMAMEN kapatiyordu (cizdirilince goruldu). Kuzeye
        alinca piramit onde, tabela arkasinda bir fon
        oluyor.                                              */
  const panelZ = merkez.z - yari - EFSANE_TABELA_UZAK;

  /* 1) Panel arkaligi: once tamami doseniyor, harfler
        uzerine yaziliyor (sonraki nokta oncekini eziyor). */
  for (let dy = 0; dy < icBoy; dy++) {
    for (let dx = 0; dx < icEn; dx++) {
      noktalar.push({
        x: icX0 + dx, y: icY0 + dy, z: panelZ, blok: EFSANE_ZEMIN
      });
    }
  }

  /* 2) Cerceve: panelin dort bir yani. */
  for (let dx = -1; dx <= icEn; dx++) {
    noktalar.push({ x: icX0 + dx, y: icY0 - 1, z: panelZ,
                    blok: EFSANE_TABELA_CERCEVE });
    noktalar.push({ x: icX0 + dx, y: icY0 + icBoy, z: panelZ,
                    blok: EFSANE_TABELA_CERCEVE });
  }
  for (let dy = -1; dy <= icBoy; dy++) {
    noktalar.push({ x: icX0 - 1, y: icY0 + dy, z: panelZ,
                    blok: EFSANE_TABELA_CERCEVE });
    noktalar.push({ x: icX0 + icEn, y: icY0 + dy, z: panelZ,
                    blok: EFSANE_TABELA_CERCEVE });
  }

  /* 3) Ayaklar: uc direk, panelin altindan yere. Tabela
        cimenin ustunde asili durmasin.                     */
  /* Dort direk, esit araliklarla. Tam ORTAYA bir direk
     konmuyor: orasi piramidin arkasina denk geliyor ve
     gorunmuyor -- gorunmeyen bir direk sadece blok yer.   */
  for (const ax of [icX0, icX0 + Math.floor(icEn / 3),
                    icX0 + Math.floor(icEn * 2 / 3), icX0 + icEn - 1]) {
    for (let ay = merkez.y - 1; ay < icY0 - 1; ay++) {
      noktalar.push({ x: ax, y: ay, z: panelZ,
                      blok: EFSANE_TABELA_DIREK });
    }
  }

  /* 4) Meydan: tabelanin onunde birkac sira zemin. Yere
        serilen sey artik YAZI degil, sadece zemin.         */
  for (let dz = 1; dz <= EFSANE_TABELA_MEYDAN; dz++) {
    for (let dx = -1; dx <= icEn; dx++) {
      /* +z yonu: tabela ile piramidin ARASI, yani okuyucunun
         durdugu taraf.                                      */
      noktalar.push({ x: icX0 + dx, y: merkez.y - 1, z: panelZ + dz,
                      blok: EFSANE_ZEMIN });
    }
  }

  /* 5) SGA harfleri. tarla.noktalar'da y ASAGI dogru artiyor
        (satir 0 = ilk satir); panelde satir 0 EN USTTE
        olmali, o yuzden y TERSLENIYOR. Terslemeyi unutmak
        yaziyi bas asagi cevirir ve sifre okunmaz olur.      */
  const yaziTaban = icY0 + 2;
  const yaziX0 = merkez.x - Math.floor(tarla.en / 2);
  for (const n of tarla.noktalar) {
    noktalar.push({
      x: yaziX0 + n.x,
      y: yaziTaban + (tarla.boy - 1 - n.y),
      z: panelZ,
      blok: EFSANE_SGA_BLOK
    });
  }

  /* 6) Baconian bandi: panelin en alt ic sirasi. Soldan saga
        okunuyor -- cozucu icin duzlem degismedi, x hala x.  */
  const bandX = merkez.x - Math.floor(kod.length / 2);
  for (let i = 0; i < kod.length; i++) {
    noktalar.push({
      x: bandX + i, y: icY0, z: panelZ,
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
              ? "§8· §7Bu SON durak §8· tohum: §f" + EFSANE_TOHUM
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
