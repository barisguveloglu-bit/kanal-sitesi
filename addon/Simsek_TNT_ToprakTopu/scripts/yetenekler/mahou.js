import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, bilgiYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  eldekiEsya
} from "../yardimcilar.js";
import {
  MAHOU_ACIK, MAHOU_ONEK, MAHOU_TARAMA, MAHOU_MANA_TAVAN,
  MAHOU_MANA_TICK, MAHOU_BASLANGIC_MANA, MAHOU_KAYIT_ANAHTAR,
  MAHOU_ESYALAR, MAHOU_BUYULER, LAZER_HASAR_SEBEP
} from "../ayarlar.js";

/* ================================================================
   MAHOU TSUKAI  (Buyucu)                                   v5.4

   Kullanici: "bir tane daha mod buldum, bunu da ekle aynı
   şekilde... kalıcı olarak aktar."

   ---- MANA MODUN KALBI ----
   Modda her buyunun bir bedeli var ve manan yoksa buyu
   calismiyor. Bizde de oyle -- yoksa yirmi buyu yirmi bedava
   dugmeye donerdi ve modun dengesi kaybolurdu.

   Bedeller kaynagin kendi ayarlarindan (MTConfig$Server):
   Gandr 5, Yukselis 30, Hasar Takasi 40, Fay Gorusu 100,
   ... Dusus 2000. Yani ucuz buyu cok, pahali buyu az
   kullanilir.

   ---- MANA NEREDE DURUYOR ----
   Oyuncunun kendi dinamik ozelliginde (simsek:mahou). Dunya
   ozelliginde DEGIL: kalp defterinde ogrenildi, oyuncu basina
   veri oyuncunun uzerinde durursa dunya kaydi sismiyor ve
   oyuncu silinince veri de gidiyor.

   ---- BUYULER NASIL TETIKLENIYOR ----
   Parsomeni ELINE AL, menuden ya da jestle tetikle. Kaynakta
   buyuler yere cizilen CEMBERLE calisiyor; blok deseni okuyup
   ritüel calistirmak ayri bir sistem ve alinmadi. Bu bir
   sadelestirme ve ozetlerde/NOTLAR'da yazili.
   ================================================================ */

/* oyuncuId -> bir sonraki mana tazeleme tick'i */
const sonraki = new Map();

export function mahouUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    sonraki.clear(); bellekMana.clear(); ozellikVar = undefined;
    return;
  }
  sonraki.delete(oyuncuId);
  bellekMana.delete(oyuncuId);
}

/* ---------------- mana ----------------

   ---- NEDEN IKI YOL VAR ----
   Mana oyuncunun DINAMIK OZELLIGINDE duruyor: dunya kaydi
   sismesin ve oyuncu silinince veri de gitsin diye (kalp
   defterindeki karar).

   Ama `setDynamicProperty` her API surumunde YOK. Ilk yazimda
   eksik oldugunda hataYaz cagriliyordu ve tarama testi
   yakaladi: Content Log saniyede uc kez, HER OYUNCU icin
   dolardi. Simdi eksiklik BIR KEZ olculuyor, bir kez
   bildiriliyor ve bellekteki deftere dusuluyor -- mana o
   oturumda calisiyor, yalniz dunyayi kapatinca sifirlaniyor.
   (bot_ilkel'deki "eksik API ozelligi kapatir, paketi
   oldurmez" kuralinin aynisi.)                              */
let ozellikVar;                 /* undefined = henuz olculmedi */
const bellekMana = new Map();   /* oyuncuId -> mana (yedek yol) */

function ozellikDestekli(oyuncu) {
  if (ozellikVar !== undefined) return ozellikVar;
  ozellikVar = typeof oyuncu.setDynamicProperty === "function" &&
               typeof oyuncu.getDynamicProperty === "function";
  if (!ozellikVar) {
    bilgiYaz("Dinamik ozellik yok: Mahou manasi bellekte tutuluyor. " +
             "Buyuler calisiyor, mana dunya kapaninca sifirlaniyor.");
  }
  return ozellikVar;
}

