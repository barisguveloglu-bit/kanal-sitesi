import { system } from "@minecraft/server";

// Sahte dunya: blok deposu + sayaclar
export function dunyaKur(sinir = { min: -64, max: 319 }) {
  const bloklar = new Map();
  const sayac = {
    getBlock: 0, setType: 0, istisna: 0, patlama: [], dogan: [],
    varliklar: [], kaldirilan: 0,
    yazilan: [],      // her setType: {x, y, z, tip}
    tickBlok: {}      // tick -> o tick'teki blok islemi sayisi
  };
  const blokSay = () => {
    const t = system.currentTick;
    sayac.tickBlok[t] = (sayac.tickBlok[t] || 0) + 1;
  };
  const anah = (x, y, z) => x + "," + y + "," + z;

  // bloklar.hepsiDolu = true -> her yer dolu; "var olan yapiya
  // dokunmuyor mu" testleri bunu kullaniyor.
  function varsayilan(y) {
    if (bloklar.hepsiDolu) return "minecraft:stone";
    return y < 64 ? "minecraft:stone" : "minecraft:air";
  }

  const boyut = {
    id: "minecraft:overworld",
    heightRange: { min: sinir.min, max: sinir.max },
    /* SAYMADAN okuma. Yalniz sahte dunyanin KENDI ic isleri
       icin -- su an tek kullanani isin izi
       (getBlockFromViewDirection).

       NEDEN AYRI: isin izi gercek motorda blok butcesinden
       harcamiyor, bir arama. Sayan getBlock uzerinden
       yurutuldugunde dort.mjs "ors tick basina 602 blok islemi
       yapiyor, tavan 56" diye dustu -- oysa orsun kendisi
       tick basina 2 islem yapiyor, 600'u benim izimin okumasiydi.
       Yani sahte dunyanin olcum araci, yine sahte dunyanin
       baska bir parcasi yuzunden yanlis olcuyordu.           */
    _blokOku(x, y, z) {
      if (y < sinir.min || y > sinir.max) {
        const e = new Error("LocationOutOfWorldBoundariesError");
        e.name = "LocationOutOfWorldBoundariesError";
        throw e;
      }
      return boyut._blokNesnesi(x, y, z);
    },
    _blokNesnesi(x, y, z) {
      const k = anah(x, y, z);
      return {
        get typeId() { return bloklar.has(k) ? bloklar.get(k) : varsayilan(y); },
        get isAir() { return this.typeId === "minecraft:air"; },
        setType(t) {
          sayac.setType++;
          blokSay();
          sayac.yazilan.push({ x, y, z, tip: t });
          bloklar.set(k, t);
        },
        location: { x, y, z }
      };
    },
    getBlock(loc) {
      sayac.getBlock++;
      const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
      if (y < sinir.min || y > sinir.max) {
        sayac.istisna++;
        const e = new Error("LocationOutOfWorldBoundariesError");
        e.name = "LocationOutOfWorldBoundariesError";
        throw e;
      }
      blokSay();
      return boyut._blokNesnesi(x, y, z);
    },
    /* boyut._varliklar doldurulursa taramalar onu gorur.

       DIKKAT: burasi eskiden secenekleri YOK SAYIP butun listeyi
       donduruyordu. O yuzden "menzil disindaki vurulmadi" gibi
       testler aslinda hicbir sey sinamiyordu -- sahte dunya her
       varligi menzilde sayiyordu. Artik gercek API gibi
       location + maxDistance/minDistance ve excludeTypes
       suzuluyor.                                                */
    getEntities(secenek) {
      const hepsi = boyut._varliklar || [];
      if (!secenek) return hepsi;

      const merkez = secenek.location;
      const enFazla = secenek.maxDistance;
      const enAz = secenek.minDistance;
      const disla = secenek.excludeTypes;

      return hepsi.filter((v) => {
        if (disla && disla.indexOf(v.typeId) !== -1) return false;
        if (!merkez || (enFazla === undefined && enAz === undefined)) return true;
        const k = v.location;
        const d = Math.hypot(k.x - merkez.x, k.y - merkez.y, k.z - merkez.z);
        if (enFazla !== undefined && d > enFazla) return false;
        if (enAz !== undefined && d < enAz) return false;
        return true;
      });
    },
    /* v6.6: efsane muzigi buradan calabiliyor. Sahte dunyada
       da olmasi sart: yoksa "muzik caldi mi" olculemez, kod
       sessizce catlar ve test bunu fark etmez.             */
    playSound(ad, poz, sec) {
      (sayac.ses = sayac.ses || []).push({ ad, poz, sec, nasil: "boyut" });
      return true;
    },
    /* molang: v7.18'de eklendi. Kaydediliyor cunku goz
       alevinin oyuncunun HIZINI aldigi tek yer burasi ve
       "gecirdim" demek yetmiyor -- gecen degerin dogru olmasi
       gerekiyor.                                            */
    spawnParticle(tip, poz, molang) {
      (sayac.parcacik = sayac.parcacik || []).push({
        tip, x: poz.x, y: poz.y, z: poz.z,
        molang: molang ? molang._deger : undefined
      });
    },
    createExplosion(poz, guc) { sayac.patlama.push({ x: poz.x, y: poz.y, z: poz.z, guc }); return true; },
    spawnEntity(tip, poz) {
      sayac.dogan.push({ tip, x: poz.x, y: poz.y, z: poz.z });
      // TNT govdesi gercekten dussun: meteorun "yukaridan iniyor"
      // davranisi ancak boyle sinanabilir.
      const dogumTick = system.currentTick;
      const duser = (tip === "minecraft:tnt");
      const v = {
        id: "e" + sayac.dogan.length, typeId: tip, isValid: true,
        get location() {
          if (!duser) return { x: poz.x, y: poz.y, z: poz.z };   // poz teleport ile degisebilir
          const gecen = system.currentTick - dogumTick;
          return { x: poz.x, y: poz.y - gecen * 0.6, z: poz.z };
        },
        _itildi: null, _kaldirildi: false,
        _efektler: [],
        addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
        applyImpulse(i) { this._itildi = i; },
        remove() { this._kaldirildi = true; this.isValid = false; sayac.kaldirilan++; },

        /* --- Bot icin gerekenler (v4.22) --- */
        dimension: boyut,
        _ozellikler: new Map(),
        _olaylar: [],
        _isinlanma: [],
        _evcilSahip: undefined,
        setDynamicProperty(ad, deger) { this._ozellikler.set(ad, deger); },
        getDynamicProperty(ad) { return this._ozellikler.get(ad); },
        triggerEvent(ad) { this._olaylar.push(ad); },
        /* v4.89: ikinci argumandaki rotation da saklaniyor --
           donusum kiligi oyuncunun yaw'ina cevirmek zorunda ve
           bunun sinanabilmesi lazim.                          */
        _donus: undefined,
        teleport(nokta, secenek) {
          this._isinlanma.push({ x: nokta.x, y: nokta.y, z: nokta.z });
          poz = { x: nokta.x, y: nokta.y, z: nokta.z };
          if (secenek && secenek.rotation) {
            this._donus = { x: secenek.rotation.x, y: secenek.rotation.y };
          }
          return true;
        },
        /* --- Botun kendi kutusu (v4.33) ---
           behavior.pickup_items yerden aldigi esyayi buraya
           koyuyor; script de burayi ekip cantasina bosaltiyor.
           _kutu doldurulunca varlik envanteri "varmis" gibi
           davraniyor; bos birakilirsa bileşen YOK sayiliyor --
           iki durum da sinaniyor.                              */
        _kutu: undefined,
        _kutuYaz: true,
        /* --- Elindeki esya (v4.48, Ilkel Besli baltasi) ---
           boyut._equipYok = true -> bilesen hic yokmus gibi:
           "surumde yoksa paket olmuyor mu" sinamasi icin.     */
        _el: undefined,
        getComponent(ad) {
          const kendisi = this;
          if (ad === "minecraft:equippable" && !boyut._equipYok) {
            return {
              getEquipment: (yuva) => (yuva === "Mainhand" ? kendisi._el : undefined),
              setEquipment: (yuva, esya) => {
                if (boyut._equipYaz === false) throw new Error("ele konulamadi");
                if (yuva === "Mainhand") kendisi._el = esya;
                return true;
              }
            };
          }
          if (ad === "minecraft:tameable" && !boyut._tameYok) {
            return { tame(oyuncu) { kendisi._evcilSahip = oyuncu.id; return true; } };
          }
          if (ad === "minecraft:inventory" && this._kutu) {
            return {
              container: {
                size: kendisi._kutu.length,
                getItem: (i) => kendisi._kutu[i],
                setItem: (i, esya) => {
                  if (!kendisi._kutuYaz) throw new Error("kutu yazilamiyor");
                  kendisi._kutu[i] = esya;
                }
              }
            };
          }
          return undefined;
        }
      };
      sayac.varliklar.push(v);
      (boyut._varliklar = boyut._varliklar || []).push(v);
      return v;
    }
  };

  // Karsilastirma icin: varsayilandan farkli olan bloklarin imzasi
  function imza() {
    const satirlar = [];
    for (const [k, v] of bloklar) {
      const y = Number(k.split(",")[1]);
      if (v !== varsayilan(y)) satirlar.push(k + "=" + v);
    }
    satirlar.sort();
    return satirlar;
  }

  return { boyut, bloklar, sayac, imza };
}

