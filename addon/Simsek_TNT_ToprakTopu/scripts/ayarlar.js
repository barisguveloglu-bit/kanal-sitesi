/* ============================================================
   AYARLAR
   Butun sabit sayilar burada. Baska dosyada sabit tanimlama.
   ============================================================ */

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni tutulmali.
export const SURUM = "v4.56";

/* ============================================================
   BETA MODULU  --  DENENDI, GERI ALINDI (v4.26)

   v4.24'te manifest'te @minecraft/server "2.0.0-beta" olarak
   istendi. Sonuc: OYUNDA HICBIR SEY CALISMADI. Kollar gelmedi,
   jestler islemedi, bot yok, menu yok -- yani script modulu hic
   yuklenmedi ve paketin tamami oldu.

   Kullanicinin dunyasinda "Beta API'ler" anahtari ACIKTI. Yani
   anahtar yetmiyor: istenen beta SURUMU o yapida bulunmuyor.
   Oyun v26.44 / protokol 12168; hangi beta surumunu sundugu
   disaridan bilinmiyor ve script hic calismadigi icin ICERIDEN
   de sorulamiyor (modul yuklenmezse kod da yuklenmez).

   Yanlis surum yazmanin cezasi "ozellik calismaz" degil "paket
   olur" oldugu icin BIR DAHA TAHMIN EDILMEYECEK. Kararli surume
   donuldu:  @minecraft/server 2.0.0

   BUNUN MALIYETI: world.beforeEvents.chatSend yalnizca beta
   modulunde var, yani sohbete "bot" yazmak calismiyor. Yerine
   IKI yol var ve ikisi de kararli API'de:
     1. MENU  -- kola dokun, listeden sec (tablette en hizlisi)
     2. /scriptevent s:k bot   (kisa takma ad, asagida)

   Beta'yi tekrar denemek istersek once o yapinin hangi beta
   surumunu sundugunu OGRENMEK gerekiyor; kor deneme paketi
   olduruyor.
   ============================================================ */
export const BETA_GEREKLI = false;

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
   olcum ve hata satirlari sohbete de dusuyor.

   v4.23: OLCUM_SOHBETE KAPATILDI. Oyun ici goruntude sohbetin
   tamami [OLCUM] satirlariyla dolmustu ve gercek mesajlar
   (bot cevaplari, iksir bildirimleri) arada kayboluyordu. Olcum
   Content Log'a yazilmaya devam ediyor; tablette bakmak
   isteyince buradan tekrar acilir.

   HATA_SOHBETE ACIK kaliyor: hatalar seyrek ve gormek gerekiyor. */
export const OLCUM_ACIK        = true;
export const OLCUM_SOHBETE     = false;  // v4.23: sohbeti dolduruyordu
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

/* ---------------- Can verme: KALDIRILDI (v4.33) ----------------
   CAN_* ayarlari ve can_verme yetenegi tamamen silindi.

   Gerekce kullanicinin kendi sozu: "zaten hem kalp ekleme var,
   hem de iksir icince onun 4-5 kati sureyle yenilenme geliyor;
   artik gereksizlesti."

   Rakamlar da onu dogruluyordu:
     can_verme  ->  200 tick (10 sn) yenilenme
     iksirler   -> 6000 tick (300 sn) yenilenme
     kalp ekle  -> KALICI ek kalp
   Ayni ihtiyacin uc karsiligi vardi; en zayifi olan gitti.

   Not: bu blokta bir de CAN_DUSMAN (dusman mob listesi) vardi.
   Baska hicbir yerde kullanilmadigi icin o da silindi; dusman
   ayrimi gerekirse geri eklenir.                                */


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

   Iyilestirme ile KARISTIRMA -- ikisi ayri is:

     iksirler   -> bos kalpleri DOLDURUR (yenilenme, 300 sn)
     kalp_ekle  -> kalp SAYISINI buyutur (kalici, birikir)

   (v4.33'e kadar burada ucuncu bir yol vardi: can_verme. 10
   saniyelik yenilenme veriyordu, yani iksirin otuzda biri --
   kaldirildi.)

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

   ---- BOT_TAVAN: 1 -> 20 (v4.27) -> 30 (v4.43) ----
   20 sayisi ihtiyata dayaniyordu, olcume degil. Tablette
   denendi: yirmi bot birden yaninda dolasirken HIC takilma
   yok. Sasirtici degil -- bot sayisi tick yukunu artirmiyor,
   blok butcesi paylasiliyor. 30'a cikarildi.
   Asama 1'de tek bottu. Artik 20.

   DURUST UYARI: 20 bot SCRIPT maliyetini pek artirmiyor -- blok
   butcesi ORTAK, yani yirmi bot da 56 islem/tick'i paylasiyor,
   toplam yuk sabit. Isler sadece yavaslar.

   Asil maliyet VANILLA tarafinda: her bot yol bulan bir mob.
   Yirmi mob birden pesinden kosarken tablet zorlanabilir ve bunu
   biz olcemiyoruz (script disi). Tablette takilma olursa once
   bot sayisini dusur, ayarlarla ugrasma.

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
export const BOT_TAVAN            = 30;   // oyuncu basina kac bot
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

/* ============================================================
   BOT ISLERI  --  Asama 2 (v4.27): odun topla, maden kaz

   ---- NEDEN BOTUN ETRAFINDA CALISIYOR ----
   Bedrock'ta yol bulma API'si yok: bota "su agaca git" denemiyor.
   O yuzden bot KENDI etrafindaki bloklari isliyor. Sen ormana
   yuruyorsun, bot pesinden geliyor (vanilla takip), "odun topla"
   diyorsun, etrafindakini kesiyor. Referans modlar da tam olarak
   boyle calisiyor -- botu yurutuyor gibi gorunen sey aslinda bu.

   ---- ARAMA UCUZ OLMAK ZORUNDA ----
   Yaricap 6'lik bir kutuda 2000+ blok var; her tick hepsini
   okumak tableti oldururdu. Iki sey yapiliyor:

     1. Offset listesi MODUL YUKLENIRKEN bir kez hesaplaniyor ve
        mesafeye gore siralaniyor (once yakin bloklar).
     2. Tarama IMLECLI: her tick butcenin verdigi kadar blok
        okunuyor, kaldigi yerden devam ediyor. Butce bitince
        sonraki tick'e sarkiyor.

   ---- ODUN: GOVDE TAKIBI ----
   Agac ararken kure taramak israf; govde DIKEY. Once bot
   hizasinda yatay bir disk taraniyor, bir kutuk bulununca
   "tirmanma" moduna geciliyor ve o sutun yukari dogru
   kiriliyor. Gercek odun kesme de boyle.

   ---- ESYA NEREYE GIDIYOR ----
   Blok setType("air") ile kaldiriliyor; bu esya DUSURMEZ, o
   yuzden karsiligi elle sahibin envanterine konuyor. Envanter
   doluysa botun yanina dusuruluyor -- kaybolmasin.

   Kutuk bloklarinin esya kimligi kendisiyle AYNI (oak_log ->
   oak_log). Cevherlerde degil (iron_ore -> raw_iron), o yuzden
   maden icin ayri bir eslesme tablosu var.                     */