export function manaOku(oyuncu) {
  if (!ozellikDestekli(oyuncu)) {
    const v = bellekMana.get(oyuncu.id);
    return typeof v === "number" ? v : MAHOU_BASLANGIC_MANA;
  }
  try {
    const v = oyuncu.getDynamicProperty(MAHOU_KAYIT_ANAHTAR);
    if (typeof v === "number") return v;
  } catch (e) { /* ozellik henuz yazilmamis */ }
  return MAHOU_BASLANGIC_MANA;
}

export function manaYaz(oyuncu, deger) {
  const v = Math.max(0, Math.min(MAHOU_MANA_TAVAN, Math.floor(deger)));
  if (!ozellikDestekli(oyuncu)) {
    bellekMana.set(oyuncu.id, v);
    return v;
  }
  try {
    oyuncu.setDynamicProperty(MAHOU_KAYIT_ANAHTAR, v);
  } catch (e) {
    /* Bir kez yaziyoruz ve bir daha denemiyoruz: her
       taramada hata gunlugune dusmek Content Log'u
       kullanilmaz yapiyordu.                              */
    ozellikVar = false;
    bellekMana.set(oyuncu.id, v);
    bilgiYaz("Mahou manasi yazilamadi, bellege alindi: " +
             (e && e.message ? e.message : e));
  }
  return v;
}

/* Bedeli ode. Yetmiyorsa ODEMEZ ve false doner -- yarim
   odeme yok, buyu ya calisir ya calismaz.                    */
export function manaHarca(oyuncu, bedel) {
  const simdi = manaOku(oyuncu);
  if (simdi < bedel) {
    actionbarYaz(oyuncu, "§9✦ §cMana yetmiyor §8· " + simdi + " / " + bedel);
    return false;
  }
  manaYaz(oyuncu, simdi - bedel);
  return true;
}

/* Merkezi tick'ten: mana tazelenmesi.
   MANA_REGEN_PER_TICK 1 -- ama biz her TICK degil her
   MAHOU_TARAMA tick'te bakiyoruz, o yuzden birikmis miktar
   veriliyor. Sonuc ayni, cagri sayisi yirmide bir.           */
export function mahouTara(oyuncular) {
  if (!MAHOU_ACIK) return;
  const simdi = system.currentTick;
  for (const oyuncu of oyuncular) {
    const hazir = sonraki.get(oyuncu.id);
    if (hazir !== undefined && simdi < hazir) continue;
    const gecen = hazir === undefined ? MAHOU_TARAMA : simdi - hazir + MAHOU_TARAMA;
    sonraki.set(oyuncu.id, simdi + MAHOU_TARAMA);
    const m = manaOku(oyuncu);
    if (m < MAHOU_MANA_TAVAN) {
      manaYaz(oyuncu, m + MAHOU_MANA_TICK * Math.min(gecen, MAHOU_TARAMA * 4));
    }
  }
}

/* ---------------- elindeki ---------------- */
function elindekiKimlik(oyuncu) {
  let kimlik;
  try {
    /* DIKKAT: eldekiEsya ESYAYI degil KIMLIGINI donduruyor
       (v5.0'da uc dosyada bu yuzden hata cikmisti).         */
    kimlik = eldekiEsya(oyuncu);
  } catch (e) { /* eli bos */ }
  if (typeof kimlik === "string") return kimlik;
  try {
    const b = oyuncu.getComponent("minecraft:equippable");
    if (b && typeof b.getEquipment === "function") {
      const e = b.getEquipment("Mainhand");
      if (e) return e.typeId;
    }
  } catch (e) { /* bilesen yok */ }
  return undefined;
}

/* Elinde bu buyunun parsomeni ya da bu esya var mi? */
function elinde(oyuncu, anahtar) {
  return elindekiKimlik(oyuncu) === MAHOU_ONEK + anahtar;
}

