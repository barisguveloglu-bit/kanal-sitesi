/* ============================================================
   AYARLAR
   Butun sabit sayilar burada. Baska dosyada sabit tanimlama.
   ============================================================ */

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni tutulmali.
export const SURUM = "v4.22";

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

/* ---------------- Hedef kilidi ----------------
   Tek simsek atarken karsindaki varliga kilitlenme. Hedef yoksa
   yetenek eskisi gibi baktigin NOKTAYA calisir; kilit sadece bir
   nisan yardimi, davranisi degistirmiyor.

   KILIT_ACI nokta carpimi: 1 = burnunun tam ucu, 0 = her yon.
   0.9 kabaca 25 derecelik bir koni -- tablette parmakla nisan
   almak zor oldugu icin bilerek genis tutuldu.

   KILIT_MENZIL neden MENZIL'den (150) cok kucuk: varlik taramasi
   yaricapla pahalilasiyor ve 150 blok oteki bir mob zaten
   yuklenmemis chunk'ta olur. 32 gorus mesafesiyle uyumlu.

   KILIT_SAYISI < SIMSEK_SAYISI: nisan alinmis tek hedefe 20
   yildirim gereksiz; hepsi tuttugu icin 6 fazlasiyla yetiyor.   */
export const KILIT_ACIK    = true;
export const KILIT_MENZIL  = 32;
export const KILIT_ACI     = 0.9;
export const KILIT_SAYISI  = 6;
export const KILIT_YAYILMA = 1;    // kilitliyken sacilma (normalde YAYILMA=7)

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

   BIRIM: bir "blok islemi" = getBlock ya da setType, yani tek bir
   API cagrisi. Bir blogu degistirmek IKI islem eder (once oku, sonra
   yaz), o yuzden yetenekler blok basina blokIste(2) cagiriyor.

   TICK_BLOK_BUTCESI olculerek secildi. 120 rastgele yonde atis
   yapilip ucus suresi ve tepe yuk karsilastirildi
   (orijinal: 62 tick, 33 BLOK/tick -- yani 66 islem/tick):

     28 blok (56 islem) -> ucus 62 tick (ayni), tepe yuk %15 az  <-- secilen
     24 blok (48 islem) -> ucus 80 tick (%29 YAVAS), tepe yuk %27 az
     32 blok (64 islem) -> ucus 62 tick (ayni), tepe yuk %3 az

   56'nin altina inersen top gorunur sekilde yavaslar. Tablette OLCUM
   satirindaki "maks" surekli 5ms uzerindeyse dusurmek gerekebilir.

   NOT: v4.5'e kadar burada 28 yaziyordu ama toprak_topu blok basina
   1 birim istiyordu (digerleri 2). Yani top gercekte 56 islem/tick
   yapiyordu ve olcum de o hâliyle alinmisti. v4.5'te toprak_topu
   digerleriyle ayni sayima gecti; sayi 56'ya cikarildi ki tablette
   test edilmis ucus hizi AYNEN korunsun. Gercek yuk degismedi,
   sadece rakam artik dogruyu soyluyor.                            */
export const TICK_BLOK_BUTCESI   = 56;  // tick basina blok islemi (getBlock/setType)
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

/* ---------------- Cift el (iki kol birden) ----------------
   BoraLo videolarinda iki kol ayni anda takili: hem ors yagiyor
   hem buz gidiyor. Minecraft'ta sol el (off-hand) slotu var, biz
   de onu kullaniyoruz.

     sag el (mainhand) -> kolun secili yetenegi
     sol el (offhand)  -> onun secili yetenegi
     egil + zipla      -> IKISI BIRDEN calisir

   Bunun icin "oyuncu basina tek is" kurali gevsetildi: ayni anda
   en fazla AYNI_ANDA is calisabiliyor. Butce zaten ortak oldugu
   icin iki is tick basina toplam yuku artirmiyor, sadece
   paylasiyor -- yani tablette guvenli.                          */
export const CIFT_EL_ACIK = true;
export const AYNI_ANDA    = 2;    // oyuncu basina es zamanli is tavani

/* ---------------- Cekme (kamci) ----------------
   Referans "Bobby whip": execute @s^^^2 /tp @e[r=2,c=1] @s
   Onundekini KENDINE isinliyor. Uc noktada (2/4/5) tek tek
   bakiyor -- ustelik ucuncu satirda mesafe 5 ama yaricap 6,
   yani kendi desenine de uymuyor.

   Bizimki koninin tamamini tariyor ve isinlamak yerine ITIYOR:
   isinlama duvarin icine sokabiliyor, itme fizige birakiyor.   */
export const CEKME_MENZIL = 24;
export const CEKME_ACI    = 0.7;
export const CEKME_GUC    = 2.2;   // sana dogru cekme kuvveti
export const CEKME_YUKARI = 0.45;  // biraz yukari kaldir, yere surtmesin
export const CEKME_TAVAN  = 8;
export const CEKME_OYUNCU = true;

/* ---------------- Isinlanma ----------------
   Referans "Kevin1545 (isinlanma)": tp @s ^^^8
   Duvar olsun olmasin 8 blok ileri isinliyor -- tasin icine
   girip bogulabiliyorsun. Bizimki ONCE guvenli yer ariyor:
   uzaktan yakina dogru bakip ayagin ve basin icin bos yer
   bulunan ilk noktaya gidiyor. Hicbiri uygun degilse hic
   isinlanmiyor ve sebebini soyluyor.                           */
export const ISIN_MENZIL = 12;   // en fazla kac blok ileri
export const ISIN_ADIM   = 1;    // kac blokta bir guvenli yer aransin

/* ---------------- Yetkili modu ----------------
   Referansta "Admin Olma Esyasi" vardi: op @s + herkese duyuru.
   Kendi dunyanda zaten operatorsun, yani orada bir ise yaramaz;
   asil anlami sunucuda/Realm'de. Ayni sebeple TEHLIKELI: esyayi
   eline gecirien herkes operator olur.

   Bu yuzden varsayilan KAPALI. Acmak icin bunu true yap.       */
export const YETKILI_ACIK   = false;
export const YETKILI_DUYURU = true;   // acikken herkese haber versin mi

