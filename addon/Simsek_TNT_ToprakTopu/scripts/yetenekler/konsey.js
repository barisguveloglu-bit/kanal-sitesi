import { system } from "@minecraft/server";
import { hataYaz } from "../yardimcilar.js";
import {
  KONSEY_ACIK, KONSEY_TARAMA, KONSEY_SURE, KONSEY_GORUNMEZ
} from "../ayarlar.js";

/* ================================================================
   KONSEY KOSTUMLERI -- GORUNMEZLIK                          v6.2

   Kullanici: "bunlardan alabildigimizi alalim, esya dahil her
   sey."

   ---- BU DOSYANIN TEK ISI ----
   Kostum uc parcadan olusuyor ve ucu de olmadan calismiyor:
     1. giyilebilir esya   -> kol_uret.py:konsey_esyasi
     2. attachable + model -> kol_uret.py:konsey_attachable
     3. OYUNCUYA GORUNMEZLIK -> burasi
   Ucuncusu olmadan oyuncu kendi derisiyle kostumun icinden
   gorunur. Kaynak pakette bu is on dort ayri
   `<ad>_effect.mcfunction` ile yapiliyor; hepsi tek satir ve
   hepsi ayni sey. Bizde tek tarama.

   ---- NEDEN SADECE ONDORT PARCA ----
   Liste UYDURULMADI, kaynakta `_effect` dosyasi olanlar
   (ayarlar.js:KONSEY_GORUNMEZ). Kemik Maskesi ve kollar
   listede DEGIL cunku onlar oyuncunun ustune biniyor,
   yerine gecmiyor -- gorunmezlik verseydik kolsuz bir hayalet
   olurdun.

   ---- YUVA DA SINANIYOR ----
   Kaynak `hasitem={..., location=slot.armor.head}` diyor.
   Esyayi ELINDE tutmak kostumu giymek degil; yuva
   sinanmasaydi envanterinde tasimak seni gorunmez yapardi.

   ---- EFEKT SURESI TARAMADAN UZUN ----
   KONSEY_SURE (60) > KONSEY_TARAMA (20). Esit olsaydi iki
   tarama arasinda bir kare gorunur olurdun; goz sisteminde
   ayni ders alinmisti.
   ================================================================ */

const sonraki = new Map();

/* Oyuncunun o yuvasindaki esya kimligi (onek atilmis). */
function yuvadaki(oyuncu, yuva) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    return undefined;
  }
  if (!bilesen) return undefined;
  try {
    const e = bilesen.getEquipment(yuva);
    if (!e || typeof e.typeId !== "string") return undefined;
    return e.typeId.startsWith("pa:") ? e.typeId.slice(3) : e.typeId;
  } catch (e) {
    return undefined;
  }
}

export function konseyTara(oyuncular) {
  if (!KONSEY_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + KONSEY_TARAMA);

    /* Tek tur: her parca kendi yuvasinda araniyor. Ondort
       parca var ama yuva iki tane, yani en fazla iki okuma. */
    let takili = false;
    const okunan = new Map();
    for (const [kimlik, yuva] of KONSEY_GORUNMEZ) {
      if (!okunan.has(yuva)) okunan.set(yuva, yuvadaki(oyuncu, yuva));
      if (okunan.get(yuva) === kimlik) { takili = true; break; }
    }
    if (!takili) continue;

    try {
      oyuncu.addEffect("invisibility", KONSEY_SURE, {
        amplifier: 0,
        /* Parcacik KAPALI: acikken oyuncu parcacik bulutuna
           donuyor ve kostum gorunmez oluyor (zirh ve Ben 10
           tablolarindaki ayni ders).                        */
        showParticles: false
      });
    } catch (e) {
      hataYaz("konsey.gorunmezlik", e);
    }
  }
}

/* Testler ve dunya degisimi icin. */
export function konseyUnut(oyuncuId) {
  if (oyuncuId === undefined) { sonraki.clear(); return; }
  sonraki.delete(oyuncuId);
}