export function oyuncuKur(boyut, bakis, bas) {
  return {
    id: "oyuncu-1",
    isValid: true,
    dimension: boyut,
    location: { x: bas.x, y: bas.y - 1.62, z: bas.z },
    isSneaking: false,
    isJumping: false,
    onScreenDisplay: { _son: null, setActionBar(t) { this._son = t; } },
    // Gercek API birim vektor doner; koni testleri buna bagli
    getViewDirection: () => {
      const u = Math.hypot(bakis.x, bakis.y, bakis.z) || 1;
      return { x: bakis.x / u, y: bakis.y / u, z: bakis.z / u };
    },
    getHeadLocation: () => ({ x: bas.x, y: bas.y, z: bas.z }),
    /* Blok/TICK -- gercek API'nin birimi bu. Testler bunu
       degistirip alevin hizi mirasladigini sinayabilsin diye
       yazilabilir bir alan (_hiz) uzerinden okunuyor.       */
    _hiz: { x: 0, y: 0, z: 0 },
    getVelocity() { return { x: this._hiz.x, y: this._hiz.y, z: this._hiz.z }; },
    /* ---- ISIN IZI  (v7.12'de eklendi) ----
       Bu YOKTU ve bir OLCUM BOSLUGUYDU. yardimcilar.js'teki
       hedefBul() once bunu deniyor, yoksa "bakis yonunde
       MENZIL blok ileri" diye geri cekiliyor. MENZIL 150.
       Sahte dunyada y<64 tas oldugu icin isin duz zeminin
       ALTINA dusuyor ve `ors` gibi yetenekler orsu tasin icine
       koymaya calisip hicbir sey yapmiyordu. Gercek oyunda
       isin birkac blok otede yere carpar.

       Yani ors bozuk degildi, sahte dunya eksikti -- kol.mjs
       "Bobby Kanli Kol hicbir sey yapmiyor" diyordu.
       (Ayni sinif hata: anna.mjs'te kurban koni disinda,
       kol.mjs'te kurbanin applyImpulse'u yok, dave'de itme
       sayilmiyor. Dordu de olcumdeydi.)

       Basit adim adim yurutme: gercek motorun DDA'si degil ama
       "ilk dolu blogu bul" davranisi ayni.                    */
    getBlockFromViewDirection(secenek) {
      const uzak = (secenek && secenek.maxDistance) || 100;
      const y = this.getViewDirection();
      const b = this.getHeadLocation();
      for (let t = 0.25; t <= uzak; t += 0.25) {
        const n = { x: b.x + y.x * t, y: b.y + y.y * t, z: b.z + y.z * t };
        let blok;
        try {
          blok = boyut._blokOku(Math.floor(n.x), Math.floor(n.y),
                                Math.floor(n.z));
        } catch (e) {
          return undefined;               // dunya sinirinin disi
        }
        if (blok && !blok.isAir) return { block: blok, face: "Up" };
      }
      return undefined;
    },
    runCommand(k) { (this._komutlar = this._komutlar || []).push(k); return { successCount: 1 }; },
    applyImpulse: () => true,
    _elde: undefined,
    _envanter: [],
    /* Gercek yuvalar (v4.50): dismont tasi saymak ve harcamak
       icin getItem/setItem lazim. _envanter eski testlerin
       kullandigi duz liste, ikisi birlikte duruyor.           */
    _yuvalar: new Array(36).fill(undefined),
    _isinlanma: [],
    teleport(nokta) {
      this._isinlanma.push({ x: nokta.x, y: nokta.y, z: nokta.z });
      this.location = { x: nokta.x, y: nokta.y - 1.62, z: nokta.z };
      return true;
    },
    getComponent(ad) {
      const o = this;
      if (ad === "minecraft:equippable") {
        return { getEquipment: (slot) => (slot === "Mainhand" && o._elde) ? { typeId: o._elde } : undefined };
      }
      if (ad === "minecraft:inventory") {
        return {
          container: {
            get size() { return o._yuvalar.length; },
            getItem: (i) => o._yuvalar[i],
            setItem: (i, esya) => { o._yuvalar[i] = esya; },
            addItem: (esya) => { o._envanter.push(esya.typeId); }
          }
        };
      }
      return undefined;
    },
    applyKnockback: () => true,
    addEffect: (ad, sure, o) => { (boyut._efektler = boyut._efektler || []).push({ ad, sure, o }); },
    /* v4.89 -- DONUSUM icin. Gercek API'de ikisi de var:
       removeEffect efekti siler, getRotation bakis acisini
       ({x: pitch, y: yaw}) doner. Kilik her tick oyuncunun
       yaw'ina isinlaniyor.                                   */
    removeEffect(ad) {
      const l = boyut._efektler || [];
      const i = l.findIndex((e) => e.ad === ad);
      if (i >= 0) l.splice(i, 1);
      (this._silinenEfektler = this._silinenEfektler || []).push(ad);
      return true;
    },
    _donus: { x: 0, y: 0 },
    getRotation() { return { x: this._donus.x, y: this._donus.y }; },
    _mesajlar: [],
    sendMessage(m) { this._mesajlar.push(m); },
    applyDamage: () => true
  };
}
