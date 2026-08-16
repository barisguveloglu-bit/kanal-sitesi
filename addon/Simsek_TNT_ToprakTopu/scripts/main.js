import { world, system } from "@minecraft/server";

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni
// tutulmali; hangi paketin calistigini sohbetten anlamak icin.
const SURUM = "v2.5";

/* ============================================================
   AYARLAR
   ============================================================ */

// Tetikleyici esyalar
const SIMSEK_ESYA = "minecraft:blaze_rod";     // baktigin yere simsek yagmuru
const ALAN_ESYA   = "minecraft:ghast_tear";    // etraftaki TUM moblara simsek
const TNT_ESYA    = "minecraft:nether_star";   // TNT yagmuru
const TOP_ESYA    = "minecraft:clay_ball";     // dev toprak topu

// Yon simsegi / TNT
const MENZIL        = 150;  // en fazla kac blok uzaga vurabilir
const YAYILMA       = 7;    // hedefin etrafina kac blok sacilsin
const SIMSEK_SAYISI = 20;   // toplam kac simsek dussun
const TNT_SAYISI    = 30;   // toplam kac TNT dussun
const TNT_YUKSEKLIK = 30;   // TNT hedefin kac blok ustunde dogsun

/* Yagmurun ne kadar surede bitecegi.
   Sure = ceil(sayi / grup) * aralik  tick.

   Simsek eskiden: grup 2, aralik 3 -> 10 parti x 3 = 30 tick (1.5 sn)
   Simsek simdi  : grup 4, aralik 2 ->  5 parti x 2 = 10 tick (0.5 sn)

   Daha da hizli istersen SIMSEK_ARALIK'i 1 yap (5 tick = 0.25 sn).
   Grubu 4'un uzerine cikarmak icin TICK_VARLIK_BUTCESI'ni de
   yukseltmen gerekir, yoksa butce fazlasini sonraki tick'e atar
   ve sure kisalmaz.                                                */
const SIMSEK_GRUP   = 4;    // her partide kac simsek dussun
const SIMSEK_ARALIK = 2;    // partiler arasi tick
const TNT_GRUP      = 2;    // her partide kac TNT dussun
const TNT_ARALIK    = 2;    // partiler arasi tick

/* ---------------- Esyasiz tetikleme ----------------
   Elin bosken yukari bakip egilince (sneak) etrafina yildirim
   yagiyor. Esya tutmaya gerek yok; blaze_rod hala calisiyor.

   Yildirim oyuncunun UZERINE degil, etrafindaki halkaya duser --
   yoksa kendini oldururdun. Ic yaricapi kucultursen kendine
   isabet etme ihtimali artar.                                     */
const ESYASIZ_ACIK        = true;
const ESYASIZ_EGILME_SART = true;  // egilmek de gerekli mi (yanlislikla tetiklenmesin)
const ESYASIZ_BAKIS_ESIGI = 0.9;   // yukari bakis esigi (1.0 = tam dik yukari)
const ESYASIZ_TUTMA       = 8;     // kac tick boyunca tutulmali
const ESYASIZ_TARAMA      = 4;     // kac tick'te bir kontrol edilsin
const ESYASIZ_SAYISI      = 20;    // kac yildirim dussun
const ESYASIZ_IC_YARICAP  = 6;     // oyuncuya en yakin kac blok (guvenlik payi)
const ESYASIZ_DIS_YARICAP = 14;    // en uzak kac blok

// Alan simsegi
const ALAN_YARICAP = 25;    // etrafindaki kac blokluk moblar vurulsun

// Toprak topu
const TOP_YARICAP  = 2;     // topun yaricapi (2 = 5 blok capinda dev top)
const TOP_HIZ      = 2;     // her adimda kac blok ilerlesin
const TOP_ARALIK   = 2;     // adimlar arasi tick sayisi
const TOP_MENZIL   = 60;    // en fazla kac blok gitsin
const TOP_HASAR    = 12;    // carptigi moba verdigi hasar
const PATLAMA_GUCU = 4;     // sonunda patlama gucu (TNT = 4)
const TOP_BLOK     = "minecraft:dirt";

// Genel
const BEKLEME     = 60;     // tekrar kullanma beklemesi (20 tick = 1 saniye)
const KOL_GECIKME = 10;     // kollar kalktiktan kac tick sonra baslasin

/* ---------------- Performans butceleri ----------------
   Bu degerler TUM oyuncular icin ortaktir, oyuncu basina degil.
   Iki kisi ayni anda yetenek kullanirsa butce paylasilir; isler
   yavaslar ama sunucu tick'i sismez. Tablet icin kritik olan bu.   */

/* Tick basina en fazla kac blok islemi yapilsin.
   Bir "blok islemi" = 1 getBlock + 1 setType cifti.

   Bu deger olculerek secildi. 120 rastgele yonde atis yapilip
   ucus suresi ve tepe yuk karsilastirildi (orijinal: 62 tick, 33/tick):

     butce 24 -> ucus 80 tick (%29 YAVAS), tepe yuk %27 az
     butce 28 -> ucus 62 tick (ayni),      tepe yuk %15 az   <-- secilen
     butce 32 -> ucus 62 tick (ayni),      tepe yuk %3 az

   28 altina inersen top gorunur sekilde yavaslar. Tablette
   OLCUM satirindaki "maks" degeri surekli 5ms uzerindeyse
   dusurmek gerekebilir; o zaman yavaslama bilincli bir takas olur. */
