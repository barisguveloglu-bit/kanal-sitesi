import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import { kademeAl, lazerGozuAc, lazerGozuKapat } from "./iksirler.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  LAZER_KALINLIK, LAZER_SURE, LAZER_ADIM, LAZER_TAVAN, LAZER_OYUNCU,
  PARCACIK_LAZER,
  LAZER_MENZIL, DUVAR_DELME_ACIK, DUVAR_DELME_YARICAP,
  DUVAR_DELME_TAVAN, KORUNAN_KUME,
  LAZER_DONDUR_SURE, LAZER_DONDUR_SEVIYE,
  LAZER_MODLARI, LAZER_MOD_VARSAYILAN,
  LAZER_BUZ_ACIK, LAZER_BUZ_BLOK, LAZER_BUZ_SURE,
  LAZER_BUZ_YARICAP, LAZER_BUZ_YUKSEK, LAZER_BUZ_TAVAN,
  LAZER_HASAR, LAZER_BIRAKILAN_CAN, LAZER_TEPKI_HASARI,
  LAZER_ZIRH_ACIK, LAZER_ZIRH_KALAN,
  LAZER_VURUS_ARALIK, LAZER_CIZIM_ARALIK,
  LAZER_KALKAN_KIR, LAZER_KALKAN_SURESI, LAZER_KALKAN_ESYALARI
} from "../ayarlar.js";

/* ============================================================
   LAZER MODU SECIMI  (v4.67)

   Element iksirinin lazeri iki turlu: buz ve ates. Kullanici:
   "atesi olarak ayarladigimiz zaman karsidaki kisi yanmaya
   basliyor, buz haline cevirirsek karsidaki kisi yavaslik
   aliyor ve etrafi buz blogu ile kaplaniyor."

   Secim OYUNCU BASINA tutuluyor ve kolun menusunden
   degistiriliyor. Sadece modu olan kademelerde gorunuyor --
   digerlerinde menuye satir eklenmiyor.                     */
const modSecim = new Map();     // oyuncuId -> mod kimligi

/* Buz kafesinin sekli: hedefin etrafinda ici BOS bir kabuk.
   Bir kez hesaplaniyor -- her atista yeniden uretmek bosuna.

   Ici bos olmasi sart: dolu olsaydi hedef blogun icinde kalir
   ve BOGULARAK olurdu. Istenen sey hapsetmek, oldurmek degil;
   hasari zaten lazer veriyor.                                */
/* ============================================================
   LAZERIN UC SERT ETKISI  (v4.68)

   Kullanici: "full elmas setli birinin elmas zirhinin tumunu
   yari canina indirsin... elmas setli o kisinin yarim kalplik
   cani kalsin... kalkan tuttugu zaman da o da 1-2 saniye
   icinde parcalansin."
   ============================================================ */

const ZIRH_YUVALARI = ["Head", "Chest", "Legs", "Feet"];

/* Bir esyanin dayanikligini oranla. Donen deger: degisti mi.

   DIKKAT -- getEquipment KOPYA veriyor. Uzerinde degisiklik
   yapip setEquipment ile GERI YAZMAZSAN hicbir sey olmaz;
   sessizce calisir gorunur. Bu tuzak bu depoda daha once
   silahta yasandi (v4.59).                                   */
function esyayiYipranmis(varlik, yuva, kalanPuan) {
  let bilesen;
  try {
    bilesen = varlik.getComponent("minecraft:equippable");
  } catch (e) {
    return false;
  }
  if (!bilesen || typeof bilesen.getEquipment !== "function") return false;

  let esya;
  try {
    esya = bilesen.getEquipment(yuva);
  } catch (e) {
    return false;
  }
  if (!esya) return false;

  let day;
  try {
    day = esya.getComponent("minecraft:durability");
  } catch (e) {
    return false;
  }
  if (!day || typeof day.maxDurability !== "number") return false;

  /* Kalan dayanikligi kalanPuan'a cek. Buyulere bagisik:
     durability.damage DOGRUDAN yaziliyor, oyunun yipranma
     zari (Unbreaking) hic atilmiyor.                        */
  const hedefHasar = Math.max(0, day.maxDurability - kalanPuan);
  /* ZATEN daha yipranmissa DOKUNMA. Yoksa lazer dusmanin
     zirhini TAMIR ederdi -- sessiz ve tersine calisan bir
     hata olurdu.                                             */
  if (day.damage >= hedefHasar) return false;

  try {
    day.damage = hedefHasar;
    bilesen.setEquipment(yuva, esya);      // geri yazmadan olmuyor
    return true;
  } catch (e) {
    return false;
  }
}