/* ---------------- Buz mizragi ----------------
   Baktigin yone bir buz parcasi firlatir. Carptigi seye UZUN
   sureli yavaslik + zehir verir; zehir cani yavas yavas
   goturur ama OLDURMEZ (vanilla zehir 1 canda birakir) --
   yani hapsedip eritiyorsun, aninda infaz degil.

   Mizrak bizim isimiz olarak ucuyor, varlik degil: her tick
   MIZRAK_HIZ blok ilerliyor, yolda carpma araniyor. Varlik
   dogurmadigimiz icin varlik butcesi harcanmiyor ve chunk
   sinirinda kaybolma derdi yok.

   Carptigi yere buz dikiti birakiyor (gorsel), o da BUZ_SURE
   sonunda kendiliginden eriyor.                                */
export const MIZRAK_MENZIL   = 40;    // en fazla kac blok gitsin
export const MIZRAK_HIZ      = 1.5;   // her tick kac blok
export const MIZRAK_YARICAP  = 1.6;   // carpma yaricapi
export const MIZRAK_HASAR    = 6;     // carpma anindaki hasar
export const MIZRAK_ETKI     = 2400;  // yavaslik/zehir suresi (2 dakika)
export const MIZRAK_YAVASLIK = 3;     // slowness seviyesi
export const MIZRAK_ZEHIR    = 1;     // poison seviyesi
export const MIZRAK_ALAN     = 2.5;   // carpma noktasi etrafinda kac blok
export const MIZRAK_TAVAN    = 6;     // en fazla kac hedef
export const MIZRAK_OYUNCU   = true;
export const MIZRAK_DIKIT    = 4;     // carpma yerine kac blok buz dikiti
export const MIZRAK_BLOK     = "minecraft:packed_ice";

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

/* v4.10 -- Boralo Mod V2'deki yamultmadan alinanlar.

   Oradaki surum (spm_advanced_dirtarms_power_3):
     tag @p[r=8,rm=1] add Yamul
     inputpermission set @p[tag=Yamul,r=8,rm=1] movement disabled
     inputpermission set @p[tag=Yamul,r=8,rm=1] camera disabled
     playanimation @p[...] animation.sp_m_animasyon_yamulma.

   Bizimkinden IYI olan tek yani: GORSEL. Hedef gercekten
   yamulmus gibi duruyor. Bizde hic poz yoktu, sadece efekt.
   O yuzden poz alindi.

   Gerisi bizde zaten daha iyiydi:
     - onlarinki @p, yani SADECE OYUNCU. Tek kisilik dunyada
       hicbir ise yaramiyor. Bizimki moblari da yamultuyor.
     - onlarinki SURESIZ; caresi ayri bir menu kipi ("Duzel/
       Duzelt"). Kolu kaybedersen kurban sonsuza kadar kilitli.
       Bizimki sureli ve ayni yetenek tekrar kullanilinca cozuyor.
     - inputpermission camera disabled ALINMADI: kurban etrafina
       bile bakamiyor, ustelik moblarda hicbir etkisi yok.

   Kelepce silahindan (kelepcejsoenaam.js) alinan: mining_fatigue.
   Yamulan biri kazma da sallayamamali. Onlarinki 99999 saniye
   veriyordu, bizimki YAMULT_SURE kadar.                        */
export const YAMULT_KAZMA = 3;      // mining_fatigue seviyesi
export const YAMULT_ANIM  = "animation.fox.sleep a 9999";
export const YAMULT_ANIM_BITIS = "animation.humanoid.move a 0";

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
/* MENZIL ARTIK HEPSINDE AYNI. v4.11'e kadar her iksirin lazeri
   farkli uzaga gidiyordu (10/14/18/22/28 blok) ve "hangisi daha
   uzagi vuruyor" diye dusunmek gerekiyordu. Artik tek sayi;
   iksirler sadece HASAR ve YAN ETKI ile ayriliyor.            */
export const LAZER_MENZIL = 22;      // hepsi icin ortak menzil

/* ---------------- Lazerle duvar delme ----------------
   Referansta duvar kirma YOK. Aranan tek "wall" gecen yer
   "damage @e[r=3] 4 fly_into_wall" ve orasi bir HASAR TURU adi
   (elytra ile duvara carpma), blok kirmayla ilgisi yok.
   Yani bu sifirdan yazildi.

   Lazer onune cikan bloklari deliyor. Korumalar:
     - KORUNAN_KUME'deki bloklar (bedrock, sandik, komut blogu...)
       delinmiyor; yoksa dunyani ve esyalarini kaybedersin
     - blok butcesine uyuyor
     - delik yaricapi ve toplam blok sayisi sinirli
     - DUVAR_DELME_ACIK false yapilirsa lazer eskisi gibi
       sadece varliklara vuruyor                               */
export const DUVAR_DELME_ACIK   = true;
export const DUVAR_DELME_YARICAP = 1;    // delik yaricapi (1 = 3x3)
export const DUVAR_DELME_TAVAN   = 60;   // tek atista en fazla kac blok

export const LAZER_KALINLIK = 1.4;   // isindan kac blok sapma vurulur
export const LAZER_SURE     = 10;    // isin kac tick gorunur kalsin
export const LAZER_ADIM     = 1.5;   // parcacik kac blokta bir
export const LAZER_TAVAN    = 10;    // tek atista en fazla kac hedef
export const LAZER_OYUNCU   = true;  // oyunculara da vursun mu
export const PARCACIK_LAZER = "minecraft:basic_flame_particle";

/* Her kademe: kimlik, ad, sure, verilen efektler, goz esyasi.
   Efekt suresi TAZELEME'den uzun tutuluyor ki iki tazeleme
   arasinda efekt sonmesin.                                       */