const TICK_BLOK_BUTCESI = 28;

// Tick basina en fazla kac varlik dogurulsun (simsek + TNT ortak).
const TICK_VARLIK_BUTCESI = 4;

// Olcum harness'i. Acikken her atisin sonunda tick sureleri
// raporlaniyor. Kapaliyken maliyeti sifira yakin.
const OLCUM_ACIK = true;

/* ---------------- Test kolayligi ----------------
   Content Log'u tablette okumak zahmetli. Bu iki ayar acikken
   olcum ve hata satirlari SOHBETE de dusuyor, ekran goruntusu
   almak yeterli oluyor. Yayin/normal oynanista ikisini de
   kapatmak lazim, yoksa sohbet dolar.                          */
const OLCUM_SOHBETE = true;
const HATA_SOHBETE  = true;

// Ayni hata mesaji sohbete en fazla bu aralikta bir kez yazilir (tick)
const HATA_SOHBET_ARALIK = 100;

// Toprak topunun asla kiramayacagi bloklar
const KORUNAN = [
  "minecraft:bedrock",
  "minecraft:barrier",
  "minecraft:end_portal",
  "minecraft:end_portal_frame",
  "minecraft:end_gateway",
  "minecraft:command_block",
  "minecraft:repeating_command_block",
  "minecraft:chain_command_block",
  "minecraft:structure_block",
  "minecraft:jigsaw",
  "minecraft:light_block"
];

// indexOf yerine Set: KORUNAN her blok icin taraniyor, dizi taramasi bosuna
const KORUNAN_KUME = new Set(KORUNAN);

// Simsek carpmasindan muaf tutulacaklar
const MUAF = [
  "minecraft:player",
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:arrow",
  "minecraft:lightning_bolt",
  "minecraft:tnt",
  "minecraft:armor_stand",
  "minecraft:painting",
  "minecraft:item_frame",
  "minecraft:glow_item_frame",
  "minecraft:leash_knot",
  "minecraft:fishing_hook",
  "minecraft:falling_block"
];

const TOP_HASAR_MUAF = [
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:lightning_bolt"
];

/* ============================================================
   HATA KAYDI
   Bos catch yok. Her hata hangi iste ve nerede oldugu yazili
   olarak Content Log'a duser.
   ============================================================ */

/* isValid bazi API surumlerinde property, bazilarinda metot.
   Metot oldugu surumde "if (e.isValid)" HER ZAMAN dogru doner
   (fonksiyon nesnesi truthy'dir), yani sessizce yanlis calisir.
   Ikisini de dogru ele almak icin tek gecit.                     */
function gecerliMi(varlik) {
  if (!varlik) return false;
  try {
    const d = varlik.isValid;
    if (typeof d === "function") return !!varlik.isValid();
    if (typeof d === "boolean") return d;
    return true;   // isValid hic yoksa gecerli varsay
  } catch (e) {
    return false;
  }
}

// Date.now bazi calisma ortamlarinda olmayabilir; olcum onsuz da calissin
const ZAMAN_VAR = (typeof Date !== "undefined" && typeof Date.now === "function");
function simdiMs() { return ZAMAN_VAR ? Date.now() : 0; }

// Sohbete yazmak dunya hazir olmadan calismaz; o yuzden ayri ve korumali
function sohbeteYaz(metin) {
  try {
    world.sendMessage(metin);
  } catch (e) {
    // Dunya henuz hazir degil: Content Log yeterli, sessizce gec
  }
}

const sonHataTick = new Map();

function hataYaz(nerede, e) {
  const mesaj = (e && e.message) ? e.message : String(e);
  const iz = (e && e.stack) ? "\n  " + String(e.stack).split("\n").join("\n  ") : "";
  console.warn("[SimsekTNT] HATA @ " + nerede + ": " + mesaj + iz);

  if (!HATA_SOHBETE) return;

  // Ayni hata her tick tekrarlanabilir; sohbeti bogmasin
  const simdi = system.currentTick;
  const onceki = sonHataTick.get(nerede);
  if (onceki !== undefined && simdi - onceki < HATA_SOHBET_ARALIK) return;
  sonHataTick.set(nerede, simdi);

  sohbeteYaz("§c[SimsekTNT] HATA §f" + nerede + "§7: " + mesaj);
}

function bilgiYaz(mesaj) {
  console.warn("[SimsekTNT] " + mesaj);
}

/* ============================================================
   DUNYA SINIRLARI
   Eski kodda y ekseni sinirinin disina cikinca getBlock her
   cagrida throw ediyordu: adim basina 66 istisna. Istisna
   firlatmak normal cagridan cok daha pahali, tablette gorunur
   donma sebebi buydu. Artik sinir onceden kontrol ediliyor.
   ============================================================ */

const YUKSEKLIK_TABLO = {
  "minecraft:overworld": { min: -64, max: 319 },
  "minecraft:nether":    { min: 0,   max: 127 },
  "minecraft:the_end":   { min: 0,   max: 255 }
};

const yukseklikOnbellek = new Map();