export function elindekiBuyu(oyuncu) {
  const k = elindekiKimlik(oyuncu);
  if (typeof k !== "string" || !k.startsWith(MAHOU_ONEK)) return undefined;
  const a = k.slice(MAHOU_ONEK.length);
  return MAHOU_BUYULER.has(a) ? a : undefined;
}

export function elindekiMahouEsya(oyuncu) {
  const k = elindekiKimlik(oyuncu);
  if (typeof k !== "string" || !k.startsWith(MAHOU_ONEK)) return undefined;
  const a = k.slice(MAHOU_ONEK.length);
  return MAHOU_ESYALAR.has(a) ? a : undefined;
}

/* ---------------- ortak yardimcilar ---------------- */
function bakilanVarlik(oyuncu, menzil) {
  try {
    if (typeof oyuncu.getEntitiesFromViewDirection !== "function") return undefined;
    const v = oyuncu.getEntitiesFromViewDirection({ maxDistance: menzil });
    for (const x of v || []) {
      const e = x.entity || x;
      if (e && e.id !== oyuncu.id) return e;
    }
  } catch (e) { /* yok */ }
  return undefined;
}

function yakindakiler(oyuncu, yaricap) {
  try {
    return oyuncu.dimension.getEntities({
      location: oyuncu.location, maxDistance: yaricap,
      excludeTypes: ["minecraft:player", "minecraft:item"]
    });
  } catch (e) {
    return [];
  }
}

function vur(varlik, hasar, atan) {
  try {
    varlik.applyDamage(hasar, { cause: LAZER_HASAR_SEBEP, damagingEntity: atan });
    return true;
  } catch (e) { /* asagi dus */ }
  try { varlik.applyDamage(hasar); return true; } catch (e) { return false; }
}

function canEkle(varlik, miktar) {
  try {
    const c = varlik.getComponent("minecraft:health");
    if (!c) return;
    const simdi = typeof c.currentValue === "number" ? c.currentValue
      : (typeof c.getCurrentValue === "function" ? c.getCurrentValue() : undefined);
    if (simdi === undefined) return;
    const tavan = typeof c.effectiveMax === "number" ? c.effectiveMax : 20;
    if (typeof c.setCurrentValue === "function") {
      c.setCurrentValue(Math.min(tavan, simdi + miktar));
    }
  } catch (e) { /* bilesen yok */ }
}

/* ---------------- buyu kaydi ----------------

   Yirmi buyunun ONALTISI ayni kalibi paylasiyor: parsomeni
   tut, bedeli ode, ya EFEKT ver ya SCRIPT isi yap. Tek tek
   yazmak yerine tablodan uretiliyor -- yeni bir buyu
   eklenince burasi kendiliginden dogru kalir.

   Jest sirasi 340'tan basliyor: Marvel mekanikleri 320-327'de,
   isinlar 300'lerde. siraDenetimi carpismayi zaten yakalar
   ama arada rahat yer birakildi.                            */
let _sira = 340;

/* Buyunun script isi: kimlik -> (oyuncu) => is|undefined */
const ISLER = {};

for (const [anahtar, t] of MAHOU_BUYULER) {
  yetenekKaydet({
    kimlik: "mahou_buyu_" + anahtar,
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      if (!MAHOU_ACIK) { kollariIndir(oyuncu); return undefined; }
      /* KAPI: parsomen elinde olmali. Yetenek menuden de
         secilebiliyor, o yuzden burada da sinaniyor.        */
      if (!elinde(oyuncu, anahtar)) {
        actionbarYaz(oyuncu, "§9✦ §7Parşömeni eline al §8· " + t.ad);
        kollariIndir(oyuncu);
        return undefined;
      }
      if (!manaHarca(oyuncu, t.mana)) {
        kollariIndir(oyuncu);
        return undefined;
      }
      try {
        parcacikAt(oyuncu.dimension, "minecraft:enchanting_table_particle",
                   oyuncu.location);
      } catch (e) { /* parcacik onemli degil */ }

      for (const [ad, sure, amp] of t.efektler || []) {
        try {
          oyuncu.addEffect(ad, sure, { amplifier: amp, showParticles: false });
        } catch (e) { /* efekt yoksa otekiler versin */ }
      }
      const is = t.yetenek && ISLER[t.yetenek]
        ? ISLER[t.yetenek](oyuncu, t) : undefined;
      actionbarYaz(oyuncu, "§9✦ §f" + t.ad + " §8· " + manaOku(oyuncu) + " mana");
      kollariIndir(oyuncu);
      return is;
    }
  });
}