/* Dort zirh parcasinin dayanikligini bitme noktasina ceker.
   Donen deger: kac parca etkilendi.

   Sonuc: elmas kilicla tek vurus dort parcayi da AYNI ANDA
   kiriyor -- kullanicinin istedigi bu.                      */
function zirhiYarila(varlik) {
  let n = 0;
  for (const yuva of ZIRH_YUVALARI) {
    try {
      if (esyayiYipranmis(varlik, yuva, LAZER_ZIRH_KALAN)) n++;
    } catch (e) {
      hataYaz("goz_lazeri.zirhiYarila", e);
    }
  }
  return n;
}

/* Elinde kalkan varsa dayanikligini bitme noktasina ceker.
   Donen deger: kalkan bulundu mu (kirilma isi cagirana ait). */
function kalkaniHazirla(varlik) {
  let bulundu = false;
  for (const yuva of ["Offhand", "Mainhand"]) {
    try {
      const bilesen = varlik.getComponent("minecraft:equippable");
      if (!bilesen || typeof bilesen.getEquipment !== "function") return false;
      const esya = bilesen.getEquipment(yuva);
      if (!esya || !LAZER_KALKAN_ESYALARI.has(esya.typeId)) continue;

      const day = esya.getComponent("minecraft:durability");
      if (day && typeof day.maxDurability === "number") {
        day.damage = Math.max(day.damage, day.maxDurability - 1);
        bilesen.setEquipment(yuva, esya);
      }
      bulundu = true;
    } catch (e) {
      hataYaz("goz_lazeri.kalkaniHazirla", e);
    }
  }
  return bulundu;
}

/* Isaretlenen kalkani gercekten kirar (yuvadan siler). */
function kalkaniKir(varlik) {
  if (!gecerliMi(varlik)) return;
  for (const yuva of ["Offhand", "Mainhand"]) {
    try {
      const bilesen = varlik.getComponent("minecraft:equippable");
      if (!bilesen || typeof bilesen.getEquipment !== "function") return;
      const esya = bilesen.getEquipment(yuva);
      if (!esya || !LAZER_KALKAN_ESYALARI.has(esya.typeId)) continue;
      bilesen.setEquipment(yuva, undefined);
      try {
        varlik.dimension.playSound("random.break", varlik.location);
      } catch (e) {
        /* ses her surumde yok; kalkan zaten kirildi */
      }
    } catch (e) {
      hataYaz("goz_lazeri.kalkaniKir", e);
    }
  }
}

/* Hedefin canini LAZER_BIRAKILAN_CAN'a sabitler.

   ---- BURADA GERCEK BIR CELISKI VAR (v4.69) ----
   Kullanici iki sey istedi:
     "lazerin gucunu daha da guclendirelim" (ham hasar 200)
     "kalp kalma isi de ayni olsun"        (yarim kalp kalsin)

   Ikisi ayni anda olmuyor: 200 hasar full elmas setli bir
   oyuncuyu (20 can) ZATEN olduruyor, yani yarim kalp kalmiyor.
   Simulasyonda birebir goruldu: 200 hasar -> 0 can.

   Cozum: hasari degil DURUMU kural yapmak.

     can yarim kalpten YUKSEKSE  -> yarim kalbe SABITLENIR,
                                    olmez. Tepki icin kucuk
                                    bir hasar veriliyor
                                    (vurus hissi, geri tepme,
                                    mobun sana donmesi).
     can zaten yarim kalpTEYSE   -> LAZER_HASAR ile BITIRILIR.

   Sonuc: ilk vurus soyuyor ve yarim kalple birakiyor; isini
   uzerinde TUTMAYA devam edersen bir sonraki vurus (yarim
   saniye sonra) olduruyor. Yani hem "yarim kalp kalsin" hem
   "cok daha guclu" ayni anda saglaniyor.

   NEDEN HASAR HESABIYLA DEGIL: Bedrock'ta zirh indirimi zirh
   puani + toughness + Koruma buyusune bagli ve hangi formulun
   gecerli oldugunu OLCMEDEN bilemeyiz. Cani DOGRUDAN yazmak
   buyuye de formule de bagisik.

   EMILIM (absorption) ayrica siliniyor: o kalpler
   minecraft:health'in DISINDA duruyor, can yazmak onlara
   dokunmuyordu. Full buyulu bir patronun emilimi olmasa da
   olurdu diye degil -- "neredeyse tum canina goturSun"
   istegi ancak boyle tutuyor.                                */