function yukseklikAraligi(boyut) {
  const onceki = yukseklikOnbellek.get(boyut.id);
  if (onceki) return onceki;

  let aralik = YUKSEKLIK_TABLO[boyut.id] || { min: -64, max: 319 };

  // Ozellik tespiti: heightRange bazi surumlerde yok. Burada catch
  // kullanmak hatayi yutmak degil, API varligini sinamak.
  try {
    const r = boyut.heightRange;
    if (r && typeof r.min === "number" && typeof r.max === "number") {
      aralik = { min: r.min, max: r.max };
    }
  } catch (e) {
    bilgiYaz("heightRange okunamadi (" + boyut.id + "), tablo degeri kullaniliyor.");
  }

  yukseklikOnbellek.set(boyut.id, aralik);
  return aralik;
}

/* ============================================================
   OLCUM HARNESS'I
   Tableti ben test edemedigim icin setType'in gercek ms
   maliyetini bilemiyorum. Bu sayac gercek rakami oyundan
   toplayip Content Log'a yaziyor.
   ============================================================ */

const olcum = {
  tickSayisi: 0,
  toplamMs: 0,
  maksMs: 0,
  blokIslemi: 0,
  varlikDogumu: 0,
  ertelenenTick: 0   // butce doldugu icin is bekleyen tick sayisi
};

function olcumSifirla() {
  olcum.tickSayisi = 0;
  olcum.toplamMs = 0;
  olcum.maksMs = 0;
  olcum.blokIslemi = 0;
  olcum.varlikDogumu = 0;
  olcum.ertelenenTick = 0;
}

function olcumRaporla() {
  if (olcum.tickSayisi === 0) return;
  const ort = olcum.toplamMs / olcum.tickSayisi;
  const blokTick = olcum.blokIslemi / olcum.tickSayisi;

  bilgiYaz(
    "OLCUM | tick: " + olcum.tickSayisi +
    " | ort: " + ort.toFixed(2) + "ms" +
    " | maks: " + olcum.maksMs.toFixed(2) + "ms" +
    " | toplam: " + olcum.toplamMs.toFixed(1) + "ms" +
    " | blok: " + olcum.blokIslemi +
    " (" + blokTick.toFixed(1) + "/tick)" +
    " | varlik: " + olcum.varlikDogumu +
    " | butce dolan tick: " + olcum.ertelenenTick
  );

  if (!OLCUM_SOHBETE) return;

  // Sohbet dar, iki satira bolup renklendiriyoruz.
  // "maks" en onemli sutun: tek bir tick'in en kotu suresi.
  const renk = olcum.maksMs >= 5 ? "§c" : (olcum.maksMs >= 2 ? "§e" : "§a");
  sohbeteYaz(
    "§6[OLCUM] §fmaks " + renk + olcum.maksMs.toFixed(1) + "ms" +
    " §fort §b" + ort.toFixed(2) + "ms" +
    " §ftoplam §b" + olcum.toplamMs.toFixed(0) + "ms"
  );
  sohbeteYaz(
    "§7        blok " + olcum.blokIslemi + " (" + blokTick.toFixed(1) + "/tick)" +
    " · varlik " + olcum.varlikDogumu +
    " · tick " + olcum.tickSayisi +
    " · butce dolan " + olcum.ertelenenTick
  );
}

/* ============================================================
   MERKEZI TICK YONETICISI
   Eski kodda her yetenek kendi runInterval'ini aciyordu, yani
   toplam yuke kimse bakmiyordu. Artik tek dongu var ve butceyi
   o dagitiyor.
   ============================================================ */

const isler = [];                 // aktif isler
const oyuncununIsi = new Map();   // oyuncuId -> is  (oyuncu basina tek aktif efekt)

let blokButcesi = 0;
let varlikButcesi = 0;

// Butceden blok kotasi ister, verilen miktari dondurur.
function blokIste(adet) {
  const verilen = adet < blokButcesi ? adet : blokButcesi;
  blokButcesi -= verilen;
  if (OLCUM_ACIK) olcum.blokIslemi += verilen;
  return verilen;
}

function varlikIste(adet) {
  const verilen = adet < varlikButcesi ? adet : varlikButcesi;
  varlikButcesi -= verilen;
  if (OLCUM_ACIK) olcum.varlikDogumu += verilen;
  return verilen;
}

function isEkle(is) {
  if (OLCUM_ACIK && isler.length === 0) olcumSifirla();
  isler.push(is);
  oyuncununIsi.set(is.oyuncuId, is);
}

function isSil(indeks) {
  const is = isler[indeks];
  isler.splice(indeks, 1);
  if (oyuncununIsi.get(is.oyuncuId) === is) oyuncununIsi.delete(is.oyuncuId);
  try {
    is.bitir();
  } catch (e) {
    hataYaz(is.ad + ".bitir", e);
  }
}

system.runInterval(() => {
  // Esyasiz tetikleme taramasi: is olmasa da calismali
  if (ESYASIZ_ACIK) {
    try {
      esyasizTara();
    } catch (e) {
      hataYaz("esyasizTara", e);
    }
  }

  if (isler.length === 0) return;

  blokButcesi = TICK_BLOK_BUTCESI;
  varlikButcesi = TICK_VARLIK_BUTCESI;

  const baslangic = OLCUM_ACIK ? simdiMs() : 0;

  for (let i = isler.length - 1; i >= 0; i--) {
    const is = isler[i];
    let bitti;
    try {
      bitti = is.calis();
    } catch (e) {
      // Buraya dusen hata isin kendi ele alamadigi bir seydir;
      // isi kapatiyoruz ki bozuk durumda donmeye devam etmesin.
      hataYaz(is.ad, e);
      bitti = true;
    }
    if (bitti) isSil(i);
  }

  if (OLCUM_ACIK) {
    const gecen = simdiMs() - baslangic;
    olcum.tickSayisi++;
    olcum.toplamMs += gecen;
    if (gecen > olcum.maksMs) olcum.maksMs = gecen;
    if (blokButcesi === 0 || varlikButcesi === 0) olcum.ertelenenTick++;
    if (isler.length === 0) olcumRaporla();
  }
}, 1);