export const BOT_IS_ACIK      = true;
export const BOT_IS_SURE      = 6000;  // is en fazla kac tick sursun (5 dk)
export const BOT_IS_YARICAP   = 6;     // botun etrafinda kac blok
export const BOT_ODUN_YUKSEK  = 12;    // govde takibinde en fazla kac blok yukari
export const BOT_MADEN_DERIN  = 6;     // maden ararken kac blok asagi
export const BOT_IS_BOT_BASI  = 8;     // tek tick'te tek bota en fazla kac islem

/* ============================================================
   BOT CALISIRKEN DURUYOR  (v4.31)

   v4.30'a kadar bot calisirken de SENI TAKIP EDIYORDU ve bu iki
   sorun birden yaratiyordu:

   1. HICBIR SEY TOPLANMIYORDU. Tarama imleci, bot her blok yer
      degistirdiginde sifirlaniyordu. Bot pesinden kostugu icin
      surekli hareket halinde -- yani imlec hep 0'a doeuyor ve
      bot sadece EN YAKIN ~8 offseti tekrar tekrar tariyordu.
      Uzaktaki agaclara hic sira gelmiyordu. Ara sira dibindeki
      bir kutuk kirildigi icin "odun kendi kendine kiriliyor"
      gibi gorunuyordu ama canta bos kaliyordu.

   2. GORUNMUYORDU. Bot yaninda yuruyor, agac uzakta kiriliyor.
      Kullanici "botun onu yaptigini gormem gerek" dedi -- hakli,
      ortada calisan bir bot goruntusu yoktu.

   Ikisinin de cozumu ayni: bot ise baslayinca DURUYOR, isi
   bitince takibe geri donuyor. Duran bot hem imleci sifirlamiyor
   (yani gercekten tariyor) hem de nerede calistigi belli oluyor.

   BOT_IS_MERKEZ_KAYMA: durmasina ragmen bot birkac blok itilirse
   (fizik, mob carpmasi) tarama bastan baslamasin. Ancak bu kadar
   kayarsa yeniden merkezleniyor.                                */
export const BOT_IS_DURARAK      = true;
export const BOT_IS_MERKEZ_KAYMA = 3;    // bu kadar kayinca yeniden merkezle

/* Calisirken gorsel geri bildirim. Blok kirilinca botun ve
   blogun oldugu yerde parcacik cikiyor -- "bot calisiyor"
   goruntusu icin. PARCACIK_TOPRAK bu pakette zaten kullaniliyor,
   yani var oldugu biliniyor.                                    */
export const BOT_IS_PARCACIK     = true;
export const BOT_IS_SES          = "dig.wood";   // bos birakirsan ses yok

/* Ilerleme bildirimi: kac blok kirdigini ara ara yazar ki
   calistigi belli olsun. 0 = kapali.                            */
export const BOT_IS_RAPOR_ARALIK = 100;  // tick

/* ============================================================
   DERIN TARAMA  (v4.32)

   Istek: "madenlerde 10 dakika boyunca kazim yapsin... Elmas
   getir dedigimde... elmasin olmasi cok dusuk... ardindan
   cesitli yerlere baksin... verdigim zorluga gore is dakikasi
   artsin... yanimda odun var odun topla dedigimde hemen yapar
   ama Elmas bul 64 tane dedigimde is dakikasi artsin."

   Normal "bot maden" ile FARKI uc tane:

   1. HEDEFI VAR. "elmas 64" dersen bot 64 elmas bulana kadar
      calisir. Normal is sadece sureye bakar, ne buldugu onemli
      degildir.

   2. SURE ZORLUKTAN CIKAR. Elle girilmiyor, hesaplaniyor:
        sure = TABAN + adet * zorluk * PARCA_TICK   (EN_UZUN'a kadar)
      Yani "odun 64" bir buçuk dakika, "elmas 64" sekiz buçuk
      dakika, "netherit 64" tam on dakika surer. Istenen adet
      ERKEN bulunursa is HEMEN biter -- sure bir TAVAN, zorunlu
      bir bekleme degil.

   3. DURAK DURAK GEZER. Normal is botun durdugu yeri tarar ve
      biter. Derin tarama bir daireyi bitirince BIR SONRAKI
      DURAGA gecer: altin acili sarmal uzerinde yana, ve
      cevherin gercek Y seviyesine dogru asagi. Yani bot
      gercekten madene iniyor ve yol ustundeki komuru, demiri
      de topluyor.

   ---- NEDEN ISINLANIYOR ----
   Bedrock'ta yol bulma API'si YOK (bkz. _bot_defteri.js).
   Bota "su magaraya yuru" denemez. Duraga isinlanmak bunun tek
   calisan karsiligi. Varis noktasi tas doluysa iki blok
   aciliyor -- madenci zaten tunel kazar.

   ---- Y SEVIYELERI ----
   1.18 sonrasi dagilima gore, cevherin EN SIK bulundugu yukseklik.
   Bot bu seviyeye tek hamlede degil DERIN_Y_ADIM'lik basamaklarla
   iniyor; boylece inis yolundaki cevherleri de goruyor.
   Zumrut sadece dag biyomunda cikar, kuvars ve ancient_debris
   sadece Nether'da: o boyutta degilsen bot bos doner ve bunu
   soyler -- uydurma yapmiyor.                                   */
export const DERIN_ACIK        = true;
export const DERIN_TABAN_SURE  = 1200;   // her iste en az bu kadar (1 dk)
export const DERIN_EN_UZUN     = 12000;  // tavan: 10 dakika
export const DERIN_PARCA_TICK  = 20;     // adet * zorluk * bu = ek sure
export const DERIN_VARSAYILAN  = 64;     // adet soylenmezse
export const DERIN_ADET_TAVAN  = 640;    // canta tavaniyla ayni

export const DERIN_YARICAP     = 7;      // bir duraktaki tarama yaricapi
export const DERIN_DERINLIK    = 4;      // durakta kac blok asagi/yukari
export const DERIN_DURAK_ADIM  = 14;     // duraklar arasi yatay mesafe
export const DERIN_DURAK_TAVAN = 60;     // en fazla kac durak gezilsin
export const DERIN_DURAK_SURE  = 400;    // bir durakta en fazla kac tick
export const DERIN_Y_ADIM      = 16;     // durak basina en fazla kac blok in
export const DERIN_ISINLA      = true;   // duraga isinlansin mi
export const DERIN_TUNEL       = true;   // varis noktasi doluysa 2 blok ac
export const DERIN_DONUS       = true;   // is bitince yanina donsun
export const DERIN_YOL_USTU    = true;   // yolda rastladigi cevheri de al
export const DERIN_RAPOR       = 200;    // ilerleme bildirimi araligi (tick)

