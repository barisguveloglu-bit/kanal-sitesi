/* ============================================================
   AYARLAR
   Butun sabit sayilar burada. Baska dosyada sabit tanimlama.
   ============================================================ */

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni tutulmali.
export const SURUM = "v4.3";

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

/* ---------------- Kollari alma jesti ----------------
   egil + TAM ASAGI bak, tut -> butun kollar envantere girer.
   Ayni semanin ucuncu ayagi: yukari bak = degistir, zipla =
   calistir, asagi bak = kollari al. Komut yazmaya gerek yok.     */
export const KOL_VER_ACIK  = true;
export const KOL_VER_ESIGI = 0.9;   // 1.0 = tam dik asagi
export const KOL_VER_TUTMA = 16;    // kac tick tutulmali (degistirmeden uzun,
                                    // yanlislikla envanter dolmasin)

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

/* ---------------- Toprak yukselisi (Toprak Kol'un ucusu) ----------------
   Normal Ucus duz levitation, geride bir sey kalmaz. Bu yukselirken
   ALTINDA toprak sutunu oruyor -- ucus bitince kule duruyor.

   TUCUS_ARALIK sutunun sikligi: 2 tick'te bir blok, levitation 2
   siddetinde saniyede ~2 blok yukseldigi icin sutun kabaca kesiksiz
   cikiyor. Buyutursen sutunda bosluk olur (merdiven gibi).       */
export const TUCUS_SURE    = 140;  // tick (140 = 7 saniye)
export const TUCUS_SIDDET  = 2;    // levitation seviyesi
export const TUCUS_YUMUSAK = 200;  // bitince kac tick yavas dusme
export const TUCUS_ARALIK  = 2;    // kac tick'te bir blok konsun
export const TUCUS_TAVAN   = 40;   // en fazla kac blokluk sutun
export const TUCUS_BLOK    = "minecraft:dirt";

/* ---------------- Guclu TNT ----------------
   Vanilla TNT'nin gucu degistirilemez (motor tarafinda sabit 4).
   Bu yuzden TNT varligi firlatilip fitil dolunca ELLE kaldiriliyor
   ve yerine kendi patlamamiz cagriliyor. Boylece guc bizim.       */
export const GTNT_HIZ       = 1.6;  // firlatma hizi
export const GTNT_FITIL     = 30;   // kac tick sonra patlasin
export const GTNT_GUC       = 8;    // patlama gucu (vanilla TNT = 4)
export const GTNT_ATES      = false;// patlama ates cikarsin mi

/* ---------------- Yildirim meteoru ----------------
   Her meteor = 1 dusen govde + 1 yildirim + 1 patlama.

   ESKI HALI anlik patlamaydi: hedefte birden yildirim cakip
   patliyordu. Gelen bir sey GORUNMUYORDU. Simdi once yukarida
   bir TNT govdesi doguyor, dusuyor, yere yaklasinca kaldirilip
   yerine bizim patlamamiz cagriliyor -- yani gorunum "gokten
   dusen tas", guc bizim. (Ayni teknik guclu_tnt'de de var:
   vanilla TNT'nin gucu motorda sabit 4, degistirilemiyor.)       */
export const METEOR_SAYISI  = 6;    // kac meteor dussun
export const METEOR_YAYILMA = 9;    // hedefin etrafina kac blok sacilsin
export const METEOR_GUC     = 5;    // her meteorun patlama gucu
export const METEOR_ARALIK  = 6;    // meteorlar arasi tick
export const METEOR_ATES    = true; // ates cikarsin mi
export const METEOR_YUKSEK  = 24;   // kac blok yukaridan dussun (0 = anlik)
export const METEOR_INIS    = 2.0;  // yere bu kadar yaklasinca patlar
export const METEOR_TAVAN   = 80;   // govde bu kadar tick'te inmezse zorla patlat

/* ---------------- Can verme ----------------
   Referans mod bunu "effect @s health_boost 100000 255" diye
   yapiyordu: sadece kendine, sonsuza kadar, 255 seviye. Yani
   olumsuzluk. Bizimki cevredeki DOSTLARI da iyilestiriyor,
   suresi belli ve seviyeler makul.

   Dusmanlar disarida birakiliyor -- yoksa saldiran zombiyi de
   iyilestirirsin. Liste eksik kalabilir; yeni bir dusman gorursen
   buraya ekle.                                                    */
export const CAN_YARICAP = 12;   // kac blokluk cevre iyilessin
export const CAN_SURE    = 200;  // rejenerasyon/kalkan suresi (tick)
export const CAN_REJEN   = 1;    // regeneration seviyesi
export const CAN_KALKAN  = 1;    // absorption seviyesi
export const CAN_ANLIK   = 2;    // instant_health seviyesi
export const CAN_TAVAN   = 24;   // en fazla kac varlik iyilestirilsin