/* ---------------- buyulerin script isleri ---------------- */

/* Gandr: kara mermi. GANDR_MIN_DAMAGE 5.0, HIT_RADIUS 6.0.  */
ISLER.mahou_gandr = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 32);
  if (!hedef) {
    actionbarYaz(oyuncu, "§9✦ §7Gandr hedef bulamadı");
    return undefined;
  }
  vur(hedef, 5, oyuncu);
  /* HIT_RADIUS 6.0: hedefin cevresindekiler de yiyor.       */
  try {
    for (const v of oyuncu.dimension.getEntities({
      location: hedef.location, maxDistance: 6,
      excludeTypes: ["minecraft:player", "minecraft:item"]
    })) {
      if (v.id === hedef.id) continue;
      vur(v, 5, oyuncu);
    }
    parcacikAt(oyuncu.dimension, "minecraft:basic_smoke_particle",
               hedef.location);
  } catch (e) { /* alan yok */ }
  return undefined;
};

/* Kara Alev: 30 blok menzil, 100 tik yanma.                 */
ISLER.mahou_kara_alev = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 30);
  if (!hedef) return undefined;
  try {
    if (typeof hedef.setOnFire === "function") hedef.setOnFire(5, true);
  } catch (e) { /* yakilamadi */ }
  vur(hedef, 6, oyuncu);
  return undefined;
};

/* Dusus: 30 blok yaricapta 2.0 + hedefin caninin %5'i.      */
ISLER.mahou_dusus = (oyuncu) => {
  for (const v of yakindakiler(oyuncu, 30)) {
    let can = 0;
    try {
      const c = v.getComponent("minecraft:health");
      can = c ? (c.currentValue || 0) : 0;
    } catch (e) { /* can okunamadi */ }
    vur(v, 2 + can * 0.05, oyuncu);
  }
  try {
    parcacikAt(oyuncu.dimension, "minecraft:huge_explosion_emitter",
               oyuncu.location);
  } catch (e) { /* parcacik onemli degil */ }
  return undefined;
};

/* Icgoru: 1200 tik boyunca yakindakiler parliyor.           */
ISLER.mahou_icgoru = (oyuncu) => surekli(oyuncu, 1200, 20, (o) => {
  for (const v of yakindakiler(o, 20)) {
    try { v.addEffect("glowing", 40, { amplifier: 0, showParticles: false }); }
    catch (e) { /* efekt yok */ }
  }
});

/* Alarm Siniri: 10 blok, cevrim 20 tik.                     */
ISLER.mahou_alarm = (oyuncu) => surekli(oyuncu, 1200, 20, (o) => {
  for (const v of yakindakiler(o, 10)) {
    try { v.addEffect("glowing", 40, { amplifier: 0, showParticles: false }); }
    catch (e) { /* efekt yok */ }
  }
});

/* Can Emme Siniri: yaricap 10, hasar 2.0, iyilesme x0.5.    */
ISLER.mahou_can_emme = (oyuncu) => surekli(oyuncu, 1200, 20, (o) => {
  let toplam = 0;
  for (const v of yakindakiler(o, 10)) {
    if (vur(v, 2, o)) toplam += 2;
  }
  if (toplam > 0) canEkle(o, toplam * 0.5);
});