/* Isinlanirken bu bloklarin ustune inme: bot 25 canli, lav
   onu oldurur ve cantasi da yaninda gider.                     */
export const DERIN_TEHLIKELI = new Set([
  "minecraft:lava", "minecraft:flowing_lava", "minecraft:fire",
  "minecraft:soul_fire", "minecraft:magma", "minecraft:campfire"
]);

/* Turkce ad -> hedef.
     esya    : cantaya girecek esya kimligi (odun icin ozel)
     zorluk  : sure carpani. Ne kadar nadirse o kadar buyuk.
     y       : cevherin en sik bulundugu yukseklik (yoksa inme yok)
     boyut   : sadece bu boyutta cikar (yoksa her yerde)
     odun    : true ise kutuk kumesi kullanilir, cevher tablosu degil

   Zorluk degerleri oyunun kendi dagilimindan: komur her yerde,
   elmas dar bir bantta ve seyrek, ancient_debris en zoru.       */
export const DERIN_HEDEFLER = new Map([
  ["odun",     { ad: "odun",     esya: "minecraft:oak_log",     zorluk: 0.4,
                 odun: true }],
  ["komur",    { ad: "komur",    esya: "minecraft:coal",        zorluk: 0.6, y: 50 }],
  ["bakir",    { ad: "bakir",    esya: "minecraft:raw_copper",  zorluk: 1,   y: 48 }],
  ["demir",    { ad: "demir",    esya: "minecraft:raw_iron",    zorluk: 1.2, y: 16 }],
  ["kuvars",   { ad: "kuvars",   esya: "minecraft:quartz",      zorluk: 1.5, y: 20,
                 boyut: "minecraft:nether" }],
  ["redstone", { ad: "redstone", esya: "minecraft:redstone",    zorluk: 2,   y: -58 }],
  ["lapis",    { ad: "lapis",    esya: "minecraft:lapis_lazuli", zorluk: 2.5, y: 0 }],
  ["altin",    { ad: "altin",    esya: "minecraft:raw_gold",    zorluk: 3,   y: -16 }],
  ["elmas",    { ad: "elmas",    esya: "minecraft:diamond",     zorluk: 7,   y: -59 }],
  ["zumrut",   { ad: "zumrut",   esya: "minecraft:emerald",     zorluk: 8,   y: 100 }],
  ["netherit", { ad: "netherit", esya: "minecraft:ancient_debris", zorluk: 10, y: 15,
                 boyut: "minecraft:nether" }],
  /* Dismont: "elmas gibi ama bulmasi asiri zor" (v4.50).
     Zorlugu netheritin ustunde -- yani derin tarama bunu
     istedigin an tavan sureye (DERIN_EN_UZUN) dayaniyor.
     Bilincli: mezar anahtarinin kolay bulunmasi zinciri
     anlamsiz kilardi.                                        */
  ["dismont",  { ad: "dismont taşı", esya: "pa:dismont",     zorluk: 14,  y: -59 }],
  /* Hedef soylenmezse: ne cikarsa. Sadece sure hesabi icin
     zorlugu var, sayimda BUTUN cevherler sayilir.              */
  ["maden",    { ad: "maden",    esya: undefined,               zorluk: 1.5, y: -16 }]
]);

/* Kullanicinin yazabilecegi butun yazimlar -> DERIN_HEDEFLER
   anahtari. Sadelestirilmis (kucuk harf, Turkce harfsiz) hali.  */
export const DERIN_ADLAR = new Map([
  ["dismont", "dismont"], ["dismonttasi", "dismont"], ["dismont tasi", "dismont"],
  ["odun", "odun"], ["agac", "odun"], ["kutuk", "odun"], ["tahta", "odun"],
  ["komur", "komur"], ["coal", "komur"],
  ["bakir", "bakir"], ["copper", "bakir"],
  ["demir", "demir"], ["iron", "demir"],
  ["kuvars", "kuvars"], ["quartz", "kuvars"],
  ["redstone", "redstone"], ["kizil", "redstone"], ["kirmizitas", "redstone"],
  ["lapis", "lapis"], ["lacivert", "lapis"], ["lazuli", "lapis"],
  ["altin", "altin"], ["gold", "altin"],
  ["elmas", "elmas"], ["diamond", "elmas"], ["pirlanta", "elmas"],
  ["zumrut", "zumrut"], ["emerald", "zumrut"],
  ["netherit", "netherit"], ["netherite", "netherit"], ["debris", "netherit"],
  ["moloz", "netherit"], ["ancient", "netherit"],
  ["maden", "maden"], ["cevher", "maden"], ["hepsi", "maden"], ["nevarsa", "maden"]
]);

/* ============================================================
   BOT CANTASI ve TESLIM  (v4.28)

   Istek: "botlarin odun topladiktan sonra odunu bana vermeleri
   lazim". v4.27'de esya zaten dogrudan envantere giriyordu ama
   gorunmuyordu -- ne kadar topladigini ancak is bitince
   ogreniyordun ve envanter doluysa sessizce yere dusuyordu.

   Artik toplanan sey once EKIP CANTASINA giriyor, sonra topluca
   teslim ediliyor:
     - is bitince otomatik
     - canta dolunca otomatik (kaybolmasin)
     - "bot teslim" deyince elle

   CANTA NEDEN BOT BASINA DEGIL EKIP BASINA: yirmi bot ayri ayri
   canta tutsaydi hem kayit uzardi hem de "hangi bot ne tasiyor"
   diye bir soru cikardi. Oynanista bir faydasi yok -- sen tek
   bir yigin aliyorsun.

   Kayit kisa tutuluyor: "minecraft:" oneki atiliyor, kalan
   "oak_log:12,raw_iron:3" gibi duruyor.                        */
export const BOT_CANTA_TAVAN  = 640;   // ekip cantasinda en fazla kac parca
export const BOT_TESLIM_MENZIL = 32;   // bu mesafeden uzaktaki bot teslim edemez

/* ============================================================
   BOT SAVASI  (v4.28)

   Istek: "kopek gibi olsun -- birine vurdugun zaman ona
   saldiriyor". Vanilla kurdun kullandigi UC davranis:
     owner_hurt_target     sen vurdun -> bot saldirir
     owner_hurt_by_target  sana vuruldu -> bot saldirir
     hurt_by_target        bota vuruldu -> karsilik verir

   Ucu de varlik JSON'unda, pa:savas grubunda. Script sadece
   grubu acip kapiyor (pa:savas_ac / pa:savas_kapat olaylari).

   NEDEN KAPATILABILIR: ormanda odun toplarken botun her koyuna
   saldirmasi istenmez. Varsayilan ACIK, kurtta da oyle.       */
/* ---------------- Yerden esya toplama (v4.33) ----------------
   Bot varlik JSON'unda behavior.pickup_items tasiyor: yerdeki
   esyayi kendisi alip kendi kutusuna koyuyor, botTara() da o
   kutuyu ekip cantasina bosaltiyor.

   Fikir uc referans modun ortak yaninden geldi: hepsinde
   karakterler koylu klonuydu ve koyluler yerdeki esyayi toplar.
   Onlarda bu bir YAN ETKIYDI; burada bilincli bir ozellik --
   sen blok kirarken dusen esyayi bot topluyor.

   Kapatmak icin false yeter; varlik JSON'undaki bilesen kalir
   ama esya botun kutusunda birikir (ve teslimde gelmez).       */
