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
  LAZER_HASAR, LAZER_BIRAKILAN_CAN,
  LAZER_ZIRH_ACIK, LAZER_ZIRH_ORAN,
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
function esyayiYipranmis(varlik, yuva, oran) {
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

  const hedefHasar = Math.floor(day.maxDurability * (1 - oran));
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

/* Dort zirh parcasinin dayanikligini yariya indirir.
   Donen deger: kac parca etkilendi.                          */
function zirhiYarila(varlik) {
  let n = 0;
  for (const yuva of ZIRH_YUVALARI) {
    try {
      if (esyayiYipranmis(varlik, yuva, LAZER_ZIRH_ORAN)) n++;
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

/* Hedefin canini LAZER_BIRAKILAN_CAN'a ceker.

   NEDEN HASAR SAYISIYLA DEGIL: Bedrock'ta zirh indirimi zirh
   puani + toughness + Koruma buyusune bagli ve hangi formulun
   gecerli oldugunu OLCMEDEN bilemeyiz. Bu depoda olculmeyen
   sayi yazilmiyor. Vurustan SONRA cani okuyup cekmek zirhtan
   bagimsiz olarak ayni sonucu veriyor.

   Sadece ASAGI ceker: zaten daha az cani olani iyilestirmez. */
function cananCek(varlik) {
  if (LAZER_BIRAKILAN_CAN <= 0) return;    // 0 = lazer oldursun
  try {
    const can = varlik.getComponent("minecraft:health");
    if (!can || typeof can.setCurrentValue !== "function") return;
    if (typeof can.currentValue !== "number") return;
    if (can.currentValue <= LAZER_BIRAKILAN_CAN) return;
    can.setCurrentValue(LAZER_BIRAKILAN_CAN);
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

    /* ---- Hedef bulma: TEK tarama, sonra isina izdusum ---- */
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
    const buzNoktalari = [];
    const kalkanlar = [];        // { varlik } -- 1-2 sn sonra kirilacak
    for (const h of vurulanlar) {
      if (vuran >= LAZER_TAVAN) break;
      try {
        /* 1. GERCEK VURUS. Vurus hissi, geri tepme ve olum
              sahipligi bundan geliyor; zirhsiz hedefi bu tek
              basina oldurur.                                  */
        h.varlik.applyDamage(LAZER_HASAR, {
          cause: "fire",
          damagingEntity: oyuncu
        });

        /* 2. ZIRHI YARILA -- "elmas zirhinin tumunu yari
              canina indirsin"                                 */
        if (LAZER_ZIRH_ACIK) zirhiYarila(h.varlik);

        /* 3. KALKANI ISARETLE. Hemen kirilmiyor: dayanikligi
              bitme noktasina cekiliyor, gercek kirilma asagida
              LAZER_KALKAN_SURESI sonra.                       */
        if (LAZER_KALKAN_KIR && kalkaniHazirla(h.varlik)) {
          kalkanlar.push(h.varlik);
        }

        /* 4. CAN TAVANI -- "yarim kalplik cani kalsin"
              Hasar sayisiyla tutturulamaz (zirh indirimi
              formulu olculmedi), o yuzden vurustan SONRA
              okunup cekiliyor. Zirh ne olursa olsun sonuc
              ayni.                                            */
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
        if (ayar.buzKafes && LAZER_BUZ_ACIK &&
            buzNoktalari.length < LAZER_BUZ_TAVAN) {
          try {
            const k = h.varlik.location;
            const tx = Math.floor(k.x), ty = Math.floor(k.y), tz = Math.floor(k.z);
            for (const n of BUZ_KABUGU) {
              if (buzNoktalari.length >= LAZER_BUZ_TAVAN) break;
              buzNoktalari.push({ x: tx + n.x, y: ty + n.y, z: tz + n.z });
            }
          } catch (e) {
            hataYaz("goz_lazeri.buzKafes", e);
          }
        }
        vuran++;
      } catch (e) {
        hataYaz("goz_lazeri.applyDamage", e);
      }
    }

    /* ---- Gorunum: goz parlar, isin cizilir ---- */
    lazerGozuAc(oyuncu, kademe);

    const bitisTick = system.currentTick + LAZER_SURE;
    let cizildi = false;

    try {
      actionbarYaz(oyuncu, "§c⚡ " + kademe.ad + " lazeri §7· " +
                   vuran + " hedef · " + LAZER_HASAR + " hasar");
    } catch (e) {
      hataYaz("goz_lazeri.actionbar", e);
    }

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
    const kalkanTick = system.currentTick + LAZER_KALKAN_SURESI;
    let kalkanKirildi = kalkanlar.length === 0;

    let buzIndeks = 0;
    const konanBuz = [];
    let buzKalkmaTick = 0;
    let buzSokIndeks = 0;

    return {
      ad: "goz_lazeri",
      oyuncuId: oyuncu.id,

      calis() {
        /* Isin parcaciklari bir kez ciziliyor; her tick cizmek
           tablette bosuna yuk. Isin zaten anlik bir sey.        */
        if (!cizildi) {
          cizildi = true;
          for (let d = 1; d <= LAZER_MENZIL; d += LAZER_ADIM) {
            parcacikAt(boyut, PARCACIK_LAZER, {
              x: bas.x + yon.x * d,
              y: bas.y + yon.y * d,
              z: bas.z + yon.z * d
            });
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
        if (!kalkanKirildi) {
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