export const CAN_DUSMAN = new Set([
  "minecraft:zombie", "minecraft:husk", "minecraft:drowned",
  "minecraft:zombie_villager", "minecraft:zombie_pigman",
  "minecraft:skeleton", "minecraft:stray", "minecraft:wither_skeleton",
  "minecraft:bogged", "minecraft:creeper", "minecraft:spider",
  "minecraft:cave_spider", "minecraft:enderman", "minecraft:endermite",
  "minecraft:silverfish", "minecraft:witch", "minecraft:slime",
  "minecraft:magma_cube", "minecraft:blaze", "minecraft:ghast",
  "minecraft:phantom", "minecraft:guardian", "minecraft:elder_guardian",
  "minecraft:shulker", "minecraft:vindicator", "minecraft:evocation_illager",
  "minecraft:pillager", "minecraft:ravager", "minecraft:vex",
  "minecraft:piglin", "minecraft:piglin_brute", "minecraft:hoglin",
  "minecraft:zoglin", "minecraft:warden", "minecraft:breeze",
  "minecraft:creaking", "minecraft:wither", "minecraft:ender_dragon"
]);

/* ---------------- Ors yagdir ----------------
   Referans: "execute @s^^^6 /setblock ~~10~ anvil" -- tek ors,
   sabit 6 blok ileri, hedef gozetmeden. Bizimki nisan aldigin
   noktanin etrafina birden fazla ors yagdiriyor, blok butcesine
   uyuyor ve sadece HAVA olan yere koyuyor (bir seyin ustune
   yazip yok etmesin).

   Orsun dusmesi vanilla fizigi: havada duran ors kendiliginden
   dusen bloga donusuyor ve altindakine hasar veriyor. Bizim
   ayrica hasar vermemize gerek yok.                              */
export const ORS_SAYISI  = 8;    // kac ors dussun
export const ORS_YAYILMA = 4;    // hedefin etrafina kac blok sacilsin
export const ORS_YUKSEK  = 14;   // hedefin kac blok ustunde dogsun
export const ORS_ARALIK  = 3;    // orsler arasi tick
export const ORS_BLOK    = "minecraft:anvil";

/* ---------------- Buz adam ----------------
   Referans: hedefin kafasina kilitli bir "buz adam" kaski
   takiyor -- yani sadece gorunum degisiyor, oyuncu serbest
   kaliyor ve cikarmanin yolu yok (kalici).

   Bizimki gercekten hapsediyor: hedefin etrafina buz kabugu
   oruluyor, yavaslik veriliyor, sure dolunca buz eriyip
   ALTINDAKI BLOKLAR GERI GELIYOR. Sadece havanin yerine buz
   konuyor, hicbir sey yok edilmiyor.                             */
export const BUZ_MENZIL   = 30;   // kac blok oteye kadar hedef aranir
export const BUZ_ACI      = 0.95; // bakis konisi (1 = tam dar)
export const BUZ_SURE     = 200;  // hapis suresi (tick)
export const BUZ_YARICAP  = 1;    // kabugun yatay yaricapi (1 = 3x3)
export const BUZ_YUKSEK   = 3;    // kabugun yuksekligi
export const BUZ_BLOK     = "minecraft:ice";
export const BUZ_YAVASLIK = 5;    // slowness seviyesi
export const BUZ_OYUNCU   = true; // oyuncular da donsun mu

/* ---------------- Gorsel efektler ----------------
   Ikisi de OYNANISI DEGISTIRMEZ, sadece his katar. Tablette
   parcacik pahaliya gelebilir diye ayri kapatilabiliyor.

   Parcacik tipleri vanilla; ozel parcacik tanimlamak resource
   pack gerektirirdi, gerek yok.                                */
export const PARCACIK_ACIK = true;
export const SARSINTI_ACIK = true;

export const PARCACIK_PATLAMA = "minecraft:huge_explosion_emitter";
export const PARCACIK_ATES    = "minecraft:mobflame_emitter";
export const PARCACIK_BUZ     = "minecraft:snowflake_particle";
export const PARCACIK_IYILES  = "minecraft:heart_particle";
export const PARCACIK_TOPRAK  = "minecraft:crop_growth_emitter";

/* Sarsinti siddeti 0-1 arasi mantikli; 4 gibi degerler mideyi
   bulandiriyor (referans oyle yapiyordu).                      */
export const SARSINTI_PATLAMA = 0.35;
export const SARSINTI_SURE    = 0.45;

