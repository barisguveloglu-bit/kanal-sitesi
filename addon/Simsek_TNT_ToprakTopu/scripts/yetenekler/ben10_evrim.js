import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, baslikYaz,
  parcacikAt, koniHedefleri, varlikKonumu
} from "../yardimcilar.js";
import { elindekiYaratik } from "./ben10.js";
import {
  EVRIM_ACIK, EVRIM_SIRA, EVRIM_SURE, EVRIM_ARA, EVRIM_SES,
  EVRIM_PARCACIK, BEN10_EVRIM, BEN10_BICIM
} from "../ayarlar.js";

/* BEN 10 -- EVRIM KADEMESI                          v7.92

   Kaynak: `pinnacle_of_evolution` (AlienEvo eklentisi).
   Gerekceler ve oteki iki jar'in neden alinmadigi
   ayarlar.js'te ve REFERANS_BEN10_EK.md'de yazili.

   ---- BICIM DEGIL KADEME ----
   Bizdeki _proto / _10k ayni turun uc GORUNUMU ("gorunum
   farkli, guc ayni"). Evrim oyle degil: kaynakta ayri
   `powers/evolved_*.json` dosyalari var ve gucleri farkli.
   O yuzden bicim listesine eklenmedi.                       */

/* oyuncuId -> { tur, bitis } */
const evrimde = new Map();
export function evrimUnut(oyuncuId) {
  if (oyuncuId === undefined) evrimde.clear();
  else evrimde.delete(oyuncuId);
}
export function evrimDurum(oyuncuId) { return evrimde.get(oyuncuId); }

/* Elindeki yaratigin TUR adi -- bicim ekleri atiliyor.
   Kaynakta evrim TURE bagli, gorunume degil: 10K Ates ile
   Prototip Ates ayni evrime girer.                          */
export function turAdi(anahtar) {
  if (typeof anahtar !== "string") return undefined;
  for (const [ek] of BEN10_BICIM) {
    if (ek && anahtar.endsWith(ek)) return anahtar.slice(0, -ek.length);
  }
  return anahtar;
}

function vur(hedef, oyuncu, hasar) {
  try {
    hedef.applyDamage(hasar, { cause: "entityAttack", damagingEntity: oyuncu });
    return true;
  } catch (e) {
    try { hedef.applyDamage(hasar); return true; }
    catch (e2) { hataYaz("evrim.hasar", e2); return false; }
  }
}
function it(v, x, z, y) {
  try {
    if (typeof v.applyKnockback !== "function") return;
    try { v.applyKnockback({ x, z }, y); }
    catch (e) { v.applyKnockback(x, z, Math.hypot(x, z) * 3, y); }
  } catch (e) { /* itilemedi */ }
}
const cevre = (oyuncu, r) => koniHedefleri(oyuncu, {
  menzil: r, aci: -1, tavan: 12, oyuncuDahil: true
});

/* Alti mekanik. Her biri kaynaktaki function/guc adindan
   secildi, adindan degil.                                   */
const MEKANIK = {
  /* Ates: evolved_pyronite_nova.mcfunction */
  nova(oyuncu, t) {
    let n = 0;
    for (const h of cevre(oyuncu, t.yaricap)) {
      try {
        if (!gecerliMi(h)) continue;
        if (!vur(h, oyuncu, t.hasar)) continue;
        if (t.atesle && typeof h.setOnFire === "function") {
          try { h.setOnFire(t.atesle / 20, true); } catch (e) { /* onemsiz */ }
        }
        parcacikAt(oyuncu.dimension, "minecraft:basic_flame_particle",
                   varlikKonumu(h) || h.location);
        n++;
      } catch (e) { hataYaz("evrim.nova", e); }
    }
    return n;
  },

  /* Vahsi: evolved_vulpimancer_stun.mcfunction.
     HASAR YOK -- kaynakta da adi "stun".                    */
  sersem(oyuncu, t) {
    let n = 0;
    for (const h of cevre(oyuncu, t.yaricap)) {
      try {
        if (!gecerliMi(h) || typeof h.addEffect !== "function") continue;
        h.addEffect("slowness", t.sure, { amplifier: 3, showParticles: true });
        h.addEffect("nausea", t.sure, { amplifier: 0, showParticles: false });
        n++;
      } catch (e) { hataYaz("evrim.sersem", e); }
    }
    return n;
  },

  /* Elmas: kristal dikenler. Kaynakta BLOK koyuyor
     (crystal_spike); burada blok koyulmuyor -- bir oyuncuyu
     blogun icine hapsetmek bu depoda yasak (kafes.js'te ayni
     karar yazili). Karsiligi diken hasari.                 */
  diken(oyuncu, t) {
    let n = 0;
    for (const h of cevre(oyuncu, t.yaricap)) {
      try {
        if (!gecerliMi(h)) continue;
        if (!vur(h, oyuncu, t.hasar)) continue;
        parcacikAt(oyuncu.dimension, "minecraft:redstone_ore_dust_particle",
                   varlikKonumu(h) || h.location);
        n++;
      } catch (e) { hataYaz("evrim.diken", e); }
    }
    return n;
  },

  /* XLR8: speed_1..speed_5. Kademe her adimda bir artiyor ve
     TAVANDA duruyor -- kaynaktaki sayac gostergesinin
     karsiligi.                                             */
  hiz(oyuncu, t, durum) {
    durum.kademe = Math.min(t.kademe, (durum.kademe || 0) + 1);
    try {
      oyuncu.addEffect("speed", EVRIM_ARA + 20,
                       { amplifier: durum.kademe, showParticles: false });
    } catch (e) { /* efekt yoksa kademe yine ilerler */ }
    return durum.kademe;
  },

  /* Gri Madde: telekinezi. Hedefleri kendine ceker. */
  cekim(oyuncu, t) {
    const m = oyuncu.location;
    let n = 0;
    for (const h of cevre(oyuncu, t.yaricap)) {
      try {
        if (!gecerliMi(h)) continue;
        const k = h.location;
        const dx = m.x - k.x, dz = m.z - k.z;
        const boy = Math.hypot(dx, dz) || 1;
        it(h, dx / boy, dz / boy, 0.35);
        vur(h, oyuncu, t.hasar);
        n++;
      } catch (e) { hataYaz("evrim.cekim", e); }
    }
    return n;
  },

  /* Dort Kol: alan carpmasi -- vurur VE savurur. */
  carpma(oyuncu, t) {
    const m = oyuncu.location;
    let n = 0;
    for (const h of cevre(oyuncu, t.yaricap)) {
      try {
        if (!gecerliMi(h)) continue;
        if (!vur(h, oyuncu, t.hasar)) continue;
        const k = h.location;
        const dx = k.x - m.x, dz = k.z - m.z;
        const boy = Math.hypot(dx, dz) || 1;
        it(h, (dx / boy) * t.itme, (dz / boy) * t.itme, 0.6);
        n++;
      } catch (e) { hataYaz("evrim.carpma", e); }
    }
    return n;
  }
};