/* ============================================================
   OLAY ABONELIGI
   Bir olay adi API surumunde yoksa .subscribe cagrisi script
   YUKLENIRKEN hata firlatir ve tum paket olur. Orijinal kod
   sadece itemUse kullaniyordu; playerLeave ve playerSpawn
   sonradan eklendi, o yuzden her abonelik tek tek korunuyor.
   Eksik olay artik sadece o ozelligi kapatir, paketi oldurmez.
   ============================================================ */

function olayaAbone(olayAdi, isleyici) {
  try {
    const olaylar = world.afterEvents;
    const olay = olaylar ? olaylar[olayAdi] : undefined;
    if (!olay || typeof olay.subscribe !== "function") {
      bilgiYaz("UYARI: world.afterEvents." + olayAdi +
               " bu API surumunde yok. Ilgili ozellik devre disi.");
      return false;
    }
    olay.subscribe(isleyici);
    return true;
  } catch (e) {
    hataYaz("olayaAbone(" + olayAdi + ")", e);
    return false;
  }
}

/* ---------------- Oyuncu ayrilinca temizle ---------------- */

olayaAbone("playerLeave", (olay) => {
  esyasizTutma.delete(olay.playerId);
  const is = oyuncununIsi.get(olay.playerId);
  if (!is) {
    sonKullanim.delete(olay.playerId);
    return;
  }
  const indeks = isler.indexOf(is);
  if (indeks !== -1) isSil(indeks);
  sonKullanim.delete(olay.playerId);
});

/* ---------------- Yuklendi bildirimi ----------------
   Paketin gercekten calistigini dunyaya girer girmez gormek icin.
   Bu satiri gormuyorsan paket ya etkin degil ya da script hic
   calismamis demektir.                                            */

olayaAbone("playerSpawn", (olay) => {
  if (!olay.initialSpawn) return;
  if (!OLCUM_SOHBETE && !HATA_SOHBETE) return;
  try {
    olay.player.sendMessage(
      "§a[SimsekTNT " + SURUM + "] yuklendi §7· blok butcesi " + TICK_BLOK_BUTCESI + "/tick" +
      " · olcum " + (OLCUM_ACIK ? "§aacik" : "§7kapali")
    );
  } catch (e) {
    hataYaz("playerSpawn", e);
  }
});

/* ============================================================
   GIRIS
   ============================================================ */

const sonKullanim = new Map();

// Esyasiz tetikleme icin de kullanilan ortak yol
const ESYASIZ_TIP = "esyasiz:yildirim";

function yetenekTetikle(oyuncu, tip) {
  // Oyuncu basina tek aktif efekt: ust uste tetikleme yuku katlamasin
  if (oyuncununIsi.has(oyuncu.id)) return false;

  const simdi = system.currentTick;
  const onceki = sonKullanim.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < BEKLEME) return false;
  sonKullanim.set(oyuncu.id, simdi);

  kollariKaldir(oyuncu);

  system.runTimeout(() => {
    try {
      if (!gecerliMi(oyuncu)) return;
      yetenekBaslat(oyuncu, tip);
    } catch (e) {
      hataYaz("yetenekBaslat(" + tip + ")", e);
      kollariIndir(oyuncu);
    }
  }, KOL_GECIKME);

  return true;
}

const girisKuruldu = olayaAbone("itemUse", (olay) => {
  try {
    const oyuncu = olay.source;
    const esya = olay.itemStack;
    if (!oyuncu || !esya) return;

    const tip = esya.typeId;
    if (tip !== SIMSEK_ESYA && tip !== ALAN_ESYA && tip !== TNT_ESYA && tip !== TOP_ESYA) return;

    yetenekTetikle(oyuncu, tip);
  } catch (e) {
    hataYaz("itemUse", e);
  }
});

if (!girisKuruldu) {
  bilgiYaz("KRITIK: itemUse olayina abone olunamadi, hicbir yetenek calismaz.");
}

