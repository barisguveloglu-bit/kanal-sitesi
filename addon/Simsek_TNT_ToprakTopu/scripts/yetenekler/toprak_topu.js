import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, yukseklikAraligi,
  kureNoktalari, kureAnahtar
} from "../yardimcilar.js";
import {
  TOP_ESYA, TOP_YARICAP, TOP_HIZ, TOP_ARALIK, TOP_MENZIL,
  TOP_HASAR, TOP_BLOK, PATLAMA_GUCU, KORUNAN_KUME, TOP_HASAR_MUAF
} from "../ayarlar.js";

const KURE = kureNoktalari(TOP_YARICAP);

const KURE_KUME = new Set();
for (const n of KURE) KURE_KUME.add(kureAnahtar(n.x, n.y, n.z));

/* ============================================================
   DELTA ONBELLEGI
   Ilk kod her adimda kurenin tamamini havaya cevirip tamamini
   yeniden ciziyordu: 66 blok islemi. Oysa arka arkaya iki kure
   buyuk olcude ust uste biniyor; ortak kalan bloklara dokunmaya
   gerek yok. Sadece fark yazilinca atis basina 1980 -> 1414.

   Bakis yonu ucus boyunca sabit oldugundan tum ucusta yalnizca
   2 farkli tam sayi otelemesi olusuyor, yani bu hesap atis basina
   2 kez yapilip 30 kez kullaniliyor. Pratikte bedava.
   ============================================================ */

const deltaOnbellek = new Map();

function deltaAl(dx, dy, dz) {
  const anahtar = kureAnahtar(dx, dy, dz);
  const onceki = deltaOnbellek.get(anahtar);
  if (onceki) return onceki;

  const silinecek = [];   // eski merkeze gore: eskide var, yenide yok
  const cizilecek = [];   // yeni merkeze gore: yenide var, eskide yok

  for (const n of KURE) {
    if (!KURE_KUME.has(kureAnahtar(n.x - dx, n.y - dy, n.z - dz))) silinecek.push(n);
    if (!KURE_KUME.has(kureAnahtar(n.x + dx, n.y + dy, n.z + dz))) cizilecek.push(n);
  }

  const delta = { silinecek, cizilecek };
  deltaOnbellek.set(anahtar, delta);
  return delta;
}

const BOS_LISTE = [];

// getBlock'a verilen koordinat: her blok icin yenisini uretmek
// yerine tek nesne surekli yeniden kullaniliyor.
const _koord = { x: 0, y: 0, z: 0 };

// getEntities secenekleri de her adimda yeniden uretilmesin
const _hasarSecenek = {
  location: { x: 0, y: 0, z: 0 },
  maxDistance: TOP_YARICAP + 1.5,
  excludeTypes: TOP_HASAR_MUAF
};

function carpmaVarMi(boyut, sinir, poz, yon) {
  const x = Math.floor(poz.x + yon.x * (TOP_YARICAP + 1));
  const y = Math.floor(poz.y + yon.y * (TOP_YARICAP + 1));
  const z = Math.floor(poz.z + yon.z * (TOP_YARICAP + 1));

  if (y < sinir.min || y > sinir.max) return true;

  _koord.x = x; _koord.y = y; _koord.z = z;

  try {
    const blok = boyut.getBlock(_koord);
    if (!blok) return true;                       // yuklenmemis chunk: dur
    return KORUNAN_KUME.has(blok.typeId);
  } catch (e) {
    hataYaz("toprak_topu.carpmaVarMi", e);
    return true;
  }
}

function hasarVer(boyut, poz, atanId) {
  _hasarSecenek.location.x = poz.x;
  _hasarSecenek.location.y = poz.y;
  _hasarSecenek.location.z = poz.z;

  let yakin;
  try {
    yakin = boyut.getEntities(_hasarSecenek);
  } catch (e) {
    hataYaz("toprak_topu.hasarVer.getEntities", e);
    return;
  }

  for (const varlik of yakin) {
    if (varlik.id === atanId) continue;
    try {
      varlik.applyDamage(TOP_HASAR);
    } catch (e) {
      hataYaz("toprak_topu.hasarVer.applyDamage", e);
    }
  }
}

function patlat(boyut, poz) {
  if (!poz) return;
  try {
    boyut.createExplosion(poz, PATLAMA_GUCU, {
      breaksBlocks: true, causesFire: false, allowUnderwater: true
    });
  } catch (e) {
    hataYaz("toprak_topu.patlat", e);
  }
}