function cananCek(varlik) {
  if (LAZER_BIRAKILAN_CAN <= 0) {
    /* 0 = "lazer oldursun": kural kapali, tam hasar. */
    try {
      varlik.applyDamage(LAZER_HASAR, { cause: "fire" });
    } catch (e) {
      hataYaz("goz_lazeri.cananCek", e);
    }
    return;
  }

  let can;
  try {
    can = varlik.getComponent("minecraft:health");
  } catch (e) {
    can = undefined;
  }

  /* Can bileseni okunamiyorsa elimizdeki tek arac hasar. */
  if (!can || typeof can.currentValue !== "number" ||
      typeof can.setCurrentValue !== "function") {
    try {
      varlik.applyDamage(LAZER_HASAR, { cause: "fire" });
    } catch (e) {
      hataYaz("goz_lazeri.cananCek", e);
    }
    return;
  }

  /* Emilim kalpleri can bileseninin disinda: ayrica silinmeli */
  try {
    varlik.removeEffect("absorption");
  } catch (e) {
    /* efekt yoksa ya da silinemiyorsa devam */
  }

  const onceki = can.currentValue;

  if (onceki > LAZER_BIRAKILAN_CAN) {
    /* SOY VE SABITLE: olmuyor, yarim kalple kaliyor. */
    try {
      varlik.applyDamage(LAZER_TEPKI_HASARI, { cause: "fire" });
    } catch (e) {
      /* tepki hasari verilemedi; sabitleme yine de yapilacak */
    }
    try {
      if (can.currentValue > LAZER_BIRAKILAN_CAN) {
        can.setCurrentValue(LAZER_BIRAKILAN_CAN);
      }
    } catch (e) {
      hataYaz("goz_lazeri.cananCek", e);
    }
    return;
  }

  /* ZATEN yarim kalpte: bitir. Isini uzerinde tutmaya devam
     edersen bu dal yarim saniye sonra calisiyor.            */
  try {
    varlik.applyDamage(LAZER_HASAR, { cause: "fire" });
  } catch (e) {
    hataYaz("goz_lazeri.cananCek", e);
  }
}


const BUZ_KABUGU = (() => {
  const n = [];
  const r = LAZER_BUZ_YARICAP, h = LAZER_BUZ_YUKSEK;
  for (let x = -r; x <= r; x++) {
    for (let z = -r; z <= r; z++) {
      for (let y = 0; y <= h; y++) {
        const kenar = Math.abs(x) === r || Math.abs(z) === r;
        if (kenar || y === 0 || y === h) n.push({ x, y, z });
      }
    }
  }
  return n;
})();

export function lazerModlari(kademe) {
  if (!kademe || !kademe.lazer || !kademe.lazer.modlu) return undefined;
  return LAZER_MODLARI.get(kademe.lazer.modlu);
}

export function lazerModuAl(oyuncuId, kademe) {
  const liste = lazerModlari(kademe);
  if (!liste) return undefined;
  const secili = modSecim.get(oyuncuId);
  return liste.find((m) => m.kimlik === secili) ||
         liste.find((m) => m.kimlik === LAZER_MOD_VARSAYILAN) ||
         liste[0];
}

/* Sirayla gecer ve yeni modu dondurur (menu bunu kullaniyor). */
export function lazerModuDegistir(oyuncuId, kademe) {
  const liste = lazerModlari(kademe);
  if (!liste) return undefined;
  const simdiki = lazerModuAl(oyuncuId, kademe);
  const i = liste.indexOf(simdiki);
  const yeni = liste[(i + 1) % liste.length];
  modSecim.set(oyuncuId, yeni.kimlik);
  return yeni;
}

export function lazerModuUnut(oyuncuId) {
  modSecim.delete(oyuncuId);
}