/* ---------------- Toprak duvar ----------------
   Referans: "fill ^1^5^6 ^-2^^6 dirt" -- baktigin yone tek
   komutla duvar oruyor, orada ne varsa YOK EDEREK.

   Bizimki blok butcesine uyuyor ve sadece havanin yerine
   koyuyor. Duvar bakis yonune DIK oruluyor: yatay yonun
   dikeyi alinarak (z, -x) genislik ekseni bulunuyor.          */
export const DUVAR_UZAKLIK  = 4;    // kac blok onune orulsun
export const DUVAR_GENISLIK = 3;    // merkezden saga/sola (3 = 7 blok)
export const DUVAR_YUKSEK   = 4;    // kac blok yukari
export const DUVAR_DERINLIK = 1;    // kac blok kalinlikta
export const DUVAR_BLOK     = "minecraft:dirt";

/* ---------------- Ucurma ----------------
   Referans: "execute @s^^^N /effect @e[r=N,c=1] levitation 1 255"
   uc ayri mesafede, ardindan "effect @s clear" (kendi butun
   efektlerini siler -- kaba bir yan etki).

   Bizdeki SAVUR ile karistirilmasin: savur ITER (applyImpulse,
   yatay firlatma), ucurma KALDIRIR (levitation, caresiz havada
   asili kalir). Ikisi farkli his.                                */
export const UCURMA_MENZIL = 20;
export const UCURMA_ACI    = 0.75;  // bakis konisi (1 = tam dar)
export const UCURMA_SURE   = 100;   // tick (5 saniye)
export const UCURMA_SIDDET = 4;     // levitation seviyesi
export const UCURMA_TAVAN  = 12;    // en fazla kac hedef
export const UCURMA_OYUNCU = true;

/* ---------------- Yamultma (felc) ----------------
   Referans: slowness 100000 tick seviye 255 + animation.fox.sleep,
   ve GERI ALAN HICBIR FONKSIYON YOK. Yani ~83 dakika kalici felc.

   Bizimki sureli ve CARESI VAR: ayni yetenegi felcli birine tekrar
   kullanirsan cozuluyor (referansta boyle bir sey yok).           */
export const YAMULT_MENZIL = 20;
export const YAMULT_ACI    = 0.85;
export const YAMULT_SURE   = 160;   // tick (8 saniye)
export const YAMULT_SIDDET = 5;     // slowness seviyesi
export const YAMULT_TAVAN  = 8;
export const YAMULT_OYUNCU = true;

/* ---------------- Iksirler (Nitroksin sistemi) ----------------
   Referans mod bunu tamamen komutla yapiyordu:
     - iksir minecraft:food bileseni, icince bos siseye donusuyor
     - bir fonksiyon kafa zirhina KILITLI bir "goz" esyasi takiyor
     - tick.json her tick @e[hasitem={...}] ile o gozu ARIYOR ve
       buff veriyor -> her tick DUNYADAKI TUM VARLIKLAR taraniyor
     - gozu cikarmanin yolu yok (item_lock), yani kalici

   Bizde durum script'te: kademeAl(oyuncuId) tek Map okumasi.
   Dunya taramasi yok, sadece iksir icmis oyuncular geziliyor.
   Sure dolunca goz kendiliginden cikiyor.

   Goz esyasi SADECE GORUNUM. Guc bayragi degil -- oyuncu gozu
   cikarsa bile kademe suresi devam eder. Referansta tam tersiydi
   ve bu yuzden gozu kilitlemek zorunda kalmislar.

   Kademeler birikmiyor: yeni iksir icince onceki iptal olur ve
   yenisi bastan baslar.                                          */
export const IKSIR_TAZELEME = 40;   // kac tick'te bir efektler yenilensin

/* ---------------- Goz lazeri ----------------
   Nitroksin'in ikonik yetenegi. Referansta bes kademenin lazeri
   de BIREBIR AYNIYDI -- hepsi soyle:
     execute @s^^^2 /damage @e[r=2,c=1] 6 fire
     execute @s^^^4 /damage @e[r=4,c=1] 6 fire
     execute @s^^^6 /damage @e[r=6,c=1] 6 fire
     execute @s^^^8 /damage @e[r=8,c=1] 6 fire
   Yani sabit 6 hasar, sabit 8 blok, kademe farki yok.

   Uc sorunu vardi:
     1. Sadece 2/4/6/8 blok mesafedeki noktalari tariyordu --
        3. blokta duran kurtuluyordu. Bizimki isinin TAMAMINI
        tariyor (nokta degil, cizgi).
     2. "c=1" en yakini seciyor ama OYUNCUYU DA sayiyordu; bu
        yuzden her lazerden once kendilerine instant_health
        veriyorlardi. Yama, cozum degil. Biz kendimizi hedef
        listesine hic almiyoruz.
     3. Kapatma dugmesi de ayni dort hasar satirini calistiriyordu,
        yani "lazeri kapat" da hasar veriyordu.

   Bizde hasar ve menzil KADEMEYE gore artiyor (asagidaki
   KADEMELER tablosunda her satirin kendi lazer ayari var).      */