function yetenekBaslat(oyuncu, tip) {
  // Gecikme sirasinda baska bir is baslamis olabilir
  if (oyuncununIsi.has(oyuncu.id)) return;

  if (tip === ALAN_ESYA) {
    const is = alanSimsegiIsi(oyuncu);
    if (is) isEkle(is);
    return;
  }

  if (tip === TOP_ESYA) {
    const is = toprakTopuIsi(oyuncu);
    if (is) isEkle(is);
    return;
  }

  // Esyasiz: yildirim oyuncunun ETRAFINA yagar, baktigi yere degil.
  // Tetiklemek icin yukari bakmak gerektiginden "baktigi yer" gokyuzu
  // olurdu ve yildirim 150 blok yukarida gorunmez sekilde dogardi.
  if (tip === ESYASIZ_TIP) {
    const k = oyuncu.location;
    const merkez = { x: k.x, y: k.y, z: k.z };
    isEkle(yagdirIsi(oyuncu, merkez, "minecraft:lightning_bolt",
                     ESYASIZ_SAYISI, 0, SIMSEK_ARALIK, SIMSEK_GRUP,
                     { ic: ESYASIZ_IC_YARICAP, dis: ESYASIZ_DIS_YARICAP }));
    return;
  }

  const hedef = hedefBul(oyuncu);
  if (!hedef) {
    kollariIndir(oyuncu);
    return;
  }

  if (tip === SIMSEK_ESYA) {
    isEkle(yagdirIsi(oyuncu, hedef, "minecraft:lightning_bolt",
                     SIMSEK_SAYISI, 0, SIMSEK_ARALIK, SIMSEK_GRUP, null));
  } else {
    isEkle(yagdirIsi(oyuncu, hedef, "minecraft:tnt",
                     TNT_SAYISI, TNT_YUKSEKLIK, TNT_ARALIK, TNT_GRUP, null));
  }
}

/* ============================================================
   ESYASIZ TETIKLEME
   Elin bosken yukari bak + egil -> etrafina yildirim.
   Her tick oyuncu taramak israf oldugu icin ESYASIZ_TARAMA
   tick'te bir bakiliyor.
   ============================================================ */

const esyasizTutma = new Map();   // oyuncuId -> kac tick tutuldu (veya TETIKLENDI)
const ESYASIZ_TETIKLENDI = -1;    // durus bozulana kadar tekrar tetikleme
let esyasizSayac = 0;

function esyasizDurus(oyuncu) {
  if (ESYASIZ_EGILME_SART && !oyuncu.isSneaking) return false;
  const yon = oyuncu.getViewDirection();
  return yon.y >= ESYASIZ_BAKIS_ESIGI;
}

function esyasizTara() {
  if (++esyasizSayac < ESYASIZ_TARAMA) return;
  esyasizSayac = 0;

  let oyuncular;
  try {
    oyuncular = world.getAllPlayers();
  } catch (e) {
    hataYaz("esyasizTara.getAllPlayers", e);
    return;
  }
  if (!oyuncular || oyuncular.length === 0) return;

  for (const oyuncu of oyuncular) {
    try {
      const durum = esyasizTutma.get(oyuncu.id);

      // Durus bozulduysa sifirla; tekrar tetiklemenin tek yolu bu
      if (!esyasizDurus(oyuncu)) {
        if (durum !== undefined) esyasizTutma.delete(oyuncu.id);
        continue;
      }

      // Bir kez tetiklendi: durusu bozup yeniden yapmadan tekrarlamasin.
      // Yoksa el yukarida beklerken bekleme suresi her doldugunda
      // kendiliginden yeniden yagardi.
      if (durum === ESYASIZ_TETIKLENDI) continue;

      // Efekt suruyorsa sayaci koru, sifirlama
      if (oyuncununIsi.has(oyuncu.id)) continue;

      const tutulan = (durum || 0) + ESYASIZ_TARAMA;
      if (tutulan < ESYASIZ_TUTMA) {
        esyasizTutma.set(oyuncu.id, tutulan);
        continue;
      }

      // Bekleme suresi dolmadiysa tetiklenmez; o zaman isaretleme de
      // yapma ki bekleme bitince ayni durusla tekrar denenebilsin.
      if (yetenekTetikle(oyuncu, ESYASIZ_TIP)) {
        esyasizTutma.set(oyuncu.id, ESYASIZ_TETIKLENDI);
      }
    } catch (e) {
      hataYaz("esyasizTara", e);
    }
  }
}

/* ---------------- Kol animasyonu ---------------- */

function kollariKaldir(oyuncu) {
  try {
    oyuncu.runCommand("playanimation @s animation.zombie.attack_bare_hand a 999");
  } catch (e) {
    hataYaz("kollariKaldir", e);
  }
}

function kollariIndir(oyuncu) {
  try {
    if (gecerliMi(oyuncu)) {
      oyuncu.runCommand("playanimation @s animation.zombie.attack_bare_hand a 0");
    }
  } catch (e) {
    hataYaz("kollariIndir", e);
  }
}

/* ---------------- Hedef bulma ---------------- */

function hedefBul(oyuncu) {
  try {
    const vurus = oyuncu.getBlockFromViewDirection({ maxDistance: MENZIL });
    if (vurus && vurus.block) {
      const k = vurus.block.location;
      return { x: k.x + 0.5, y: k.y + 1, z: k.z + 0.5 };
    }
  } catch (e) {
    hataYaz("hedefBul.raycast", e);
  }

  // Isin bir seye carpmadiysa havada bir nokta hedefle
  try {
    const yon = oyuncu.getViewDirection();
    const bas = oyuncu.getHeadLocation();
    return {
      x: bas.x + yon.x * MENZIL,
      y: bas.y + yon.y * MENZIL,
      z: bas.z + yon.z * MENZIL
    };
  } catch (e) {
    hataYaz("hedefBul.yon", e);
    return undefined;
  }
}

/* ============================================================
   YON SIMSEGI VE TNT YAGMURU
   ============================================================ */