/* Yercekimi Siniri: yaricap 10, carpan 1.4, cevrim 1.
   Cevrim 1 kaynakta HER TICK demek; bizde 2 tick, cunku her
   tick varlik taramasi bu depoda pahali (butce dersi).      */
ISLER.mahou_yercekimi = (oyuncu) => surekli(oyuncu, 600, 2, (o) => {
  for (const v of yakindakiler(o, 10)) {
    try {
      if (typeof v.applyKnockback === "function") v.applyKnockback(0, 0, 0, -1.4);
      else if (typeof v.applyImpulse === "function") v.applyImpulse({ x: 0, y: -1.4, z: 0 });
    } catch (e) { /* itilemedi */ }
  }
});

/* Olum Toplama: 600 tik, 10 blok, olen her canli can veriyor.
   SOUL_VALUE_MOB 0.25 x REVIVE_VALUE 12.0 = 3 can.          */
ISLER.mahou_olum_toplama = (oyuncu) => {
  const bitis = system.currentTick + 600;
  const gorulen = new Map();
  return {
    calis() {
      if (system.currentTick > bitis || !gecerliMi(oyuncu)) return true;
      for (const v of yakindakiler(oyuncu, 10)) {
        let can;
        try {
          const c = v.getComponent("minecraft:health");
          can = c ? c.currentValue : undefined;
        } catch (e) { continue; }
        const onceki = gorulen.get(v.id);
        gorulen.set(v.id, can);
        if (onceki !== undefined && can !== undefined && can <= 0 && onceki > 0) {
          canEkle(oyuncu, 0.25 * 12.0);
        }
      }
      return false;
    }
  };
};

/* Baglama: 5 blokta baktigini 600 tik dondurur.             */
ISLER.mahou_baglama = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 5);
  if (!hedef) {
    actionbarYaz(oyuncu, "§9✦ §7Bağlanacak hedef yok §8(5 blok)");
    return undefined;
  }
  try {
    hedef.addEffect("slowness", 600, { amplifier: 6, showParticles: true });
    hedef.addEffect("weakness", 600, { amplifier: 2, showParticles: false });
  } catch (e) { /* efekt yok */ }
  return undefined;
};

/* Zihinsel Yer Degistirme: 20 blokta baktiginla yer degistir. */
ISLER.mahou_yer_degistir = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 20);
  if (!hedef) {
    actionbarYaz(oyuncu, "§9✦ §7Yer değiştirecek hedef yok");
    return undefined;
  }
  try {
    const a = oyuncu.location, b = hedef.location;
    hedef.teleport({ x: a.x, y: a.y, z: a.z }, { dimension: oyuncu.dimension });
    oyuncu.teleport({ x: b.x, y: b.y, z: b.z }, { dimension: oyuncu.dimension });
  } catch (e) {
    hataYaz("mahou.yerDegistir", e);
  }
  return undefined;
};

/* Uzamsal Karisiklik: 4 blok alanda hiz 7.0 ile firlat.     */
ISLER.mahou_savrul = (oyuncu) => {
  let yon;
  try { yon = oyuncu.getViewDirection(); } catch (e) { return undefined; }
  for (const v of yakindakiler(oyuncu, 4)) {
    try {
      if (typeof v.applyKnockback === "function") {
        v.applyKnockback(yon.x * 7, yon.z * 7,
                         Math.hypot(yon.x * 7, yon.z * 7), yon.y * 7);
      } else if (typeof v.applyImpulse === "function") {
        v.applyImpulse({ x: yon.x * 7, y: yon.y * 7, z: yon.z * 7 });
      }
    } catch (e) { /* itilemedi */ }
  }
  return undefined;
};

