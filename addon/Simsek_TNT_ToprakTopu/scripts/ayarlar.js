/* ============================================================
   AYARLAR
   Butun sabit sayilar burada. Baska dosyada sabit tanimlama.
   ============================================================ */

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni tutulmali.
export const SURUM = "v3.3";

/* ---------------- Tetikleyici esyalar ---------------- */
export const SIMSEK_ESYA = "minecraft:blaze_rod";     // baktigin yere simsek
export const ALAN_ESYA   = "minecraft:ghast_tear";    // etraftaki TUM moblara simsek
export const TNT_ESYA    = "minecraft:nether_star";   // TNT yagmuru
export const TOP_ESYA    = "minecraft:clay_ball";     // dev toprak topu

/* ---------------- Yon simsegi / TNT ---------------- */
export const MENZIL        = 150;  // en fazla kac blok uzaga vurabilir
export const YAYILMA       = 7;    // hedefin etrafina kac blok sacilsin
export const SIMSEK_SAYISI = 20;   // toplam kac simsek dussun
export const TNT_SAYISI    = 30;   // toplam kac TNT dussun
export const TNT_YUKSEKLIK = 30;   // TNT hedefin kac blok ustunde dogsun

/* Yagmurun ne kadar surede bitecegi.
   Sure = ceil(sayi / grup) * aralik  tick.  (20 tick = 1 saniye)

   Simsek gecmisi:
     ilk hali  : grup 2, aralik 3 -> 10 parti x 3 = 30 tick (1.5 sn)
     kisaltilan: grup 4, aralik 2 ->  5 parti x 2 = 10 tick (0.5 sn)
     SIMDIKI   : grup 1, aralik 3 -> 20 parti x 3 = 60 tick (3.0 sn)

   DIKKAT: yagmur BEKLEME suresinden uzun olursa yeni tetikleme
   beklemeye takilir. Ikisi de su an 60 tick.                      */
export const SIMSEK_GRUP   = 1;
export const SIMSEK_ARALIK = 3;
export const TNT_GRUP      = 2;
export const TNT_ARALIK    = 2;

/* ---------------- Alan simsegi ---------------- */
export const ALAN_YARICAP = 25;   // etrafindaki kac blokluk moblar vurulsun
export const ALAN_GRUP    = 4;    // her partide kac mob vurulsun
export const ALAN_ARALIK  = 2;    // partiler arasi tick

/* ---------------- Toprak topu ---------------- */
export const TOP_YARICAP  = 2;    // topun yaricapi (2 = 5 blok capinda)
export const TOP_HIZ      = 2;    // her adimda kac blok ilerlesin
export const TOP_ARALIK   = 2;    // adimlar arasi tick
export const TOP_MENZIL   = 60;   // en fazla kac blok gitsin
export const TOP_HASAR    = 12;   // carptigi moba verdigi hasar
export const PATLAMA_GUCU = 4;    // sonunda patlama gucu (TNT = 4)
export const TOP_BLOK     = "minecraft:dirt";

/* ---------------- Genel ---------------- */
export const BEKLEME     = 60;    // tekrar kullanma beklemesi (20 tick = 1 sn)
export const KOL_GECIKME = 10;    // kollar kalktiktan kac tick sonra baslasin

/* ---------------- Kol animasyonu ----------------
   Ozel animasyon tanimlamak RESOURCE PACK gerektirir; behavior
   pack'ten yaratilamaz. O yuzden animasyonlar AYRI ve ISTEGE BAGLI
   bir pakete konuldu: "Simsek Kol Animasyonlari".

   KAPALI (varsayilan): animation.zombie.attack_bare_hand kullanilir.
     Oyunun icinde hazir gelir, hicbir ek paket gerekmez. Kollar one
     uzanir (zombi durusu), tam olarak "havaya kalkmaz".

   ACIK: kollar gercekten havaya kalkar. Bunun icin resource pack'in
     dunyada etkin olmasi SART. Etkin degilken acik birakirsan
     playanimation sessizce basarisiz olur ve kol hic kalkmaz.

   Yani: resource pack'i kurduysan burayi true yap, kurmadiysan false. */
export const OZEL_ANIMASYON = false;

export const ANIM_KALDIR = OZEL_ANIMASYON
  ? "animation.simsek.kol_kaldir"
  : "animation.zombie.attack_bare_hand a 999";

export const ANIM_INDIR = OZEL_ANIMASYON
  ? "animation.simsek.kol_indir"
  : "animation.zombie.attack_bare_hand a 0";

/* ---------------- Performans butceleri ----------------
   Bu degerler TUM oyuncular icin ortaktir, oyuncu basina degil.
   Iki kisi ayni anda yetenek kullanirsa butce paylasilir; isler
   yavaslar ama sunucu tick'i sismez. Tablet icin kritik olan bu.

   TICK_BLOK_BUTCESI olculerek secildi. 120 rastgele yonde atis
   yapilip ucus suresi ve tepe yuk karsilastirildi
   (orijinal: 62 tick, 33 blok/tick):

     butce 24 -> ucus 80 tick (%29 YAVAS), tepe yuk %27 az
     butce 28 -> ucus 62 tick (ayni),      tepe yuk %15 az   <-- secilen
     butce 32 -> ucus 62 tick (ayni),      tepe yuk %3 az

   28 altina inersen top gorunur sekilde yavaslar. Tablette OLCUM
   satirindaki "maks" surekli 5ms uzerindeyse dusurmek gerekebilir. */
export const TICK_BLOK_BUTCESI   = 28;  // tick basina blok islemi (getBlock+setType)
export const TICK_VARLIK_BUTCESI = 4;   // tick basina varlik dogurma