export const BOT_YERDEN_TOPLA = true;

/* ============================================================
   ILKEL BESLI  (v4.34)

   Kullanicinin getirdigi liste bes PATRONDU: sana saldiran,
   seni korlestiren, kendini iyilestiren bes dusman. Istek
   "bunlar benim kisisel botlarim olacak" oldu -- yani ayni
   guclerle ama SENIN yaninda.

   ---- NE DEGISTI, NE DEGISMEDI ----
   Sayilarin hicbirine dokunulmadi: canlar, hasarlar, iyilesme
   miktarlari, efekt seviyeleri ve sureleri listedekiyle birebir
   ayni. Degisen tek sey HEDEF: listede "oyuncuya Yavaslik III
   verir" yazan yerlerde artik botun VURDUGU seye veriliyor.
   Kendi botun seni korlestirseydi ozellik degil ceza olurdu.

   ---- NEDEN AYRI VARLIK DEGIL ----
   Besi de pa:bot'un bilesen GRUPLARI. Boyle olunca defter,
   canta, teslim, odun/maden, derin tarama, savas anahtari --
   hepsi oldugu gibi calisiyor. Ayri varlik yapsaydik
   _bot_defteri.js bastan yazilirdi ve "bot varligi kayitli
   degil" hatasi bes katina cikardi.

   ---- DENGE ----
   Bunlar patron sayilari: Okazor 50 hasar vuruyor (vanilla
   demir golem 21), Kajaros 1750 can tasiyor (ender ejderi 200).
   Yani yaninda bir tanesi bile oyunu kolaylastirir. Bilincli
   bir tercih: sen istedin, sayilar senin verdigin listeden.
   Zor gelirse ILKEL_TAVAN'i dusur ya da ILKEL_ACIK'i kapat.

   ---- GORUNUS ----
   Bes uye de normal bot gibi cizilir, sadece BOYU ve ISMI
   farklidir (nameTag). Ayri doku vermek istemedim: v4.28'de
   bot dokusuna dokunulunca bot tamamen gorunmez olmustu ve
   sebebini bulmak uc surum aldi. Isim etiketi risksiz ve
   ayirt etmek icin yeterli.                                  */
/* ---------------- CANLAR KALP CINSINDEN OKUNUR ----------------
   Kaynak listedeki "1750 HP" aslinda 1750 KALP demekmis
   (kullanici bildirdi, v4.41). Minecraft'ta 1 kalp = 2 HP, yani
   buradaki sayilar listedekinin IKI KATI:

     listede        burada      oyunda gorunen
     1750           3500        1750 kalp
     "20 HP iyiles" 40          20 kalp

   Ilk surumde sayilar oldugu gibi girilmisti; herkes yarim
   canla dolasiyordu. Ayni kural IYILESME miktarlari icin de
   gecerli -- onlar da kaynakta "HP" diye yaziliydi.

   HASAR DA AYNI KURALA GIRDI (v4.42): kaynaktaki "23 Hasar" da
   kalp cinsindenmis, o da ikiye katlandi.

     23 hasar  -> 46 HP  = 23 kalp / vurus
     50 hasar  -> 100 HP = 50 kalp / vurus   <- Okazor

   Okazor'un tek vurusu normal bir oyuncuyu (10 kalp) bes kez
   oldurur, kalp tavanindaki bir oyuncuyu (110 kalp) uc vuruste
   bitirir. Bilincli: sayilar kullanicinin listesinden.        */
export const ILKEL_ACIK  = true;
export const ILKEL_TAVAN = 1;    // her isimden kac tane olabilir

/* ---------------- HIYERARSI ----------------  (v4.36)

   Sirayi KULLANICI belirledi:

     1  Okazor   Ekip Lideri        (basindan beri sabit)
     2  Miskel   Bas Buyucu
     3  Kajaros  Muhafiz Komutani
     4  Raxxan   Golge Ajani
     5  Harkos   Golge Ciragi       (basindan beri sabit)

   Yani bu ekipte BUYU askeri rutbenin ustunde: Miskel, 1750
   canli Kajaros'un amiri. Can/hasar sirasiyla ozellikle
   ORTUSMUYOR ve bu bilincli -- rutbe bir GOREV sirasi, guc
   siralamasi degil.

   DIKKAT: sayilari "rutbeye uydurmak" icin degistirme. Canlar
   ve hasarlar kullanicinin getirdigi patron listesinden
   birebir geliyor; rutbe onlardan bagimsiz bir katman.        */

/* Uye tanimlari. can/hasar/olcek VARLIK JSON'unda (kol_uret.py:
   ILKEL); burada script tarafinin bilmesi gerekenler var.
   Ikisinin ayni seyi soyledigini ilkel.mjs sinliyor.          */