/* Kademenin lazer ayari + secili modun eklentileri.
   Ayarlar tablosuna DOKUNULMUYOR: yeni bir nesne uretiliyor,
   yoksa mod degistikce ayarlar.js'teki sabit kirlenirdi.    */
function lazerAyari(oyuncuId, kademe) {
  const mod = lazerModuAl(oyuncuId, kademe);
  if (!mod) return kademe.lazer;
  return Object.assign({}, kademe.lazer, mod.ek, { modAdi: mod.ad });
}

/* GOZ LAZERI -- Nitroksin'in ikonik yetenegi.

   Iksir icmis olman SART: lazer gozden cikiyor, goz de iksirden
   geliyor. Kademe yoksa yetenek calismaz ve sebebini soyler.

   ---- REFERANS NASIL YAPIYORDU ----
     execute @s^^^2 /damage @e[r=2,c=1] 6 fire
     execute @s^^^4 /damage @e[r=4,c=1] 6 fire
     execute @s^^^6 /damage @e[r=6,c=1] 6 fire
     execute @s^^^8 /damage @e[r=8,c=1] 6 fire
   Bes kademenin lazeri de BIREBIR AYNIYDI: sabit 6 hasar, sabit
   8 blok. Uc sorun:

     1. NOKTA tariyordu, cizgi degil. 2/4/6/8. blokta duran
        vuruluyor, 3. blokta duran kurtuluyordu.
     2. "@e[r=2,c=1]" en yakini seciyor ama OYUNCUYU da sayiyor.
        Bu yuzden her lazerden once kendilerine instant_health
        veriyorlardi -- kendi lazerinle vurulup aninda iyilesmek.
        Yama, cozum degil.
     3. "Lazeri kapat" dugmesi de ayni dort hasar satirini
        calistiriyordu, yani kapatmak da hasar veriyordu.

   ---- BIZDE ----
   Isin bir CIZGI. Tek getEntities cagrisi yapiliyor, sonra her
   varligin isin uzerine izdusumu hesaplaniyor: ileride mi ve
   isina yeterince yakin mi. Dort ayri dunya taramasi yerine bir
   tarama -- hem daha dogru hem daha ucuz.

   Kendimizi hedef listesine hic almiyoruz, o yuzden kendini
   iyilestirme yamasina gerek yok.

   Hasar ve menzil KADEMEYE gore artiyor.                        */