/* Yukselis: oyuncuyu yukari kaldirir.                       */
ISLER.mahou_yukselis = (oyuncu) => {
  try {
    oyuncu.addEffect("levitation", 60, { amplifier: 4, showParticles: false });
    oyuncu.addEffect("slow_falling", 200, { amplifier: 0, showParticles: false });
  } catch (e) { /* efekt yok */ }
  return undefined;
};

/* Surekli buyuler icin ortak is: sure boyunca her `aralik`
   tick'te bir govdeyi calistir.                             */
function surekli(oyuncu, sure, aralik, govde) {
  const bitis = system.currentTick + sure;
  let sonraki2 = 0;
  return {
    calis() {
      const simdi = system.currentTick;
      if (simdi > bitis || !gecerliMi(oyuncu)) return true;
      if (simdi < sonraki2) return false;
      sonraki2 = simdi + aralik;
      try { govde(oyuncu); } catch (e) { hataYaz("mahou.surekli", e); }
      return false;
    }
  };
}

/* ---------------- ESYA yetenekleri ----------------

   Silah ve asalar. Kapi: o esya ELINDE olmali.

   DIKKAT: ESYA_ISLERI asagidaki dongunun USTUNDE tanimli.
   Altta olsaydi teknik olarak yine calisirdi (olustur sonra
   cagriliyor) ama v4.94'te tam bu bicimdeki bir "const kendi
   tanimindan once okunuyor" hatasi menuyu uc surum boyunca
   patlatmisti. Sira artik goze gorunur.                     */
const ESYA_ISLERI = {};

for (const [anahtar, t] of MAHOU_ESYALAR) {
  if (!t.yetenek) continue;
  yetenekKaydet({
    kimlik: t.yetenek,
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,

    olustur(oyuncu) {
      if (!MAHOU_ACIK) { kollariIndir(oyuncu); return undefined; }
      if (!elinde(oyuncu, anahtar)) {
        actionbarYaz(oyuncu, "§9✦ §7" + t.ad + " elinde değil");
        kollariIndir(oyuncu);
        return undefined;
      }
      if (t.mana && !manaHarca(oyuncu, t.mana)) {
        kollariIndir(oyuncu);
        return undefined;
      }
      const is = ESYA_ISLERI[t.yetenek]
        ? ESYA_ISLERI[t.yetenek](oyuncu, t) : undefined;
      kollariIndir(oyuncu);
      return is;
    }
  });
}

/* Rhongomyniad: 20 blokta 10 yildirim.                      */
ESYA_ISLERI.mahou_kutsal_mizrak = (oyuncu) => {
  let sayi = 0;
  for (const v of yakindakiler(oyuncu, 20)) {
    if (sayi >= 10) break;
    sayi++;
    try {
      oyuncu.dimension.spawnEntity("minecraft:lightning_bolt", v.location);
    } catch (e) {
      vur(v, 8, oyuncu);
    }
  }
  actionbarYaz(oyuncu, "§9✦ §fRhongomyniad §8· " + sayi + " hedef");
  return undefined;
};

/* Emrys: 22 blok, saniyede 4 hasar (odakli).                */
ESYA_ISLERI.mahou_yildirim_asasi = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 22);
  if (!hedef) {
    actionbarYaz(oyuncu, "§9✦ §7Emrys hedef bulamadı §8(22 blok)");
    return undefined;
  }
  /* DAMAGE_FOCUSED_PER_SECOND 4.0 -- bizimki tek atis, o
     yuzden bir saniyelik toplam (4) veriliyor. Isin
     motorundaki "ayni saniyelik hasar" kuralinin aynisi.    */
  vur(hedef, 4, oyuncu);
  try {
    parcacikAt(oyuncu.dimension, "minecraft:electric_spark_particle",
               hedef.location);
  } catch (e) { /* parcacik onemli degil */ }
  return undefined;
};