yetenekKaydet({
  kimlik: "evrim",
  ad: "Evrim Modulu",
  esyasiz: true,
  sira: EVRIM_SIRA,

  olustur(oyuncu) {
    if (!EVRIM_ACIK) { kollariIndir(oyuncu); return undefined; }

    /* KAPI: elinde evrimlesebilen bir yaratik olmali.
       Kaynakta da evrim modulu yalniz o alti ture isliyor;
       yedincisini uydurmadik.                              */
    const anahtar = elindekiYaratik(oyuncu);
    const tur = turAdi(anahtar);
    const t = tur && BEN10_EVRIM.get(tur);
    if (!t) {
      actionbarYaz(oyuncu, "§7Evrimleşebilen bir yaratık tut §8· " +
                           [...BEN10_EVRIM.keys()].length + " tür");
      kollariIndir(oyuncu);
      return undefined;
    }

    for (const [ad, sure, amp] of t.efektler || []) {
      try { oyuncu.addEffect(ad, sure, { amplifier: amp, showParticles: false }); }
      catch (e) { /* efekt yoksa otekiler versin */ }
    }
    try {
      oyuncu.dimension.playSound(EVRIM_SES, oyuncu.location);
      parcacikAt(oyuncu.dimension, EVRIM_PARCACIK, oyuncu.location);
      baslikYaz(oyuncu, t.renk + "✦ " + t.ad, "§7evrim tamamlandı");
    } catch (e) { /* gorsel onemsiz */ }

    const durum = { tur, bitis: system.currentTick + EVRIM_SURE, kademe: 0 };
    evrimde.set(oyuncu.id, durum);
    kollariIndir(oyuncu);

    const bas = system.currentTick;
    let sonraki = bas;
    let toplam = 0;
    return {
      ad: "evrim",
      oyuncuId: oyuncu.id,
      calis() {
        const simdi = system.currentTick;
        if (simdi - bas >= EVRIM_SURE) return true;
        if (simdi < sonraki) return false;
        sonraki = simdi + EVRIM_ARA;
        if (!gecerliMi(oyuncu)) return true;

        /* ELINDEN BIRAKIRSA EVRIM BITER. Kaynakta da evrim
           o yaratigin ustune biniyor; yaratik gidince evrim
           de gider.                                        */
        if (turAdi(elindekiYaratik(oyuncu)) !== tur) return true;

        try {
          const is = MEKANIK[t.mekanik];
          const n = is ? is(oyuncu, t, durum) || 0 : 0;
          if (n > 0) {
            toplam += n;
            actionbarYaz(oyuncu, t.renk + "✦ §f" + t.ad + " §8· " +
              (t.mekanik === "hiz" ? "kademe " + n : n + " hedef"));
          }
          parcacikAt(oyuncu.dimension, EVRIM_PARCACIK, oyuncu.location);
        } catch (e) { hataYaz("evrim.adim", e); }
        return false;
      },
      bitir() {
        evrimde.delete(oyuncu.id);
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§7Evrim sona erdi §8· " + toplam);
          }
        } catch (e) { /* onemsiz */ }
      }
    };
  }
});