/* Patlama en pahali is: guc 4'luk bir patlama ~50 blok kirar ve o
   kadar da item dusurur. Guc 8 bunun kabaca 4 kati. Tablette gercek
   maliyet henuz olculmedi, o yuzden tavan bilerek dusuk tutuldu.
   OLCUM satirindaki "maks" rahatsa yukseltilebilir.                */
export const TICK_PATLAMA_BUTCESI = 1;  // tick basina patlama sayisi

/* ---------------- Olcum ve gunluk ----------------
   Content Log'u tablette okumak zahmetli. SOHBETE ayarlari acikken
   olcum ve hata satirlari sohbete de dusuyor. Yayin/normal oynanista
   ikisini de kapat, yoksa sohbet dolar.                             */
export const OLCUM_ACIK        = true;
export const OLCUM_SOHBETE     = true;
export const HATA_SOHBETE      = true;
export const HATA_SOHBET_ARALIK = 100;  // ayni hata sohbete en fazla bu aralikta

/* ---------------- Esyasiz tetikleme ----------------
   NEDEN JEST? Minecraft'ta "kolunu kaldir" diye bir oyuncu girdisi
   YOK. playanimation kolu kaldiran bir KOMUT, bizim oynattigimiz bir
   animasyon; oyuncunun yaptigi bir sey degil ve okunamaz. Script'in
   gorebildigi gercek girdiler: egilme, ziplama, kosma, bakis yonu.

   SEMA (ikisi de egilme gerektirir, yanlislikla tetiklenmesin):
     egil + tam yukari bak  -> yetenek DEGISTIR (actionbar'da yazar)
     egil + zipla           -> secili yetenegi CALISTIR

   Calistirma ziplamaya bagli cunku yon simsegi, TNT ve toprak topu
   baktigin yere gidiyor; calistirma jesti bakisi kisitlasaydi nisan
   alamazdin. Ziplama bakistan bagimsiz.                             */
export const ESYASIZ_ACIK        = true;
export const ESYASIZ_EGILME_SART = true;
export const ESYASIZ_BAKIS_ESIGI = 0.9;  // 1.0 = tam dik yukari
export const ESYASIZ_TUTMA       = 8;    // degistirme jesti kac tick tutulmali
export const ESYASIZ_TARAMA      = 4;    // kac tick'te bir kontrol

/* ---------------- Yildirim halkasi (esyasiz) ----------------
   Yildirim oyuncunun UZERINE degil etrafindaki halkaya duser --
   yoksa kendi yildiriminden olurdun. Ic yaricap guvenlik payi.     */
export const HALKA_SAYISI      = 20;
export const HALKA_IC_YARICAP  = 6;
export const HALKA_DIS_YARICAP = 14;

/* ---------------- Baktigini ucur (savur) ----------------
   Baktigin yondeki varliklari savurur. Blok kirmaz, sadece iter. */
export const SAVUR_MENZIL   = 20;   // kac blok oteye kadar etkiler
export const SAVUR_ACI      = 0.6;  // bakis konisi genisligi (1 = tam dar, 0 = her yon)
export const SAVUR_GUC      = 3.0;  // yatay itme gucu
export const SAVUR_YUKARI   = 0.8;  // dikey itme gucu
export const SAVUR_OYUNCU   = true; // oyunculari da savursun mu

/* ---------------- Ucus ----------------
   Levitation efekti kullaniliyor: guvenli, ucuz ve stabil API.   */
export const UCUS_SURE      = 140;  // tick (140 = 7 saniye)
export const UCUS_SIDDET    = 2;    // levitation seviyesi (0-9)
export const UCUS_YUMUSAK   = 200;  // bitince kac tick yavas dusme

/* ---------------- Guclu TNT ----------------
   Vanilla TNT'nin gucu degistirilemez (motor tarafinda sabit 4).
   Bu yuzden TNT varligi firlatilip fitil dolunca ELLE kaldiriliyor
   ve yerine kendi patlamamiz cagriliyor. Boylece guc bizim.       */
export const GTNT_HIZ       = 1.6;  // firlatma hizi
export const GTNT_FITIL     = 30;   // kac tick sonra patlasin
export const GTNT_GUC       = 8;    // patlama gucu (vanilla TNT = 4)
export const GTNT_ATES      = false;// patlama ates cikarsin mi

/* ---------------- Yildirim meteoru ----------------
   Her meteor = 1 yildirim + 1 patlama. Patlama butcesi yuzunden
   tick basina en fazla TICK_PATLAMA_BUTCESI tane isleniyor.       */
export const METEOR_SAYISI  = 6;    // kac meteor dussun
export const METEOR_YAYILMA = 9;    // hedefin etrafina kac blok sacilsin
export const METEOR_GUC     = 5;    // her meteorun patlama gucu
export const METEOR_ARALIK  = 6;    // meteorlar arasi tick
export const METEOR_ATES    = true; // ates cikarsin mi

/* ---------------- Korunan bloklar ----------------
   Toprak topu ve blok yazan diger yetenekler bunlara dokunmaz.     */
export const KORUNAN_KUME = new Set([
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
]);

/* ---------------- Simsek carpmasindan muaf varliklar ---------------- */
export const MUAF = [
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

export const TOP_HASAR_MUAF = [
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:lightning_bolt"
];

/* ---------------- Dunya yukseklik sinirlari ----------------
   heightRange okunamazsa bu tablo kullanilir.                      */
export const YUKSEKLIK_TABLO = {
  "minecraft:overworld": { min: -64, max: 319 },
  "minecraft:nether":    { min: 0,   max: 127 },
  "minecraft:the_end":   { min: 0,   max: 255 }
};