/* Mystic Staff: patlayan mana isini.                        */
ESYA_ISLERI.mahou_mana_patlamasi = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 30);
  const yer = hedef ? hedef.location : undefined;
  if (!yer) return undefined;
  for (const v of oyuncu.dimension.getEntities({
    location: yer, maxDistance: 6,
    excludeTypes: ["minecraft:player", "minecraft:item"]
  })) {
    vur(v, 12, oyuncu);
  }
  try {
    parcacikAt(oyuncu.dimension, "minecraft:huge_explosion_emitter", yer);
  } catch (e) { /* parcacik onemli degil */ }
  return undefined;
};

ESYA_ISLERI.mahou_savrul = ISLER.mahou_savrul;

/* The Ripper: 20 blok sis -- gorunmezlik ve korku.          */
ESYA_ISLERI.mahou_sis = (oyuncu) => {
  try {
    oyuncu.addEffect("invisibility", 200, { amplifier: 0, showParticles: false });
  } catch (e) { /* efekt yok */ }
  for (const v of yakindakiler(oyuncu, 20)) {
    try {
      v.addEffect("blindness", 100, { amplifier: 0, showParticles: false });
      v.addEffect("slowness", 100, { amplifier: 1, showParticles: false });
    } catch (e) { /* efekt yok */ }
  }
  return undefined;
};

/* Clarent: yara. WOUND_TICKS 600, WOUND_DAMAGE 0.2.         */
ESYA_ISLERI.mahou_yara = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 6);
  if (!hedef) return undefined;
  try {
    hedef.addEffect("wither", 600, { amplifier: 0, showParticles: true });
  } catch (e) {
    vur(hedef, 3, oyuncu);
  }
  return undefined;
};

/* Morgan: ofke. RAGE_TIME 120, HEAL_FACTOR 30.              */
ESYA_ISLERI.mahou_ofke = (oyuncu) => {
  try {
    oyuncu.addEffect("strength", 120, { amplifier: 2, showParticles: false });
    oyuncu.addEffect("speed", 120, { amplifier: 1, showParticles: false });
  } catch (e) { /* efekt yok */ }
  return undefined;
};

/* Rule Breaker: hedefin butun etkilerini siler.             */
ESYA_ISLERI.mahou_kural_kirici = (oyuncu) => {
  const hedef = bakilanVarlik(oyuncu, 6);
  if (!hedef) return undefined;
  try {
    if (typeof hedef.getEffects === "function") {
      for (const e of hedef.getEffects()) {
        try { hedef.removeEffect(e.typeId); } catch (e2) { /* silinemedi */ }
      }
    }
    actionbarYaz(oyuncu, "§9✦ §fRule Breaker §8· etkiler silindi");
  } catch (e) {
    hataYaz("mahou.kuralKirici", e);
  }
  return undefined;
};

/* Hazine Yansitma Eldiveni: silah yagmuru.                  */
ESYA_ISLERI.mahou_hazine = (oyuncu) => {
  for (const v of yakindakiler(oyuncu, 12)) {
    vur(v, 10, oyuncu);
    try {
      parcacikAt(oyuncu.dimension, "minecraft:critical_hit_emitter", v.location);
    } catch (e) { /* parcacik onemli degil */ }
  }
  return undefined;
};

/* ---------------- menu icin ---------------- */
export function mahouListesi(oyuncu) {
  const elde = elindekiKimlik(oyuncu);
  const cikti = [];
  for (const [anahtar, t] of MAHOU_BUYULER) {
    cikti.push({
      anahtar, ad: t.ad, en: t.en, mana: t.mana, ozet: t.ozet,
      tur: "büyü", esya: MAHOU_ONEK + anahtar,
      elinde: elde === MAHOU_ONEK + anahtar
    });
  }
  for (const [anahtar, t] of MAHOU_ESYALAR) {
    cikti.push({
      anahtar, ad: t.ad, en: t.en, mana: t.mana || 0, ozet: t.ozet,
      tur: "eşya", esya: MAHOU_ONEK + anahtar,
      elinde: elde === MAHOU_ONEK + anahtar
    });
  }
  return cikti;
}