yetenekKaydet({
  kimlik: "toprak_topu",
  ad: "Toprak Topu",
  esya: TOP_ESYA,
  esyasiz: true,
  sira: 50,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);
    const oyuncuId = oyuncu.id;

    let yon, poz;
    try {
      yon = oyuncu.getViewDirection();
      const bas = oyuncu.getHeadLocation();
      // Kendini vurmamak icin biraz ileriden baslat
      poz = {
        x: bas.x + yon.x * (TOP_YARICAP + 2),
        y: bas.y + yon.y * (TOP_YARICAP + 2),
        z: bas.z + yon.z * (TOP_YARICAP + 2)
      };
    } catch (e) {
      hataYaz("toprak_topu.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    // Tam sayi merkezler: delta hesabi bunlarin farkina dayaniyor
    let merkezX = Math.floor(poz.x);
    let merkezY = Math.floor(poz.y);
    let merkezZ = Math.floor(poz.z);

    // Bekleyen yazim kuyrugu: liste + indeks, her adimda dizi uretilmiyor
    let silListe = BOS_LISTE, silIndeks = 0;
    let silX = merkezX, silY = merkezY, silZ = merkezZ;
    let cizListe = BOS_LISTE, cizIndeks = 0;

    let gidilen = 0;
    let cizildi = false;
    let bitisBekliyor = false;
    let sonrakiAdim = system.currentTick;
    let patlamaNoktasi = null;

    function blokYaz(x, y, z, tip) {
      // Dunya sinirini istisna firlatmadan once ele al
      if (y < sinir.min || y > sinir.max) return;

      _koord.x = x; _koord.y = y; _koord.z = z;

      const blok = boyut.getBlock(_koord);
      if (!blok) return;                            // yuklenmemis chunk
      if (KORUNAN_KUME.has(blok.typeId)) return;    // korunan blok
      blok.setType(tip);
    }

    /* Bekleyen yazimlari butce kadar bosaltir. Butce yetmezse
       kalani sonraki tick'e devreder; boylece tick basina blok
       sayisi tavani asla asilmaz.                                */
    function bosalt() {
      const kalan = (silListe.length - silIndeks) + (cizListe.length - cizIndeks);
      if (kalan === 0) return true;

      let kota = blokIste(kalan);
      if (kota === 0) return false;

      // Tek try: her blok icin ayri try/catch hem pahali hem hatayi yutar
      try {
        while (kota > 0 && silIndeks < silListe.length) {
          const n = silListe[silIndeks++];
          blokYaz(silX + n.x, silY + n.y, silZ + n.z, "minecraft:air");
          kota--;
        }
        while (kota > 0 && cizIndeks < cizListe.length) {
          const n = cizListe[cizIndeks++];
          blokYaz(merkezX + n.x, merkezY + n.y, merkezZ + n.z, TOP_BLOK);
          kota--;
        }
      } catch (e) {
        hataYaz("toprak_topu.bosalt", e);
        return true;   // kuyrugu bitmis say, is kapansin
      }

      return (silIndeks >= silListe.length) && (cizIndeks >= cizListe.length);
    }

    function adimHazirla(yeni) {
      const yeniMerkezX = Math.floor(yeni.x);
      const yeniMerkezY = Math.floor(yeni.y);
      const yeniMerkezZ = Math.floor(yeni.z);

      const delta = deltaAl(
        yeniMerkezX - merkezX, yeniMerkezY - merkezY, yeniMerkezZ - merkezZ
      );

      // Silme eski merkeze, cizme yeni merkeze gore
      silX = merkezX; silY = merkezY; silZ = merkezZ;
      silListe = cizildi ? delta.silinecek : BOS_LISTE;
      silIndeks = 0;

      poz.x = yeni.x; poz.y = yeni.y; poz.z = yeni.z;
      merkezX = yeniMerkezX; merkezY = yeniMerkezY; merkezZ = yeniMerkezZ;

      // Ilk adimda ortada eski kure yok, kurenin tamami cizilir
      cizListe = cizildi ? delta.cizilecek : KURE;
      cizIndeks = 0;
      cizildi = true;

      gidilen += TOP_HIZ;
    }

    function bitisiKur(nokta) {
      silX = merkezX; silY = merkezY; silZ = merkezZ;
      silListe = cizildi ? KURE : BOS_LISTE;
      silIndeks = 0;
      cizListe = BOS_LISTE;
      cizIndeks = 0;
      bitisBekliyor = true;
      patlamaNoktasi = nokta;
    }

    return {
      ad: "toprak_topu",
      oyuncuId: oyuncuId,

      calis() {
        // 1) Bekleyen yazimlar varsa once onlari bitir
        if (!bosalt()) return false;

        // 2) Son temizlik bittiyse patlat ve kapat
        if (bitisBekliyor) {
          patlat(boyut, patlamaNoktasi);
          return true;
        }

        // 3) Adim araligini bekle
        if (system.currentTick < sonrakiAdim) return false;
        sonrakiAdim = system.currentTick + TOP_ARALIK;

        // 4) Oyuncu ayrildi/oldu ise topu temizleyip bitir
        if (!gecerliMi(oyuncu)) {
          bitisiKur({ x: poz.x, y: poz.y, z: poz.z });
          return false;
        }

        // 5) Menzil doldu mu (ilerlemeden once, patlama mevcut noktada)
        if (gidilen >= TOP_MENZIL) {
          bitisiKur({ x: poz.x, y: poz.y, z: poz.z });
          return false;
        }

        const yeni = {
          x: poz.x + yon.x * TOP_HIZ,
          y: poz.y + yon.y * TOP_HIZ,
          z: poz.z + yon.z * TOP_HIZ
        };

        // 6) Onunde sert bir sey var mi. Dunya sinirini asmak da
        //    durdurucu sayilir; ilk kod bunu getBlock'un istisnasindan
        //    anliyordu, artik acikca kontrol ediliyor.
        if (carpmaVarMi(boyut, sinir, yeni, yon)) {
          bitisiKur(yeni);
          return false;
        }

        // NOT: Kurenin bir dilimi dunya sinirinin disina tasarsa top
        // durmaz, ucmaya devam eder; sadece o bloklar atlanir.
        // Atlama isi blokYaz icinde, istisna firlatmadan yapilir.

        adimHazirla(yeni);
        hasarVer(boyut, poz, oyuncuId);
        return false;
      },

      bitir() {
        kollariIndir(oyuncu);
      }
    };
  }
});