/* ============================================================
   IKSIRLER -- HIYERARSI YOK

   v4.11'e kadar bes iksir bir GUC MERDIVENIYDI: nitroksin en
   zayif, hiperoksin en guclu; her basamak bir oncekinin her
   seyini daha yuksek seviyede veriyordu. Yani dordu de aslinda
   gereksizdi, hep sonuncuyu icerdin.

   v4.12'de merdiven kaldirildi. Artik alti iksirin HER BIRI
   kendi alaninda EN IYI, baska alanlarda ortalama. Hangisini
   iceceğin ne yapacagina bagli:

     Nitroksin   -> HIZ ve ZIPLAMA        (kacmak, gezmek)
     Grinoksin   -> DAYANIKLILIK          (ayakta kalmak)
     Redoksin    -> SALDIRI ve KAZMA      (vurmak, madencilik)
     Firenoksin  -> ATES                  (nether, lav, yanmamak)
     Kan Iksiri  -> VAMPIR                (vur, canini geri al)
     Hiperoksin  -> HER SEY               (hicbirinde en iyi degil)

   v4.18: ORMAN ATESI KALDIRILDI. Referansta (iksir modu
   muhammetlo mz) sp:m_forest_fire_bottle olarak vardi, biz de
   ceviri olarak eklemistik; ama "her seyden orta" olmak bir
   kimlik degil -- hicbir sebep birakmiyordu onu icmek icin.
   Kaldirildi, kalan altisi birbirinden net ayriliyor.

   Hiperoksin artik "en guclu" degil: her alandan biraz veriyor
   ama hicbir alanda uzmanini gecemiyor. Nitroksin ondan hizli,
   Redoksin ondan sert, Grinoksin ondan dayanikli.

   ---- REFERANSA GORE (iksir modu muhammetlo mz) ----
   Onunki de merdiven degildi ama sebebi tasarim degil, EKSIKLIK:
   nitroxin ile hiperoksin neredeyse ayni efektleri veriyordu
   (ikisi de instant_health + resistance + speed + strength) ve
   hepsi seviye 0-1'deydi. Ustelik GRINOXIN'IN HIC EFEKT DOSYASI
   YOK -- icince yesil bir parlama ve goz geliyor, baska hicbir
   sey olmuyor.

   Bizimkiler onun karsiliklarindan GUCLU: onun seviye 0-1
   verdigi yerde biz 2-4 veriyoruz ve her iksire kendi kimligini
   veren ek efektler koyduk. Mantik ayni (ic, sure boyunca guclen,
   gozun degissin, lazer at), sadece daha yuksek.

   ---- SURELER (v4.22) ----
   60 saniye azdi: iksiri iciyordun, bir sey yapmaya firsat
   bulamadan bitiyordu. Yeni sureler:

     Nitroksin, Grinoksin, Redoksin, Firenoksin, Kan Iksiri
                  -> 6000 tick = 5 dakika
     Hiperoksin   -> 9600 tick = 480 saniye (8 dakika)

   Hiperoksin'in daha uzun olmasi hiyerarsiyi geri getirmiyor:
   hicbir alanda hala uzman degil (hiz Nitroksin'de, vurus
   Redoksin'de, dayaniklilik Grinoksin'de). Farki artik GUCTE
   degil SUREDE -- "her seyden biraz, ama uzun sure". Bu ona
   uzmanlarin yerini almadan kendi sebebini veriyor.

   DIKKAT: bu sayilar KADEME suresidir, efekt suresi degil.
   Efektler IKSIR_TAZELEME'de (40 tick) bir yenileniyor ve her
   seferinde 120 tick veriliyor; kademe bitince elle siliniyor.
   Yani sureyi uzatmak tick maliyetini ARTIRMIYOR, sadece
   tazelemenin ne kadar sureceğini degistiriyor.

   Her kademe: kimlik, ad, renk, sure, efektler, goz esyasi.
   Efekt suresi TAZELEME'den uzun tutuluyor ki iki tazeleme
   arasinda efekt sonmesin.

   LAZER: menzil ARTIK HEPSINDE AYNI (LAZER_MENZIL). Sadece
   hasar ve yan etki iksire gore degisiyor -- "hangisi daha uzagi
   vuruyor" diye dusunmek zorunda kalma.                        */
