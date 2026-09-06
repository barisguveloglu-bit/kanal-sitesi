import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, actionbarYaz } from "../yardimcilar.js";
import { blokIste } from "../butce.js";
import {
  IZ_ACIK, IZ_SIRA, IZ_BLOK, IZ_SURE, IZ_TAVAN,
  IZ_KORUNAN, IZ_KORUNAN_ONEK, IZ_GECILIR
} from "../ayarlar.js";

/* TOPRAK IZI -- yurudugun yer toprak olur, sonra geri doner.

   Kaynak: Boby1545 Mini Pack · menu.js "boby_2".

   ---- KAYNAKTA UC SORUN, UCU DE BURADA YOK ----
   1. HER TICK YAZIYOR. Kaynagin dongusu runInterval(...,1) ve
      duruyorken bile ayni bloga ayni degeri yaziyor. Burada
      koordinat DEGISMEDIKCE tek islem yok.
   2. GERI ALMIYOR. Kalici toprak birakiyor. Burada eski blok
      tipi deftere yaziliyor, iz kapaninca aynen geri konuyor.
   3. SURESIZ. Burada hem IZ_SURE hem IZ_TAVAN var.

   ---- ACIK/KAPALI, cunku cikis yolu sart ----
   Savunma Kipi'ndeki kalibin aynisi: ikinci kez basmak
   kapatiyor. Suresi dolunca da kendi kapaniyor. Kapanista
   defterdeki her blok geri konuyor.                        */

const korunanKume = new Set(IZ_KORUNAN);
const gecilirKume = new Set(IZ_GECILIR);

// oyuncuId -> { kapat }
const izde = new Map();

export function izUnut(oyuncuId) {
  if (oyuncuId === undefined) izde.clear();
  else izde.delete(oyuncuId);
}

export function izdeMi(oyuncuId) { return izde.has(oyuncuId); }

/* Ustune yazilir mi? Sandik/firin gibi KAP bloklari ve kendi
   "pa:" bloklarimiz asla. Kaynagin `replace` filtresi yok --
   sandigi da icindekiyle birlikte topraga ceviriyor.        */
function yazilirMi(tip) {
  if (typeof tip !== "string") return false;
  if (tip === IZ_BLOK) return false;          // zaten toprak
  /* HAVA VE ICINDEN GECILENLER: iz bir ZEMIN izi, kopru
     degil. Bu denetim olmadan ziplamak havada toprak
     merdiveni oruyordu -- olculdu, uc zipla uc blok.
     Kaynak Boby1545'te de var (filtresiz `dirt replace`);
     kopyalarken hatayi da kopyalamisiz.                   */
  if (gecilirKume.has(tip)) return false;
  if (korunanKume.has(tip)) return false;
  if (tip.indexOf(IZ_KORUNAN_ONEK) === 0) return false;
  return true;
}

function anahtar(x, y, z) { return x + "," + y + "," + z; }

yetenekKaydet({
  kimlik: "toprak_izi",
  ad: "Toprak İzi",
  esyasiz: true,
  sira: IZ_SIRA,

  olustur(oyuncu) {
    if (!IZ_ACIK) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    const varOlan = izde.get(oyuncu.id);
    if (varOlan) {
      varOlan.kapat = true;      // is kendi bitir()'ine dusecek
      return undefined;
    }

    const durum = { kapat: false };
    izde.set(oyuncu.id, durum);

    const boyut = oyuncu.dimension;
    /* Kuyruk: [{ anahtar, x, y, z, eski }]. Tavan dolunca
       BASTAN geri konuyor -- yani sinir "iz durur" degil,
       "arkanda en fazla IZ_TAVAN blokluk kuyruk kalir".    */
    const kuyruk = [];
    const yazilan = new Set();
    let sonAnahtar = "";
    const bitisTick = system.currentTick + IZ_SURE;

    /* Bir kaydi geri koyar. Blok okunamazsa (chunk bosaldi)
       kayit yine de dusuyor: tutmak sizinti olurdu.        */
    function geriKoy(kayit) {
      try {
        const b = boyut.getBlock({ x: kayit.x, y: kayit.y, z: kayit.z });
        /* Yalniz BIZIM koydugumuz duruyorsa geri koyuyoruz.
           Arada biri ustune bir sey insa ettiyse onunki
           kalir -- kendi izimizi silerken baskasinin isini
           bozmak, geri almanin amacina aykiri.              */
        if (b && b.typeId === IZ_BLOK) b.setType(kayit.eski);
      } catch (e) {
        hataYaz("toprak_izi.geri", e);
      }
      yazilan.delete(kayit.anahtar);
    }

    try {
      actionbarYaz(oyuncu, "§6👣 §fToprak izi §aAÇIK");
    } catch (e) { /* onemsiz */ }

    return {
      ad: "toprak_izi",
      oyuncuId: oyuncu.id,

      calis() {
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitisTick) return true;

        let k;
        try { k = oyuncu.location; } catch (e) { return true; }
        const x = Math.floor(k.x);
        /* v7.52.1: once `Math.floor(k.y) - 1` yaziliydi. Tam
           blok uzerinde ikisi de ayni sonucu veriyor ama YARIM
           blokta (slab, soul_sand, farmland) bir fazla asagi
           iniyordu: y=63.5'te bizimki 62'yi, kaynak 63'u
           gosteriyordu -- kaynak dogruydu. Onun hesabi alindi. */
        const y = Math.floor(k.y - 0.5);    // ayagin bastigi blok
        const z = Math.floor(k.z);
        const a = anahtar(x, y, z);

        /* KAYNAKTAN ASIL FARK: koordinat degismediyse cikiyoruz.
           Kaynak duruyorken bile saniyede 20 setblock yapiyor. */
        if (a === sonAnahtar) return false;
        sonAnahtar = a;
        if (yazilan.has(a)) return false;

        if (!blokIste(1)) return false;

        let blok;
        try { blok = boyut.getBlock({ x, y, z }); }
        catch (e) { return false; }
        if (!blok) return false;

        let tip;
        try { tip = blok.typeId; } catch (e) { return false; }
        if (!yazilirMi(tip)) return false;

        try { blok.setType(IZ_BLOK); }
        catch (e) { hataYaz("toprak_izi.koy", e); return false; }

        kuyruk.push({ anahtar: a, x, y, z, eski: tip });
        yazilan.add(a);

        /* Tavan dolunca en eskisi geri konuyor. Sinirin
           "durdur" degil "kuyruk" olmasinin sebebi: durduran
           bir sinir, yeteneği sessizce olu hale getirirdi. */
        while (kuyruk.length > IZ_TAVAN) geriKoy(kuyruk.shift());
        return false;
      },

      bitir() {
        izde.delete(oyuncu.id);
        let sayi = 0;
        /* Butceye SORULMUYOR: geri koymak bir secim degil,
           borc. Butce doldu diye yarim birakilirsa iz kalici
           olurdu -- yetenegin bozuk hali tam olarak bu.    */
        while (kuyruk.length > 0) { geriKoy(kuyruk.pop()); sayi++; }
        try {
          oyuncu.sendMessage("§7Toprak izi kapandı §8· " + sayi +
                             " blok geri kondu");
        } catch (e) { /* onemsiz */ }
      }
    };
  }
});
