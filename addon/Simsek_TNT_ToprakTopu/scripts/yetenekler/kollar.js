import { esyaBagla } from "./kayit.js";
import { bilgiYaz, hataYaz, actionbarYaz } from "../yardimcilar.js";

/* ============================================================
   KOL ESYALARI

   Her kol, ZATEN VAR OLAN bir yetenege baglaniyor. Yetenek
   dosyalarina hic dokunulmuyor; burasi sadece esya -> yetenek
   eslemesi yapiyor.

   Kol elde tutulunca:
     - esyaya dokunmak yetenegi tetikler
     - egil + zipla da secili yetenek yerine KOLUN yetenegini
       calistirir (main.js icinde)

   ---- Gorunum tarafi (Simsek_Kol_Kaynak resource pack'i) ----
     models/entity/simsek_kol.geo.json   tek geometri, hepsi paylasiyor
     attachables/<kol>.json              elde 3B kol olarak cizer
     textures/entity/<kol>.png           kol kaplamasi (64x64)
     textures/item/<kol>.png             envanter ikonu (16x16)
     texts/*.lang                        gorunen ad

   Bu dosyalarin hepsini scratchpad'deki kol_uret.py uretiyor.
   Elle duzenleme; sekiz dosyayi senkron tutmak hataya davetiye.

   ---- NEDEN GORUNMUYORDU (v3.3 hatasi) ----
   Geometrinin kok kemigi "kol_kok" adindaydi. Bedrock attachable
   modelini oyuncu iskeletine BAGLARKEN kemik adlarini esliyor;
   oyuncuda "kol_kok" diye bir kemik olmadigi icin model kola hic
   oturmuyordu. Kok kemik artik "RightArm".
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

/* Esya JSON'undaki on_use olayi "scriptevent simsek:kol <kisa_ad>"
   calistiriyor. Kisa addan tam kimlige donmek icin.               */
const KISA_AD = new Map();
for (const [esya] of KOL_ESYALARI) {
  KISA_AD.set(esya.slice(esya.indexOf(":") + 1), esya);
}

export function kisaAddanEsya(kisa) {
  return KISA_AD.get(kisa);
}

/* ============================================================
   ESYA KAYIT DENETIMI

   "/give @s pa:kol_top" SOZ DIZIMI HATASI veriyorsa sebep tek:
   esya oyunun kayit defterinde yok, yani behavior pack'in items/
   klasoru dunyaya yuklenmemis. Komut satirindan bunu anlamak zor
   oldugu icin script acilista kendisi bakiyor ve hangi esyanin
   eksik oldugunu tek tek yaziyor.

   ItemTypes @minecraft/server 2.0.0'da kararli. Yine de bazi
   surumlerde bulunmayabilir diye ozellik tespitiyle cagriliyor;
   yoksa denetim atlanir, kollar calismaya devam eder.
   ============================================================ */

/* Ad ile import ("import { ItemTypes } from ...") API'de o ad yoksa
   modul BAGLANIRKEN hata verir ve tum paket olur. Isim alani importu
   ("* as") boyle bir sey yapmaz: olmayan ad sadece undefined kalir.
   Ust duzey await de kullanilmiyor -- Bedrock motorunda garantisi yok. */
import * as api from "@minecraft/server";

const ItemTypes = api.ItemTypes;
const ItemStack = api.ItemStack;

export function kayitliKollar() {
  if (!ItemTypes || typeof ItemTypes.get !== "function") return undefined;

  const eksik = [];
  for (const [esya] of KOL_ESYALARI) {
    let tip;
    try {
      tip = ItemTypes.get(esya);
    } catch (e) {
      tip = undefined;
    }
    if (!tip) eksik.push(esya);
  }
  return eksik;
}

export function kolDenetimi() {
  const eksik = kayitliKollar();

  if (eksik === undefined) {
    bilgiYaz("ItemTypes bu surumde yok, kol esyasi denetimi atlandi.");
    return;
  }
  if (eksik.length === 0) {
    bilgiYaz("kol denetimi: " + KOL_ESYALARI.length + " esyanin hepsi kayitli.");
    return;
  }
  bilgiYaz(
    "KRITIK: " + eksik.length + " kol esyasi oyuna KAYITLI DEGIL -> " +
    eksik.join(", ") + ". Bu esyalari /give ile alamazsin (soz dizimi " +
    "hatasi verir). Sebebi neredeyse her zaman ayni: dunyada ESKI surum " +
    "behavior pack etkin. Dunya ayarlarindan eski paketi kaldirip yeniyi ekle."
  );
}

/* ============================================================
   KOLLARI ENVANTERE KOY

   /give yazmak zorunda kalmamak icin. Komut degil dogrudan API
   kullaniliyor: esya kayitli degilse ItemStack kurucusu hata
   firlatir, biz de bunu ADIYLA raporlariz -- komut satirinin
   verdigi "soz dizimi hatasi"ndan cok daha kullanisli.
   ============================================================ */

export function kollariVer(oyuncu) {
  if (!ItemStack) {
    actionbarYaz(oyuncu, "§cItemStack API'si yok, kollar verilemiyor.");
    return 0;
  }

  let kap;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    kap = env ? env.container : undefined;
  } catch (e) {
    hataYaz("kollariVer.envanter", e);
  }
  if (!kap || typeof kap.addItem !== "function") {
    actionbarYaz(oyuncu, "§cEnvanter okunamadi.");
    return 0;
  }

  let verilen = 0;
  const basarisiz = [];

  for (const [esya] of KOL_ESYALARI) {
    try {
      kap.addItem(new ItemStack(esya, 1));
      verilen++;
    } catch (e) {
      basarisiz.push(esya);
    }
  }

  if (basarisiz.length > 0) {
    hataYaz("kollariVer", new Error("kayitli olmayan esyalar: " + basarisiz.join(", ")));
    actionbarYaz(oyuncu, "§e" + verilen + " kol verildi §8· §c" +
                 basarisiz.length + " tanesi oyuna kayitli degil");
  } else {
    actionbarYaz(oyuncu, "§a" + verilen + " kol envantere kondu");
  }

  return verilen;
}