export const ILKEL_BESLI = new Map([
  ["kajaros", {
    ad: "İlkel Muhafız Kajaros",
    kimlik: "pa:kajaros",
    rutbe: 3, unvan: "Muhafız Komutanı",
    can: 3500, hasar: 46,
    /* Muhafiz Komutani: ekibin kalkani. En cok cani o tasiyor,
       en cok darbeyi de o yiyor -- Direnc II hasarin %40'ini
       kesiyor. Ates bagisikligi "muhafiz" isinin parcasi:
       lav basinda duran o olsun.                              */
    pasif: [["resistance", 0, 1], ["fire_resistance", 0, 0]],
    /* "Isabet aldiginda kendisini 20 HP iyilestirir" --
       VURULUNCA, vurunca degil. 20 KALP = 40 HP (v4.41).     */
    vurulunca: 40,
    /* "Oyuncuya 7,5 saniyeligine Yavaslik III, Bulanti III ve
       Korluk III" -> artik VURDUGU seye.                     */
    vurusEfekt: [
      ["slowness", 150, 2],
      ["nausea", 150, 2],
      ["blindness", 150, 2]
    ]
  }],
  ["miskel", {
    ad: "İlkel Sihirbaz Miskel",
    kimlik: "pa:miskel",
    rutbe: 2, unvan: "Baş Büyücü",
    can: 2600, hasar: 28,
    vurulunca: 80,
    /* Bas Buyucu: kendini yenileyen tek uye. Kullanicinin
       ornegi buydu ("yenilenme 2 falan"). Menzilli oldugu
       icin az darbe yiyor ama yedigi zaman toparlansin.      */
    pasif: [["regeneration", 0, 1], ["resistance", 0, 0]],
    /* Iyilesme 40 KALP = 80 HP (v4.41).
       "Korluk XVI (6 sn) VEYA Solgunluk VII (4 sn)" -- ikisinden
       biri, her vuruste yazi tura. Solgunluk = wither.        */
    vurusEfektSecim: [
      [["blindness", 120, 15]],
      [["wither", 80, 6]]
    ]
  }],
  ["harkos", {
    ad: "İlkel Suikastçı El-Harkos",
    kimlik: "pa:harkos",
    rutbe: 5, unvan: "Gölge Çırağı",
    can: 2600, hasar: 26,
    /* Golge Ciragi: en alt rutbe, en hizli ayak. Sicrama
       yetenegi varlik JSON'unda (leap_at_target); Ziplama III
       onu tamamliyor. Ustadindan (Raxxan) bir kademe yavas --
       rutbe farki sayilarda da gorunsun.                     */
    pasif: [["speed", 0, 0], ["jump_boost", 0, 2]],
    /* Asa zinciri (v4.50). Sayilar SERSEM ve MEZAR ayarlarindan
       geliyor; burada sadece "bu uyede var" yaziyor. Baska bir
       uyeye vermek istenirse tek satir.                       */
    asa: true,
    /* "Pasif olarak zamanla canini iyilestirir (tik basina
       0,5 HP)". 0,5 KALP = 1 HP (v4.41). Tarama 20 tick'te bir
       donuyor, yani her taramada 20 HP = 10 kalp.             */
    tikIyilesme: 1
  }],
  ["raxxan", {
    ad: "İlkel Zihin Bükücü Raxxan",
    kimlik: "pa:raxxan",
    rutbe: 4, unvan: "Gölge Ajanı",
    /* ---- GUCLENDIRILDI (v4.55, v4.56'da ayarlandi) ----
       Kullanicinin tespiti: "El-Harkos en alt rutbe ama
       Raxxan'dan daha guclu." Dogruydu -- Harkos 2600 can
       tasirken Golge Ajani 2000'de kalmisti, yani rutbe 4,
       rutbe 5'in altindaydi.

       Cozum de kullanicinin: carpani uygula.
       v4.55'te 1,5 idi; kullanici "bir tik dusur ama cok da
       dusurme" deyince 1,4'e cekildi (v4.56).

         can    2000 -> 2800   (1400 kalp)
         hasar    30 ->   42   (21 kalp)
         ani iyilesme 200 -> 280 (140 kalp)

       DIKKAT -- TABAN 2600'DUR, DAHA ASAGI INMEZ. Golge
       Ciragi El-Harkos 2600 can tasiyor; Raxxan onun ustunde
       kalmak zorunda, sebebi zaten bu degisiklik. 1,3 (2600)
       esitlik olurdu, altisi geriye donus.

       IHTIMALLER CARPILMADI (gizlenme %15, ani iyilesme %10):
       onlar guc degil SIKLIK. Carpmak yetenegin karakterini
       degistirirdi, sayisini degil. Ayni sebeple aura menzili
       (30 blok) ve gizlenme suresi (6 sn) de duruyor.        */
    can: 2800, hasar: 42,
    /* Golge Ajani: ekibin en az canlisi, hayatta kalmasi
       goze gorunmemekten geciyor. Hiz II ile kacip
       konumlaniyor, Gece Gorusu ile karanlikta calisiyor.
       Ciragindan (Harkos) bir kademe hizli.                  */
    pasif: [["speed", 0, 1], ["night_vision", 0, 0]],
    /* "30 blok civarindaki oyunculara Bulanti V" -> civardaki
       DUSMANLARA. Sahibi ve ekip arkadaslari disarida.        */
    aura: { menzil: 30, efekt: ["nausea", 100, 4] },
    /* "Rastgele anlarda gorunmez olma" */
    gizlenme: { sans: 0.15, sure: 120 },
    /* "Kendini tek seferde 100 HP iyilestirme sansi"
       100 KALP = 200 HP (v4.41).                              */
    ansizinIyilesme: { sans: 0.1, miktar: 280 }
  }],
  ["okazor", {
    ad: "İlkel Savaşçı Okazor",
    kimlik: "pa:okazor",
    rutbe: 1, unvan: "Ekip Lideri",
    can: 2400, hasar: 100,
    /* Ekip Lideri: onden giren. Guc I vurusunu buyutuyor,
       Direnc I ayakta tutuyor. Direnci Kajaros'unkinden DUSUK
       -- tank o degil, lider o.                              */
    pasif: [["strength", 0, 0], ["resistance", 0, 0]],
    /* "4 saniyelik araliklarla ust uste 3 kez vurmayi
       basarirsa cani tamamen yenilenir."                     */
    seri: { adet: 3, pencere: 80 }
  }]
]);

/* ============================================================
   EL-HARKOS'UN ASASI  (v4.50)

   Kullanici modu bulamadi ama yetenegi adim adim anlatti:

     "Elinde tuttugu asayi el hareketi yapar gibi havaya
      kaldiriyor. 2-3 kere vurdugunda karsidaki kisi bir anda
      yere duser, yerde kalir, hareket edemez ama kafasini
      cevirebilir. Yerdeyken asayi bir kez daha kaldirdiginda
      bir mezar gibi bir yapi acilir, o karakteri alir.
      Kurtulmak icin dismont tasi gerekiyor, 10 tane."

   Uc asamali bir zincir: VUR -> SERSEMLET -> MEZAR -> (kurtarma)

   ---- "HAREKET EDEMEZ AMA KAFASINI CEVIREBILIR" ----
   Bu cumle tam olarak bizim dondur yetenegimizin ayari:
     inputpermission movement disabled   (hareket kilitli)
     inputpermission camera  enabled     (kamera serbest)
   v4.33'te uc referans moddan alinip duzeltilmisti; ayni
   mekanizma burada yeniden kullaniliyor, ikinci kopya yok.

   ---- NEDEN YENI BIR KOL YOK ----
   Kullanicinin kurali: "her seyi kol yapma, kol israfini
   onle." Bu zincir El-Harkos'un YETENEGI, senin bir kolun
   degil -- tetigi onun vurusu. Kol istenirse tek satirla
   kollar.js'e eklenir.                                        */

/* Kac vurusta yere serilir. Kullanici "2 kere veya 3 kere"
   dedi; ortasi degil ALTI aliniyor -- 3'e cikarsa "vurdum
   vurdum olmadi" hissi verir, 2 ise cok cabuk. 3 secildi
   cunku Okazor'un serisi de 3 ve ayni his zaten kurulu.       */
export const SERSEM_VURUS = 3;

/* Vuruslarin ARALIKSIZ olmasi lazim: pencere disinda kalanlar
   dusuyor. Okazor'un serisiyle ayni kalip.                    */
export const SERSEM_PENCERE = 80;      // 4 saniye

/* Yerde ne kadar kalir. Mezar acilmazsa bu sure sonunda
   kendiliginden kalkiyor -- referans modlarin en can sikici
   huyu suresiz etkiydi, ona donulmuyor.                       */
export const SERSEM_SURE = 200;        // 10 saniye