yetenekKaydet({
  kimlik: "goz_lazeri",
  ad: "Goz Lazeri",
  esyasiz: true,
  sira: 170,

  olustur(oyuncu) {
    const kademe = kademeAl(oyuncu.id);
    if (!kademe || !kademe.lazer) {
      actionbarYaz(oyuncu, "§cOnce iksir icmelisin §7(lazer gozden cikar)");
      kollariIndir(oyuncu);
      return undefined;
    }

    const boyut = oyuncu.dimension;
    const ayar = lazerAyari(oyuncu.id, kademe);

    let bas, yon;
    try {
      bas = oyuncu.getHeadLocation();
      yon = oyuncu.getViewDirection();
    } catch (e) {
      hataYaz("goz_lazeri.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* ============================================================
       SUREKLI ISIN  (v4.69)

       Kullanici: "lazer kac saniye tutabiliyorum onu da
       soyleyebilir misin, uzatalim onu, en azindan bir 25
       saniye daha ekleyelim."

       Cevap: v4.68'e kadar HIC tutamiyordun. Lazer TEK ATISTI;
       LAZER_SURE = 10 tick yalnizca isinin ne kadar GORUNUR
       kalacagiydi (yarim saniye), hasar bir kez veriliyordu.

       Artik gercek bir sureli isin:
         - LAZER_SURE boyunca acik kaliyor
         - her LAZER_VURUS_ARALIK tickte YENIDEN tariyor ve
           vuruyor
         - her tick oyuncunun O ANKI bakisindan cikiyor, yani
           isini SUPUREBILIYORSUN

       Tarama her tick DEGIL araliklarla: 25 saniye boyunca
       her tick getEntities cagirmak tablette en pahali sey
       olurdu. Ayni sebeple parcacik da araliklarla ciziliyor.
       ============================================================ */
    /* Bunlar isin OMRU boyunca birikiyor, her vurusta degil:
       buz kafesi bir kez oruluyor, kalkan bir kez isaretlenip
       bir kez kiriliyor. Sureli isinda her vurus tickinde
       yeniden ormek tablette blok butcesini yerdi.          */
    const buzNoktalari = [];
    const kalkanlar = [];
    let buzKuruldu = false;

    function isinVur(bas, yon) {
    /* ---- Hedef bulma: bir tarama, sonra isina izdusum ---- */
      let yakin;
      try {
        yakin = boyut.getEntities({
          location: bas,
          maxDistance: LAZER_MENZIL,
          excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
        });
      } catch (e) {
        hataYaz("goz_lazeri.getEntities", e);
        yakin = [];
      }

      const vurulanlar = [];
      for (const varlik of yakin) {
        try {
          if (varlik.id === oyuncu.id) continue;          // kendimize asla
          if (!gecerliMi(varlik)) continue;
          if (varlik.typeId === "minecraft:player" && !LAZER_OYUNCU) continue;

          const k = varlik.location;
          const dx = k.x - bas.x, dy = k.y - bas.y, dz = k.z - bas.z;

          // Isin uzerindeki izdusum: ne kadar ILERIDE
          const ileri = dx * yon.x + dy * yon.y + dz * yon.z;
          if (ileri < 0 || ileri > LAZER_MENZIL) continue;

          // Isina dik uzaklik: ne kadar YANDA
          const sapmaKare = (dx * dx + dy * dy + dz * dz) - ileri * ileri;
          if (sapmaKare > LAZER_KALINLIK * LAZER_KALINLIK) continue;

          vurulanlar.push({ varlik, ileri });
        } catch (e) {
          hataYaz("goz_lazeri.izdusum", e);
        }
      }

      // Tavan asilirsa en YAKINDAKILER vurulsun, rastgele degil
      vurulanlar.sort((a, b) => a.ileri - b.ileri);

      let vuran = 0;
      for (const h of vurulanlar) {
        if (vuran >= LAZER_TAVAN) break;
        try {
          /* 1. ZIRHI ERIT -- "elmas zirhinin tumunu... elmas
                bir kilic ile bir defa vurdugunda tum hepsi
                ayni anda kirilsin"                              */
          if (LAZER_ZIRH_ACIK) zirhiYarila(h.varlik);

          /* 2. KALKANI ISARETLE. Hemen kirilmiyor: dayanikligi
                bitme noktasina cekiliyor, gercek kirilma asagida
                LAZER_KALKAN_SURESI sonra. Ayni kalkan iki kez
                isaretlenmesin -- isin sureli, ayni hedefe
                defalarca vuruyor.                               */
          if (LAZER_KALKAN_KIR && !kalkanlar.includes(h.varlik) &&
              kalkaniHazirla(h.varlik)) {
            kalkanlar.push(h.varlik);
          }

          /* 3. CAN. Vurus hasari da burada: yarim kalpten
                yuksekse SOYUP SABITLIYOR, zaten yarim kalpteyse
                BITIRIYOR. Gerekcesi cananCek'in basinda.        */
          cananCek(h.varlik);

          /* ---- Element buz modu ---- */
          if (ayar.dondur) {
            try {
              h.varlik.addEffect("slowness", LAZER_DONDUR_SURE,
                                 { amplifier: LAZER_DONDUR_SEVIYE });
            } catch (e) {
              /* efekt verilemedi; hasar zaten gitti */
            }
          }
          /* ---- Element ates modu ---- */
          if (ayar.ates) {
            try {
              h.varlik.setOnFire(4, true);
            } catch (e) {
              /* setOnFire bazi surumlerde yok; hasar zaten verildi */
            }
          }
          /* Buz kafesi: noktalar burada TOPLANIYOR, blok koyma
             isi asagida butceyle yapiliyor -- vurus dongusunde
             blok koymak tek tick'te onlarca setType demek.     */
          if (ayar.buzKafes && LAZER_BUZ_ACIK && !buzKuruldu &&
              buzNoktalari.length < LAZER_BUZ_TAVAN) {
            try {
              const k = h.varlik.location;
              const tx = Math.floor(k.x), ty = Math.floor(k.y), tz = Math.floor(k.z);
              for (const n of BUZ_KABUGU) {
                if (buzNoktalari.length >= LAZER_BUZ_TAVAN) break;
                buzNoktalari.push({ x: tx + n.x, y: ty + n.y, z: tz + n.z });
              }
              buzKuruldu = true;
            } catch (e) {
              hataYaz("goz_lazeri.buzKafes", e);
            }
          }
          vuran++;
        } catch (e) {
          hataYaz("goz_lazeri.applyDamage", e);
        }
      }


      return vuran;
    }

    /* ---- Gorunum: goz parlar, isin cizilir ---- */
    lazerGozuAc(oyuncu, kademe);

    const bitisTick = system.currentTick + LAZER_SURE;
    let sonrakiVurus = system.currentTick;      // ilki HEMEN
    let sonrakiCizim = 0;
    let toplamVuran = 0;
    let sonBildirim = 0;

    /* ---- Duvar delme ----
       Isin boyunca onune cikan bloklari deliyor. Referansta bu
       YOK; oradaki tek "wall" gecen yer "fly_into_wall" ve o bir
       HASAR TURU adi, blok kirmayla ilgisi yok.

       Nokta listesi bir kez hesaplaniyor; her tick butcenin izin
       verdigi kadari deliniyor.                                 */
    const delinecek = [];
    if (DUVAR_DELME_ACIK) {
      const r = DUVAR_DELME_YARICAP;
      for (let d = 1; d <= LAZER_MENZIL && delinecek.length < DUVAR_DELME_TAVAN; d++) {
        const mx = bas.x + yon.x * d;
        const my = bas.y + yon.y * d;
        const mz = bas.z + yon.z * d;
        for (let ox = -r; ox <= r; ox++) {
          for (let oy = -r; oy <= r; oy++) {
            for (let oz = -r; oz <= r; oz++) {
              if (delinecek.length >= DUVAR_DELME_TAVAN) break;
              delinecek.push({
                x: Math.floor(mx) + ox,
                y: Math.floor(my) + oy,
                z: Math.floor(mz) + oz
              });
            }
          }
        }
      }
    }

    let delIndeks = 0;
    let delinen = 0;
    const _koord = { x: 0, y: 0, z: 0 };

    /* ---- Buz kafesi (Element'in buz modu) ----
       Uc kural, ucu de bilincli:
         1. SADECE HAVANIN yerine konur. Oyuncunun evini buza
            cevirmek felaket olurdu.
         2. Kaldirirken sadece BIZIM koydugumuz ve HALA buz
            olan bloklar silinir. Araya biri bir sey koyduysa
            ona dokunulmaz.
         3. Blok packed_ice: normal buz eriyip SU birakiyor,
            kapali bir alanda bu sel demek.                  */
    /* Kalkan kirilma zamani. Aninda kirmiyoruz: oyuncu
       kalkanin kirmiziya donup parcalandigini gorsun.       */
    /* DIKKAT: kalkanlar listesi is CALISIRKEN doluyor (isinVur
       icinde), yaratilis aninda BOS. "kalkanKirildi = kalkanlar
       .length === 0" diye baslatilirsa bayrak hep true baslar
       ve kalkan hicbir zaman kirilmez -- sureli isina gecerken
       tam bu oldu, testi yazmasak fark edilmezdi.            */
    const kalkanTick = system.currentTick + LAZER_KALKAN_SURESI;
    let kalkanKirildi = false;

    let buzIndeks = 0;
    const konanBuz = [];
    let buzKalkmaTick = 0;
    let buzSokIndeks = 0;

    return {
      ad: "goz_lazeri",
      oyuncuId: oyuncu.id,

      calis() {
        const simdi = system.currentTick;
        const suruyor = simdi < bitisTick && gecerliMi(oyuncu);

        /* ---- Isin acikken: her tick O ANKI bakistan cikar ----
           Boylece isini supurebiliyorsun. Oyuncu gecersizse
           (ciktiysa/oldiyse) isin hemen kesiliyor.            */
        if (suruyor) {
          let b, y;
          try {
            b = oyuncu.getHeadLocation();
            y = oyuncu.getViewDirection();
          } catch (e) {
            b = undefined;
          }

          if (b) {
            /* Cizim araliklarla: 25 saniye boyunca her tick
               15 parcacik atmak tablette bosuna yuk.        */
            if (simdi >= sonrakiCizim) {
              sonrakiCizim = simdi + LAZER_CIZIM_ARALIK;
              for (let d = 1; d <= LAZER_MENZIL; d += LAZER_ADIM) {
                parcacikAt(boyut, PARCACIK_LAZER, {
                  x: b.x + y.x * d,
                  y: b.y + y.y * d,
                  z: b.z + y.z * d
                });
              }
            }

            /* Vurus da araliklarla: her tick getEntities
               cagirmak 25 saniyede 500 tarama ederdi.       */
            if (simdi >= sonrakiVurus) {
              sonrakiVurus = simdi + LAZER_VURUS_ARALIK;
              try {
                toplamVuran += isinVur(b, y);
              } catch (e) {
                hataYaz("goz_lazeri.isinVur", e);
              }
              if (simdi >= sonBildirim) {
                sonBildirim = simdi + 10;
                const kalan = ((bitisTick - simdi) / 20).toFixed(1);
                actionbarYaz(oyuncu, "§c⚡ " + kademe.ad + " lazeri §7· " +
                             toplamVuran + " vurus · §8" + kalan + " sn");
              }
            }
          }
        }
        /* Duvar delme: butce kadar, sonrakine devrederek */
        while (delIndeks < delinecek.length) {
          if (blokIste(2) < 2) return false;    // butce dolu
          const n = delinecek[delIndeks++];
          try {
            _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
            const b = boyut.getBlock(_koord);
            if (!b) continue;                   // yuklenmemis chunk
            if (b.isAir) continue;
            /* KORUNAN bloklar delinmiyor: bedrock, sandik,
               komut blogu... Yoksa dunyani ve esyalarini
               kaybedersin.                                     */
            if (KORUNAN_KUME.has(b.typeId)) continue;
            b.setType("minecraft:air");
            delinen++;
          } catch (e) {
            hataYaz("goz_lazeri.duvarDel", e);
          }
        }

        /* Kalkan: sure dolunca kir. Is BITMIYOR -- kalkan
           kirilmadan cikarsak isaretledigimiz kalkan bir
           daha asla kirilmazdi.                             */
        if (!kalkanKirildi && kalkanlar.length > 0) {
          if (system.currentTick < kalkanTick) return false;
          for (const v of kalkanlar) kalkaniKir(v);
          kalkanKirildi = true;
        }

        /* Buz kafesini or: butce kadar, sonrakine devrederek */
        while (buzIndeks < buzNoktalari.length) {
          if (blokIste(2) < 2) return false;
          const n = buzNoktalari[buzIndeks++];
          try {
            _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
            const b = boyut.getBlock(_koord);
            if (!b || !b.isAir) continue;      // sadece havaya
            b.setType(LAZER_BUZ_BLOK);
            konanBuz.push({ x: n.x, y: n.y, z: n.z });
          } catch (e) {
            hataYaz("goz_lazeri.buzOr", e);
          }
          if (buzIndeks === buzNoktalari.length) {
            buzKalkmaTick = system.currentTick + LAZER_BUZ_SURE;
          }
        }

        /* Sure dolunca sok. Is BITMIYOR: kafes kalkana kadar
           surer, yoksa dunyada kalici buz birakirdik.        */
        if (konanBuz.length > 0) {
          if (system.currentTick < buzKalkmaTick) return false;
          while (buzSokIndeks < konanBuz.length) {
            if (blokIste(2) < 2) return false;
            const n = konanBuz[buzSokIndeks++];
            try {
              _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
              const b = boyut.getBlock(_koord);
              /* Sadece HALA bizim buzumuzse: araya giren bir
                 seyi silmiyoruz.                             */
              if (b && b.typeId === LAZER_BUZ_BLOK) b.setType("minecraft:air");
            } catch (e) {
              hataYaz("goz_lazeri.buzSok", e);
            }
          }
        }

        return system.currentTick >= bitisTick;
      },

      bitir() {
        if (delinen > 0) {
          try {
            actionbarYaz(oyuncu, "§c⚡ " + kademe.ad + " lazeri §7· " +
                         vuran + " hedef · §8" + delinen + " blok delindi");
          } catch (e) {
            hataYaz("goz_lazeri.bitirActionbar", e);
          }
        }
        // Goz normale donsun -- kademe hala devam ediyor
        lazerGozuKapat(oyuncu, kademe);
        kollariIndir(oyuncu);
      }
    };
  }
});
