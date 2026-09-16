import { SIMSEK_EK_HASAR, SIMSEK_EK_YARICAP, SIMSEK_EK_MUAF,
         SIMSEK_OYUNCU_HEDEF } from "../ayarlar.js";
import { hataYaz } from "../yardimcilar.js";

/* SIMSEK EK HASARI                                          v7.94.4

   ---- NEDEN VAR ----
   Dort simsek yeteneginin dordu de vanilla `lightning_bolt`
   doguruyor: yon_simsegi, yildirim_halkasi, coklu_simsek,
   tek_simsek. Yani hasar OYUNUN kendisinden geliyordu ve
   ayarlanabilir bir sayisi YOKTU -- "simsegin hasarini artir"
   diye bir ayar yoktu cunku artirilacak sayi yoktu.

   Bu dosya o sayiyi ekliyor: yildirim dustugu noktanin
   cevresindekilere SIMSEK_EK_HASAR kadar ek hasar uyguluyor.
   Vanilla yildirimin kendi hasari yerinde duruyor, uzerine
   biniyor.

   ---- NEDEN TEK DOSYA ----
   Dort cagri yeri var. Dordune ayri ayri yazilsaydi ayar
   degistiginde dordunun birden degismesi gerekirdi ve biri
   unutulurdu. Bu depoda tam bu hata sinifi (K1: ayni formulun
   uc kopyasi) daha once tespit edildi. Tek kaynak.

   ---- KENDINI VURMAMA ----
   `vuran` disarida birakiliyor. ayarlar.js'te yazili:
   "yoksa yetenek intihar tusuna donerdi". Yildirimi kendi
   dibine atan biri vanilla hasarini zaten yer; ustune bir de
   bizim ek hasarimizi yememeli.

   ---- YARICAP NEDEN DAR ----
   SIMSEK_EK_YARICAP vanilla yildirimin kendi etki alanindan
   GENIS OLMAMALI. Genis olsaydi bu artik "daha guclu simsek"
   degil "daha buyuk simsek" olurdu -- istenen o degil.       */
export function simsekEkHasar(boyut, nokta, vuran) {
  if (!(SIMSEK_EK_HASAR > 0)) return 0;      // kapali
  if (!boyut || !nokta) return 0;

  let hedefler;
  try {
    hedefler = boyut.getEntities({
      location: nokta,
      maxDistance: SIMSEK_EK_YARICAP
    });
  } catch (e) {
    hataYaz("simsekEkHasar.getEntities", e);
    return 0;
  }

  const vuranId = vuran && vuran.id;
  let vurulan = 0;

  for (const varlik of hedefler) {
    try {
      if (!varlik || !varlik.isValid) continue;
      if (vuranId && varlik.id === vuranId) continue;       // kendini vurma
      const tip = varlik.typeId;
      if (SIMSEK_EK_MUAF.includes(tip)) continue;           // esya, xp, yildirim
      if (tip === "minecraft:player" && !SIMSEK_OYUNCU_HEDEF) continue;

      varlik.applyDamage(SIMSEK_EK_HASAR);
      vurulan++;
    } catch (e) {
      /* Tek hedef dustu, kalanlar surer -- bir varlik o tick
         icinde yok olmus olabilir, bu normal.                */
    }
  }
  return vurulan;
}