/* Yerde yatiyor hissi. Girdi kilidi oyuncuyu tutuyor ama
   MOBLARDA inputpermission yok; onlari yavaslik tutuyor.      */
export const SERSEM_YAVASLIK = 255;
export const SERSEM_KOR = false;       // gorsun: "kafasini cevirebilir"

/* ---------------- MEZAR ----------------
   Sersemlemis hedefe bir vurus daha gelirse mezar aciliyor.
   Yani zincir: 3 vurus -> yere duser -> 4. vurus -> mezar.   */
export const MEZAR_ACIK = true;
export const MEZAR_YARICAP = 1;        // ic bosluk (3x3 taban)
export const MEZAR_YUKSEK = 3;
export const MEZAR_BLOK = "pa:mezar_tasi";

/* Mezar SURESIZ: kendiliginden acilmiyor, anahtar gerekiyor.
   Hapis kafesiyle ayni felsefe. Dunya ozelligine kaydediliyor,
   dunyadan cikip girsen de duruyor.                           */
export const MEZAR_KAYIT_ANAHTAR = "simsek:mezarlar";
export const MEZAR_TAVAN = 8;          // ayni anda kac mezar

/* ---------------- DISMONT TASI ----------------
   "Elmas gibi ama bulmasi asiri zor bir maden, adi dismont
   tasi. 10 tane ile mezara kazarsam aciliyor."

   Mezari acmak icin envanterinde bu kadar tas GEREKIYOR ve
   acinca harcaniyor.                                          */
export const DISMONT_ESYA = "pa:dismont";
export const DISMONT_CEVHER = "pa:dismont_cevheri";
export const MEZAR_ANAHTAR_ADET = 10;

/* ============================================================
   SINIF OZELLIKLERI ve BALTA  (v4.48)

   Istek: "bunların hani sınıfı var ya -- biri gölge muhafızı,
   biri çırağı -- bunların yeteneklerine göre özellikler versin,
   yenilenme 2 falan."

   Her uyenin ILKEL_BESLI kaydinda artik bir `pasif` alani var:
   kendine surekli verdigi efektler. Unvanindan turetildi, tek
   tek yukarida yaziyor. Ozet:

     1 Okazor    Ekip Lideri         Guc I     + Direnc I
     2 Miskel    Bas Buyucu          Yenilenme II + Direnc I
     3 Kajaros   Muhafiz Komutani    Direnc II + Ates Bagisikligi
     4 Raxxan    Golge Ajani         Hiz II    + Gece Gorusu
     5 Harkos    Golge Ciragi        Hiz I     + Ziplama III

   RUTBE SAYILARDA DA GORUNSUN diye iki cift bilincli
   kademelendi: Raxxan (ajan) Harkos'tan (cirak) bir kademe
   hizli, Kajaros (tank) Okazor'dan (lider) bir kademe direncli.

   AMPLIFIER KURALI (depoda her yerde ayni): gorunen seviye
   eksi bir. "Yenilenme II" -> amplifier 1. Sureler 0 yazili
   cunku ILKEL_PASIF_SURE'den geliyor -- iki yerde yazili sure
   ayrisirdi.                                                  */
export const ILKEL_PASIF_ACIK = true;

/* Efekt suresi. Tarama BOT_TARAMA (20 tick) araliginda donuyor;
   suresi ondan UZUN olmali, yoksa iki tarama arasinda efekt
   dusup bot bir an savunmasiz kalir. Alti kat pay birakildi:
   tarama bir kez atlansa bile kesinti olmuyor.                */
export const ILKEL_PASIF_SURE = BOT_TARAMA * 6;

/* Pasifler parcacik CIKARMIYOR. Bes uye yaninda dururken
   surekli parlayan efekt bulutu hem gozu yoruyor hem bosuna
   parcacik. Vurusa bagli efektler (Korluk, Solgunluk) gorunur
   kaliyor -- onlar bir sey OLDUGUNU haber veriyor.            */
export const ILKEL_PASIF_PARCACIK = false;

/* ---------------- SILAHLAR ----------------
   v4.48: kullanici bir balta cizip gonderdi, "bunlar genel
          olarak ilkel beslinin tamamında olsun".
   v4.49: El-Harkos'un asasini gonderdi -- "bu normalde de
          zaten el-harkos'un elinde bulunan bir esyaydi".
          Yani silah artik UYEYE OZEL; balta varsayilan.

   HASAR TASIMIYOR, bilincli: Bedrock'ta mobun elindeki silah
   vurusuna eklenir. Silah hasar tasisaydi uyelerin hasari da
   sessizce artardi -- o sayilar kullanicinin listesinden geliyor
   ve testler onlari kilitliyor. Silah bir GORUNUM.

   Elde tutulmasi iki parcali: varlik JSON'unda equippable +
   geometride "rightItem" kemigi (kol_uret.py), ele koyma
   burada script tarafinda. Ikisi de olmadan gorunmuyor.

   DIKKAT: bu esleme kol_uret.py:ILKEL_SILAH ile AYNI olmali --
   orada varligin equippable.accepted_items'i, burada ele
   konulan esya var. Ayrisirlarsa silah ele konulmaz ve hicbir
   hata gorunmez. ilkel.mjs ikisini karsilastiriyor.           */
export const ILKEL_SILAH_VARSAYILAN = "pa:ilkel_balta";

export const ILKEL_SILAH = new Map([
  ["harkos", "pa:ilkel_asa"]
]);

export function ilkelSilahi(anahtar) {
  return ILKEL_SILAH.get(anahtar) || ILKEL_SILAH_VARSAYILAN;
}

/* Her taramada elin bos olup olmadigina bakilsin mi. Dunya
   yeniden yuklenince ya da silah bir sekilde dusunce kendi
   kendine geri geliyor. Kapatirsan silah sadece cagirma aninda
   veriliyor.                                                  */
export const ILKEL_SILAH_TAZELE = true;

/* ============================================================
   MISKEL'IN SAVAS MODU  (v4.47)

   Kullanici bildirdi: "Miskel digerlerine gore etkisiz kaliyor,
   mob'a saldirttim." Bakinca sebep tek degil, UC ayri sey ust
   uste binmis:

   1) MENZILLI OLMAK HASARI YUTUYORDU.
      Miskel'in varlik JSON'unda minecraft:shooter var, mermisi
      vanilla ok. Bedrock'ta okun hasari ATICININ attack.damage
      degerinden BAGIMSIZ -- ok kendi sabit hasarini vurur
      (~2-4 HP). Yani ayarlarda yazan 28 hasar oynanista HIC
      kullanilmiyordu: Miskel vurus basina ~2 kalp verirken
      Okazor 50 kalp veriyordu. "Etkisiz kaliyor" tam olarak bu.

   2) IMZA YETENEGI HIC CALISMIYORDU.
      Korluk/Solgunluk entityHitEntity olayina bagliydi; o olay
      sadece YAKIN DOVUS vurusunda tetikleniyor. Menzilli bir
      varlik neredeyse hic yakin dovuse girmiyor, yani Miskel'in
      "Korluk XVI veya Solgunluk VII" yetenegi pratikte olu
      koddu -- moba karsi da, oyuncuya karsi da.

   3) YAZI TURANIN YARISI MOBA ISLEMIYORDU.
      Iki secenekten biri Korluk. Korluk moblarda hicbir sey
      yapmiyor (sadece oyuncunun ekranini karartiyor). Yani
      calissa bile yarisi bosa gidiyordu.

   ---- COZUM ----
   projectileHitEntity olayina abone olundu: Miskel'in oku bir
   seye degdiginde hem ekstra hasar biniyor hem imza yetenegi
   tetikleniyor. Boylece menzilli olmak artik bir CEZA degil.

   Hasar "esitleniyor", uydurulmuyor: 28 zaten kullanicinin
   listesinden gelen sayi. Okun kendi hasari dusuluyor ki
   toplam 28'i gecmesin.                                       */
