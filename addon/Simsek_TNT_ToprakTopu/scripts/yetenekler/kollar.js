import { esyaBagla } from "./kayit.js";

/* ============================================================
   KOL ESYALARI

   Her kol, ZATEN VAR OLAN bir yetenege baglaniyor. Yetenek
   dosyalarina hic dokunulmuyor; burasi sadece esya -> yetenek
   eslemesi yapiyor.

   Kol elde tutulunca:
     - esyayi kullanmak yetenegi tetikler
     - egil + zipla da secili yetenek yerine KOLUN yetenegini
       calistirir (main.js icinde)

   Gorunum tarafi resource pack'te:
     models/entity/simsek_kol.geo.json   tek geometri, hepsi paylasiyor
     attachables/<kol>.json              elde 3B kol olarak cizer
     textures/entity/<kol>.png           kol kaplamasi (64x64)
     textures/item/<kol>.png             envanter ikonu (16x16)

   Yeni kol eklemek: yukaridaki dort dosyayi uret, esya JSON'unu
   items/ altina koy, buraya bir satir ekle.
   ============================================================ */

export const KOL_ESYALARI = [
  ["pa:kol_halka",  "yildirim_halkasi"],
  ["pa:kol_simsek", "yon_simsegi"],
  ["pa:kol_alan",   "alan_simsegi"],
  ["pa:kol_tnt",    "guclu_tnt"],
  ["pa:kol_top",    "toprak_topu"],
  ["pa:kol_savur",  "savur"],
  ["pa:kol_ucus",   "ucus"],
  ["pa:kol_meteor", "meteor"]
];

for (const [esya, yetenek] of KOL_ESYALARI) {
  esyaBagla(esya, yetenek);
}