function yagdirIsi(oyuncu, hedef, varlik, toplam, yukseklik, aralik, grup, halka) {
  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const oyuncuId = oyuncu.id;

  // Her dogumda yeni nesne uretmek yerine tek nesneyi yeniden kullan
  const nokta = { x: 0, y: 0, z: 0 };

  let dogan = 0;
  let sonrakiTick = system.currentTick;

  return {
    ad: "yagdir(" + varlik + ")",
    oyuncuId: oyuncuId,

    calis() {
      if (system.currentTick < sonrakiTick) return false;

      const kalan = toplam - dogan;
      const izin = varlikIste(grup < kalan ? grup : kalan);
      if (izin === 0) return false;   // butce dolu, sonraki tick'te devam

      for (let i = 0; i < izin; i++) {
        if (halka) {
          // Oyuncunun etrafindaki halkaya dagit: ic yaricaptan yakina
          // dusmesin ki tetikleyen kisi kendi yildirimindan olmesin.
          const aci = Math.random() * Math.PI * 2;
          const mesafe = halka.ic + Math.random() * (halka.dis - halka.ic);
          nokta.x = hedef.x + Math.cos(aci) * mesafe;
          nokta.y = hedef.y + yukseklik;
          nokta.z = hedef.z + Math.sin(aci) * mesafe;
        } else {
          nokta.x = hedef.x + (Math.random() * 2 - 1) * YAYILMA;
          nokta.y = hedef.y + yukseklik;
          nokta.z = hedef.z + (Math.random() * 2 - 1) * YAYILMA;
        }

        // Sinir disina dogurmaya calisirsak istisna yerine atla
        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          dogan++;
          continue;
        }

        try {
          boyut.spawnEntity(varlik, nokta);
        } catch (e) {
          // Yuklenmemis chunk veya gecersiz konum: bu tek dogumu atla,
          // ama sessiz gecme.
          hataYaz("yagdir.spawnEntity", e);
        }
        dogan++;
      }

      sonrakiTick = system.currentTick + aralik;
      return dogan >= toplam;
    },

    bitir() {
      kollariIndir(oyuncu);
    }
  };
}

/* ============================================================
   ALAN SIMSEGI
   ============================================================ */