export const ILKEL_OK_HASARI = true;

/* Vanilla okun kendi hasari. Zorluk ve hiza gore 2-4 HP
   arasinda oynuyor; ortalama aliniyor. Tam deger API'den
   okunamiyor -- olay hasar miktarini vermiyor.                */
export const ILKEL_OK_TABAN = 4;

/* Moblarda hicbir sey yapmayan efektler.
   Bunlar oyuncuya karsi cok etkili (ekran kararir, ekran
   dalgalanir) ama bir zombi icin yok hukmunde. Iki secenekli
   yeteneklerde (Miskel) hedef oyuncu DEGILSE bu efektlerden
   ibaret olan secenek eleniyor -- boylece moba karsi her
   zaman ise yarayan taraf cikiyor.

   DIKKAT: bu liste efektleri SILMIYOR, sadece SECIMDE eliyor.
   Kajaros gibi hepsini birden veren uyeler etkilenmiyor;
   onlarin listesinde zaten Yavaslik da var.                   */
export const MOBA_ISLEMEYEN_EFEKTLER = new Set([
  "blindness", "nausea", "darkness", "hunger", "mining_fatigue"
]);

/* Raxxan'in aurasi OYUNCULARA da vursun mu. Varsayilan HAYIR:
   yaninda oynayan arkadasini surekli mide bulantisinda tutmak
   ozellik degil eziyet olurdu. Vurus efektleri bundan bagimsiz
   -- oraya kimi vuracagina SEN karar veriyorsun.             */
export const ILKEL_AURA_OYUNCU = false;

/* "Bunlar beni ozel koruyanlar, bunlar ekip."
   Normal botlarin savasi kapatilabiliyor (ormanda odun
   toplarken her koyune saldirmasin diye). Ilkel Besli'nin isi
   BU: koruma. O yuzden ekip savasi kapali olsa bile bu bes uye
   savasa hazir doguyor. Elle "bot savas kapat" dersen yine
   susarlar -- bu bir baslangic durumu, kilit degil.           */
export const ILKEL_KORUMA = true;

/* Turkce yazimlar -> anahtar. Sohbet komutu icin.            */
export const ILKEL_ADLAR = new Map([
  ["kajaros", "kajaros"], ["muhafiz", "kajaros"], ["kajaross", "kajaros"],
  ["miskel", "miskel"], ["sihirbaz", "miskel"], ["buyucu", "miskel"],
  /* El-Harkos tam adi, Harkos kisaltmasi. Ikisi de yaziliyor.
     Anahtar "harkos" olarak KALDI: varlik kimligi (pa:harkos),
     doku dosyasi ve kayitlar ona bagli. Kimligi degistirmek,
     mevcut dunyalarda dogmus El-Harkos'u "bilinmeyen varlik"
     yapardi -- ad bir GORUNUM, kimlik bir SOZLESME.           */
  ["harkos", "harkos"], ["elharkos", "harkos"], ["el-harkos", "harkos"],
  ["el", "harkos"], ["suikastci", "harkos"], ["suikast", "harkos"],
  ["raxxan", "raxxan"], ["zihin", "raxxan"], ["bukucu", "raxxan"],
  ["okazor", "okazor"], ["savasci", "okazor"]
]);

/* Botun ilkel kimligi VARLIGIN kendi ozelliginde duruyor.
   Dunya kaydina eklemedik: kayit bicimi degisince eski
   dunyalar okunamaz olurdu (v4.27'de bir kez yasandi).       */
export const ILKEL_OZELLIK = "simsek:ilkel";

/* ---------------- BUTUN BOT TURLERI ----------------  (v4.35)

   v4.34'te Ilkel Besli pa:bot'un bilesen gruplariydi, yani
   "bot mu?" sorusunun cevabi tek kimlikti. Kullanici bes ayri
   SKIN gonderince bes ayri VARLIK olmak zorunda kaldilar (bir
   varligin tek dokusu olur; cesitli doku icin gereken ozel
   render controller v4.28'de botu gorunmez yapmisti).

   Bu liste ILKEL_BESLI'den TURETILIYOR, elle yazilmiyor. Yeni
   bir uye eklenip buraya eklenmeyi unutsaydi: bot menusu
   acilmaz, nisan ona kilitlenir, botlar birbirini doverdi.    */
export const BOT_KIMLIKLER = new Set([BOT_KIMLIK]);
for (const t of ILKEL_BESLI.values()) {
  if (t.kimlik) BOT_KIMLIKLER.add(t.kimlik);
}

export function botTuruMu(tip) {
  return BOT_KIMLIKLER.has(tip);
}

export const BOT_SAVAS_VARSAYILAN = true;

/* ============================================================
   BOT OZEL GUCLERI  (v4.29)

   Istek: "aynen benim gibi simsek yagdirabilsin ve kil topu
   atabilsin".

   ---- BOTLAR SENIN NISAN ALDIGIN YERE ATIYOR ----
   Bota "sunu vur" demenin bir yolu yok: bot kendi bakisini
   oyuncuya cevirip duruyor (look_at_player). Botun kendi
   bakisini kullansaydik top DOGRUDAN SANA gelirdi.

   O yuzden hedefi SEN veriyorsun: nisan aldigin nokta (ya da
   kilitlendigin varlik) hesaplaniyor, botlar oraya atiyor.
   "Aynen benim gibi" tam olarak bu -- senin yaptigin seyi
   senin nisaninla yapiyorlar.

   ---- NEDEN TAVAN VAR ----
   Yirmi bot birden toprak topu atsa yirmi tane blok yazan is
   acilir. Blok butcesi ortak oldugu icin tablet olmez ama her
   top saniyeler suren bir yavaslamayla ucar ve ortalik
   kullanilmaz hale gelir. Simsek daha ucuz (varlik dogurma),
   tavani daha yuksek.

   ---- SIMSEK OYUNCULARA VURMUYOR ----
   Yildirim yangin cikariyor ve alan etkisi var. Botun kendi
   kararyla arkadasina yildirim indirmesi istenmez; oyunculari
   sen vurursun. Savas modundan BAGIMSIZ olarak kapali.       */