export const KADEMELER = [
  {
    kimlik: "nitroksin",
    ad: "Nitroksin",
    renk: [1.0, 1.0, 1.0],          // beyaz
    sure: 6000,                     // 5 dakika
    goz: "pa:goz_beyaz",
    lazerGoz: "pa:goz_beyaz_lazer",
    ozet: "Hiz ve ziplama",
    lazer: { hasar: 9 },
    /* Referans: speed 0, jump_boost 0, strength 0, resistance 0,
       instant_health 0.  Bizde hiz/ziplama UZMANI.             */
    efektler: [
      ["speed",        3],   // referans 0
      ["jump_boost",   3],   // referans 0
      ["strength",     2],
      ["resistance",   1],
      ["haste",        1],
      ["absorption",   2],
      ["night_vision", 0],
      /* v4.16 buff: ziplama kimligini tamamliyor -- yuksekten atlayip yavas iniyorsun */
      ["slow_falling", 0]
    ]
  },
  {
    kimlik: "grinoksin",
    ad: "Grinoksin",
    renk: [0.0, 1.0, 0.2],          // yesil
    sure: 6000,
    goz: "pa:goz_yesil",
    lazerGoz: "pa:goz_yesil_lazer",
    ozet: "Dayaniklilik",
    lazer: { hasar: 8, zehir: true },
    /* Referansta HIC EFEKT YOK -- icince sadece parlama ve goz
       geliyor. Bizde ayakta kalma UZMANI.                      */
    efektler: [
      ["resistance",   3],
      ["regeneration", 3],
      ["absorption",   4],
      ["health_boost", 4],
      ["strength",     1],
      ["speed",        1],
      ["night_vision", 0],
      /* v4.16 buff: dayaniklilik: suda da bogulmuyorsun */
      ["water_breathing", 0]
    ]
  },
  {
    kimlik: "redoksin",
    ad: "Redoksin",
    renk: [0.8, 0.0, 0.0],          // kirmizi
    sure: 6000,
    goz: "pa:goz_kirmizi",
    lazerGoz: "pa:goz_kirmizi_lazer",
    ozet: "Saldiri ve kazma",
    lazer: { hasar: 13 },
    /* Referans: regeneration 0, speed 0, strength 0.
       Bizde vurus ve kazma UZMANI.                             */
    efektler: [
      ["strength",     4],   // referans 0
      ["haste",        4],
      ["speed",        2],
      ["regeneration", 1],
      ["absorption",   1],
      ["night_vision", 0],
      /* v4.16 buff: kazarken acikmiyorsun */
      ["saturation", 0]
    ]
  },
  {
    kimlik: "firenoksin",
    ad: "Firenoksin",
    renk: [1.0, 0.45, 0.0],         // turuncu
    sure: 6000,
    goz: "pa:goz_ates",
    lazerGoz: "pa:goz_ates_lazer",
    ozet: "Ates",
    lazer: { hasar: 10, ates: true },
    /* Referans: fire_resistance 0, speed 0, strength 0.
       Bizde ates UZMANI -- lazeri de yakiyor.                  */
    efektler: [
      ["fire_resistance", 0],
      ["strength",        3],
      ["speed",           3],
      ["resistance",      2],
      ["regeneration",    1],
      ["absorption",      2],
      ["night_vision",    0],
      /* v4.16 buff: ates blogu yumusatir gibi: daha hizli kazma (Redoksin 4 ile hala uzman) */
      ["haste", 2]
    ]
  },
  {
    kimlik: "kan_iksiri",
    ad: "Kan Iksiri",
    renk: [0.45, 0.0, 0.05],        // koyu kirmizi
    sure: 6000,
    goz: "pa:goz_kan",
    lazerGoz: "pa:goz_kan_lazer",
    ozet: "Vampir",
    lazer: { hasar: 12, canCal: true },
    /* Referansta yok, bizim. Lazeri verdigi hasarin bir kismini
       CANA CEVIRIYOR -- vampir kimligi.                        */
    efektler: [
      ["strength",     4],
      ["absorption",   4],
      ["regeneration", 2],
      ["haste",        2],
      ["speed",        1],
      ["night_vision", 0],
      /* v4.16 buff: vampir kimligi: goze gorunmuyorsun */
      ["invisibility", 0]
    ]
  },
  {
    kimlik: "hiperoksin",
    ad: "Hiperoksin",
    renk: [0.2, 0.6, 1.0],          // mavi
    sure: 9600,                     // 480 saniye (8 dakika)
    goz: "pa:goz_mavi",
    lazerGoz: "pa:goz_mavi_lazer",
    ozet: "Her seyden biraz",
    lazer: { hasar: 11 },
    /* ARTIK "EN GUCLU" DEGIL. Her alandan biraz veriyor ama
       hicbirinde uzmanini gecmiyor:
         hiz 2  < Nitroksin 3
         vurus 3 < Redoksin 4
         dayaniklilik 2 < Grinoksin 3
       Yani "ne yapacagimi bilmiyorum" iksiri.                  */
    efektler: [
      ["speed",           2],
      ["strength",        3],
      ["resistance",      2],
      ["regeneration",    2],
      ["jump_boost",      2],
      ["absorption",      3],
      ["haste",           2],
      ["fire_resistance", 0],
      ["night_vision",    0],
      /* v4.16 buff: her seyden biraz: su alti paketi de var */
      ["conduit_power", 0]
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

/* ---------------- Kasirga ----------------
   Referans (Dave1545):
     execute as @e[type=!player] at @s run tp ^5^1^1 facing @p
   Uc kusuru vardi:
     1. "^5^1^1" bosluksuz -- komut hic calismiyor
     2. tp ile tasima duvarin/tasin icine sokabiliyor
     3. yaricap yok: YUKLU BUTUN varliklar cekiliyordu, sinirdaki
        koyun bile. Sunucuyu kilitleyecek bir secici.

   Bizimki: yaricap icindeki varliklari her tick etrafinda
   DONDURUYOR (teget hiz) + yukari kaldiriyor. Isinlama yok,
   applyImpulse ile fizige birakiliyor; carpisma oyunun isi.
   Sure dolunca birakiliyorlar ve dusuyorlar.                     */
export const KASIRGA_YARICAP = 12;
export const KASIRGA_SURE    = 70;    // tick (3.5 sn)
export const KASIRGA_TAVAN   = 10;    // ayni anda en fazla kac varlik
export const KASIRGA_DONME   = 0.9;   // teget (dondurme) kuvveti
export const KASIRGA_MERKEZ  = 0.35;  // merkeze cekme kuvveti
export const KASIRGA_KALDIR  = 0.32;  // yukari kaldirma kuvveti
export const KASIRGA_TAVAN_Y = 9;     // merkezden kac blok yukari ciksin
export const KASIRGA_ARALIK  = 2;     // kac tickte bir itilsin
export const KASIRGA_OYUNCU  = false; // oyunculari da savursun mu

/* ---------------- Koruma kubbesi ----------------
   Referans (Dave1545):  fill ~~50~~50~~0barrier
   Bosluksuz, yani hic calismiyor; calissaydi da 50x50x50'lik dev
   bir barrier kupu -- 125.000 blok, tableti dondururdu.

   Bizimki: etrafina ICI BOS bir kure kabugu oruyor, sadece HAVA
   olan yerlere. Sure dolunca koydugu bloklari TEK TEK geri
   aliyor -- yani dunyada iz birakmiyor. Kabugun kendi koydugu
   yerler kayitli oldugu icin baskasinin blogunu silmiyor.       */
export const KUBBE_YARICAP = 4;
export const KUBBE_SURE    = 200;   // tick (10 sn)
export const KUBBE_BLOK    = "minecraft:barrier";

/* ---------------- Hapis ----------------
   Referans (Kevin1545):
     execute positioned ^^^10 at @e[r=10,c=1] run
       fill ~1 ~2 ~1 ~-1 ~ ~-1 iron_bars
   Sozdizimi dogru (referansta nadir) ama DOLU 3x3x3 dolduruyor --
   hedefin durdugu hucre dahil, yani kafes degil demir blogu.
   Ustelik "keep" yok (orada ne varsa siliyor).

   Referansta "iron_bars" TUM PAKETTE tek bir yerde geciyor: bu
   komutta. Yani kafesi acan hicbir sey yok -- kurdugun kafes
   sonsuza kadar duruyor, elle kirmaktan baska caresi yok.

   Bizimki ici bos kabuk oruyor, sadece havaya koyuyor ve
   ACILABILIYOR.

   HAPIS_YARICAP 1 = 3x3 taban. 2 yaparsan 5x5 olur ama kafes o
   kadar genis olunca hedef icinde dolasabiliyor.               */
export const HAPIS_MENZIL  = 24;
export const HAPIS_ACI     = 0.9;
export const HAPIS_YARICAP = 1;     // taban yaricapi (1 = 3x3)
export const HAPIS_YUKSEK  = 3;     // kac kat yuksek
export const HAPIS_BLOK    = "minecraft:iron_bars";

/* Kafes SURESIZ: kendiliginden acilmiyor, sen aciyorsun.
     onunde hedef VAR -> yeni kafes
     onunde hedef YOK -> en yakin kafesini ac

   HAPIS_TAVAN neden var: kafes suresiz oldugu icin sinir olmasa
   dunya kafesle dolar ve kayit (dunya ozelligi) sisip boyut
   sinirini asardi. Tavan dolunca yeni kafes kurulmuyor, once
   birini acman gerekiyor.

   HAPIS_AC_MENZIL: cok uzaktaki kafesi kazara acmayalim. Uzak
   blok yazimi yuklenmemis chunk'a denk gelir ve sessizce
   basarisiz olur -- kafes acildi sanip acilmamis olurdun.      */
export const HAPIS_TAVAN     = 8;    // ayni anda en fazla kac kafes
export const HAPIS_AC_MENZIL = 48;   // bu mesafeden uzaktakini acmaz

// Kafesler dunya ozelligine bu adla kaydediliyor
export const HAPIS_KAYIT_ANAHTAR = "simsek:kafesler";

/* ============================================================
   KALP EKLEME

   "Can verme" ile KARISTIRMA -- ikisi ayri is:

     can_verme  -> bos kalpleri DOLDURUR (iyilestirme, gecici)
     kalp_ekle  -> kalp SAYISINI buyutur (kalici, birikir)

   Bedrock'ta maksimum can health_boost efektiyle buyutuluyor:

     health_boost seviye N  ->  +4 CAN  x  (N + 1)
     1 KALP = 2 CAN

   Yani eklenen kalp = 2 x (seviye + 1). Bu yuzden kalpler
   CIFT sayilarla artiyor; KALP_ADIM tek sayi verilirse asagi
   yuvarlanir. Seviye tavani 255, yani motorun izin verdigi en
   fazla 512 can = 256 kalp.

   NEDEN KALP_ADIM 10: bir basista bir tam can barisi (10 kalp)
   ekleniyor -- fark hemen gorunsun diye. KALP_TAVAN 100 ise
   toplam 110 kalp eder; can bari ekranda satir satir sarilir,
   daha yukarisi okunamaz hale geliyor.

   UC TUZAK (referans modlarda hepsi var):

   1. health_boost eklenen kalpleri BOS birakir. Icince "10 kalp
      geldi" dersin ama bar bos gorunur. Bu yuzden ekledikten
      sonra can DOLDURULUYOR (health.setCurrentValue).

   2. Efekt olunce, cikip girince ve surenin sonunda SILINIR.
      Kalp sayisi bir deftere yaziliyor ve KALP_TAZELEME'de bir
      geri veriliyor; oldugunde de kalplerin duruyor.

   3. Kalici efekt geri alinamazsa oyun bozulur. KALP_SIFIRLA
      yetenegi (ve menudeki "Kalpleri sifirla") her seyi
      temizliyor. Referanstaki "effect @s health_boost 100000 255"
      geri alinamiyordu.

   KALP_SURE neden TAZELEME'nin katı: iki tazeleme arasinda efekt
   sonerse kalpler bir anligina kaybolur ve can bari zıplar.     */
export const KALP_ADIM     = 10;    // her kullanimda kac kalp eklensin
export const KALP_TAVAN    = 100;   // en fazla kac EK kalp (normal 10 haric)
export const KALP_TAZELEME = 40;    // kac tick'te bir efekt yenilensin
export const KALP_SURE     = 200;   // efekt suresi (TAZELEME x 5)
export const KALP_DOLDUR   = true;  // eklenince can tam dolsun mu

// Kalp defteri dunya ozelligine bu adla kaydediliyor
export const KALP_KAYIT_ANAHTAR = "simsek:kalpler";

/* ============================================================
   SOHBET KOMUTLARI

   NEDEN: her sey icin ayri kol yapmak israf. Kalp eklemek gibi
   SAYI isteyen isler yazarak daha dogal:  "can 10".

   SOHBET_ONEK bos birakilirsa "can 10" dogrudan calisir. Bir
   onek (orn. "!") yazarsan "!can 10" gerekir -- baskasiyla
   sohbet ederken yanlislikla komut calistirmamak icin.

   Sohbet olayi (world.beforeEvents.chatSend) her surumde
   olmayabilir; yoksa ayni komutlar
     /scriptevent simsek:komut can 10
   ile calisiyor. Ikisi de ayni cozumleyiciden geciyor.        */
export const SOHBET_ACIK = true;
export const SOHBET_ONEK = "";     // "" = oneksiz. "!" yazarsan "!can 10"

/* ============================================================
   IKSIR ICINCE LAZERI HAZIR ET

   v4.20'de gercek bir kullanim hatasi cikti: oyuncu iksir icip
   "goz lazeri atayim" dedi, etrafa YILDIRIM yagdi.

   Sebep lazerde degildi. Esyasiz jest sirasinda 34 yetenek var
   ve Goz Lazeri 21. sirada; sifirinci sira Yildirim Halkasi.
   Secim degistirmeden "egil + zipla" yapinca sifirinci calisiyor
   -- yani etrafa yildirim. Lazere ulasmak icin 21 kez
   "egil + yukari bak + bekle" yapmak gerekiyordu.

   Referans (iksir modu muhammetlo mz) bunu boyle yapmiyor:
     query.get_equipped_item_name=='nitroxin_goz_lazer'
     && query.is_using_item
   Yani iksiri icip GOZU takinca lazer zaten elinin altinda.

   Bizde karsiligi: iksir icilince esyasiz jest secimi otomatik
   olarak Goz Lazeri'ne gecer. Icersin, egil + zipla, lazer.
   Iksir bitince secim eski haline doner -- yildirim atmak
   isteyen biri iksir yuzunden secimini kaybetmesin.            */
export const IKSIR_LAZERI_SEC = true;

/* ============================================================
   BOT  --  Asama 1: var olsun, takip etsin, beklesin

   Depodaki ILK ozel VARLIK. Su ana kadar sadece esya vardi.

   ---- MIMARIYI BELIRLEYEN KISIT ----
   @minecraft/server'da YOL BULMA API'SI YOK. Script'ten bir
   varliga "su koordinata yuru" denemiyor. Elde olanlar: varlik
   JSON'undaki vanilla AI hedefleri, teleport, applyImpulse.

   Bu yuzden is bolunuyor:
     YURUMEYI  vanilla AI yapar (minecraft:behavior.follow_owner,
               kurdun/kedinin kullandigi hedef). Gercek yol bulma,
               bedava, akici.
     KURTARMAYI script yapar. Bot cok geride kaldiysa, sikistiysa
               ya da baska boyuttaysa yanina isinlanir -- vanilla
               takip bunlarin hicbirini cozmuyor.

   @minecraft/server-gametest / SimulatedPlayer KULLANILMIYOR:
   deneysel ayar istiyor, test amacli bir modul, tablette riskli
   ve dunya yeniden yuklenince yasamiyor.

   ---- BOT_ACIK bir guvenlik anahtari ----
   Bot tablette kotu davranirsa (tick sisirir, isinlanip durur)
   burasi false yapilir; modun geri kalani hic etkilenmez. Yeni
   ve riskli bir alan oldugu icin bu anahtar bilerek var.

   ---- Neden BOT_TAVAN 1 ----
   Oyuncu basina tek bot. Ikincisi tick maliyetini ikiye katlar
   ve "hangisi benimdi" karisikligi yaratir. Sonraki asamada
   bot is yapmaya baslayinca yukseltmek daha kolay olur.

   BOT_KURTARMA_MENZIL neden 24: vanilla follow_owner ~10 blokta
   yetisiyor. 24 "gercekten kaybolmus" demek; daha dusuk tutulursa
   bot normal yururken bile isinlanir ve yuruyus goruntusu bozulur.

   BOT_TARAMA neden 20: kurtarma saniyede bir bakilsa yeter.
   Her tick mesafe olcmek bos yere getEntity cagrisi demek.     */
/* ---- ASAMA 1 (v4.22): var olsun, takip etsin, beklesin ----
   Odun toplama / maden kazma SONRAKI asama. Once zor ve
   belirsiz olan kismi cozuyoruz: ozel bir varlik kaydoluyor mu
   ve duzgun takip ediyor mu.

   PLANDAN SAPMA: planda "pa:kol_bot" diye yeni bir kol vardi.
   Yapilmadi -- kullanicinin kurali "her seyi kol yapma, kol
   israfini onle". Bot SOHBETTEN yonetiliyor:
     bot          -> cagir / yanina getir
     bot bekle    -> oldugu yerde dursun
     bot takip    -> pesinden gelsin
     bot geri     -> gonder (sil)
   Ayrica bota DOKUNUNCA ayni secenekler menu olarak aciliyor.  */
export const BOT_ACIK             = true;
export const BOT_KIMLIK           = "pa:bot";
export const BOT_TAVAN            = 1;    // oyuncu basina kac bot
export const BOT_KURTARMA_MENZIL  = 24;   // bu kadar uzaklasirsa isinlanir
export const BOT_KURTARMA_YAKIN   = 2;    // isinlanirken oyuncuya kac blok uzaga
export const BOT_TARAMA           = 20;   // kac tick'te bir mesafe olculsun
export const BOT_CAGIR_YAKIN      = 3;    // "yanima gel" mesafesi
export const BOT_DOGUM_YAKIN      = 2;    // yeni bot kac blok yana dogsun

/* Botun sahibi IKI yere birden yaziliyor:
     - dunya ozelligi (BOT_KAYIT_ANAHTAR): [[oyuncuId, botId], ...]
     - varligin kendi ozelligi (BOT_SAHIP_OZELLIK)
   Ikincisi yedek: dunya kaydi bozulur ya da silinirse bot
   sahipsiz kalmasin, dokununca kendini yeniden baglasin.       */
export const BOT_KAYIT_ANAHTAR    = "simsek:botlar";
export const BOT_SAHIP_OZELLIK    = "simsek:sahip";
export const BOT_DURUM_OZELLIK    = "simsek:durum";   // "takip" | "bekle"

/* Varlik JSON'undaki olay adlari. Script bunlari triggerEvent
   ile calistiriyor; JSON'daki "events" bolumuyle AYNI olmali.  */
export const BOT_OLAY_TAKIP       = "pa:takip";
export const BOT_OLAY_BEKLE       = "pa:bekle";

/* Vanilla follow_owner bir SAHIP ister; sahip tameable.tame()
   ile atanir. O cagri her surumde ayni sekilde olmayabilir, o
   yuzden ozellik tespitiyle deneniyor. Basarisiz olursa script
   kendi takibine gecer: BOT_SCRIPT_MENZIL'den uzaklasinca
   isinlaniyor. Kaba ama HER surumde calisiyor.

   Iki menzil ayri:
     BOT_KURTARMA_MENZIL (24) vanilla takip calisirken sadece
       "gercekten kayboldu" durumu icin.
     BOT_SCRIPT_MENZIL (8) vanilla takip YOKKEN, botun yaninda
       kalmasi icin. Daha kucuk cunku tek kurtaran o.           */
export const BOT_SCRIPT_MENZIL    = 8;

/* ---------------- Dondur ----------------
   Referans (Kevin1545 "kol koparma"):
     playanimation @e [r=10,c=1] animation.evoker.general a 999
   "@e [r=..." arasindaki BOSLUK yuzunden hic calismiyor. Calissa
   bile sadece poz oynatirdi; hedef poz icinde yurumeye devam
   ederdi. Burasi pozu koruyup hedefi gercekten yerinde tutuyor.

   DONDUR_YAVASLIK 5 = slowness VI, pratikte yerinden kimildamaz.
   Referanstaki gibi 255 ve KALICI degil -- sure dolunca serbest.

   Etki DONDUR_ARALIK'ta bir tazeleniyor; is yarida kesilirse
   hedef saatlerce degil, en fazla bir aralik kadar kilitli kalir. */
export const DONDUR_MENZIL   = 24;
export const DONDUR_ACI      = 0.9;
export const DONDUR_SURE     = 200;  // tick (10 sn)
export const DONDUR_YAVASLIK = 5;    // slowness seviyesi
export const DONDUR_ARALIK   = 20;   // etki kac tickte bir tazelensin
export const DONDUR_ANIM     = "animation.evoker.general a 999";


/* ---------------- Menu (@minecraft/server-ui) ----------------
   Fikir Gunes modundan: esyayi EGILEREK kullaninca menu acilir,
   normal kullaninca secili yetenek calisir. Toprak Kol'da sekiz
   yetenek var; sekizinciye jestle gecmek yedi kez "egil + yukari
   bak + bekle" demekti. Menu bunu tek dokunusa indiriyor.

   KAPATIRSAN hicbir sey kaybolmaz: jestle secim aynen calisir.
   Modul yuklenemezse de kendiliginden kapaniyor.               */
export const MENU_ACIK = true;

/* Menu NASIL acilir?

   true  (varsayilan): kola DOKUNMAK menuyu acar. Tablette en
         kolay hareket bu; egilme dugmesini basili tutmaya gerek
         yok. Menuden yetenek secince HEMEN calisiyor, yani
         ikinci bir jest de gerekmiyor.

   false: v4.13 oncesi davranis -- dokunmak secili yetenegi
         calistirir, EGILEREK dokunmak menuyu acar.

   Iki durumda da jestler aynen duruyor: egil+zipla calistirir,
   egil+yukari bak degistirir.                                 */
export const MENU_DOKUNUSLA = true;

/* ---------------- Isin topu ----------------
   Fikir Gunes modundan ("Sari Particle At" + "Yesil Top"):
   script ile ilerleyen, onunu tarayan mermi. Referansta her atis
   kendi runInterval'ini aciyordu (butcesiz, ust uste binen) ve
   oyuncu cikinca durmuyordu; burasi merkezi is listesinde.

   ISINTOP_DELIP_GECER false: ilk hedefte durur (referans gibi).
   true yaparsan sirayla ISINTOP_TAVAN hedefe kadar deler.      */
export const ISINTOP_HAZIRLIK       = 20;   // elinde toplanma suresi (tick)
export const ISINTOP_MENZIL         = 40;   // en fazla kac blok gitsin
export const ISINTOP_HIZ            = 1.2;  // her tick kac blok ilerlesin
export const ISINTOP_YARICAP        = 1.2;  // carpma tarama yaricapi
export const ISINTOP_HASAR          = 7;
export const ISINTOP_DELIP_GECER    = false;
export const ISINTOP_TAVAN          = 3;    // delip gecerken en fazla kac hedef
export const ISINTOP_PARCACIK       = "minecraft:basic_flame_particle";

/* Vardigi yerde patlasin mi. TNT'nin gucu 4 -- PATLAMA_GUCU ile
   ayni sayi, yani toprak topunun sonundaki patlamayla esit.
   Referansta (Gunes modu "Sari Particle At") patlama yoktu,
   sadece hasar veriyordu.

   breaksBlocks true: gercek TNT gibi blok kiriyor. Kendi
   ussunu havaya ucurmak istemiyorsan false yap.               */
export const ISINTOP_PATLAR      = true;
export const ISINTOP_PATLAMA     = 4;      // TNT ile ayni guc
export const ISINTOP_BLOK_KIRAR  = true;
export const ISINTOP_HAZIR_PARCACIK = "minecraft:redstone_ore_dust_particle";

/* ---------------- Gunes yumrugu ----------------
   Fikir Gunes modundan ("Kirmizi Yumruk"): acikken vurdugun her
   seye ek hasar. Referansta KALICIYDI -- kapatmayi unutursan
   oyunun sonuna kadar acik kaliyordu. Burasi sureli.

   DIKKAT: ek hasar entityHurt icinde veriliyor ve verilen hasar
   yeni bir entityHurt uretiyor. Referansta bu korumasizdi;
   yumruk.js'te "kendiHasarimiz" bayragi sonsuz donguyu kesiyor. */
export const YUMRUK_SURE     = 200;   // tick (10 sn)
export const YUMRUK_HASAR    = 5;     // normal vurusun USTUNE
export const YUMRUK_PARCACIK = "minecraft:critical_hit_emitter";


/* ---------------- Yakala / Birak ----------------
   Fikir Boralo Mod V2'deki "Mob Picker"dan. Adi Mob Picker ama
   kodu SADECE OYUNCU yakaliyor, moba hic dokunmuyor -- adiyla
   yaptigi is tutmuyor. Burada tersi: mob yakalaniyor, oyuncu
   yakalanmiyor.

   Referans kurbani 200 blok yukari isinlayip 5 tick'te bir oraya
   GERI isinliyordu; ustelik yakalayan oyuncu cikinca temizlik hic
   calismiyor, kurban sonsuza kadar orada kaliyordu. Burada
   yakalanan varlik dunyadan aliniyor ve TURU kaydediliyor:
   tutarken hicbir tick maliyeti yok.

   NE KAYBOLUYOR: birakinca yeni bir varlik doguyor, yani
   evcillestirme/envanter gibi ayrintilar korunmuyor. Script
   API'de NBT kopyalama yok.                                    */
export const YAKALA_MENZIL       = 12;
export const YAKALA_ACI          = 0.85;
export const YAKALA_BIRAK_MENZIL = 24;
export const YAKALA_PARCACIK     = "minecraft:large_explosion";
export const YAKALA_KAYIT_ANAHTAR = "simsek:cep";

/* Yakalanamayanlar. Oyuncu ayrica kodda ozel olarak engelli.
   Bosslar disarida: ejderi cebe atip baska dunyaya tasimak
   oynanisi bozar.                                             */
export const YAKALA_YASAK = [
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:lightning_bolt",
  "minecraft:arrow",
  "minecraft:tnt",
  "minecraft:falling_block"
];

/* ---------------- Coklu simsek ----------------
   Fikir Boralo Mod V2'deki "Astrape Weapon"dan. Oradaki en iyi
   ayrinti MIN MESAFE: 4 bloktan yakindakini vurmuyor, boylece
   yildirimin alan hasarindan kendin yanmiyorsun. alan_simsegi'nde
   bu yok -- o yaricaptaki herkesi vuruyor.

   Referansta bekleme Date.now() ile, yani DUVAR SAATIYLE
   tutuluyordu; oyun duraklayinca ya da tick dusunce oyunla
   alakasi kalmiyordu. Bizde bekleme main.js'in ortak yolunda ve
   system.currentTick ile.                                      */
export const COKLU_MENZIL    = 15;
export const COKLU_EN_YAKIN  = 4;    // bundan yakindakini VURMAZ
export const COKLU_HEDEF     = 3;    // en fazla kac hedef
export const COKLU_ARALIK    = 3;    // yildirimlar arasi tick
export const COKLU_OYUNCU    = false;
export const COKLU_MUAF = [
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:lightning_bolt"
];


/* ---------------- Icme parlamasi ----------------
   Fikir "iksir modu muhammetlo mz"den: iksiri icince ekran o
   iksirin renginde parliyor (camera fade). Bizde hic gorsel
   yoktu -- iciyordun, sadece sohbete satir dusuyordu.

   REFERANSTAKI HATA: fade rengi 0.0-1.0 araliginda olmali.
   Ayni pakette firenoxin "color 1 0.5 0" ve grinoxin
   "color 0.0 1.0 0.0" DOGRU yaziyor ama redoxin "color 255 0 0",
   nitroxin "color 255 255 255" yaziyor -- aralik disi. Yani
   kirmizi iksir kirmizi degil BEYAZ parliyor. Bizdeki renkler
   KADEMELER tablosunda, hepsi 0.0-1.0.

   AYRICA ALINMADI: referans her icme fonksiyonunun basinda
   "gamerule sendcommandfeedback false" ve "commandblockoutput
   false" calistiriyor. Bunlar DUNYA AYARI; iksir icmek dunyanin
   ayarini kalici degistirmemeli, ustelik geri de almiyor.      */
export const PARLAMA_ACIK  = true;
export const PARLAMA_GIRIS = 0.2;   // saniye, kararma
export const PARLAMA_TUT   = 0.3;   // saniye, sabit kalma
export const PARLAMA_CIKIS = 0.6;   // saniye, acilma


/* ---------------- Ok yagmuru ----------------
   Fikir "En Iyi BoraLo Modu V15"teki okyamuru.mcfunction'dan:
     summon arrow ^0^7^10 ... 25 satir, 5x5 izgara

   Referansin dort hatasi:
     1. "^0^7^10" bosluksuz -- komut hic calismiyor
     2. izgara ^0..^4 arasi, yani hepsi TEK YANA; baktigin yere
        degil, sagina bir duvar oluyor
     3. "summon arrow" ile dogan okun HIZI YOK -- oldugu yerde
        belirip dusuyor. Gercek yagmur icin asagi hiz gerekiyor.
     4. 25 ok tek tick'te doguyor, butce yok

   OK_HIZ: asagi dogru baslangic hizi. 1.2 civari gercek bir yay
   okuna yakin duruyor; dusurursen tembel tembel suzuluyor.    */
export const OK_MENZIL  = 40;    // baktigin nokta en fazla kac blok oteye
export const OK_SAYISI  = 25;    // referanstaki 5x5 ile ayni sayi
export const OK_YAYILMA = 3.5;   // hedefin etrafina kac blok sacilsin
export const OK_YUKSEK  = 12;    // hedefin kac blok ustunde dogsun
export const OK_GRUP    = 3;     // her partide kac ok
export const OK_ARALIK  = 2;     // partiler arasi tick
export const OK_HIZ     = 1.2;   // asagi dogru baslangic hizi

/* ---------------- Sarsinti ----------------
   Fikir "En Iyi BoraLo Modu V15"teki shadowstaffozlelik'ten:
     execute @s^^^6 /camerashake add @e[r=6,c=1] 4

   Hasar yok, olum yok -- sadece karsidakinin ekranini sallayip
   nisan almasini zorlastiriyor.

   Referansin hatalari:
     1. "@s^^^6" bosluksuz -- calismiyor
     2. "c=1" en yakini seciyor ama @e OYUNCUYU DA sayiyor, yani
        cogu zaman KENDI ekranini sarsiyorsun
     3. camerashake yalnizca OYUNCUDA calisiyor; @e moblari da
        tarayip bosa donuyor
     4. sure verilmemis (varsayilan 1 sn) ve siddet 4, yani tavan

   SARS_SIDDET tavani 4. 4 gercekten cok sert -- 1.6 rahatsiz
   edici ama oynanabilir. Arkadasini denemek icin 3 yap.

   DIKKAT: camerashake mobda calismaz. Tek kisilik dunyada bu
   yetenek ise yaramaz; arkadasinla oynarken anlamli.          */
export const SARS_MENZIL    = 16;
export const SARS_ACI       = 0.8;
export const SARS_SIDDET    = 1.6;   // 0-4 arasi, 4 tavan
export const SARS_SURE      = 2.5;   // saniye
export const SARS_TAVAN     = 5;     // en fazla kac oyuncu
export const SARS_PARCACIK  = "minecraft:sonic_explosion";

/* ---------------- Dunya yukseklik sinirlari ----------------
   heightRange okunamazsa bu tablo kullanilir.                      */
export const YUKSEKLIK_TABLO = {
  "minecraft:overworld": { min: -64, max: 319 },
  "minecraft:nether":    { min: 0,   max: 127 },
  "minecraft:the_end":   { min: 0,   max: 255 }
};