function alanSimsegiIsi(oyuncu) {
  const boyut = oyuncu.dimension;
  const oyuncuId = oyuncu.id;

  let hedefler;
  try {
    hedefler = boyut.getEntities({
      location: oyuncu.location,
      maxDistance: ALAN_YARICAP,
      excludeTypes: MUAF
    });
  } catch (e) {
    hataYaz("alanSimsegi.getEntities", e);
    kollariIndir(oyuncu);
    return undefined;
  }

  if (hedefler.length === 0) {
    try {
      oyuncu.sendMessage("§eEtrafta vurulacak mob yok.");
    } catch (e) {
      hataYaz("alanSimsegi.sendMessage", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }

  try {
    oyuncu.sendMessage("§b" + hedefler.length + " hedef bulundu.");
  } catch (e) {
    hataYaz("alanSimsegi.sendMessage", e);
  }

  let i = 0;
  let sonrakiTick = system.currentTick;

  return {
    ad: "alanSimsegi",
    oyuncuId: oyuncuId,

    calis() {
      if (system.currentTick < sonrakiTick) return false;

      const kalan = hedefler.length - i;
      const izin = varlikIste(4 < kalan ? 4 : kalan);
      if (izin === 0) return false;

      for (let k = 0; k < izin; k++) {
        const hedef = hedefler[i++];
        try {
          if (gecerliMi(hedef)) {
            boyut.spawnEntity("minecraft:lightning_bolt", hedef.location);
          }
        } catch (e) {
          hataYaz("alanSimsegi.spawnEntity", e);
        }
      }

      sonrakiTick = system.currentTick + 2;
      return i >= hedefler.length;
    },

    bitir() {
      hedefler = undefined;   // varlik referanslarini birak
      kollariIndir(oyuncu);
    }
  };
}

/* ============================================================
   DEV TOPRAK TOPU
   ============================================================ */

function kureNoktalari(r) {
  const noktalar = [];
  const t = Math.ceil(r);
  for (let x = -t; x <= t; x++) {
    for (let y = -t; y <= t; y++) {
      for (let z = -t; z <= t; z++) {
        if (x * x + y * y + z * z <= r * r + 0.5) noktalar.push({ x, y, z });
      }
    }
  }
  return noktalar;
}

const KURE = kureNoktalari(TOP_YARICAP);

// Kucuk tam sayi koordinatlarini tek sayiya paketle (-16..15 arasi guvenli)
function kureAnahtar(x, y, z) {
  return (x + 16) * 1024 + (y + 16) * 32 + (z + 16);
}

const KURE_KUME = new Set();
for (const n of KURE) KURE_KUME.add(kureAnahtar(n.x, n.y, n.z));

/* Delta onbellegi.
   Eski kod her adimda kurenin tamamini havaya cevirip tamamini
   yeniden ciziyordu: 66 blok islemi. Oysa arka arkaya iki kure
   buyuk olcude ust uste biniyor; ortak kalan bloklara dokunmaya
   gerek yok. Sadece farki yazinca adim basina ~44 islem kaliyor.

   Bakis yonu ucus boyunca sabit oldugu icin tum ucusta yalnizca
   2 farkli tam sayi otelemesi olusuyor, yani bu hesap atis basina
   2 kez yapilip 30 kez kullaniliyor. Pratikte bedava.            */

const deltaOnbellek = new Map();

function deltaAl(dx, dy, dz) {
  const anahtar = kureAnahtar(dx, dy, dz);
  const onceki = deltaOnbellek.get(anahtar);
  if (onceki) return onceki;

  const silinecek = [];   // eski merkeze gore: eskide var, yenide yok
  const cizilecek = [];   // yeni merkeze gore: yenide var, eskide yok

  for (const n of KURE) {
    if (!KURE_KUME.has(kureAnahtar(n.x - dx, n.y - dy, n.z - dz))) silinecek.push(n);
    if (!KURE_KUME.has(kureAnahtar(n.x + dx, n.y + dy, n.z + dz))) cizilecek.push(n);
  }

  const delta = { silinecek, cizilecek };
  deltaOnbellek.set(anahtar, delta);
  return delta;
}

const BOS_LISTE = [];

// getBlock'a verilen koordinat nesnesi: her blok icin yenisini
// uretmek yerine tek nesne surekli yeniden kullaniliyor.
const _koord = { x: 0, y: 0, z: 0 };

// getEntities secenekleri de her adimda yeniden uretilmesin
const _hasarSecenek = {
  location: { x: 0, y: 0, z: 0 },
  maxDistance: TOP_YARICAP + 1.5,
  excludeTypes: TOP_HASAR_MUAF
};

function toprakTopuIsi(oyuncu) {
  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const oyuncuId = oyuncu.id;

  let yon, poz;
  try {
    yon = oyuncu.getViewDirection();
    const bas = oyuncu.getHeadLocation();
    // Kendini vurmamak icin biraz ileriden baslat
    poz = {
      x: bas.x + yon.x * (TOP_YARICAP + 2),
      y: bas.y + yon.y * (TOP_YARICAP + 2),
      z: bas.z + yon.z * (TOP_YARICAP + 2)
    };
  } catch (e) {
    hataYaz("toprakTopu.baslangic", e);
    kollariIndir(oyuncu);
    return undefined;
  }

  // Tam sayi merkezler: delta hesabi bunlarin farkina dayaniyor
  let merkezX = Math.floor(poz.x);
  let merkezY = Math.floor(poz.y);
  let merkezZ = Math.floor(poz.z);

  // Bekleyen yazim kuyrugu: liste + indeks, her adimda dizi uretilmiyor
  let silListe = BOS_LISTE, silIndeks = 0;
  let silX = merkezX, silY = merkezY, silZ = merkezZ;
  let cizListe = BOS_LISTE, cizIndeks = 0;

  let gidilen = 0;
  let cizildi = false;
  let bitisBekliyor = false;   // son temizlik bitince patlat
  let sonrakiAdim = system.currentTick;
  let patlamaNoktasi = null;

  /* Bekleyen yazimlari butce kadar bosaltir.
     Butce yetmezse kalani sonraki tick'e devreder; boylece
     tick basina blok sayisi tavani asla asilmaz.              */
  function bosalt() {
    const kalan = (silListe.length - silIndeks) + (cizListe.length - cizIndeks);
    if (kalan === 0) return true;

    let kota = blokIste(kalan);
    if (kota === 0) return false;

    // Tek try: eski kodda her blok icin ayri try/catch vardi ve
    // hata yutuluyordu. Burada bir sorun cikarsa is duzgun biter.
    try {
      while (kota > 0 && silIndeks < silListe.length) {
        const n = silListe[silIndeks++];
        blokYaz(silX + n.x, silY + n.y, silZ + n.z, "minecraft:air");
        kota--;
      }
      while (kota > 0 && cizIndeks < cizListe.length) {
        const n = cizListe[cizIndeks++];
        blokYaz(merkezX + n.x, merkezY + n.y, merkezZ + n.z, TOP_BLOK);
        kota--;
      }
    } catch (e) {
      hataYaz("toprakTopu.bosalt", e);
      return true;   // kuyrugu bitmis say, is kapansin
    }

    return (silIndeks >= silListe.length) && (cizIndeks >= cizListe.length);
  }

  function blokYaz(x, y, z, tip) {
    // Dunya sinirini istisna firlatmadan once ele al
    if (y < sinir.min || y > sinir.max) return;

    _koord.x = x;
    _koord.y = y;
    _koord.z = z;

    const blok = boyut.getBlock(_koord);
    if (!blok) return;                              // yuklenmemis chunk
    if (KORUNAN_KUME.has(blok.typeId)) return;      // korunan blok
    blok.setType(tip);
  }

  // Sonraki adima gecerken silinecek/cizilecek listelerini kur
  function adimHazirla(yeni) {
    const yeniX = yeni.x;
    const yeniY = yeni.y;
    const yeniZ = yeni.z;

    const yeniMerkezX = Math.floor(yeniX);
    const yeniMerkezY = Math.floor(yeniY);
    const yeniMerkezZ = Math.floor(yeniZ);

    const delta = deltaAl(
      yeniMerkezX - merkezX,
      yeniMerkezY - merkezY,
      yeniMerkezZ - merkezZ
    );

    // Silme eski merkeze, cizme yeni merkeze gore
    silX = merkezX; silY = merkezY; silZ = merkezZ;
    silListe = cizildi ? delta.silinecek : BOS_LISTE;
    silIndeks = 0;

    poz.x = yeniX; poz.y = yeniY; poz.z = yeniZ;
    merkezX = yeniMerkezX; merkezY = yeniMerkezY; merkezZ = yeniMerkezZ;

    // Ilk adimda ortada eski kure yok, kurenin tamami cizilir.
    // Sonraki adimlarda sadece fark yazilir.
    cizListe = cizildi ? delta.cizilecek : KURE;
    cizIndeks = 0;
    cizildi = true;

    gidilen += TOP_HIZ;
  }

  // Topu tamamen sil, sonra verilen noktada patla
  function bitisiKur(nokta) {
    silX = merkezX; silY = merkezY; silZ = merkezZ;
    silListe = cizildi ? KURE : BOS_LISTE;
    silIndeks = 0;
    cizListe = BOS_LISTE;
    cizIndeks = 0;
    bitisBekliyor = true;
    patlamaNoktasi = nokta;
  }

  return {
    ad: "toprakTopu",
    oyuncuId: oyuncuId,

    calis() {
      // 1) Bekleyen yazimlar varsa once onlari bitir
      if (!bosalt()) return false;

      // 2) Son temizlik bittiyse patlat ve kapat
      if (bitisBekliyor) {
        patlat(boyut, patlamaNoktasi);
        return true;
      }

      // 3) Adim araligini bekle
      if (system.currentTick < sonrakiAdim) return false;
      sonrakiAdim = system.currentTick + TOP_ARALIK;

      // 4) Oyuncu hala gecerli mi (ayrildiysa/oldu ise topu temizleyip bitir)
      if (!gecerliMi(oyuncu)) {
        bitisiKur({ x: poz.x, y: poz.y, z: poz.z });
        return false;
      }

      // 5) Menzil doldu mu -- eski kodda oldugu gibi ilerlemeden once
      //    kontrol edilir ve patlama mevcut noktada olur
      if (gidilen >= TOP_MENZIL) {
        bitisiKur({ x: poz.x, y: poz.y, z: poz.z });
        return false;
      }

      // Ilerlenecek nokta (henuz uygulanmadi)
      const yeni = {
        x: poz.x + yon.x * TOP_HIZ,
        y: poz.y + yon.y * TOP_HIZ,
        z: poz.z + yon.z * TOP_HIZ
      };

      // 6) Onunde sert bir sey var mi -- eski kodla ayni: ilerlenmis
      //    noktadan (TOP_YARICAP + 1) blok ileri bakilir.
      //    Dunya sinirini asmak da burada "durdurucu" sayilir; eski kod
      //    bunu getBlock'un istisnasindan anliyordu, artik acikca
      //    kontrol ediliyor.
      if (carpmaVarMi(boyut, sinir, yeni, yon)) {
        bitisiKur(yeni);
        return false;
      }

      // NOT: Kurenin bir dilimi dunya sinirinin disina tasarsa top
      // durmaz, eski koddaki gibi ucmaya devam eder; sadece o bloklar
      // atlanir. Atlama isi blokYaz icinde, istisna firlatmadan yapilir.

      // 7) Ilerle: silinecek/cizilecek listeleri kurulur,
      //    yazma isini bir sonraki calis() butceye gore yapar
      adimHazirla(yeni);
      hasarVer(boyut, poz, oyuncuId);
      return false;
    },

    bitir() {
      kollariIndir(oyuncu);
    }
  };
}

function carpmaVarMi(boyut, sinir, poz, yon) {
  const x = Math.floor(poz.x + yon.x * (TOP_YARICAP + 1));
  const y = Math.floor(poz.y + yon.y * (TOP_YARICAP + 1));
  const z = Math.floor(poz.z + yon.z * (TOP_YARICAP + 1));

  if (y < sinir.min || y > sinir.max) return true;

  _koord.x = x;
  _koord.y = y;
  _koord.z = z;

  try {
    const blok = boyut.getBlock(_koord);
    if (!blok) return true;                            // yuklenmemis chunk: dur
    return KORUNAN_KUME.has(blok.typeId);
  } catch (e) {
    hataYaz("carpmaVarMi", e);
    return true;
  }
}

function hasarVer(boyut, poz, atanId) {
  _hasarSecenek.location.x = poz.x;
  _hasarSecenek.location.y = poz.y;
  _hasarSecenek.location.z = poz.z;

  let yakin;
  try {
    yakin = boyut.getEntities(_hasarSecenek);
  } catch (e) {
    hataYaz("hasarVer.getEntities", e);
    return;
  }

  for (const varlik of yakin) {
    if (varlik.id === atanId) continue;
    try {
      varlik.applyDamage(TOP_HASAR);
    } catch (e) {
      // Olmus veya hasar alamayan varlik: bu tek varligi atla
      hataYaz("hasarVer.applyDamage", e);
    }
  }
}

function patlat(boyut, poz) {
  if (!poz) return;
  try {
    boyut.createExplosion(poz, PATLAMA_GUCU, {
      breaksBlocks: true,
      causesFire: false,
      allowUnderwater: true
    });
  } catch (e) {
    hataYaz("patlat", e);
  }
}

bilgiYaz(SURUM + " yuklendi | blok butcesi: " + TICK_BLOK_BUTCESI + "/tick, varlik butcesi: " + TICK_VARLIK_BUTCESI + "/tick, olcum: " + (OLCUM_ACIK ? "acik" : "kapali"));