/* Nisan alma (koniHedefleri / kilitliHedef) bu tipleri ATLAR.

   v4.29'da gercek bir kusur cikti: bot onunde dururken "simsek"
   dediginde kilit KENDI BOTUNA takiliyordu -- hem oyuncunun
   yon_simsegi'nde hem botlarin kendi guclerinde. Bot da bir
   varlik ve koninin tam ortasinda duruyor.

   Cozum tek yerde: nisan sistemi botlari gormezden geliyor.
   Yani ne sen kendi botuna yildirim indiriyorsun ne de botlar
   birbirine. Botu gercekten vurmak istersen elle vurabilirsin;
   nisan yardimi onu secmiyor, o kadar.                        */
/* v4.35: elle "pa:bot" yaziliydi; Ilkel Besli ayri varliklara
   tasininca nisan ONLARA kilitlenmeye basladi -- yani kendi
   Okazor'una yildirim indiriyordun. Liste artik butun bot
   turlerinden turetiliyor.                                    */
export const KILIT_ATLA_TIPLER = new Set(BOT_KIMLIKLER);

export const BOT_GUC_ACIK      = true;
export const BOT_TOP_TAVAN     = 3;    // ayni anda kac bot top atsin
export const BOT_SIMSEK_TAVAN  = 5;    // ayni anda kac bot simsek yagdirsin
export const BOT_SIMSEK_SAYISI = 4;    // bot basina kac yildirim
export const BOT_GUC_MENZIL    = 60;   // botun nisan alabilecegi en uzak nokta
export const BOT_SIMSEK_OYUNCU = false; // bot yildirimi oyunculara da vursun mu
export const BOT_OLAY_SAVAS_AC    = "pa:savas_ac";
export const BOT_OLAY_SAVAS_KAPAT = "pa:savas_kapat";

/* Kutukler: esya kimligi blok kimligiyle ayni oldugu icin
   tablo degil kume yetiyor. Yapraklara DOKUNULMUYOR -- agaci
   kel birakmak yerine govdeyi aliyoruz.                        */
export const BOT_ODUN_BLOKLARI = new Set([
  "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log",
  "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log",
  "minecraft:mangrove_log", "minecraft:cherry_log",
  "minecraft:stripped_oak_log", "minecraft:stripped_spruce_log",
  "minecraft:stripped_birch_log", "minecraft:stripped_jungle_log",
  "minecraft:stripped_acacia_log", "minecraft:stripped_dark_oak_log",
  "minecraft:crimson_stem", "minecraft:warped_stem"
]);

/* Cevher -> DUSEN esya. Oyunun kendi kurallarina uyuluyor:
   demir/bakir/altin ham cevher veriyor, komur/elmas/zumrut
   dogrudan kendini, lapis ve redstone birden fazla adet.
   Deepslate varyantlari da ayni seyi veriyor.                  */
export const BOT_MADEN_BLOKLARI = new Map([
  /* Dismont cevheri (v4.50). Kendi blogumuz, o yuzden tek
     varyanti var -- vanilla cevherlerin deepslate ikizi
     olmasinin sebebi dunya uretimi, bizimki tek blok.        */
  ["pa:dismont_cevheri", "pa:dismont"],
  ["minecraft:coal_ore", "minecraft:coal"],
  ["minecraft:deepslate_coal_ore", "minecraft:coal"],
  ["minecraft:iron_ore", "minecraft:raw_iron"],
  ["minecraft:deepslate_iron_ore", "minecraft:raw_iron"],
  ["minecraft:copper_ore", "minecraft:raw_copper"],
  ["minecraft:deepslate_copper_ore", "minecraft:raw_copper"],
  ["minecraft:gold_ore", "minecraft:raw_gold"],
  ["minecraft:deepslate_gold_ore", "minecraft:raw_gold"],
  ["minecraft:diamond_ore", "minecraft:diamond"],
  ["minecraft:deepslate_diamond_ore", "minecraft:diamond"],
  ["minecraft:emerald_ore", "minecraft:emerald"],
  ["minecraft:deepslate_emerald_ore", "minecraft:emerald"],
  ["minecraft:lapis_ore", "minecraft:lapis_lazuli"],
  ["minecraft:deepslate_lapis_ore", "minecraft:lapis_lazuli"],
  ["minecraft:redstone_ore", "minecraft:redstone"],
  ["minecraft:deepslate_redstone_ore", "minecraft:redstone"],
  ["minecraft:lit_redstone_ore", "minecraft:redstone"],
  ["minecraft:nether_gold_ore", "minecraft:gold_nugget"],
  ["minecraft:quartz_ore", "minecraft:quartz"],
  ["minecraft:ancient_debris", "minecraft:ancient_debris"]
]);

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
/* ---- GIRDI KILIDI (v4.33, "zaman durdur" fikri) ----
   Uc referans modun ucunde de zaman_durdur.mcfunction vardi:

     inputpermission set @a movement disabled
     inputpermission set @a camera disabled
     inputpermission set @s movement enabled
     inputpermission set @s camera enabled

   Fikir iyi: slowness bir oyuncuyu YAVASLATIR ama durdurmaz,
   inputpermission gercekten kilitler. Uygulamasi ise tehlikeli:

     1. SURESIZ. Acan komut var, kapatan AYRI bir komut. Unutursan
        ya da dunyadan cikarsan oyuncu sonsuza kadar kilitli
        kalir -- kurtaran tek sey ikinci komutu bulmak.
     2. @a -- dunyadaki HERKES, mesafe suzgeci yok.
     3. Kamerayi da kapatiyor: kilitli oyuncu etrafina bile
        bakamiyor, ekran donmus gibi duruyor.

   Buradaki hali: sadece NISAN ALDIGIN hedefe, DONDUR_SURE
   kadar, bitir()'de kesin serbest birakarak. Kamera acik
   kaliyor (bakabilirsin, yurumezsin) -- istersen asagidan ac.

   SON EMNIYET: dunyaya girerken herkesin girdisi aciliyor
   (main.js, playerSpawn). Script tam kilitliyken cokerse bile
   oyuncu bir daha girdiginde serbest kalir. Referansta bu yok.  */
export const DONDUR_GIRDI_KILIT  = true;   // oyuncuyu gercekten durdur
export const DONDUR_KAMERA_KILIT = false;  // bakisi da kilitle (sert)

/* DIKKAT: bu ayar olmadan yukaridaki kilit OLU KODDU.

   koniHedefleri() oyunculari varsayilan olarak ATLIYOR
   (secenek.oyuncuDahil). Dondur bu secenegi gecmiyordu, yani
   hedef HIC oyuncu olamiyordu -- girdi kilidi de hicbir zaman
   calismazdi. Test yazilirken ortaya cikti.

   Dondur icin oyuncu dahil OLMALI: donduracak sey zaten
   karsindaki oyuncu. Zombiyi durdurmak icin kilide gerek yok,
   slowness yetiyor.                                            */
export const DONDUR_OYUNCU = true;

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