export const LAZER_KALINLIK = 1.4;   // isindan kac blok sapma vurulur
export const LAZER_SURE     = 10;    // isin kac tick gorunur kalsin
export const LAZER_ADIM     = 1.5;   // parcacik kac blokta bir
export const LAZER_TAVAN    = 10;    // tek atista en fazla kac hedef
export const LAZER_OYUNCU   = true;  // oyunculara da vursun mu
export const PARCACIK_LAZER = "minecraft:basic_flame_particle";

/* Her kademe: kimlik, ad, sure, verilen efektler, goz esyasi.
   Efekt suresi TAZELEME'den uzun tutuluyor ki iki tazeleme
   arasinda efekt sonmesin.                                       */
export const KADEMELER = [
  {
    kimlik: "nitroksin",
    ad: "Nitroksin",
    sure: 1200,                     // 60 saniye
    goz: "pa:goz_beyaz",
    lazerGoz: "pa:goz_beyaz_lazer",
    lazer: { hasar: 6, menzil: 10 },
    efektler: [
      ["speed",        1],
      ["strength",     1],
      ["jump_boost",   1],
      ["regeneration", 0],
      ["absorption",   1],   // emis/kalkan: can barinin ustune sari kalp
      ["night_vision", 0]    // gece gorusu: en dusuk kademede bile var
    ]
  },
  {
    kimlik: "grinoksin",
    ad: "Grinoksin",
    sure: 1200,
    goz: "pa:goz_yesil",
    lazerGoz: "pa:goz_yesil_lazer",
    lazer: { hasar: 8, menzil: 14 },
    efektler: [
      ["speed",        2],
      ["strength",     2],
      ["jump_boost",   2],
      ["regeneration", 1],
      ["resistance",   0],
      ["absorption",   2],
      ["night_vision", 0]
    ]
  },
  {
    kimlik: "ates_iksiri",
    ad: "Ates Iksiri",
    sure: 1200,
    goz: "pa:goz_ates",
    lazerGoz: "pa:goz_ates_lazer",
    lazer: { hasar: 10, menzil: 18, ates: true },
    efektler: [
      ["speed",           3],
      ["strength",        3],
      ["fire_resistance", 0],
      ["regeneration",    1],
      ["resistance",      1],
      ["absorption",      3],
      ["night_vision",    0]
    ]
  },
  {
    kimlik: "kan_iksiri",
    ad: "Kan Iksiri",
    sure: 1200,
    goz: "pa:goz_kan",
    lazerGoz: "pa:goz_kan_lazer",
    lazer: { hasar: 13, menzil: 22 },
    efektler: [
      ["speed",         4],
      ["strength",      4],
      ["regeneration",  2],
      ["resistance",    1],
      ["absorption",    4],
      ["night_vision",  0],
      ["haste",         2]
    ]
  },
  {
    kimlik: "hiperoksin",
    ad: "Hiperoksin",
    sure: 1200,
    goz: "pa:goz_mavi",
    lazerGoz: "pa:goz_mavi_lazer",
    lazer: { hasar: 16, menzil: 28 },
    /* EN GUCLU KADEME -- acik ara. Digerlerinde olan her sey
       burada daha yuksek, ustune haste, su altinda nefes ve
       yuksekten dusme korumasi var.

       Referansta bu kademe ucusu da aciyordu (levitation 1 2)
       ama surekli levitation kontrolu elinden aliyor: yerde
       duramiyorsun, surekli yukari suruklenirsin. Onun yerine
       slow_falling -- yuksekten atlayabilirsin, olmezsin, ama
       kontrol sende. Ucmak istersen zaten Ucus yetenegi var.    */
    efektler: [
      ["speed",           5],
      ["strength",        5],
      ["regeneration",    3],
      ["resistance",      3],
      ["absorption",      6],   // en yuksek kalkan: 6 kat sari kalp
      ["night_vision",    0],
      ["haste",           3],
      ["jump_boost",      3],
      ["fire_resistance", 0],
      ["water_breathing", 0],
      ["slow_falling",    0]    // yuksekten atlarsan olmezsin
    ]
  }
];

/* Kademe -> iksir esyasi eslesmesi generator ile ayni sirada
   uretiliyor: pa:iksir_<kimlik>                                  */
export const IKSIR_ONEK = "pa:iksir_";
export const BOS_SISE   = "pa:bos_sise";

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
