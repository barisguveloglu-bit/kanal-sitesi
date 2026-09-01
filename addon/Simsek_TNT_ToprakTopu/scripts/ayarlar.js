/* ============================================================
   AYARLAR
   Butun sabit sayilar burada. Baska dosyada sabit tanimlama.
   ============================================================ */

// Oyun ici bildirimlerde gorunur. manifest.json'daki surumle ayni tutulmali.
export const SURUM = "v7.8";

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
/* ---- UCUS AURASI  (v6.9) ----
   Kullanicinin Code-Man listesinden:
     particle minecraft:raid_omen_ambient ~~1~
     particle minecraft:raid_omen_ambient ~~2~
   Yani oyuncunun bir ve iki blok ustunde bir parcacik. Kaynak
   bunu her tick calistiriyordu; `raid_omen_ambient` zaten
   SUREKLI bir yayici (ambient), tek dogurmak yetiyor.       */
export const UCUS_PARCACIK = "minecraft:raid_omen_ambient";
export const UCUS_PARCACIK_YUKSEK = [1, 2];

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


/* ---------------- CAN VERME  (v7.7, Anna Kolu) ----------------
   Kullanici "Anna1545 Kolu'nu ekleyelim" dedi. Kaynakta
   (fear1545'in kol modu) Anna'nin ayirt edici yetenegi
   `can verme`:
       effect @s health_boost 100000 255 true
       effect @s instant_health 1 255
   Yani KENDINE sinirsiz can. Bu bize UYMUYOR ve sebebi
   depoda yazili: v4.33'te can_verme tam da bu yuzden
   SILINMISTI --

     "zaten hem kalp ekleme var, hem iksir icince onun 4-5
      kati sureyle yenilenme geliyor; artik gereksizlesti."

   O karar hala dogru. Ayni yetenegi geri koymak "kol israfi"
   kuralini da cignerdi (v4.33 ve v4.46'da SEKIZ kol tam bu
   yuzden kaldirildi).

   ---- O YUZDEN YON DEGISTI: BASKASINA ----
   Depoda hicbir sey BASKA bir varligi iyilestirmiyor. Arandi:
     kalp_ekle      -> kendine, kalici kalp
     iksirler       -> kendine, uzun yenilenme
     bot_ilkel      -> botun KENDI pasif iyilesmesi
   Yani "baskasini iyilestirmek" gercek bir bosluk. Anna'nin
   kimligi (can VERME) tam oraya oturuyor ve silinen yetenegin
   kopyasi olmuyor.

   DUSMANLARI IYILESTIRMEZ: hedefin kime ait oldugu
   sorulamiyor ama TURU sorulabiliyor. Dusman listesi yerine
   IZIN listesi kullaniliyor -- yeni bir dusman mob eklenirse
   liste eskimesin diye. Oyuncular, evcil hayvanlar, koy
   halki ve bizim botlarimiz.                                */
export const CAN_VER_MENZIL = 16;
export const CAN_VER_ACI    = 0.7;   // bakis konisi (ucurma ile ayni olcek)
export const CAN_VER_TAVAN  = 8;     // en fazla kac hedef
export const CAN_VER_MIKTAR = 20;    // dogrudan doldurulan can
/* Yenilenme SURESI ozellikle kisa: iksirler 6000 tick veriyor,
   bu onun yerine gecmesin. Anlik bir yardim, kalici bir guc
   degil. */
export const CAN_VER_SURE   = 200;   // 10 sn yenilenme
export const CAN_VER_SIDDET = 2;     // Yenilenme III
export const CAN_VER_KALKAN = 100;   // 5 sn emme (absorption)
/* Kendini de iyilestirir mi. Kaynakta SADECE kendini
   iyilestiriyordu; bizde tam tersi asil is, kendi ikincil. */
export const CAN_VER_KENDINE = true;
/* IZIN listesi -- bunlar disindaki hicbir sey iyilesmez. */
export const CAN_VER_DOSTLAR = [
  "minecraft:player", "minecraft:villager_v2", "minecraft:villager",
  "minecraft:wandering_trader", "minecraft:iron_golem", "minecraft:snow_golem",
  "minecraft:wolf", "minecraft:cat", "minecraft:ocelot", "minecraft:parrot",
  "minecraft:horse", "minecraft:donkey", "minecraft:mule", "minecraft:llama",
  "minecraft:cow", "minecraft:sheep", "minecraft:pig", "minecraft:chicken",
  "minecraft:rabbit", "minecraft:fox", "minecraft:axolotl", "minecraft:allay",
  "pa:bot"
];

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
/* ---- MENZIL (v4.73) ----
   Kullanici: "mesafe uzun olsun ki gayet iyi olsun... 12
   blokluk da okey de yani 14'ten baslayalim."

   Bu sayi ARTIK IKI ISI birden yapiyor:
     - lazerin kac blokta hasar verdigi
     - ISIN MODELININ kac blok uzadigi (kol_uret.py
       LAZER_ISIN_MENZIL bunun ikizi, test esitligi kilitliyor)

   Ikisi bilerek bagli: isin 14 blok gorunup 22 blokta
   vursaydi 18 bloktaki bir seye nisan alinca isin ona
   ULASMIYOR gorunur ama olurdu. Gordugun neyse vurdugun o.

   14 bloktan basliyoruz cunku cok uzun bir model kutusu
   Bedrock'ta gorunurluk siniri sorunu cikarabilir; tablette
   sorun cikmazsa tek satirla buyutuyoruz (ve isin da onunla
   birlikte uzuyor).

   ---- v4.82: 17 -> 21 ----
   Kullanici: "artik lazerin menzilini 21 blok yapalim."
   17 blokluk kutu (272 birim) tablette denendi, gorunurluk
   elemesi yasanmadi. 21 blok = 336 birim.

   ---- v4.77: 14 -> 17 ----
   Ustteki "tablette sorun cikmazsa buyutuyoruz" sarti doldu.
   Kullanici: "lazer menzili 14 bloktu ya, onu 17 yap; bir kac
   surumdur alistik, alistigimiza gore bunu yapalim."

   14 blokluk kutu (224 birim) oyunda sorunsuz cizildi -- iki
   surum boyunca denendi, gorunurluk elemesi yasanmadi. 17
   blok 272 birim ediyor, %21 daha uzun. Gorunurluk kutusu
   zaten bu sayidan turedigi icin (kol_uret.py
   goz_lazer_geometrisi) onunla birlikte buyuyor.

   NE PAHALILASTI (bilerek kabul edildi):
     - Hedef taramasi bir KURE: yaricap her buyudugunde
       hacim KUPUYLE artiyor. 14 -> 17 -> 21 zincirinde
       toplam (21/14)^3 = 3,4 kat.
       Yarim saniyede bir donuyor, kalabalik yerde daha cok
       varlik suzuluyor. Suzgec ucuz (nokta carpimi), asil
       maliyet getEntities cagrisinda.
     - Delme yoklamasi 14 yerine 17 okuma; her biri 1 blok
       butcesi. Vurus tickinde 56'nin 17'si yoklamaya gidiyor
       (once 14'tu). Aradaki dokuz tickte butce tam, o yuzden
       delme hizinda hissedilir fark yok.                     */
/* v7.6: Nitroksin'in yeni yetenegi -- dusme hasari bagisikligi.
   Kapatilirsa iksir eski haline doner, baska hicbir sey
   etkilenmez. */
export const NITROKSIN_DUSME_BAGISIK = true;

export const LAZER_MENZIL = 21;

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
/* v4.75: 60 -> 140.
   60 iken liste isinin ancak ilk UC blogunu kapsiyordu (her
   adim 3x3x3 = 27 nokta yiyor) ve o uc blok genelde HAVA
   oldugu icin butun butce bosluga gidiyordu. Artik yalnizca
   DOLU merkezler listeye giriyor (bkz. goz_lazeri.js
   delmeListesi), yani bu sayi dogrudan "kac blok DERINE
   girebilir"e karsilik geliyor: 140 / 27 ~ 5 blok kalinliginda
   duvar, tek vurusta.                                        */
export const DUVAR_DELME_TAVAN   = 140;  // tek taramada en fazla kac blok

/* ============================================================
   SERT BLOKLAR  --  "obsidyende birazcik zorlansin"  (v4.74)

   Kullanici: "yeri delsin obsidyene kadar, obsidyende birazcik
   zorlansin ama bayagi; odaklandigim yere, baktigim obsidyen
   blogunA gore yavas yavas kirilsin. Bunun tamamini
   kirabilmek icin 10 dusun -- birine odaklandiysan 10 kere
   lazer atmam gerekiyor."

   Asagidaki bloklar TEK VURUSTA kirilmiyor: her isin vurusunda
   sayaclari bir azaliyor, sifira inince kiriliyor.

   ISIN her LAZER_VURUS_ARALIK tickte (yarim saniye) bir
   vuruyor, yani 10 vurus = 5 SANIYE ayni bloga bakmak.
   "Yavas yavas kirilsin" tarifi bu.

   SADECE ISININ TAM ORTASINDAKI blok sayilir: 3x3 delikteki
   dokuz obsidyeni birden yontmak "odaklanma" olmazdi.
   Kenardaki sert bloklar oldugu gibi kaliyor, delik onlarin
   arasindan geciyor.

   BAKISINI CEKERSEN IYILESIYOR: LAZER_SERT_UNUTMA tick boyunca
   dokunulmayan blogun sayaci siliniyor. Yani obsidyeni delmek
   icin gercekten UZERINDE DURMAN gerekiyor; bir bakip
   kacmak ise yaramiyor.                                       */
/* ---- v4.75: "obsidyen kirilmiyor, lazerin gucunu artir" ----
   ASIL SEBEP SAYILAR DEGILDI: delme listesi isinin ancak ilk
   uc blogunu kapsiyordu ve o uc blok genelde hava oldugu icin
   birkac blok oteki obsidyene HIC vurus gitmiyordu. O hata
   goz_lazeri.js delmeListesi() icinde duzeltildi.

   Ustune kullanicinin "gucu artir" istegi: 10 -> 6 vurus.
   6 vurus x yarim saniye = 3 SANIYE odaklanma. Hala
   "zorlaniyor" ama artik gercekten kiriliyor.

   SAYI SERBEST: v4.76'da kullanici acikladi -- "orda ornek
   verdim, illa oyle demedim ki; Minecraft'ta kirilmasi zor
   blok ya, 10 taneyi kirabiliyor, icraati vermeye
   calistim." Yani asil istek "sert bloklari da deliyor"
   hissi; 10 bir olcu birimi degil. Denge icin serbestce
   oynatilabilir.                                            */
export const LAZER_SERT_ACIK = true;
export const LAZER_DELME_SERT = new Map([
  ["minecraft:obsidian",            6],
  ["minecraft:crying_obsidian",     6],
  ["minecraft:respawn_anchor",      6],
  ["minecraft:enchanting_table",    6],   // obsidyen tabanli
  ["minecraft:ender_chest",         6],
  ["minecraft:ancient_debris",      6],
  ["minecraft:netherite_block",     8],
  ["minecraft:reinforced_deepslate", 10],
]);
export const LAZER_SERT_UNUTMA = 200;     // 10 sn dokunulmazsa sifirlanir
/* Her vurusta blogun uzerinde bir kivilcim: kac vurus kaldigini
   gormenin baska yolu yok, oyunun kirilma catlagi script'ten
   cizilemiyor.                                                */
export const LAZER_SERT_PARCACIK = "minecraft:critical_hit_emitter";

export const LAZER_KALINLIK = 1.4;   // isindan kac blok sapma vurulur
/* ---- ISIN SURESI (v4.69) ----
   Kullanici: "lazer kac saniye tutabiliyorum onu da soyleyebilir
   misin, uzatalim onu, en azindan bir 25 saniye daha ekleyelim."

   ONCEKI CEVAP: hic tutamiyordun. Lazer TEK ATISTI ve bu sayi
   (10 tick = yarim saniye) yalnizca isinin ne kadar GORUNUR
   kalacagiydi; hasar bir kez veriliyordu.

   Simdi gercek bir sureli isin: acik kaldigi surece her
   LAZER_VURUS_ARALIK tickte yeniden tariyor ve vuruyor, her
   tick oyuncunun O ANKI bakisindan cikiyor (supurebiliyorsun).

   0,5 sn + 25 sn = 25,5 sn = 510 tick.                       */
export const LAZER_SURE     = 600;   // 30 saniye
export const LAZER_VURUS_ARALIK = 10;  // her yarim saniyede bir vurur
export const LAZER_CIZIM_ARALIK = 8;   // parcacik her 8 tickte
export const LAZER_ADIM     = 3.0;   // parcacik kac blokta bir (model asil gorsel)
export const LAZER_TAVAN    = 10;    // tek atista en fazla kac hedef
export const LAZER_OYUNCU   = true;  // oyunculara da vursun mu
/* ---- v4.73: ALEV DEGIL KIVILCIM ----
   Lazer parcacigi basic_flame_particle idi. Kullanici ekran
   goruntusu gonderdi: oyuncu YANIYORMUS gibi duruyordu, cunku
   1,5 blok arayla 15 alev, her 4 tickte yeniden, 25 saniye
   boyunca -- yaklasik 1900 alev parcacigi.

   Isin artik bir MODEL (bkz. LAZER_MENZIL notu ve
   kol_uret.py isin_kutulari). Parcacik ikincil kaldi ve tek
   isi var: BIRINCI SAHISTA da bir sey gorunsun. Kafaya bagli
   model birinci sahista cizilmiyor -- F5'e basmadan kendi
   isinini goremezsin, parcacik o bosluğu dolduruyor.

   endrod: kucuk beyaz kivilcim, ates gostermiyor.            */
export const PARCACIK_LAZER = "minecraft:endrod";

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
   vuruyor" diye dusunmek zorunda kalma.

   ============================================================
   v4.78 GERI ALINDI -- YERINE IKISER YENI BUYU (v4.80)

   v4.78'de butun efektlere +1 seviye verilmisti. Kullanici
   denedi ve begenmedi: "su andaki surumun iksirlerini
   sevmedim, yani verdigi gucleri sevmedim... eski iksirlerin
   buyulerini bul, onlari + kendi secegin FARKLI FARKLI
   buyuler ekle."

   DERS: toplu +1 aslinda hicbir sey degistirmiyor. Herkes
   ayni oranda buyuyunce iksirler arasindaki fark AYNEN
   kaliyor, sadece roma rakamlari sisiyor. Oynanista
   hissedilen sey YENI BIR YETENEK, bir basamak daha yuksek
   ayni yetenek degil.

   IKINCI DERS (v4.79'da yapildi ve geri alindi): hepsine AYNI
   yeni efekti (jump_boost) vermek de ayni hata. Kullanicinin
   "farkli farkli" demesi tam olarak bunun icin.

   Simdiki hal: seviyeler v4.77'deki gibi (birebir geri
   alindi), ustune her iksire IKI YENI efekt. Her iksirin
   IKILISI kendine ozel. Olcu "sayiyi buyut" degil, "bu
   iksirde EKSIK olan ve kimligine uyan sey":

     Nitroksin   saturation      kosmak acliktan yer
                 conduit_power   hiz her yerde -- su altinda da
     Grinoksin   fire_resistance tankin birinci acigi ates
                 slow_falling    ikinci acigi dusmek
     Redoksin    resistance 1    dovusuyor ama hasar indirimi
                                 HIC yoktu
                 fire_resistance kazma uzmani; madenci lav oldurur
     Firenoksin  health_boost 2  ates var, can yoktu
                 jump_boost 1    nether: lav golunu asabilsin
     Kan Iksiri  resistance 1    sert vuruyor, hicbir indirimi yok
                 slow_falling    suikastci yuksekten sessizce iner
     Hiperoksin  health_boost 1  "her seyden biraz" ama ek candan
                                 hic yoktu
                 saturation      sekiz dakikalik iksirde aclik
                                 kesiyordu
     StarOxine   water_breathing korumanin son acigi bogulmak
                 haste 1         tek yapamadigi is kazmakti
     Element     slow_falling    DORDUNCU element: hava
                                 (su/ates/toprak zaten vardi)
                 strength 1      elementin hicbir vurus gucu yoktu

   Yeni seviyeler UZMANLIK DUZENINE gore secildi; yeni gelen
   hicbir sey kendi alaninin uzmanini gecmiyor:
     can      Grinoksin 4 > StarOxine 3 > Firenoksin 2 > Hiperoksin 1
     indirim  StarOxine 4 > Grinoksin 3 > ... > Redoksin/Kan 1
     kazma    Redoksin 4 > Element 3 > ... > StarOxine 1
     vurus    Redoksin/Kan 4 > ... > Element 1

   ---- DEGISMEYEN IKI KURAL ----
   Asagidaki sayilar AMPLIFIER; oyunda gorunen seviye bunun
   BIR FAZLASI. ["strength", 3] ekranda "Kuvvet IV" yazar --
   kullanicinin ekran goruntusu bunu birebir dogruladi.

   SEVIYESIZ EFEKTLER 0'da kalir: night_vision,
   fire_resistance, water_breathing, conduit_power,
   invisibility, slow_falling, saturation. Bunlarin oyunda
   seviyesi yok; sayiyi buyutmek sadece roma rakamini
   degistirir ve oyunda hicbir sey yapmaz. Sahte icerik
   uretmiyoruz.

   DOKUNULMAZLIK TEK IKSIRDE: Bedrock'ta Dayaniklilik seviye
   basina %20 hasar dusuruyor ve seviye V (amplifier 4) TAM
   DOKUNULMAZLIK demek -- void, aclik ve /kill disinda hicbir
   sey degdirmiyor. Kullanici bunu SADECE StarOxine icin
   istedi ("hasari hic almasin"). Baska bir iksir 4'e cikarsa
   StarOxine'in varlik sebebi kalmaz.
   ============================================================ */
export const KADEMELER = [
  {
    kimlik: "nitroksin",
    ad: "Nitroksin",
    renk: [1.0, 1.0, 1.0],          // beyaz
    sure: 9600,                     // 480 saniye (8 dakika)
    goz: "pa:goz_beyaz",
    lazerGoz: "pa:goz_beyaz_lazer",
    ozet: "Hiz ve ziplama",
    lazer: {},
    /* Referans: speed 0, jump_boost 0, strength 0, resistance 0,
       instant_health 0.  Bizde hiz/ziplama UZMANI.             */
    /* ---- v7.6 GUCLENDIRME ----
       Kullanici: "nitroksin... onun da gucsuz oldugunu
       dusunuyorum artik."

       v4.78'in dersi burada gecerli: BUTUN efektlere +1
       vermek denendi ve kullanici BEGENMEDI -- herkes ayni
       oranda buyuyunce iksirler arasindaki fark aynen kaliyor,
       sadece roma rakamlari sisiyor. O yuzden bu sefer:

         1. YALNIZ KENDI UZMANLIGI buyudu (hiz ve ziplama 3->4).
            Baska hicbir efekte dokunulmadi; strength 2,
            resistance 1, haste 1, absorption 2 aynen duruyor.
            Yani uzmanlik duzeni bozulmadi -- Nitroksin zaten
            hizin uzmaniydi, sadece daha uzman oldu.
         2. YENI BIR YETENEK geldi: DUSME HASARI YOK
            (bkz. iksirler.js:nitroksinDusme). Sayi degil,
            oynamada hissedilen yeni bir sey.

       DUSME NEDEN: Nitroksin ziplama uzmani. Ziplama III ile
       atladiginda dusus hasarini KENDI yeteneginden yiyordun.
       `slow_falling` bunu hafifletiyordu ama Grinoksin ve Kan
       Iksiri'nde de var -- yani Nitroksin'e ait degildi.
       Dusme bagisikligi TEK IKSIRDE, tipki tam dokunulmazligin
       yalniz StarOxine'de olmasi gibi.                       */
    efektler: [
      ["speed",        4],   // referans 0 · v7.6: 3 -> 4
      ["jump_boost",   4],   // referans 0 · v7.6: 3 -> 4
      ["strength",     2],
      ["resistance",   1],
      ["haste",        1],
      ["absorption",   2],
      ["night_vision", 0],
      /* v4.16 buff: ziplama kimligini tamamliyor -- yuksekten atlayip yavas iniyorsun */
      ["slow_falling", 0],
      /* v4.80: kosmak acliktan yer; hiz uzmani acikmasin */
      ["saturation",   0],
      /* v4.80: hiz her yerde olsun -- su altinda da */
      ["conduit_power", 0]
    ]
  },
  {
    kimlik: "grinoksin",
    ad: "Grinoksin",
    renk: [0.0, 1.0, 0.2],          // yesil
    sure: 9600,
    goz: "pa:goz_yesil",
    lazerGoz: "pa:goz_yesil_lazer",
    ozet: "Dayaniklilik",
    lazer: {},
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
      ["water_breathing", 0],
      /* v4.80: tankin birinci acigi atesti */
      ["fire_resistance", 0],
      /* v4.80: ikinci acigi dusmekti */
      ["slow_falling", 0]
    ]
  },
  {
    kimlik: "redoksin",
    ad: "Redoksin",
    renk: [0.8, 0.0, 0.0],          // kirmizi
    sure: 9600,
    goz: "pa:goz_kirmizi",
    lazerGoz: "pa:goz_kirmizi_lazer",
    ozet: "Saldiri ve kazma",
    lazer: {},
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
      ["saturation", 0],
      /* v4.80: dovusuyor ama hasar indirimi HIC yoktu */
      ["resistance",   1],
      /* v4.80: kazma uzmani: madenci lav oldurur */
      ["fire_resistance", 0]
    ]
  },
  {
    kimlik: "firenoksin",
    ad: "Firenoksin",
    renk: [1.0, 0.45, 0.0],         // turuncu
    sure: 9600,
    goz: "pa:goz_ates",
    lazerGoz: "pa:goz_ates_lazer",
    ozet: "Ates",
    lazer: {},
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
      ["haste", 2],
      /* v4.80: ates var, can yoktu */
      ["health_boost", 2],
      /* v4.80: nether iksiri: lav golunu asabilsin */
      ["jump_boost",   1]
    ]
  },
  {
    kimlik: "kan_iksiri",
    ad: "Kan Iksiri",
    renk: [0.45, 0.0, 0.05],        // koyu kirmizi
    sure: 9600,
    goz: "pa:goz_kan",
    lazerGoz: "pa:goz_kan_lazer",
    ozet: "Vampir",
    lazer: {},
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
      ["invisibility", 0],
      /* v4.80: sert vuruyor ama hicbir indirimi yoktu */
      ["resistance",   1],
      /* v4.80: suikastci yuksekten sessizce iner */
      ["slow_falling", 0]
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
    lazer: {},
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
      ["conduit_power", 0],
      /* v4.80: "her seyden biraz" ama ek candan hic yoktu */
      ["health_boost", 1],
      /* v4.80: sekiz dakikalik iksirde aclik kesiyordu */
      ["saturation",   0]
    ]
  },
  /* ============================================================
     v4.62 -- IKI YENI IKSIR, IKI YENI REFERANS MODDAN

     Kaynaklar: "best StarOxine mod" ve "Element Iksiri modu V2".
     Kullanici: "guzel fikirleri alalim ve amacini degistirmeden
     yapalim." Yani ikisi de KENDI kimliginde kaldi, sadece
     bizim sisteme oturtuldu ve kusurlari ayiklandi.
     ============================================================ */
  {
    kimlik: "staroxine",
    ad: "StarOxine",
    /* v4.63: referansin kendi ikonundan olculdu -- (255,223,76).
       Onceki [0.96,0.88,0.55] hatirdan yazilmis soluk bir altindi. */
    renk: [1.0, 0.87, 0.30],        // altin-yildiz
    sure: 9600,
    goz: "pa:goz_yildiz",
    lazerGoz: "pa:goz_yildiz_lazer",
    ozet: "Koruma",
    lazer: {},
    /* Referansta gozun verdigi efektler: health_boost,
       night_vision, resistance -- ucu de I seviyesinde.
       Kimligi KORUMA, o yuzden burada da o.

       Grinoksin'den farki bilincli:
         Grinoksin  hasari GERI KAZANMA (regeneration 3)
         StarOxine  hasari HIC ALMAMA   (resistance 4)
       Ikisi de "dayaniklilik" ama ayri yollar; birbirinin
       kopyasi olmasinlar diye boyle ayrildi.                */
    efektler: [
      ["resistance",      4],   // UZMAN: Grinoksin 3
      ["health_boost",    3],
      ["fire_resistance", 0],
      ["absorption",      3],
      ["regeneration",    1],   // Grinoksin 3 -- orada uzman
      ["strength",        1],
      ["speed",           1],
      ["night_vision",    0],
      /* Yildiz kimligi: yuksekten dususte yavaslama */
      ["slow_falling",    0],
      /* v4.80: korumanin son acigi bogulmakti */
      ["water_breathing", 0],
      /* v4.80: tek yapamadigi is kazmakti */
      ["haste",        1]
    ]
  },
  {
    kimlik: "element",
    ad: "Element",
    /* v4.63: referansin goz dokusundan olculdu. Element'in iki
       gozu AYRI: buz (56,225,255) ve ates (255,178,0). Icme
       parlamasi tek renk alabildigi icin buz tarafi secildi --
       lazerin isi dondurmak, kimligi o tasiyor. */
    renk: [0.22, 0.88, 1.0],        // buz-turkuaz
    sure: 9600,
    goz: "pa:goz_element",
    lazerGoz: "pa:goz_element_lazer",
    ozet: "Element ve dondurma",
    /* Referansin en ozgun fikri "donma": kafaya takilan bir
       esya gorunmezlik + yavaslik veriyordu. Uygulamasi
       bozuktu -- seviye 249 ve SURESIZ, yani referans modlarin
       o meshur "caresi olmayan kalici etki" huyu.

       Fikir alindi, kusur ayiklandi: lazer VURDUGUNU
       donduruyor, sureli.                                    */
    lazer: { modlu: "element" },
    efektler: [
      ["water_breathing", 0],
      ["conduit_power",   0],
      ["fire_resistance", 0],
      ["haste",           3],
      ["resistance",      2],
      ["speed",           2],
      ["absorption",      2],
      ["night_vision",    0],
      /* Element kimligi: her ortamda ayakta kal */
      ["regeneration",    1],
      /* v4.80: dorduncu element: HAVA (su/ates/toprak vardi) */
      ["slow_falling", 0],
      /* v4.80: elementin hicbir vurus gucu yoktu */
      ["strength",     1]
    ]
  }
];

/* Element lazerinin dondurma suresi ve siddeti. Referanstaki
   seviye 249 + suresiz DEGIL: sureli ve makul. Suresiz etki bu
   depoda dorduncu kez reddediliyor.                          */
export const LAZER_DONDUR_SURE = 100;   // 5 saniye
export const LAZER_DONDUR_SEVIYE = 3;   // Yavaslik IV

/* ============================================================
   LAZER  --  v4.68: SADECE VURUR, AMA COK SERT VURUR

   Kullanici: "bunlar sey vermesin kanka, sadece hasar versin,
   ekstra bir sey vermesin; element iksiri 2 secenegi olacak,
   onda sadece... yani bunlari kaldir ama lazeri sadece vurmak
   icin ekle. Ayrica goz lazerini guclendir: full elmas setli
   birinin elmas zirhinin tumunu yari canina indirsin... ayrica
   elmas setli o kisinin yarim kalplik cani kalsin... kalkan
   tuttugu zaman da o da 1-2 saniye icinde parcalansin."

   v4.67'de her iksirin lazerine ayri bir kimlik verilmisti
   (savur / zehir / sersem / ates / canCal / hiz / kalkan).
   Kullanici hepsinin kaldirilmasini istedi: lazer bir yetenek
   dagitici degil, bir SILAH. Tek istisna Element'in iki modu.

   ---- "YARIM KALP" KALDIRILDI (v4.81) ----
   v4.68'den v4.80'e kadar lazer zirhli bir hedefi OLDURMUYOR,
   yarim kalpte BIRAKIYORDU: vurustan sonra can okunuyor ve
   LAZER_BIRAKILAN_CAN'a cekiliyordu.

   Kullanici kaldirdi: "lazerin cani yarim kalpte birakmasi
   olayini tamamen kaldiriyoruz, cunku sureyi arttirdigimiza
   gore bunu tutmak gercekten cok zor... o yuzden tamamen
   oldursun."

   DOGRU KARAR, cunku o kural 30 saniyelik bir isinda anlamini
   yitiriyordu: isin yarim saniyede bir vuruyor, yani hedef 60
   kez "yarim kalpte sabitleniyor" ve hicbir zaman olmuyordu.
   Kisa bir atista "isini kendin bitir" hissi veriyordu; sureli
   isinda sadece olumsuz bir kilit oluyordu.

   ARTIK: tek dal, tek satir -- applyDamage(LAZER_HASAR).
   Sonuc zirha BAGLI, ve bu bilincli: modun geri kalani zaten
   zirhi eritiyor (LAZER_ZIRH_ACIK) ve kalkani kiriyor.

   ---- PEKI KIM KURTULUR? (olculdu, tahmin degil) ----
   Bedrock zirh formulu:
     hasar x (1 - min(20, max(zirh/5, zirh - 4*hasar/(toughness+8))) / 25)

   500 hasar o kadar BUYUK ki toughness terimi eksiye dusuyor
   ve full netherite bile yalnizca zirh/5 = 4 puan, yani %16
   indirim veriyor:
       500 -> 420
   Koruma buyusu EPF ile: EPF 20'de kesiliyor (%80):
       420 -> 84
   Dayaniklilik IV (%80):
       84 -> 16,8

   Yani en iyi vanilla kurulum bile vurus basina ~17 hasar
   yiyor ve isin YARIM SANIYEDE BIR vuruyor. 20 canli bir
   oyuncu iki vurusta gidiyor.

   TEK KURTULUS: Dayaniklilik V = TAM DOKUNULMAZLIK, yani
   bizim StarOxine'imiz. Vanilla'da hicbir set/buyu birlesimi
   lazerden kurtaramiyor.

   DIKKAT -- hasar turu "fire" secili: bu, ATES KORUMASI
   buyusunu devreye sokuyor (EPF'de seviye basina +2, yani
   dort parca Ates Korumasi IV tavana tek basina ulasiyor).
   Yukaridaki 16,8 zaten o tavana gore hesaplandi; daha
   kotusu yok.
   ============================================================ */

/* Ham hasar. Artik TEK is yapan sayi bu -- can tavani
   kalkti, sonucu bu sayi ve hedefin zirhi belirliyor.

     v4.69:  60 -> 200   ("patron cildirdi")
     v4.75: 200 -> 500   ("gucu artir, bayagi guclu olsun")

   500 neden yetiyor: ustteki hesap. En iyi vanilla savunma
   (netherite + Ates Korumasi IV + Dayaniklilik IV) vurus
   basina 16,8 yiyor ve isin yarim saniyede bir vuruyor --
   20 canli bir oyuncu bir saniyede gidiyor. Zirhsiz her sey
   tek vuruste.

   BUYUTMEK GEREKIRSE: o en iyi kurulumu TEK VURUSTA dusurmek
   icin ~1200 lazim (16,8 -> 40). Simdilik gerek gorulmedi;
   iki vurus zaten yarim saniye.                              */
export const LAZER_HASAR = 500;

/* ---- HASAR TURU: "fire" DEGIL  (v4.95) ----

   Kullanici: "goz lazerini bayagi denedim 359 vurus yaziyordu
   bekci yani warden olmedi bile."

   SEBEP OLCULDU, tahmin edilmedi: hasar turu "fire" idi ve
   Bedrock'ta bekcinin (warden) varlik tanimi
   minecraft:fire_immune tasiyor. Ates bagisikligi bir INDIRIM
   degil, TAM SIFIR: 500 hasar da 5000 hasar da hicbir sey
   yapmiyor. Sayac "359 vurus" diyordu cunku isin gercekten
   vuruyordu; sadece hasar hic inmiyordu.

   Ayni tuzak bekciye ozel degil: blaze, wither, wither
   iskeleti, magma kubu, strider, zombilesmis piglin, ender
   ejderi -- hepsi ates bagisikli. Yani lazer o listenin
   TAMAMINA karsi isesizdi.

   Ustteki zirh hesabi (fire -> Ates Korumasi buyusu) hala
   dogru, ama yanlis soruya cevap veriyordu: sorun indirim
   degil, bagisiklikti.

   ARTIK "entityAttack" ve damagingEntity = ATAN OYUNCU:
     - hicbir vanilla varlik entityAttack'e bagisik degil
     - oldurme SAHIBI oyuncuya yaziliyor: tecrube ve ganimet
       artik geliyor (fire'da damagingEntity yoktu, yani
       oldurulen sey "sebepsiz" oluyordu ve tecrube dusmuyordu
       -- bu ikinci, sessiz bir hataydi)
     - Ates Korumasi artik tavani tek basina doldurmuyor;
       en iyi vanilla kurulum vurus basina 16,8 degil daha
       fazla yiyor, yani lazer zayiflamadi, GUCLENDI.         */
export const LAZER_HASAR_SEBEP = "entityAttack";

/* ---- EMILEN VURUS SAYACI  (v4.95) ----

   Tur degistirmek bilinen bagisikliklari cozuyor ama kural
   sunu ogretti: BIR TUR SECIP "artik tamamdir" demek hatanin
   ta kendisiydi. Bu yuzden artik SONUCA bakiyoruz.

   Her vurustan sonra hedefin cani okunuyor. Dusmediyse vurus
   EMILMIS demektir. Ust uste bu kadar kez emilirse lazer
   hedefi dogrudan bitiriyor.

   Neden "ust uste" ve neden 1 degil: vanilla'da her varligin
   vurus sonrasi 10 tick dokunulmazlik penceresi var ve isin
   da tam 10 tickte bir vuruyor (LAZER_VURUS_ARALIK). Yani
   TEK emilen vurus normal olabilir -- pencereye denk gelmistir.
   Ust uste ucu ise pencereyle aciklanamaz: gercek bagisikliktir.

   Can okunamayan hedeflerde (bileseni olmayan varliklar) bu
   mekanizma HIC calismaz, eski davranis aynen surer.         */
export const LAZER_BAGISIKLIK_SINIR = 3;

/* ---- LAZER POZU (v4.70) ----
   Kullanici: "goz lazeri attiginda ellerim one dogru... ayrica
   birazcik beden tarafim birazcik egilsin, her goz lazeri
   attigimda bu sekilde olsun."

   Poz kaynak pakette uretiliyor (kol_uret.py lazer_animasyonu);
   burada sadece ADI ve anahtari var. Animasyonun UZUNLUGU
   LAZER_SURE ile ayni olmali -- uretecdeki LAZER_ANIM_TICK
   bunun ikizi ve test ikisini karsilastiriyor.

   Kapatmak istersen LAZER_POZ_ACIK = false: lazer aynen
   calisir, sadece poz olmaz.                                 */
export const LAZER_POZ_ACIK = true;
export const LAZER_POZ_ADI  = "animation.simsek.goz_lazeri";

/* ---- ZIRHI ERIT (v4.69) ----
   Kullanici: "patron cildirdi, full buyulu elmas zirhli...
   onlarin neredeyse tum canina goturSun, yani elmas bir kilic
   ile bir defa vurdugunda tum hepsi ayni anda kirilsin."

   v4.68'de dayaniklik YARIYA iniyordu (LAZER_ZIRH_ORAN = 0.5).
   Artik BITME NOKTASINA iniyor: her parcada bu kadar puan
   kaliyor. Bir elmas kilic vurusu zirha 1-2 puan yipranma
   bindirdigi icin dort parca da AYNI ANDA kiriliyor.

   ---- BUYULER NEDEN ONEMSIZ ----
   Kullanici "buyu isini sen hallet" dedi. Cevap: bu yol
   buyuye BAGISIK.
     Unbreaking  oyunun kendi yipranma zarina etki eder;
                 biz durability.damage'i DOGRUDAN yaziyoruz,
                 zar atilmiyor.
     Koruma      gelen HASARI azaltir, dayanikligi degil.
     Mending     tecrube kuresi ister, lazer sirasinda yok.
   Yani full buyulu elmas set ile ciplak elmas set arasinda
   bu etki bakimindan hicbir fark yok. Olculecek bir sey de
   yok -- degeri dogrudan yaziyoruz.

   ZATEN daha yipranmis bir parca ONARILMIYOR: daha kotu olan
   hangisiyse o kaliyor. Yoksa lazer dusmanin zirhini TAMIR
   ederdi.                                                    */
export const LAZER_ZIRH_ACIK = true;
export const LAZER_ZIRH_KALAN = 1;   // parca basina kalan dayaniklik puani

/* ---- KALKANI PARCALA ----
   "kalkan tuttugu zaman da o da 1-2 saniye icinde parcalansin"

   Aninda silinmiyor: once dayanikligi bitme noktasina
   cekiliyor (oyuncu esya cubugunda kirmiziya dondugunu
   goruyor), sonra bu sure dolunca gercekten kiriliyor.
   Aninda yok olsa "kalkanim nereye gitti" olurdu.           */
export const LAZER_KALKAN_KIR = true;
export const LAZER_KALKAN_SURESI = 30;   // 1,5 saniye
export const LAZER_KALKAN_ESYALARI = new Set(["minecraft:shield"]);

export const LAZER_MODLARI = new Map([
  ["element", [
    { kimlik: "buz",  ad: "Buz",  ek: { dondur: true, buzKafes: true } },
    { kimlik: "ates", ad: "Ateş", ek: { ates: true } }
  ]]
]);
export const LAZER_MOD_VARSAYILAN = "buz";

/* ---- BUZ KAFESI ----
   Dondurulan hedefin etrafina gecici bir kabuk oruluyor.

   BLOK NEDEN packed_ice: normal buz ERIYOR ve yerinde SU
   birakiyor. Oyuncunun evinin ortasinda kafes acilirsa
   sel basardi. packed_ice erimiyor.

   Kabuk SADECE HAVANIN yerine konuyor ve sure dolunca
   yalnizca BIZIM koydugumuz bloklar kaldiriliyor -- araya
   giren bir sey silinmiyor. Kabuk ici bos, yani hedef
   bogulmuyor; sadece kapali kaliyor.                        */
export const LAZER_BUZ_ACIK    = true;
export const LAZER_BUZ_BLOK    = "minecraft:packed_ice";
export const LAZER_BUZ_SURE    = 120;  // 6 saniye
export const LAZER_BUZ_YARICAP = 1;    // 3x3 kabuk
export const LAZER_BUZ_YUKSEK  = 2;    // iki blok boyunda
export const LAZER_BUZ_TAVAN   = 80;   // tek atista en fazla kac blok

/* ---- KULLANILMAYAN AYARLAR  (v4.99 taramasinda bulundu) ----

   Asagidaki alti satiri HICBIR KOD OKUMUYOR. Lazerin "sana
   kisa destek ver" fikri tasarlanmis ama hic baglanmamis;
   degeri degistirmek oyunda hicbir sey yapmiyor.

   SILINMEDILER cunku niyet belli ve bir gun baglanabilir --
   ama "ayar var, karsiligi yok" durumu tam olarak
   kullanicinin "vaat ettiklerini vermiyorlar" dedigi seyin
   kucuk hali. Baglanana kadar burada BOYLE duruyorlar ki
   kimse bunlari acik saniip beklemesin.

   Testte sayilari sabit: yenisi eklenirse tarama yakalar.  */
export const LAZER_HIZ_SURE     = 100;
export const LAZER_HIZ_SEVIYE   = 2;
export const LAZER_KALKAN_SURE  = 120;
export const LAZER_KALKAN_SEVIYE = 1;
export const LAZER_SERSEM_SURE  = 100;
export const LAZER_SAVUR_GUC    = 1.6;

/* Kademe -> iksir esyasi eslesmesi generator ile ayni sirada
   uretiliyor: pa:iksir_<kimlik>                                  */
export const IKSIR_ONEK = "pa:iksir_";
export const BOS_SISE   = "pa:bos_sise";

/* ---------------- Korunan bloklar ----------------
   Toprak topu ve blok yazan diger yetenekler bunlara dokunmaz.     */
/* ---- SANDIKLAR v4.86'DA EKLENDI ----
   Ustteki notlar yillardir "bedrock, sandik, komut blogu
   delinmiyor" diyordu ama SANDIK BU LISTEDE HIC YOKTU. Yani
   lazer duvar delerken ve Resetting Sword sifirlarken
   sandiklar esyalariyla birlikte gidiyordu -- tam da onlemek
   icin yazilmis olan sey.

   Yeni kilicin testi yakaladi: "sandik da KORUNAN kumede"
   satiri kirmizi dondu. Not dogruydu, liste eksikti.

   Esya TASIYAN her sey eklendi: sandiklar, firinlar, huniler,
   damiticilar, shulker kutusu, kum tuzagi. Bunlarin icindeki
   esyayi kaybettirmek geri alinamaz bir hata.              */
export const KORUNAN_KUME = new Set([
  "minecraft:chest",
  "minecraft:trapped_chest",
  "minecraft:ender_chest",
  "minecraft:barrel",
  "minecraft:shulker_box",
  "minecraft:undyed_shulker_box",
  "minecraft:hopper",
  "minecraft:dropper",
  "minecraft:dispenser",
  "minecraft:furnace",
  "minecraft:lit_furnace",
  "minecraft:blast_furnace",
  "minecraft:smoker",
  "minecraft:brewing_stand",
  "minecraft:beacon",
  "minecraft:conduit",
  "minecraft:lectern",
  "minecraft:chiseled_bookshelf",
  "minecraft:decorated_pot",
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

/* ---- TAVAN 100 -> 400 -> 200  (v4.88, v4.89) ----
   Kullanici once "400 kalp eklesin" dedi, denedi ve
   "400 kalp biraz fazla oldugu icin 200 kalbe dusuruyorum".
   Sayilar kullanicinin; dengelemek icin oynanmaz.

   ONCE DURUSTCE: Bedrock'ta bir oyuncunun SKININI script
   OKUYAMIYOR. "Bu skini giyince 400 kalp" diye bir kancaya
   baglanamiyor -- oyle bir API yok (referans mod bunu Java'da
   MorePlayerModels ile yapiyordu). O yuzden 400 kalp bir
   DUGMEYE baglandi: menudeki "Uzak Akraba: 400 kalp".

   Motor sinirinin altinda: health_boost seviye tavani 255,
   o da 2 x (255+1) = 512 kalp. 200 sigiyor (seviye 99).

   BILINEN BEDEL: can bari ekranda satir satir sariliyor.
   410 kalpte okunamaz hale geliyordu -- kullanici denedi ve
   210'a indirdi. Bu bir hata degil, oyunun can barinin siniri.
   Geri donus tek dokunus: "Kalpleri sifirla".                */
export const KALP_TAVAN    = 200;   // en fazla kac EK kalp (normal 10 haric)

/* Tek dokunusta tavana ciktaran miktar. KALP_ADIM ile ayni
   olsaydi 200 kalp icin menuye 20 kez basmak gerekirdi.
   TAVAN ile ayni tutuluyor; ayrisirlarsa dugme tavana
   ulastiramaz ve sebebi gorunmez.                            */
export const KALP_TOPTAN   = 200;
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

   ---- v4.20'DEKI COZUM EKSIKTI (v4.65'te anlasildi) ----
   O sürümde "iksir icilince ESYASIZ SECIMI lazere kaydir"
   yapilmisti. Kullanici ayni hatayi UC SURUM daha bildirdi:
   "goz lazerini atmaya calistigimda etrafta simsek yagiyordu."

   Sebep: ELDE KOL VARSA esyasiz secime HIC BAKILMIYOR.
   main.js/esyasizOyuncu once eldeki kola bakiyor; kol varsa
   onun secili yetenegi calisiyor. Kullanici Toprak Kol
   elindeyken oynuyor ve o kolun listesinde uc tane yildirim
   yetenegi var (yildirim_halkasi, alan_simsegi, coklu_simsek).
   Yani secim dogru yere kaydiriliyordu ama okunmuyordu.

   Simulasyonda dogrulandi: elde Toprak Kol + iksir + egil/zipla
   -> toprak_topu calisiyor, goz_lazeri degil.

   ---- YENI COZUM: LAZER MODU ----
   Indeksle oynamak birakildi. Bu ayar artik sunu aciyor:

     Iksir icilince LAZER MODU aciliyor. Acikken egil+zipla
     HER ZAMAN lazer atar -- elde ne oldugu fark etmez.
     Kademe bitince kendiliginden kapaniyor.
     Her kolun menusunde "⚡ Goz Lazeri" satiri var; tek
     dokunusla hem aciliyor hem atiyor, tekrar dokununca
     kapaniyor ve kolun yetenegi geri geliyor.

   false yaparsan mod kendiliginden acilmaz; menuden elle
   acilmaya devam eder.                                        */
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

/* v4.67: is_tamed bilesenini ekleyen olay. Varlik JSON'unda
   hep vardi ama script onu HIC tetiklemiyordu -- follow_owner'in
   calismamasinin iki sebebinden biri buydu.                    */
export const BOT_OLAY_EVCIL       = "pa:evcillestir";

/* Yeni dogan varligin bilesenleri ayni tick'te hazir
   olmayabiliyor; sahiplendirme bu kadar tarama boyunca
   tekrar deneniyor, sonra script takibine dusuluyor.          */
export const BOT_EVCIL_DENEME     = 5;

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
    /* ---- ATES ISINI  (v6.8) ----
       Kullanicinin "Ust Konsey" listesinden:
         execute ... positioned ^^^10 run particle
           minecraft:mobflame_single              (^^^1..^^^10)
         execute ... positioned ^^^10 run damage @e[r=10,c=1] 2
       Kajaros'a verildi: ates bagisikligi zaten onda ("lav
       basinda duran o olsun"), ates isini da onun olsun.
       Yakma suresi kaynakta YOK; hasar ates hasari degil, o
       yuzden yakma da eklenmedi -- uydurma sayi girmemek
       icin.                                                  */
    isin: {
      ad: "Ateş Gücü", hasar: 2, menzil: 10,
      parcacik: "minecraft:mobflame_single",
      bekleme: 60
    },
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
    can: 2600, hasar: 28,   /* v4.83: 13 -> 14 kalp. Bu sayi OYUNDA
                            GORULEN toplam; varlik JSON'unda 14 yaziyor
                            ve elindeki asanin 14'u uzerine ekleniyor. */
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
    seri: { adet: 3, pencere: 80 },
    /* ---- KIRMIZI GUC ISINI  (v6.8) ----
       Kullanicinin gonderdigi "Ust Konsey" komut listesinden:
         execute ... positioned ^^^10 run particle
           minecraft:redstone_ore_dust_particle   (^^^1..^^^10)
         execute ... positioned ^^^10 run damage @e[r=10,c=1] 2
       Lidere verildi: listedeki adi "Kirmizi Guc" ve rutbe 1
       olan tek uye o.                                        */
    isin: {
      ad: "Kırmızı Güç", hasar: 2, menzil: 10,
      parcacik: "minecraft:redstone_ore_dust_particle",
      bekleme: 60
    },
    /* Evoker disleri (v4.85). Kullanici: "evoker Minecraft'ta
       yerden tuzak cikartiyor ve ona denk gelirsen hasar
       veriyor ya, iste o yetenegi Okazor'a verelim."
       Sayilar DIS_* ayarlarindan geliyor; burada sadece
       "bu uyede var" yaziyor -- asa ile birebir ayni kalip. */
    disler: true
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

/* ---- OYUNDA ORTAYA CIKAN EKSIK (v4.59) ----
   Kullanici Warden'a denedi: "yere sermesini goremedim, hala
   ona vuruyordu." Sebep tek degil:

   1) inputpermission SADECE OYUNCUDA var. Mobda yok, yani
      moblar icin geriye yalniz yavaslik kaliyordu -- yavaslik
      da yerinde duran bir mobun VURMASINI engellemiyor.
   2) Zincirin hicbir belirtisi yoktu. Calissa bile disaridan
      gorunmuyordu, yani "olmadi" ile "oldu ama gorunmedi"
      ayirt edilemiyordu.

   CIVILE: dustugu nokta kaydediliyor, taramada oraya geri
   isinlaniyor. Yurumeye calisiyor, yerinden oynayamiyor.
   Oyuncuya uygulanMIYOR -- onu zaten girdi kilidi tutuyor,
   ustune isinlanma eklemek kamerayi sarsardi.

   GUCSUZ: Gucsuzluk yakin dovus hasarini dusuruyor. "Yerde
   yatan adam" vurmamali. 255 = pratikte sifir hasar.        */
export const SERSEM_CIVILE = true;
export const SERSEM_GUCSUZ = 255;

/* Zincirin her adimi actionbar'a dussun mu. Acik olmasi
   BILINCLI: bu yetenegin yarisi mobda gorunmuyor ve kullanici
   ne olup bittigini baska turlu anlayamiyor.                */
export const ASA_BILDIR = true;

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
export const DISMONT_ESYA = "pa:freedom_stone";
export const DISMONT_CEVHER = "pa:freedom_stone_cevheri";
export const MEZAR_ANAHTAR_ADET = 10;

/* ============================================================
   RESETTING SWORD  (v4.86)

   Kullanici: "hani bir tane modda inceleme yapmistik, admin
   yetkisi veriyordu ya, onu da ekle."

   ---- REFERANSIN KODUNDAN CIKARILDI, TAHMIN DEGIL ----
   Zabri Studios BoraLo Mod'da bu esyanin adi Resetting Sword
   (kod adi proximity_projection). Derlenmis siniflarindan
   cikan komutlar:

       gamemode spectator / gamemode survival
       fill ~5 ~5 ~5 ~-5 ~-5 ~-5 air

   Yani iki isi var:
     1. Seni IZLEYICI moduna atip geri cikariyor  <- "admin
        yetkisi" dedigin sey bu
     2. Cevreyi 11x11x11 temizliyor

   ---- BEDROCK'A GECERKEN NE DEGISTI ----
   Java'da /fill dogrudan calisiyor. Bedrock'ta da calisir ama
   biz KOMUT KULLANMIYORUZ: blok yazmak script tarafinda daha
   guvenli ve TICK BUTCESINE giriyor. 11x11x11 = 1331 blok;
   tek tickte yazilsa tablet donardi. Silme is kuyruguna
   giriyor, butce kadar ilerliyor.

   KORUNAN_KUME burada da gecerli: bedrock, sandik, komut
   blogu silinmiyor. Referansta bu koruma YOK -- "reset"
   kilicini yanlis yerde kullanan sandiklarini kaybediyor.
   ============================================================ */
export const KILIC_ACIK = true;
export const KILIC_ESYA = "pa:resetting_sword";
export const KILIC_HASAR = 12;          // 6 kalp
/* Temizleme kupunun yaricapi. Referans 5 (11x11x11 = 1331). */
export const KILIC_YARICAP = 5;
export const KILIC_TAVAN = 1331;        // guvenlik siniri
/* Izleyici modu ne kadar surer. Referansta suresizdi ve
   kapatan komut ayri bir dosyadaydi -- unutursan oyuncu
   sonsuza kadar izleyici kalirdi. Burada tek yerde ve
   SURELI: kilit hep cift (bkz. asa.js ayni kural).        */
export const KILIC_IZLEYICI_SURE = 200; // 10 saniye
export const KILIC_BEKLEME = 200;       // 10 saniye

/* ============================================================
   SILAH SISTEMI  (v4.87)

   Kullanici: "silah sisteminin yani silahla alakali olan tum
   seyleri al, bedrock'a uyumlu yap."

   ---- REFERANSIN SILAHLARI (siniflardan cozuldu) ----
   Zabri Studios BoraLo Mod'da 11 atesli silah var. Hepsinin
   iskeleti AYNI:
       esya + MERMI esyasi + bekleme + ses + carpma etkisi
   Farklari sadece sayilar ve carpinca ne oldugu.

   Ornekler (derlenmis siniflardan):
     Bazooka   -> ItemBazookaMissile mermisi, carpinca
                  world.createExplosion (func_72876_a)
     PDW       -> ItemAdvancedMagazine tuketiyor, bosalinca
                  ItemAdvancedMagazineEmpty birakiyor,
                  "boralo_mod:pdw_reload" sesi
     Revolver  -> ItemRevolverBullets, "goldenrevolver_shot"
     Stun Gun  -> mermisiz; vurunca yatma animasyonu + yavaslik

   ---- BEDROCK'A GECERKEN: MERMI VARLIGI YOK, ISIN VAR ----
   Java'da her silah bir MERMI VARLIGI doguruyor ve o ucuyor.
   Bedrock'ta bunu yapmak varlik butcesini yer (tick basina
   dort varlik) ve her mermi bir varlik demek.

   Bunun yerine ISIN TARAMASI: goz lazerinin ray yurüyüsünün
   aynisi. Anlik, bedava, zaten calistigi bilinen kod. Mermi
   ucusunu GORMEK icin izinde parcacik birakiliyor.

   Tek istisna Bazuka: patlama carpma NOKTASINDA oluyor, yani
   isin nereye degdiyse orada. Sonuc ayni, ucus animasyonu
   yok -- kabul edilen tek kayip.

   ---- MERMI GERCEKTEN TUKETILIYOR ----
   Referansta da oyle. Mermisiz silah tetige basinca bos
   tiklama sesi veriyor. "Sonsuz mermi" istersen ilgili
   satirdaki mermi alanini undefined yap.
   ============================================================ */
export const SILAH_ACIK = true;
/* Isin taramasinin adim boyu (blok). Kucultmek isabeti
   artirir ama tarama sayisini da artirir.                  */
export const SILAH_ADIM = 0.5;
/* Isindan kac blok sapmadaki hedef vurulur. Goz lazerinde
   1.4; silahlar daha keskin nisan aliyor.                  */
export const SILAH_KALINLIK = 0.9;
/* Parcacik izi: her kac blokta bir. */
export const SILAH_IZ_ARALIK = 1.0;
export const SILAH_IZ_PARCACIK = "minecraft:basic_smoke_particle";
export const SILAH_TAVAN = 6;          // tek atista en fazla kac hedef

/* Her silah: kimlik -> tanim.

     esya      : elde tutulan silah
     mermi     : tuketilen esya (undefined = mermisiz)
     hasar     : dogrudan hasar
     menzil    : blok
     bekleme   : tick
     patlama   : varsa carpma noktasinda patlama gucu
     sersem    : varsa hedefi bu kadar tick kilitler
     ceker     : true ise hedefi kendine ceker (yerçekimi)
     delici    : true ise ilk hedefte durmaz, hepsini vurur

   YENI SILAH EKLEMEK: buraya bir satir + kol_uret.py'deki
   SILAHLAR tablosuna ayni kimlikle bir satir. Baska hicbir
   yere dokunmak gerekmiyor.                                */
export const SILAHLAR = new Map([
  ["bazuka", {
    ad: "Bazuka",
    esya: "pa:bazuka",
    mermi: "pa:roket",
    hasar: 30,           // 15 kalp -- patlama ayrica vuruyor
    menzil: 40,
    bekleme: 60,         // 3 saniye
    patlama: 4,          // vanilla TNT gucu
    ses: "random.explode"
  }],
  ["pdw", {
    ad: "PDW",
    esya: "pa:pdw",
    mermi: "pa:sarjor",
    hasar: 10,           // 5 kalp
    menzil: 32,
    bekleme: 4,          // hizli: saniyede 5 atis
    delici: true,        // sirali hedefleri delip geciyor
    ses: "random.bow"
  }],
  ["revolver", {
    ad: "Revolver",
    esya: "pa:revolver",
    mermi: "pa:kursun",
    hasar: 20,           // 10 kalp
    menzil: 36,
    bekleme: 20,         // 1 saniye
    ses: "random.bow"
  }],
  ["altin_revolver", {
    ad: "Altın Revolver",
    esya: "pa:altin_revolver",
    mermi: "pa:altin_kursun",
    hasar: 40,           // 20 kalp
    menzil: 48,
    bekleme: 30,
    delici: true,
    ses: "random.bow"
  }],
  ["sersem_silahi", {
    ad: "Sersemletici",
    esya: "pa:sersem_silahi",
    mermi: undefined,    // mermisiz: bekleme uzun
    hasar: 2,            // 1 kalp -- isi vurmak degil
    menzil: 16,
    bekleme: 100,        // 5 saniye
    sersem: 120,         // 6 saniye kilit
    ses: "random.orb"
  }],
  ["cekim_silahi", {
    ad: "Yerçekimi Silahı",
    esya: "pa:cekim_silahi",
    mermi: undefined,
    hasar: 0,            // hic hasar yok: tasima araci
    menzil: 24,
    bekleme: 30,
    ceker: true,
    ses: "random.orb"
  }],
]);

/* ============================================================
   TASA CEVIRME  (v4.86)

   Kullanici: "tasa cevirme de olsun kanka."

   ---- REFERANSIN MEKANIGI (siniflardan cozuldu) ----
   Stone Converterer esyasiyla birine vurunca:
     - kurbana "Stoned" efekti biniyor
     - bulundugu yere bir HEYKEL BLOGU konuyor
     - kurbanin zirh yuvalarina tas kaplamasi giydiriliyor
       (yani tastan gorunuyor)
     - efekt bitince blok kalkiyor, kurban serbest

   ---- BIZDE NE FARKLI ----
   1. SURESIZ DEGIL. Referansin en can sikici huyu suresiz
      etkiydi; burada hem sure var hem de Freedom Stone ile
      kirilabiliyor. Mezar sistemiyle ayni kural.
   2. Zirh yuvasina kaplama giydirmiyoruz: oyuncunun zirhini
      calmak geri alinamaz bir hata olurdu. Gorunum ISTEGE
      BAGLI ve attachable ile yapiliyor (goz sisteminin ayni
      teknigi) -- kafa yuvasi zaten bizim.
   3. Kilit asa.js'in makinesini kullaniyor: oyuncuda
      inputpermission, mobda civileme. Ikinci bir kopya
      yazilmadi.
   ============================================================ */
export const TAS_ACIK = true;
export const TAS_ESYA = "pa:tas_donusturucu";
export const TAS_BLOK = "pa:tas_heykel";
export const TAS_HASAR = 6;             // 3 kalp -- isi vurmak degil
export const TAS_SURE = 600;            // 30 saniye
export const TAS_BEKLEME = 100;         // 5 saniye
/* Heykeli kirmak icin gereken Freedom Stone. Mezar 10
   istiyor; heykel daha hafif bir etki, 3 yetiyor.         */
export const TAS_ANAHTAR_ADET = 3;
export const TAS_KAYIT_ANAHTAR = "simsek:heykeller";
export const TAS_TAVAN = 8;             // ayni anda kac heykel

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
/* ---- UYE ISINLARI  (v6.8) ----
   Iki uyenin (Okazor, Kajaros) `isin` alani var: dusmana
   nisan alip duz bir cizgide vuruyorlar. Kaynak komutlari
   `^^^10` diyordu, yani aticinin BAKTIGI yon; bot bakmiyor,
   o yuzden hedefe dogru cizgi cekiliyor.

   Kaynak bunlari her tick calisan komut bloklariyla
   yapiyordu; burasi BOT_TARAMA (20 tick) araliginda donuyor
   ve ustune bir de bekleme var -- yoksa iki uye yaninda
   duran hicbir sey hayatta kalmazdi.                        */
export const ILKEL_ISIN_ACIK = true;
/* Cizgi kalinligi: hedefe giden dogruya bu kadar yakin olan
   vurulur. isinlar.js'teki ZIRH_ISIN_KALINLIK ile ayni fikir. */
export const ILKEL_ISIN_KALINLIK = 1.2;
/* Kac parcacik: menzil boyunca her bu kadar blokta bir. */
export const ILKEL_ISIN_ADIM = 1;
/* Tek atista en fazla kac hedef. Kaynak `c=1` diyor. */
export const ILKEL_ISIN_TAVAN = 1;

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

/* ============================================================
   ASA OYUNCUNUN ELINDE  (v4.83)

   ---- DORT SURUMDUR CALISMAYAN SEY BUYDU ----
   Kullanici: "El-Harkos'un asasi var ya, o calismadigini
   ogrendim, valla 4 surumdur goruyorum bunun calismadigini."

   Sebep: asa zinciri (3 vurus -> yere ser, 4. vurus -> mezar)
   YALNIZCA bot_ilkel.js:botVurdu'dan cagriliyordu ve o da
   ilkelKimligi(bot) istiyordu -- yani tetigi ancak BES UYEDEN
   BIRI cekebiliyordu.

   Ama asa yaratildigi gunden beri (v4.49) yaratici menusunde
   "equipment" kategorisinde duruyor: oyuncu alabiliyor,
   eline takabiliyor, vurabiliyor. Elinde HICBIR SEY yapmiyordu.
   Ustelik esyanin minecraft:damage bileseni de yoktu, yani
   vurusu YUMRUK kadardi (1 hasar).

   Yani hata "zincir bozuk" degil, "zincir oyuncuya hic
   baglanmamis"ti. Testler de bunu goremezdi: hepsi El-Harkos
   uzerinden gidiyordu ve gecıyordu.

   Artik iki tetik var, ikisi de ayni zinciri kullaniyor:
     - El-Harkos vurunca      (bot_ilkel.js, eskisi gibi)
     - OYUNCU asayla vurunca  (asa.js kancasi, yeni)
   ============================================================ */
export const ASA_OYUNCUDA = true;
export const ASA_ESYA = "pa:ilkel_asa";
/* Asanin normal vurus hasari. Kullanici: "normal vurusu da
   14+ olsun." 14 hasar = 7 KALP, yani elmas kilicin (7) iki
   kati, netherite kilicin (8) neredeyse iki kati. Sayi esyada
   yaziyor (kol_uret.py:ASA_HASAR); burasi testlerin ve menu
   metninin okudugu ikiz.                                      */
export const ASA_HASAR = 14;

/* ---- BALTA DA OLU BIR ESYAYDI (v4.84) ----
   Kullanici: "ilkel baltada da ayni sorunlar... onda da ayni
   sey var, yani tamamen olu bir esya. 16+ hasar vursun."

   Hakliydi ve asadan bir eksigi daha vardi: baltanin
   minecraft:digger bileseni de yoktu, yani ODUN BILE
   KESMIYORDU. Elinde balta gibi duran ama agaca vurunca
   yumruk kadar is goren bir sey.

   16 hasar = 8 KALP. Netherite balta 10; bu onun 1,6 kati.
   Asadan (14) yuksek olmasi bilincli: asanin gucu sayida
   degil ZINCIRINDE (yere ser + mezar).

   DORT UYE TASIYOR: Kajaros, Miskel, Raxxan, Okazor. Elde
   tutulan silahin hasari mobun vurusuna EKLENDIGI icin
   dordunun de varlik JSON'undaki tabani 16 dusuruldu --
   oyunda gorulen sayi ILKEL_BESLI'deki sayinin AYNISI kaldi.
   Bu hesap kol_uret.py:ilkel_taban_hasar'da, tek yerde.     */
export const BALTA_HASAR = 16;

/* Esya kimligi -> vurus hasari. ilkel.mjs bu tabloyu
   kullanarak "taban + silah = ayardaki sayi" diye siniyor;
   yeni bir silah eklenip buraya yazilmazsa test hemen
   yakalar.                                                  */
export const SILAH_HASARI = new Map([
  [ASA_ESYA, ASA_HASAR],
  ["pa:ilkel_balta", BALTA_HASAR],
]);

export function silahHasari(esyaKimligi) {
  return SILAH_HASARI.get(esyaKimligi) || 0;
}

/* Her taramada elin bos olup olmadigina bakilsin mi. Dunya
   yeniden yuklenince ya da silah bir sekilde dusunce kendi
   kendine geri geliyor. Kapatirsan silah sadece cagirma aninda
   veriliyor.                                                  */
export const ILKEL_SILAH_TAZELE = true;

/* ============================================================
   OKAZOR'UN DISLERI  (v4.85)

   Kullanici: "evoker Minecraft'ta yerden tuzak cikartiyor ve
   ona denk gelirsen hasar veriyor ya, iste o yetenegi Okazor'a
   verelim."

   ---- VANILLA DAVRANISI (olculdu, tahmin degil) ----
   Varlik kimligi Bedrock'ta minecraft:evocation_fang (Java'daki
   evoker_fangs DEGIL). Hasari 6 ve ZIRHTAN ETKILENMIYOR --
   sadece Koruma buyusu dusuruyor. Evoker'in kendi dizilimi de
   iki turlu: hedef YAKINSA halka, uzaksa duz cizgi. Ikisi de
   burada var.

   ---- DOST ATESI GERCEK BIR RISK ----
   Dogal olarak cikan disler illager'lara zarar vermiyor ama
   OYUNCUNUN/SCRIPT'IN cikardigi disler HERKESI vuruyor --
   seni de, botlarini da. Okazor senin tarafinda savastigi
   icin bu kabul edilemezdi.

   Cozum: dis konulmadan once o noktanin DIS_DOST_UZAK
   yaricapinda bir dost (sen ya da herhangi bir bot) var mi
   diye bakiliyor; varsa o dis hic cikmiyor. Kusursuz degil
   (dis ciktiktan sonra icine yurüyebilirsin) ama disler bir
   saniyeden kisa yasiyor.

   ---- HER VURUSTA DEGIL ----
   botVurdu her yakin dovus vurusunda calisiyor. Bekleme
   olmasaydi Okazor saniyede iki kez sekiz dis cikarirdi;
   hem gorsel kirlilik hem varlik butcesi felaketi.          */
export const OKAZOR_DIS_ACIK = true;
export const DIS_VARLIK   = "minecraft:evocation_fang";
export const DIS_BEKLEME  = 100;   // 5 saniye (vurus basina degil)
export const DIS_MENZIL   = 12;    // hedef bundan uzaksa hic cikmaz
export const DIS_YAKIN    = 4;     // bu kadar yakinsa HALKA, uzaksa CIZGI
export const DIS_CIZGI_ADET   = 8;
export const DIS_CIZGI_ARALIK = 1.0;   // blok
export const DIS_HALKA_ADET   = 8;
export const DIS_HALKA_YARICAP = 2.5;
/* Bir dostun bu kadar yakinindaki nokta ATLANIR. */
export const DIS_DOST_UZAK = 2.5;
/* Zemin ararken kac blok asagi bakilir. Disler havada
   duramaz; saglam bir blogun ustune konuyor.               */
export const DIS_ZEMIN_TARAMA = 4;
/* Tek seferde en fazla kac dis (varlik butcesi de ayrica
   sinirliyor).                                             */
export const DIS_TAVAN = 10;

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
/* ---------------- O SEY ("That Thing") ----------------  (v4.88)

   Kullanici: "bunu yapabilir miyiz yani 6 tane kolu var bir tane
   daha bedeni var... kendi skinimize gore detaylica bir arastirma
   yap en iyisini yapmani istiyorum."

   Model turkishminecraftlegends'in "That Thing"i. Geometrisi
   referans modun jar'indan BYTECODE ile cozuldu (tahmin degil,
   bkz. kol_uret.py: o_sey_geometrisi, jar_model_coz.py). Dokusu KENDI SKINIMIZ
   (UzakAkraba_skin.png) -- istenen buydu.

   Neden Ilkel Besli'ye eklenmedi: o liste kullanicinin tek tek
   dogruladigi BES kisi. O Sey onlardan biri degil, ayri bir
   efsane. Kimlik ayri, sayilari ayri; ama govdesi yine pa:bot
   govdesi, yani defter/canta/teslim/bekle hepsi calisiyor.

   Sayilar kol_uret.py'deki ikizleriyle esit olmali -- o_sey.mjs
   ikisini karsilastiriyor.                                    */
export const SEY_ACIK   = true;
export const SEY_KIMLIK = "pa:o_sey";
export const SEY_AD     = "O Şey";
export const SEY_TAVAN  = 1;      // tek tane; kalabalik degil, efsane
export const SEY_CAN    = 4400;   // 2200 kalp
export const SEY_HASAR  = 60;     // 30 kalp / vurus
export const SEY_BOY    = 2.75;   // blok -- carpisma kutusu boyu

/* ---------------- DONUSUM (KILIK) ----------------  (v4.89)

   Kullanici: "buna donusebiliyor olmam lazim... 2 tane skin
   yapman lazim, ikincisi that thing halim, ayni geometriyi
   kullan fakat SKIN olmalidir."

   ---- NEDEN SKIN DEGIL ----
   Denendi ve olmuyor: Mojang skin paketlerinde OZEL GEOMETRIYI
   KALDIRDI. Resmi istemcide skins.json sadece iki degeri kabul
   ediyor (geometry.humanoid.custom / customSlim), yani alti
   kollu bir govde SKIN olarak yuklenemiyor. Dolasan "4D skin"
   paketleri ya Marketplace imzali ya da yamali istemci istiyor.
   Script'ten de oyuncu modeli degistirilemiyor.

   ---- BEDROCK'TA GERCEKTEN CALISAN YOL: KILIK ----
     1. oyuncu gorunmez olur
     2. yerine pa:o_sey_kilik ciziliyor
     3. her tick oyuncunun konumuna ve donusune isinlaniyor
   Birinci sahista kendini zaten gormuyorsun; F5'e basinca ve
   BASKA OYUNCULAR icin O Sey gorunuyorsun.

   ---- GORUNMEZLIK NEDEN TAZELENIYOR ----
   Kalp sisteminin aynisi: efekt olunce, sure dolunca ve SUT
   ICINCE siliniyor. Defter kaynak, efekt onun goruntusu.
   Tazelenmezse oyuncu bir anda iki bedenli gorunur.            */
export const DONUSUM_ACIK      = true;
export const SEY_KILIK_KIMLIK  = "pa:o_sey_kilik";
export const DONUSUM_TARAMA    = 1;    // kac tick'te bir konum guncellensin
export const DONUSUM_TAZELEME  = 40;   // gorunmezlik kac tick'te bir yenilensin
export const DONUSUM_SURE      = 200;  // efekt suresi (TAZELEME x 5)
export const DONUSUM_KAYIT_ANAHTAR = "simsek:kilikler";
/* Kilik oyuncunun tam konumunda duruyor. Y kaydirmasi YOK:
   modelin ayaklari y=0'da (bkz. o_sey_geometrisi).            */
export const DONUSUM_Y_KAYMA   = 0;

/* ============================================================
   ZIRH YUKSELTMESI  (Ionstrike / Max Steel)          v4.91

   Kullanici: "bu modda alinabilir olan seylerini alacagiz ve
   ZIRH olarak takilabilir sekilde ayarlayacagiz, adi zirh
   yukseltmesi olsun."

   ---- KAYNAK: mod.jar = ionstrike v1.0.0 (Bionic) ----
   Palladium eklentisi, `lowcodefml` yani DERLENMIS SINIF YOK --
   her sey JSON. Sayilar dogrudan okundu:
       data/ionstrike/palladium/powers/<mod>.json
   Bytecode cozmeye gerek kalmadi.

   Mod TEK bir takim + bircok MOD (base, strength, speed,
   flight, stealth, heat, scuba, recon, titan). Bizde de oyle:
   takimi giy, modu menuden sec.

   ---- IKI MOTOR AYNI SEYI SOYLEMIYOR ----
   Referans Java'da ATTRIBUTE veriyor (generic.attack_damage
   +15 gibi). Bedrock'ta oyuncuya script'ten attribute
   verilemiyor; elde EFEKT var. O yuzden her satirin karsiligi
   ASAGIDA ACIKCA yaziyor. Bu bir "dengeleme" degil, bir
   CEVIRI -- ve nerede birebir tutmadigini da yaziyor.

     Guc      : Guc I = +3 hasar. +15 -> Guc V   (BIREBIR)
     Direnc   : seviye basina %20. Referansin zirh+toklugu
                Bedrock formulunde zaten %80'de tavan yapiyor,
                yani Direnc IV = tavan  (BIREBIR)
     Hiz/Acele: seviye basina %20. Referansin "movement +1"i
                oyuncunun taban hizinin 11 KATI -- Bedrock'ta
                boyle bir sey oynanamaz hale gelir. Niyet
                ("cok hizli") Hiz V ile karsilandi. TEK
                YAKLASIK SATIR BU, bilerek.
     Dusme    : referansta fall_resistance; Bedrock'ta dusme
                hasarini kesen efekt Yavas Dusus.
     Toklugun : Bedrock'ta ozel esyaya armor_toughness
                verilemiyor -- Direnc ile karsilandi.

   ---- ZIRH DEGERI ----
   base_mode: generic.armor +20. Vanilla netherite takimi da
   tam 20 puan, yani referansin tabani netherite seviyesi.
   Dagilim netherite ile ayni (3/8/6/3) ve kol_uret.py:ZIRH
   ile ESIT olmali -- zirh.mjs ikisini karsilastiriyor.       */
export const ZIRH_ACIK     = true;
export const ZIRH_TARAMA   = 20;    // kac tick'te bir bakilsin
export const ZIRH_SURE     = 120;   // efekt suresi (TARAMA x 6)

/* ---- GIYILEBILIR TAKIM KALDIRILDI  (v4.95) ----

   Kullanici: "iki surum oncesinde modlara donusebilmek icin
   temel zirh gerekiyordu, onu sen eklemistin; sonra bir surum
   sonra cekirdek kavrami geldi ve artik temel zirha ihtiyac
   kalmadi diye dusunuyorum... sadece yaratici modundayken
   oradan zirhi giyebiliyorduk ya, temel zirhi -- onu kaldir,
   ama cekirdek kismini, temel zirhi, ekle."

   DOGRU TESPIT. v4.91'de takim tek yoldu: dort parcayi giy,
   sonra menuden mod sec. v4.94'te cekirdek geldi ve
   ZIRH_TAM_TAKIM_SART cekirdek varken zaten es geciliyordu.
   Yani takim bir kapiydi ve o kapinin arkasindaki her sey
   artik baska bir kapidan geliyor. Kalan tek isi 20 zirh
   puaniydi -- onu vanilla netherite de veriyor.

   KALDIRILANLAR: ZIRH_PARCALAR (dort esya), ZIRH_KORUMA,
   ZIRH_TAM_TAKIM_SART ve bunlara bagli takimVarMi /
   takimParcalari.
   KALANLAR: dokuz CEKIRDEGIN hepsi -- Temel dahil.

   ---- ENVANTERDEKI PARCALAR ----
   pa:zirh_bas / govde / bacak / ayak artik kayitli degil;
   var olan dunyalarda o yigrinlar kaybolur. Kullanici
   biliyordu: o parcalar zaten yalnizca yaratici modundan
   alinabiliyordu, yani kimsenin emegi gitmiyor.              */

/* mod anahtari -> {ad, ozet, efektler:[[ad, sure, seviye]]}
   Efekt suresi ZIRH_SURE'den geliyor; listedeki sure alani
   sadece bicim uyumu icin duruyor (efektVer kalibi).         */
/* ---- v4.95: TABLO KAYNAKTAKI SAYILARLA YENIDEN OLCULDU ----

   Kullanici: "cekirdek diye adlandirdigimiz seyler vaat
   ettikleri seyleri bence vermiyorlar."

   HAKLIYDI, ve olculdu. Iki ayri hata vardi:

   1. DIRENC COK DUSUKTU. Ozetler "armor +20", "armor +80"
      diyordu ama tablo Direnc I (%20) veriyordu. Bedrock zirh
      formulu:
        indirim = min(20, max(zirh/5, zirh - 4*hasar/(tokluk+8))) / 25
      tokluk 15, zirh 20, 10 hasarlik vurus icin:
        max(4, 20 - 40/23) = 18,26 -> 18,26/25 = %73
      zirh 25 ve ustunde terim 20'yi asiyor ve %80 TAVANINA
      dayaniyor. Yani kaynaktaki her mod en az %60-80 indirim
      vaat ediyordu; biz %20 veriyorduk.

      Direnc seviye basina %20. Esleme:
        zirh 20-50 (sekiz mod) -> Direnc III (amp 2, %60)
        zirh 80    (titan)     -> Direnc IV  (amp 3, %80)
      Titan bilerek ayri: kaynakta 80/75, digerleri 20-30.
      Direnc V (amp 4) TAM DOKUNULMAZLIK ve o StarOxine'e
      ayrilmis -- buraya girmiyor.

   2. YANLIS EFEKT, EKSIK EFEKT.
      - Ucus modunda "fire_resistance" vardi; kaynakta ates
        bagisikligi ISI modunda, ucusta DEGIL. Ucusun uc
        bagisikligi: oksijen, donma, patlama.
      - Dalis ve Kesif modlarinda zirh vaadi vardi ama
        direnc hic yoktu (amp 0 = %20).
      - Isi modunda "isin 20 hasar" yaziyordu; ortada isin
        yoktu. Titan'in 50 hasarlik lazeri de yoktu. Ucus modu
        UCMUYORDU. Ucu de artik gercek yetenek (asagida
        "yetenek" alani).

   ---- AKTARILAMAYANLAR (uydurulmadi, raporlaniyor) ----
     entity_reach +33 (titan) . Bedrock'ta menzil efekti yok.
     knockback_resistance     . efekt karsiligi yok.
     entity_glow (kesif)      . Bedrock'ta parlama efekti yok;
                                gece gorusu en yakin karsilik.
     donma bagisikligi (ucus) . Bedrock'ta karsiligi yok.
     attack_speed +5 (hiz)    . saldiri hizi efekti yok.
   Bunlar ozetlerde ARTIK VAAT EDILMIYOR: ozet metinleri
   Palladium ozellik adlarinin kopyasi olmaktan cikip
   oyuncunun GERCEKTEN aldigi seyi yaziyor.                    */
/* ================================================================
   VILTRUMITE CORE  ->  TEMEL ZIRH                          v5.6

   Kullanici: "Max Steel modundaki temel zirh var ya, bu mod
   SADECE temel zirhla birlestirilecek, diger hicbir seyle
   degil... cunku ben temel zirhin zayif oldugunu dusunuyorum."

   HAKLIYDI. v4.95'te olculen tabloda Temel'in tek sahip oldugu
   sey Direnc III + slow_falling'di; diger sekiz modun HEPSI
   ayni ikilinin ustune bir sey koyuyordu. Temel, adi ustunde,
   tabandi.

   ---- KAYNAK ----
   viltrumitecore 1.8.1 (baranhan123), Forge. Invincible
   dizisindeki Viltrumite irki. Sayilar iki yerden okundu:
     * ViltrumiteCoreConfig  -> bytecode varsayilanlari
     * ViltrumiteAbilities   -> modun KENDI tooltip metinleri
       (yuzdeler orada yaziyor: "%200 of your base attack
       damage", "%175", "%70", "4 seconds"...)
   Yani hicbir sayi uydurulmadi; her biri asagida nereden
   geldigiyle birlikte yazili.

   ---- NEDEN SADECE TEMEL ----
   Kullanicinin acik sarti. Kapi tek yerde: viltrumiteVar()
   elindeki cekirdegin VILT_MOD oldugunu soruyor. Yetenekler
   menuden de secilebildigi icin kapi yetenegin KENDI icinde
   (Marvel mekaniklerindeki kalibin aynisi).
   ================================================================ */
export const VILTRUMITE_ACIK = true;

/* Hangi mod cekirdegi Viltrumite gucu veriyor. TEK deger --
   iki yerde tutulsa ayrisirdi.                                */
export const VILT_MOD = "temel";

/* PlayerStatsMixin.onInitStatTracker: STAT_BASE_DAMAGE = 19.0f
   Butun vurus yetenekleri bunun YUZDESI olarak taniml.        */
export const VILT_TEMEL_HASAR = 19;

/* ViltrumiteCoreConfig varsayilanlari (bytecode):
     damageReductionPercent = 97.0f
     damageIgnoreThreshold  = 0.5f
     punchBlockDropChance   = 40.0f
     dashBlockDropChance    = 40.0f
     spaceLimitY            = 1500.0d                          */
export const VILT_INDIRIM      = 97;
export const VILT_ESIK         = 0.5;
export const VILT_BLOK_DUSME   = 40;
/* spaceLimitY = 1500 ALINMADI: modun ucus tavani. Bedrock
   dunyasinin tavani zaten 320, yani 1500 hicbir zaman
   yakalanmayacak bir sayi olurdu -- calismayan ayar
   birakmiyoruz.                                              */

/* ---- %97 INDIRIM BEDROCK'A NASIL SIGIYOR ----
   Direnc seviye basina %20, tavan amp 3 (Direnc IV = %80);
   amp 4 (tam bagisiklik) StarOxine'e ayrilmis, oraya
   girilmiyor. Yani efektle en fazla %80 verilebiliyor.

   Kalan %17 hasar olayindan GERI KAZANDIRILIYOR -- teknoloji
   zirhlarindaki geri kazanim kalibinin aynisi (o da entityHurt
   sonrasi can ekliyor ve yeni bir hasar olayi uretmiyor).

   Oran turetildi, tahmin degil: Direnc IV altinda oyuncuya
   ham hasarin (1 - 0.80)'i geliyor; biz (1 - 0.97) kalmasini
   istiyoruz.
       geri = gelen x (1 - (1 - 0.97) / (1 - 0.80))
            = gelen x (1 - 0.15) = gelen x 0.85                */
export const VILT_DIRENC = 3;          // amp 3 = Direnc IV
export const VILT_GERI_ORAN =
  1 - (1 - VILT_INDIRIM / 100) / (1 - (VILT_DIRENC + 1) * 0.2);

/* ---- PASIFLER  (v5.7'de eklendi) ----

   Kullanici: "temel zirh halindeyken 2 tane niye sey var ya,
   cesitlilik dedigin... temel moddayken bile 4 tane olur
   mesela, digerleri nerede."

   HAKLIYDI. v5.6'da yalniz YETENEKLERI aktarmisim; modun
   PASIFLERINI atlamisim. Jar'da alti tane daha var, hepsi
   ayri bir mixin:

     LivingEntityStatsMixin.rejectDebuffs
         MobEffectCategory.HARMFUL olan her efekt REDDEDILIYOR
     EntityFireMixin.makeViltrumiteFireImmune -> true
     EntityFreezeMixin.viltrumiteInfiniteAir
         getMaxAirSupply() donduruyor, yani hava bitmiyor
     PlayerFreezeMixin.viltrumiteCannotFreeze -> false
     PlayerStatsMixin.onTick
         can < maks iken her tick getHealFactor() kadar iyilesme
         (STAT_HEAL_FACTOR varsayilani 1.0f -> tick basina 1 can)
     PlayerStatsMixin.reduceExhaustion
         yorgunluk x 0.005f -- aclik 200 kat yavas iniyor       */

/* Tick basina iyilesme. Kaynakta STAT_HEAL_FACTOR = 1.0f.     */
export const VILT_YENILENME = 1.0;

/* Yenilenme EFEKTI yalniz GOSTERGE: oyuncu bir sey oldugunu
   gorsun diye veriliyor, isi script yapiyor. Sebep: Bedrock'un
   regeneration araligini (50 >> amp mi, 50/(amp+1) mi) bu
   ortamda OLCEMIYORUM ve tick basina 1 can gibi kesin bir
   sayiyi tahmine dayali bir amp'e emanet etmek istemedim.
   Script tarafi kaynakla birebir; efekt fazladan iyilestirse
   bile can tavanda kesiliyor, yani sonucu degistirmiyor.      */
export const VILT_YENILENME_AMP = 5;

/* Aclik: kaynakta yorgunluk x 0.005 (200 kat yavas). Bedrock'ta
   "yorgunluk carpani" diye bir sey yok; saturation aclik
   inmesini durduruyor -- en yakin karsilik, TAM esdegeri
   degil.                                                       */

/* Pasif taramasi. Zararli efekti silmek ve iyilesmek icin
   ZIRH_TARAMA (20 tick) fazla seyrek: yarim saniyede bir
   bakiliyor.                                                   */
export const VILT_PASIF_TARAMA = 10;

/* Reddedilen efektler. Bedrock script API'sinde "bu efekt
   zararli mi" diye bir soru YOK (Java'daki MobEffectCategory
   karsiligi yok), o yuzden liste ACIKCA yaziliyor. Vanilla'nin
   zararli saydiklari.                                          */
export const VILT_ZARARLI_EFEKTLER = [
  "slowness", "mining_fatigue", "instant_damage", "nausea",
  "blindness", "hunger", "weakness", "poison", "wither",
  "levitation", "fatal_poison", "darkness"
];

/* Efekt tazelemesi ICIN AYRI AYAR YOK: Temel'in Direnc IV'u
   zirh.js'in kendi ZIRH_SURE/ZIRH_TARAMA dongusunden geliyor,
   ikinci bir sayi tutmak ayrisan iki olcu demekti.            */

/* ---- YETENEKLER ----
   On iki yetenegin ONU aktarildi. Her satirin "kaynak" alani
   modun kendi yetenek kimligi, "tooltip" alani ise sayinin
   MODUN KENDI CUMLESINDEN geldigini gosteriyor.

   Bekleme sureleri modun tooltip'lerinden saniye olarak
   okunup tick'e cevrildi (x20).

   "sira" alani jest sirasindaki yeri: 380'den basliyor
   (Mahou 340-359'da, Marvel mekanikleri 320-327'de).         */
export const VILTRUMITE_YETENEKLER = new Map([
  ["vilt_yumruk", {
    ad: "Sonik Yumruk", kaynak: "viltrumite:punch", sira: 380,
    /* "deals 200% of your base attack damage. If you strike
        while flying this damage can scale up to 500%." */
    carpan: 2.0, ucusCarpan: 5.0,
    bekleme: 20,            // "Cooldown: 1s"
    menzil: 6, koniAci: 45, firlatma: 3.0, dikey: 1.2,
    /* "instantly breaks blocks in a huge cone ahead of you" */
    kirmaMenzil: 5,
    parcacik: "minecraft:huge_explosion_emitter"
  }],
  ["vilt_darbe", {
    ad: "Ölümcül Darbe", kaynak: "viltrumite:chop", sira: 381,
    /* "deals 175% of your base attack damage instantly...
        bleeding for 4 seconds... additional 175% damage over
        time which equals to 43.75% damage every second." */
    carpan: 1.75, kanamaCarpan: 1.75, kanamaSure: 80,
    kanamaAra: 20,          // saniyede bir tik -> %43.75
    bekleme: 0, menzil: 4, koniAci: 60,
    parcacik: "minecraft:redstone_wandering_trail_particle"
  }],
  ["vilt_gok_gurultusu", {
    ad: "Gök Gürültüsü", kaynak: "viltrumite:thunderclap", sira: 382,
    /* "massive cone-shaped shockwave... launches targets
        caught inside high into the air." Hasar sayisi
        tooltip'te YOK -- kaynakta da yalniz firlatma var,
        o yuzden hasar da verilmiyor (uydurulmadi).       */
    hasar: 0, bekleme: 0, menzil: 10, koniAci: 70,
    firlatma: 2.0, dikey: 2.5,
    parcacik: "minecraft:knockback_roar_particle"
  }],
  ["vilt_yaylim", {
    ad: "Yaylım Ateşi", kaynak: "viltrumite:barrage", sira: 383,
    /* "Hold the key to unleash a relentless series of rapid
        punches." Cooldown 4s, Duration 4s (Max).
       Tek yumrugun hasari tooltip'te yok. Seri, Sonik
       Yumrugun yerine gecmemeli: tek vurus kasten KUCUK
       tutuldu (temel hasarin dortte biri), toplami 4
       saniyede 20 vurus x 4.75 = 95 -- ucarken atilan tek
       Sonik Yumrukla ayni. Boylece iki yetenek birbirinin
       kopyasi olmuyor.                                   */
    carpan: 0.25, vurusAra: 4, sure: 80, bekleme: 80,
    menzil: 5, koniAci: 50,
    parcacik: "minecraft:critical_hit_emitter"
  }],
  ["vilt_atilim", {
    ad: "Atılım", kaynak: "viltrumite:dash", sira: 384,
    /* "Dash forward at extreme speed and smash through
        blocks and enemies in your path." Cooldown 1s. */
    guc: 4.0, dikey: 0.4, bekleme: 20, carpan: 1.0,
    menzil: 4, kirmaMenzil: 2,
    parcacik: "minecraft:dragon_breath_trail"
  }],
  ["vilt_savunma", {
    ad: "Savunma Duruşu", kaynak: "viltrumite:block", sira: 385,
    /* "Absorbs 70% of all damage taken from the direction you
        are facing." Cooldown 3s, Duration 2s (Max).
       %70 emme, %97'nin USTUNE binmiyor -- ikisi de ayni
       hasari azaltiyor. Savunma sirasinda geri kazanim
       oranini %97'den %99.1'e cikariyor:
           1 - (1-0.97) x (1-0.70) = 0.991                */
    emme: 0.70, sure: 40, bekleme: 60
  }],
  ["vilt_kavra", {
    ad: "Kavra ve Taşı", kaynak: "viltrumite:grab", sira: 386,
    /* "Grab a living entity standing right in front of you by
        the throat and carry them through the air. Toggle
        again to release." Cooldown yok. */
    menzil: 4, tutusMesafe: 2, sure: 600
  }],
  ["vilt_kilit", {
    ad: "Hedef Kilidi", kaynak: "viltrumite:lock", sira: 387,
    /* "Lock your focus onto a living target and track their
        every move... disables if the target moves too far away
        or breaks line of sight." */
    menzil: 32, kopmaMenzil: 48, sure: 600, tarama: 2
  }],
  ["vilt_hiz", {
    ad: "Süper Hız", kaynak: "viltrumite:speed", sira: 388,
    /* "Gain immense movement speed while on the ground.
        Cannot be activated or used while flying." */
    seviye: 4, sure: 600
  }],
  ["vilt_firlayis", {
    ad: "Hızlı Kalkış", kaynak: "viltrumite:fast_takeoff", sira: 389,
    /* "Press Sneak and Double Jump to instantly launch
        yourself high into the sky." */
    dikey: 3.0
  }]
]);

/* ---- AKTARILAMAYANLAR (uydurulmadi, raporlaniyor) ----

   viltrumite:supersonic_flight (Cruise Flight)
       Temel zirh ZATEN ucuyor: asagida ZIRH_MODLAR["temel"]
       yetenek listesine var olan "ucus" yetenegi eklendi,
       yeni kod yazilmadi. Ama modun "maksimum hizin %60'inda
       BLOKTAN GECME" ve "asiri isinma" kisimlari Bedrock'ta
       karsiliksiz: ucus bir efekt, hiz esigi okunamiyor.

   viltrumite:speed_lock (Speed Lock)
       "Maksimum hizinin %20'sinin ustundeyken ucus hizini
       kilitle." Bizim ucusumuz efekt tabanli; ne anlik hiz
       okunabiliyor ne de kilitlenebiliyor. Karsiligi YOK.

   Ayrica alinamayanlar:
     * punch/dash blok kirma KONISI 40 blok degil: blokIste()
       butcesi var (AYNI_ANDA=2). kirmaMenzil kasten kucuk.
     * damageIgnoreThreshold ham hasara bakiyor; bizde olay
       Direnc'ten SONRAKI hasari veriyor, ham hasar geri
       hesaplaniyor (viltrumite.js'te yazili).
     * Modun kendi HUD'i, yetenek carki ve NPC dogurucusu
       alinmadi -- bu depoda menu zaten var.                  */


/* ---- DIGER SEKIZ MOD IKI KATINA CIKARILDI  (v5.6) ----

   Kullanici: "temel gelen ozellikler fazla guclu olursa diger
   zirhlarin gucunu iki kat daha arttir, bu tamamen senin
   kararin."

   FAZLA GUCLU OLDU. Temel artik %97 hasar indirimi, ucus ve
   on yetenek tasiyor; digerlerinin en zengini (Titan) tek bir
   lazer + Direnc IV'tu. Karar: ikiye katlaniyor.

   ---- "IKI KAT" NE DEMEK, TEK TEK ----
   Bedrock efektlerinde seviye = amplifier + 1 ve etki seviyeyle
   DOGRUSAL. Bir efektin gucunu ikiye katlamak icin:
       yeni_amp = 2 x eski_amp + 1
   (orn. Guc V = amp 4 = +15 hasar -> amp 9 = Guc X = +30)

   Isinlarin hasari dogrudan x2 (ZIRH_ISIN tablosunda).

   ---- IKIYE KATLANAMAYAN IKI SEY ----
   1. DIRENC. III (%60) iki kati %120 ederdi; boyle bir sey
      yok. Tavan Direnc IV (%80, amp 3) -- amp 4 tam
      bagisiklik ve StarOxine'e ayrilmis, bu depo kurali.
      Sekiz modun hepsi III -> IV'e cikti; Titan zaten IV'tu,
      oldugu yerde kaldi. Yani direnc "iki kat" degil
      TAVANA cikti; ozetler de oyle yaziyor.
   2. SEVIYESIZ EFEKTLER. invisibility, water_breathing,
      night_vision, fire_resistance, conduit_power,
      slow_falling -- acik ya da kapali, ara degeri yok.
      Bunlar aynen kaldi.                                     */
export const ZIRH_MODLAR = new Map([
  ["temel", {
    ad: "Temel", kaynak: "base_mode",
    ozet: "VILTRUMITE · %97 hasar indirimi · zararlı etki bağışıklığı · " +
          "yenilenme · ateş + nefes + tokluk · uçuş · 10 yetenek",
    /* kaynak: armor 20 · toughness 15 · fall_resistance 10
       + viltrumitecore 1.8.1 (v5.6). Kullanicinin sarti:
       "bu mod SADECE temel zirhla birlestirilecek".

       Direnc III degil IV: %97 indirimin efektle verilebilen
       kismi (gerekcesi VILTRUMITE CORE basliginda). Kalan
       %17 hasar olayindan geri kazandiriliyor.

       Ucus BURADAN geliyor: modun Cruise Flight'i icin yeni
       kod yazilmadi, var olan "ucus" yetenegi listeye
       eklendi.                                              */
    /* v5.7: alti pasif daha (gerekcesi yukarida "PASIFLER").
       Ates ve hava kaynakta AYRI birer mixin; ikisi de
       Bedrock'ta dogrudan efekt karsiligi olan tek iki pasif.
       Yenilenme gosterge, isi script yapiyor.                */
    efektler: [["resistance", 0, VILT_DIRENC],
               ["slow_falling", 0, 0],
               ["fire_resistance", 0, 0],
               ["water_breathing", 0, 0],
               ["saturation", 0, 0],
               ["regeneration", 0, VILT_YENILENME_AMP]],
    /* Tek yetenek yerine LISTE: Viltrumite on yetenek
       getiriyor, tek alana sigmiyor. Digerlerinin "yetenek"
       alani oldugu gibi duruyor -- kollar.js ikisini de
       okuyor.                                               */
    yetenekler: ["ucus", ...VILTRUMITE_YETENEKLER.keys()]
  }],
  ["guc", {
    ad: "Güç", kaynak: "strength_mode",
    /* v5.8: matkap artik otomatik degil, buradan aciliyor. */
    yetenekler: ["zirh_matkap"],
    ozet: "güç X (+30 hasar) · direnç IV · acele II · MATKAP (menüden aç) · düşme hasarı yok",
    /* kaynak: attack_damage 15 · armor 30+20 · toughness 15 ·
       destroy_speed 2 · fall_resistance 100.
       +15 hasar = Guc V (seviye basina +3), BIREBIR.          */
    efektler: [["strength", 0, 9], ["resistance", 0, 3],
               ["haste", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["hiz", {
    ad: "Hız", kaynak: "speed_mode",
    ozet: "hız X · acele X · zıplama IV · direnç IV · düşme hasarı yok",
    /* kaynak: movement_speed +1 · attack_speed 5 ·
       destroy_speed 5 · step_height 2 · is_fall bagisikligi.
       v4.95: is_fall bagisikligi EKSIKTI -- slow_falling geldi;
       zirh 20 icin direnc de eksikti.                         */
    efektler: [["speed", 0, 9], ["haste", 0, 9], ["jump_boost", 0, 3],
               ["resistance", 0, 3], ["slow_falling", 0, 0]]
  }],
  ["ucus", {
    ad: "Uçuş", kaynak: "flight_mode",
    ozet: "UÇUŞ · su altında nefes · direnç IV · düşme hasarı yok",
    /* kaynak: space_breath · oksijen/donma/patlama bagisikligi ·
       armor 20 · flight_speed 1 (+ boost 3).
       v4.95: fire_resistance KALDIRILDI -- kaynakta ates
       bagisikligi ISI modunda. Yerine gercek ucus geldi.      */
    yetenek: "ucus",
    efektler: [["slow_falling", 0, 0], ["water_breathing", 0, 0],
               ["resistance", 0, 3]]
  }],
  ["gizlilik", {
    ad: "Gizlilik", kaynak: "stealth_mode",
    ozet: "görünmezlik · direnç IV · hız IV",
    /* kaynak: invisibility · armor 20 · isim gizleme.
       Hiz BIZIM eklemem, kaynakta yok: gizlilik modunun sessiz
       ve cabuk olmasi mantikli geldi. Ozet de oyle diyor.     */
    efektler: [["invisibility", 0, 0], ["resistance", 0, 3],
               ["speed", 0, 3]]
  }],
  ["isi", {
    ad: "Isı", kaynak: "heat_mode",
    ozet: "ATEŞ IŞINI (800 hasar) · ateş bağışıklığı · direnç IV",
    /* kaynak: armor 25 · is_fire bagisikligi ·
       energy_beam 20 hasar / 30 blok / 5 sn yakma.
       v4.95: "isin 20 hasar" vaadi vardi, isin YOKTU.
       Uydurma "strength 2" kaldirildi, yerine gercek isin.    */
    yetenek: "zirh_isi_isini",
    efektler: [["fire_resistance", 0, 0], ["resistance", 0, 3]]
  }],
  ["dalis", {
    ad: "Dalış", kaynak: "scuba_mode",
    ozet: "su altında nefes · su gücü · gece görüşü · direnç IV",
    /* kaynak: swim_speed 5 · armor 20.
       conduit_power su altinda hiz + gorus + nefes veriyor,
       swim_speed'in en yakin karsiligi.
       v4.95: direnc EKSIKTI (zirh 20 vaat ediliyordu).        */
    efektler: [["water_breathing", 0, 0], ["conduit_power", 0, 0],
               ["night_vision", 0, 0], ["resistance", 0, 3]]
  }],
  ["kesif", {
    ad: "Keşif", kaynak: "recon_mode",
    ozet: "gece görüşü · direnç IV · hız II",
    /* kaynak: entity_glow · vibrate · armor 20.
       entity_glow ve vibrate Bedrock'a AKTARILAMIYOR (efekt
       karsiligi yok) -- ozet artik onlari vaat etmiyor.
       v4.95: direnc amp 0 -> 2.                               */
    efektler: [["night_vision", 0, 0], ["resistance", 0, 3],
               ["speed", 0, 1]]
  }],
  ["titan", {
    ad: "Titan", kaynak: "titan_mode",
    ozet: "TITAN LAZERİ (2000 hasar) · güç LIV (+162) · direnç IV · zıplama VI · düşme hasarı yok",
    /* kaynak: armor 80 · toughness 75 · attack_damage 80 ·
       entity_reach 33 · knockback_resistance 10 ·
       titan_laser 50 hasar / 100 blok.
       Zirh+tokluk Bedrock formulunde %80 tavaninda -> Direnc IV.
       +80 hasar: Guc seviye basina +3, 27 seviye = +81.
       v4.95: lazer EKSIKTI. Menzil ve geri tepme direnci
       aktarilamiyor, ozet artik onlari vaat etmiyor.          */
    yetenek: "zirh_titan_lazeri",
    efektler: [["resistance", 0, 3], ["strength", 0, 53],
               ["slow_falling", 0, 0], ["jump_boost", 0, 5]]
  }]
]);


/* ---- WEAPONS OF MIRACLES KALDIRILDI  (v5.8) ----

   Kullanici: "animasyon tarafinda gene bozulmalar var. En
   iyisi onun ekledigi silahlar ve animasyonlari tum
   dosyalardan hangi dosyalarda varsa silelim tamamiyla...
   belli ki basaramiyoruz."

   v5.5'te olculebilen her sey duzelmisti (180'i asan kare
   sicramasi 147 -> 0, ara deger hatasi 350 -> 7 derece) ama
   OYUNDA hala bozuktu. Yani elimdeki olcutler yetmiyordu:
   duzelttigim seyler gercekten bozuktu, ama gorunen bozukluk
   baska bir yerden geliyordu ve onu bulamadim.

   KALDIRILANLAR: WOM_ACIK, WOM_ONEK, WOM_SILAHLAR (27 silah),
   WOM_DOVUS_ACIK, WOM_ANIM_ONEK, WOM_SERI_UNUTMA, WOM_SERI
   (63 animasyon) ve bunlara bagli her sey --
   yetenekler/wom_dovus.js, kaynak_anim/ef_cevir.py,
   kaynak_anim/wom_dovus.animation.json, 27 esya, 27 ikon,
   REFERANS_WOM.md, test/wom.mjs, test/wom_dovus.mjs.

   ---- ENVANTERDEKI SILAHLAR ----
   pa:wom_* artik kayitli degil; var olan dunyalarda o yiginlar
   kaybolur. Silahlar yalnizca yaratici modundan alinabiliyordu,
   yani kimsenin emegi gitmiyor -- v4.95'te zirh parcalari
   kaldirilirken de ayni durum vardi.

   ---- NE OGRENILDI, NEREDE DURUYOR ----
   Cevirinin butun dersleri NOTLAR.md v5.5 bolumunde duruyor
   (euler dal atlamasi, Root'un dusurulmesi, iskelet
   hiyerarsisi, katman cakismasi). Kod gitti, olcum kalmadi;
   bilgi kaldi. Ayni isi bir gun tekrar denersek oradan
   baslanir.

   Animasyon TARAYICISI (test/anim_tara.py) duruyor ve kalan
   animasyonlari taramaya devam ediyor -- o WoM'a ozel degildi.  */

/* ================================================================
   CAN SAYACI  (Health Overlay)                            v4.99

   Kaynak: HealthOverlay 8.0.0 (Terrails, MC 1.19+).
   Kendi tarifi: "A simple renderer for colored hearts."

   ---- ASIL OZELLIK AKTARILAMIYOR ----
   Mod 10 kalpten fazlasini UST USTE SATIRLAR yerine TEK
   SATIRDA, her 10 kalpte bir RENK DEGISTIREREK ciziyor.
   Bu tamamen Java cizim kodu: 36 derlenmis sinif ve
   `GuiGraphics` cagrilari. Dokulari (health.png,
   absorption.png) BEYAZ maskeler -- rengi kod veriyor,
   dosyada renk YOK. Olculdu.

   Bedrock'ta oyuncu HUD'unun kalp cizimi ne script'ten ne de
   kaynak paketten degistirilebiliyor; satir satir cizmeye
   devam ediyor. Yani renkli kalpler aktarilamiyor --
   uydurulmadi, raporlaniyor.

   ---- AKTARILAN: KALP SAYACI ----
   Modun ikinci ozelligi tasinabilir ve BURADA GERCEKTEN
   GEREKLI: healthoverlay.options.heart_display_mode
     off / always / on_change
   Uc mod da aynen aktarildi.

   Neden gerekli: KALP_TAVAN = 200, yani oyuncu 210 kalbe
   kadar cikabiliyor. Bedrock bunu 21 SATIR kalp olarak
   ciziyor ve ekranin yarisini kapliyor; kac canin kaldigini
   saymak imkansiz.

   ---- RENKLER BIZIM ----
   Modun kendi renk dizileri (normalColors, poisonedColors...)
   derlenmis sinifin icinde, metin olarak okunamiyor. Tahmin
   etmek yerine kendi esiklerimizi koyduk: dolulukla degisen
   uc renk. Modun renkleri DEGIL, bizim secimimiz.
   ================================================================ */
export const CAN_SAYACI_ACIK = true;
/* "kapali" | "hep" | "degisince"
   Modun off / always / on_change'inin karsiligi. Varsayilan
   "degisince": actionbar'i lazer sayaci ve donusum mesajlari
   da kullaniyor, surekli yazan bir sayac hepsinin ustune
   binerdi.                                                  */
export const CAN_SAYACI_MOD = "degisince";
/* Kac tick'te bir bakilsin. */
export const CAN_SAYACI_TARAMA = 10;
/* "degisince" modunda degisimden sonra kac tick gorunsun. */
export const CAN_SAYACI_SURE = 60;
/* Baska bir sey actionbar'a yazdiktan sonra kac tick
   SUSULSUN. Sayac konuskan bir sey degil; lazerin "359 vurus"
   yazisinin ustune binmesi kullanicinin bildirdigi hatanin
   ta kendisini gorunmez yapardi.                            */
export const CAN_SAYACI_SESSIZLIK = 40;
/* Doluluk esikleri -> renk. Modun renkleri DEGIL (okunamadi),
   bizim secimimiz.                                          */
export const CAN_SAYACI_RENKLER = [
  [0.5, "§a"],   // yarisindan fazlasi: yesil
  [0.25, "§e"],  // ceyreginden fazlasi: sari
  [0.0, "§c"]    // altinda: kirmizi
];

/* ================================================================
   BEN 10 BECERI AGACI                                     v4.98

   Kullanici: "oyunda bu mod kuruldugunda yanda bir sekme
   aciyor ve orada bir skill secilebiliyor, ekstra
   yeteneklerini arttirabiliyoruz; onun icin de bir menu
   oldugunu gordum, onlari da ekle."

   O sekme Palladium'un YETENEK EKRANI. Modun kendi
   dosyalarindan cikarildi -- hicbiri uydurma:

     data/alienevo_aliens/palladium/powers/<tur>.json
       . gizli olmayan, gui_position tasiyan her yetenek bir
         AGAC DUGUMU
       . conditions.unlocking icindeki
           palladium:ability_unlocked  -> ONKOSUL dugum
           palladium:scoreboard_score_buyable -> UCRET (puan)
       . palladium:attribute_modifier olanlar bir ISTATISTIK
         yukseltmesi (attack_damage / armor / armor_toughness /
         swim_speed)
     assets/alienevo/lang/tr_tr.json
       . dugum adlari ZATEN TURKCE, cevrilmedi -- modun kendi
         metni ("Kristalokinezi: Mermiler", "Sonik Patlama"...)

   ---- SEVIYE VE PUAN (data/alienevo/kubejs_scripts/xp.js) ----
   Uzayli halindeyken bir canliyi oldurunce o uzaylinin XP'si
   artiyor:
       xp += round(hedefin_maks_cani * 0.425)
   Kademe atlama esigi:
       gereken = kademe == 0 ? 100 : 100 * kademe
   Her kademe +1 YETENEK PUANI veriyor, tavan kademe 10.
   Sayilarin hepsi o dosyadan; carpan da esik formulu de
   birebir.

   ---- UC DAL ----
   gui_position agacin seklini veriyor: orta dal (x=0) ve iki
   yan dal (x<0, x>0), her biri kendi onkosul zinciriyle. Ilk
   dugum BEDAVA (ucret 0), gerisi birer puan.

   ---- ISTATISTIK YUKSELTMELERI NASIL CEVRILIYOR ----
   Kucuk artislar tek tek seviyeye cevrilemez: Bedrock'ta Guc
   seviye basina +3, Direnc seviye basina %20. O yuzden acilan
   dugumlerin katkilari TOPLANIP bir kez ceviriliyor
   (beceri.js:beceriEfektleri). Boylece "+1 saldiri" ucuncu
   kez alindiginda gercekten bir seviye kazandiriyor.
   ================================================================ */
export const BECERI_ACIK = true;
export const BECERI_KAYIT_ANAHTAR = "simsek:beceri";
/* xp.js: xpToAdd = Math.round(entityMaxHealth * 0.425) */
export const BECERI_XP_CARPAN = 0.425;
/* xp.js: maxXp = currentLevel === 0 ? 100 : 100 * currentLevel */
export const BECERI_XP_TABAN = 100;
/* xp.js: if (currentLevel >= 10) { ... return; } */
export const BECERI_TAVAN_KADEME = 10;

export const BECERI_AGACI = new Map([
  ["elmas", [
    { anahtar: "spikes_unlock", ad: "Kristal Kontrolü: Dikenler", dal: -1.5, derinlik: 1.5,
      gerek: "attack_upgrade", ucret: 1, etki: null },
    { anahtar: "attack_upgrade2", ad: "Saldırı §a+1", dal: -1.5, derinlik: 2.5,
      gerek: "spikes_unlock", ucret: 1, etki: ["saldiri", 1] },
    { anahtar: "attack_upgrade", ad: "Saldırı §a+1", dal: -1, derinlik: 1,
      gerek: "shards_unlock", ucret: 1, etki: ["saldiri", 1] },
    { anahtar: "shards_unlock", ad: "Kristalokinezi: Mermiler", dal: -0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "creation_unlock", ad: "Kristalokinezi", dal: 0, derinlik: 1,
      gerek: null, ucret: 0, etki: null },
    { anahtar: "health_upgrade", ad: "Dayanıklılık §a+5", dal: 0, derinlik: 2,
      gerek: "creation_unlock", ucret: 1, etki: ["zirh", 5] },
    { anahtar: "spike_circle_unlock", ad: "Kristalokinezi: Dikenler", dal: 0, derinlik: 3,
      gerek: "health_upgrade", ucret: 1, etki: null },
    { anahtar: "pillar_unlock", ad: "Kristalokinezi: Sütun", dal: 0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "defense_upgrade_1", ad: "Savunma §a+2", dal: 1, derinlik: 1,
      gerek: "pillar_unlock", ucret: 1, etki: ["zirh", 2] },
    { anahtar: "battlemode_unlock", ad: "Savaş Modu", dal: 1.5, derinlik: 1.5,
      gerek: "defense_upgrade_1", ucret: 1, etki: null },
    { anahtar: "defense_upgrade_2", ad: "Savunma §a+2", dal: 1.5, derinlik: 2.5,
      gerek: "battlemode_unlock", ucret: 1, etki: ["zirh", 1] },
  ]],
  ["dortkol", [
    { anahtar: "block_unlock", ad: "Blok", dal: -1.5, derinlik: 1.5,
      gerek: "defense_upgrade_1", ucret: 1, etki: null },
    { anahtar: "defense_upgrade_2", ad: "Dayanıklılık §a+6", dal: -1.5, derinlik: 2.5,
      gerek: "block_unlock", ucret: 1, etki: ["zirh", 6] },
    { anahtar: "defense_upgrade_1", ad: "Dayanıklılık §a+6", dal: -1, derinlik: 1,
      gerek: "leap_unlock", ucret: 1, etki: ["zirh", 6] },
    { anahtar: "leap_unlock", ad: "Sıçra", dal: -0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "boulder_unlock", ad: "Kaya Fırlatma", dal: 0, derinlik: 1,
      gerek: null, ucret: 0, etki: null },
    { anahtar: "attack_upgrade_1", ad: "Saldırı §a+4", dal: 0, derinlik: 2,
      gerek: "boulder_unlock", ucret: 1, etki: ["saldiri", 4] },
    { anahtar: "tornado_unlock", ad: "Kanca Kasırgası", dal: 0, derinlik: 3,
      gerek: "attack_upgrade_1", ucret: 1, etki: null },
    { anahtar: "sonic_clap_unlock", ad: "Sonik Patlama", dal: 0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "attack_upgrade_2", ad: "Saldırı §a+4", dal: 1, derinlik: 1,
      gerek: "sonic_clap_unlock", ucret: 1, etki: ["saldiri", 4] },
    { anahtar: "climb_unlock", ad: "Yüzey Tırmanışı", dal: 1.5, derinlik: 1.5,
      gerek: "attack_upgrade_2", ucret: 1, etki: null },
    { anahtar: "slam_unlock", ad: "Sismik Darbe", dal: 1.5, derinlik: 2.5,
      gerek: "climb_unlock", ucret: 1, etki: null },
  ]],
  ["cene", [
    { anahtar: "slash_unlock", ad: "Kamçı Vuruşu", dal: -1.5, derinlik: 1.5,
      gerek: "attack_upgrade", ucret: 1, etki: null },
    { anahtar: "climb_unlock", ad: "Yüzey Tırmanışı", dal: -1.5, derinlik: 2.5,
      gerek: "slash_unlock", ucret: 1, etki: null },
    { anahtar: "attack_upgrade", ad: "Saldırı §a+1", dal: -1, derinlik: 1,
      gerek: "leap_unlock", ucret: 1, etki: ["saldiri", 1] },
    { anahtar: "leap_unlock", ad: "Sıçrama", dal: -0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "bite_unlock", ad: "Isır", dal: 0, derinlik: 1,
      gerek: null, ucret: 0, etki: null },
    { anahtar: "attack_upgrade_1", ad: "Saldırı §a+1", dal: 0, derinlik: 2,
      gerek: "bite_unlock", ucret: 1, etki: ["saldiri", 1] },
    { anahtar: "tail_slam_unlock", ad: "Kuyruk Savurusu", dal: 0, derinlik: 3,
      gerek: "attack_upgrade_1", ucret: 1, etki: null },
    { anahtar: "aqua_jet_unlock", ad: "Su Jeti", dal: 0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "swim_upgrade_1", ad: "Yüzme Hızı §a+1", dal: 1, derinlik: 1,
      gerek: "aqua_jet_unlock", ucret: 1, etki: ["yuzme", 1] },
    { anahtar: "water_vortex_unlock", ad: "Su Girdabı", dal: 1.5, derinlik: 1.5,
      gerek: "swim_upgrade_1", ucret: 1, etki: null },
    { anahtar: "wave_unlock", ad: "Gelgit Dalgası", dal: 1.5, derinlik: 2.5,
      gerek: "water_vortex_unlock", ucret: 1, etki: null },
  ]],
  ["ates", [
    { anahtar: "fire_breath_unlock", ad: "Pyrokinezi: Ateş Nefesi", dal: -1.5, derinlik: 1.5,
      gerek: "defense_upgrade_1", ucret: 1, etki: null },
    { anahtar: "defense_upgrade_2", ad: "Savunma §a+4", dal: -1.5, derinlik: 2.5,
      gerek: "fire_breath_unlock", ucret: 1, etki: ["zirh", 4] },
    { anahtar: "defense_upgrade_1", ad: "Savunma §a+4", dal: -1, derinlik: 1,
      gerek: "heat_absorption_unlock", ucret: 1, etki: ["zirh", 4] },
    { anahtar: "heat_absorption_unlock", ad: "Pyrokinezi: Isı Emilimi", dal: -0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "fire_ball_unlock", ad: "Pyrokinezi: Alev Topu", dal: 0, derinlik: 1,
      gerek: null, ucret: 0, etki: null },
    { anahtar: "attack_upgrade_1", ad: "Saldırı §a+2", dal: 0, derinlik: 2,
      gerek: "fire_ball_unlock", ucret: 1, etki: ["saldiri", 2] },
    { anahtar: "tornado_unlock", ad: "Pyrokinezi: Hortum", dal: 0, derinlik: 3,
      gerek: "attack_upgrade_1", ucret: 1, etki: null },
    { anahtar: "pyro_leap_unlock", ad: "Pyrokinezi: Ateşle Taşıma", dal: 0.5, derinlik: 0.5,
      gerek: null, ucret: 1, etki: null },
    { anahtar: "attack_upgrade_2", ad: "Saldırı §a+2", dal: 1, derinlik: 1,
      gerek: "pyro_leap_unlock", ucret: 1, etki: ["saldiri", 3] },
    { anahtar: "pyro_surf_unlock", ad: "Pyrokinezi: Sörf Yapma", dal: 1.5, derinlik: 1.5,
      gerek: "attack_upgrade_2", ucret: 1, etki: null },
    { anahtar: "health_upgrade_1", ad: "Dayanıklılık §a+5", dal: 1.5, derinlik: 2.5,
      gerek: "pyro_surf_unlock", ucret: 1, etki: ["zirh", 5] },
  ]],
]);

/* Istatistik cevrimi. Bedrock adimlari:
     Guc    seviye basina +3 hasar
     Direnc seviye basina %20
   Zirh puani -> direnc: Max Steel modlarindaki olcumun aynisi
   (zirh 20-30 ~ %60-80). Burada artislar kucuk oldugu icin
   her 10 zirh puani bir Direnc seviyesi sayiliyor.           */
export const BECERI_SALDIRI_ADIM = 3;    // 1 Guc seviyesi
export const BECERI_ZIRH_ADIM    = 10;   // 1 Direnc seviyesi


/* ---------------- MOD ISINLARI ----------------  (v4.95)

   Kaynakta uc mod pasif efektten fazlasini veriyor ve bizde
   YOKTULAR -- kullanicinin "vaat ettiklerini vermiyorlar"
   dedigi seyin somut karsiligi buydu.

   Sayilar ionstrike/palladium/powers/*.json icindeki
   palladium:energy_beam bloklarindan BIREBIR:

     heat_mode  . fire_beam_both  damage 20 · max_distance 30
                  · set_on_fire_seconds 5 · cause_fire false
     titan_mode . titan_laser     damage 50 · max_distance 100
                  · set_on_fire_seconds 0

   cause_fire false OLDUGU GIBI korunuyor: isin blok
   tutusturmuyor, sadece HEDEFI yakiyor. Aksi hâlde titan
   lazeriyle 100 blokluk bir yangin hatti aciliyordu.

   Ucuncusu ucus: o zaten var olan "ucus" yetenegine baglandi,
   yeni kod yazilmadi (bkz. ZIRH_MODLAR.ucus.yetenek).        */
/* v4.96 -- AYNI SANIYELIK HASAR KURALI BURAYA DA UYGULANDI.

   v4.95'te bu iki isinin hasari kaynaktaki sayiyla (20 ve 50)
   BIREBIR alinmisti. Kahramanlari aktarirken fark edildi:
   palladium:energy_beam de, Fisk'in energy_projection'i da
   SUREKLI isin -- hasar HER TICK uygulaniyor. Bizim isinimiz
   tek atis + 1 saniye bekleme, yani ayni sayiyi almak
   kaynaktaki isini 20 KAT ZAYIFLATIYORDU.

   Tek kural, istisnasiz (kahraman isinlariyla ayni):
       tek atis = tick basina hasar x ZIRH_ISIN_BEKLEME
   Boylece saniyelik hasar kaynakla ayni kaliyor.

   "kaynakHasar" test icin duruyor: jar'daki JSON'la
   karsilastirilip cevrimin dogru uygulandigi olculuyor.     */
export const ZIRH_ISIN = new Map([
  ["zirh_isi_isini", {
    ad: "Ateş Işını", mod: "isi",
    kaynakHasar: 20, hasar: 800, menzil: 30, yakma: 5,
    parcacik: "minecraft:basic_flame_particle"
  }],
  ["zirh_titan_lazeri", {
    ad: "Titan Lazeri", mod: "titan",
    kaynakHasar: 50, hasar: 2000, menzil: 100, yakma: 0,
    parcacik: "minecraft:electric_spark_particle"
  }]
]);

/* Isinin YARICAPI: hedef bu kadar yakinsa isin uzerinde
   sayilir. Goz lazeriyle ayni olcu (LAZER_KALINLIK) -- iki
   isin da ayni el hissini vermeli.                          */
export const ZIRH_ISIN_KALINLIK = 1.2;
/* Tek atista en fazla kac hedef. Delici: onundekini gecip
   arkadakine de vuruyor, kaynaktaki energy_beam gibi.       */
export const ZIRH_ISIN_TAVAN = 8;
/* Parcacik sikligi (blok). 100 blokluk titan lazerinde her
   blokta parcacik atmak tek tickte 100 cagri demekti.       */
export const ZIRH_ISIN_ADIM = 1.5;
/* Bekleme: art arda basmak tek tuslu bir olum makinesi
   olmasin. Kaynakta energy_beam basili tutuluyor; bizde
   anlik atis + bekleme ayni sonucu veriyor.                 */
export const ZIRH_ISIN_BEKLEME = 20;   // tick



/* ---------------- MOD DONUSUMU ----------------  (v4.94)

   Kullanici: "Max steel modlarda ayri bir DONUSUM seyi olmasi
   lazim... zirhi aliyorum, donusum ayni kaliyor."

   HAKLIYDI. Referansta her modun KENDI TAKIMI var ve Palladium
   onu render_layer ile oyuncunun uzerine ciziyor:
     powers/<mod>.json -> abilities[].render_layer
     render_layers/<katman>.json -> geo + doku
   Dokuz modun dokuzunun da modeli ve dokusu cikarildi
   (kol_uret.py: ZIRH_MOD).

   ---- ZIRH YUKSELTMESI'NE DOKUNULMADI ----
   Kullanici "hicbir seyi degistirmeden" dedi. Zirh parcalari,
   puanlari, menusu aynen duruyor. Donusum AYRI bir esya:
   her mod icin bir CEKIRDEK. Eline al -> o modun takimina
   donusursun ve o modun gucleri gelir. Zirhi da giyersen zirh
   puani ustune biner.

   ---- NEDEN "ELINDE" ----
   Gorunusu suren molang sorgusu (get_equipped_item_name)
   yalniz main_hand/off_hand okuyabiliyor; zirh yuvalarini
   okuyamiyor. Guc de ayni kosula bagli, yoksa "takim gibi
   gorunuyorum ama gucum yok" olurdu (Ben 10'daki karar).      */
export const ZIRH_CEKIRDEK_ONEK = "pa:zirh_mod_";

/* ================================================================
   MAX STEEL YETENEK AGACI                                  v5.9

   Kullanici: "yetenek agaclarini dikkatlice hepsinin
   aldiklarimiz dahil teker teker bak, bizim yetenek agacimiz
   ile ayni olmasini istiyorum, bu modun yetenek agaci ile."

   ---- KAYNAKTAKI AGAC (olculdu) ----
   Butun gucler `gui_display_type: "tree"`. Kok `base_mode`;
   diger modlar ORADAN, CEKIRDEK ODEYEREK aciliyor:

       base_mode/heat_mode   -> palladium:item_buyable
                                { item: ionstrike:heat_core, amount: 1 }

   base_mode agacinin tamami (24 dugum) tarandi; mod -> bedel:

       isi       heat_core        gizlilik  stealth_core
       boyut     shrink_core      dalis     hydro_core
       titan     titan_core       ucus      flight_core
       guc       strength_core    kamuflaj  memory_core
       hiz       speed_core       top       cannon_core
       kesif     recon_core       klon      clone_core

   Iki dugum XP ile aliniyor:
       mode_select (mod carki)  -> 30 XP kademesi
       turbo_bike               -> 40 XP kademesi

   ---- BIZDE NEYIN DEGISTIGI ----
   Bizde cekirdek ELDE TUTULAN bir anahtardi: birakinca guc
   gidiyordu, yani agac YOKTU. Kaynakta cekirdek bir kez
   HARCANIYOR ve mod KALICI aciliyor; sonra mod carkindan
   seciliyor.

   Artik ayni: cekirdegi eline al, menuden "Aç" de -- cekirdek
   HARCANIR, mod kalici acilir. Acildiktan sonra cekirdegi
   tasimana gerek yok, menuden seciyorsun.

   ---- TEMEL NEDEN BEDAVA ----
   Kaynakta base_mode agacin KOKU; satin alinacak bir dugum
   degil. Bizde de oyle: Temel bastan acik.

   ---- MOD CARKI 30 XP ----
   Kaynaktaki `mode_select` dugumu 30 XP kademesi. Bizde menu
   zaten var; o yuzden XP ucreti MOD SECIMINI acmaya konuldu.
   Yani ilk modunu actiktan sonra secim yapabilmek icin bir
   kez 30 kademe odiyorsun -- kaynaktaki sirayla ayni.        */
export const ZIRH_AGAC_ACIK = true;
export const ZIRH_AGAC_ANAHTAR = "simsek:zirh_agac";
/* Kaynaktaki mode_select dugumunun bedeli. */
export const ZIRH_CARK_XP = 30;
/* Kaynakta base_mode agacin koku -- bedava. */
export const ZIRH_AGAC_KOK = "temel";

/* mod -> kaynaktaki cekirdek esyasinin adi. Bizim esyamiz
   ZIRH_CEKIRDEK_ONEK + mod; bu tablo yalnizca KAYNAKTAKI adi
   tutuyor, testte jar'la karsilastirilabilsin diye.          */
export const ZIRH_AGAC_BEDEL = new Map([
  ["isi",      "heat_core"],
  ["titan",    "titan_core"],
  ["guc",      "strength_core"],
  ["hiz",      "speed_core"],
  ["kesif",    "recon_core"],
  ["gizlilik", "stealth_core"],
  ["dalis",    "hydro_core"],
  ["ucus",     "flight_core"],
]);


/* ---- ACILABILIR KATMANLAR  (v5.8) ----

   Kullanici: "Max steel modunda guc modunu actigin zaman
   direkt elimde matkap oluyor; normalde matkap icin
   yetenekler kismi var ya, agac seklinde, tek tek
   acabiliyorsun. Ben oyle biliyorum."

   HAKLIYDI. Kaynakta olculdu -- strength_mode.json:
       "gui_display_type": "tree"
       drill_hands: palladium:tool_hands,
                    list_index 1, hidden_in_bar FALSE
   Yani matkap modun YETENEK BARINDA 1 numarali slot; oyuncu
   acip kapatiyor. (drilling 0, exo_render 2, armour 8 --
   hepsi ayni bar.) Biz "cekirdek eldeyse hep cizili"
   yapmisiz, o yuzden elde beliriveriyordu.

   Artik bir VARLIK OZELLIGI: script aciyor, kaynak paket
   q.property ile okuyup ciziyor. Varsayilan KAPALI.

   Neden dinamik ozellik degil de varlik ozelligi: kaynak
   paketin (gorunusun) okuyabildigi tek kanal bu. Marvel
   Project de ayni yolu kullaniyor (27 ozellik, ayni bicim).  */
export const ZIRH_KATMAN_ACIK = true;
export const ZIRH_MATKAP_OZELLIK = "pa:matkap";
export const ZIRH_MATKAP_MOD = "guc";
export const ZIRH_MATKAP_SIRA = 400;

/* Donusum caktisi. Referansta `transform_flash` bir
   palladium:lightning_sparks katmani: 20 kivilcim, kalinlik 4,
   cekirdek rengi #1AE2F0 (camgobegi). Bedrock'ta en yakin
   vanilla parcacik bakir kivilcimi -- ayni camgobegi aile.   */
export const ZIRH_CAKMA = "minecraft:electric_spark_particle";
export const ZIRH_CAKMA_ACIK = true;

/* ============================================================
   BEN 10  (AlienEvo)                                 v4.92

   Kullanici: "ben 10 modu bu iste. Elmas kafayi, dort kolu,
   yuzen ceneyi ve Ates topunu ekle SADECE."

   ---- KAYNAK ----
   AlienEvo 1.1.3 (Habb & Stephen), Fabric + Palladium.
   Modelleri GeckoLib ile yapilmis, yani ZATEN `.geo.json` --
   Bedrock bicimi. Ne bytecode cozmek gerekti ne elle cizmek.
   Tek degisiklik kemik adlari (bkz. kol_uret.py:BEN10_KEMIK).

   ---- NASIL CALISIYOR ----
   Esyayi eline (ya da yan eline) al -> o yaratik OLUYORSUN.
   Govdeyi oyuncu modeli paketi degistiriyor (v4.90'in
   makinesi), guclerini bu dosyadaki tablo veriyor.

   ---- SAYILAR ----
   powers/<tur>.json dosyalarindan OKUNDU. Ceviri kurali
   ZIRH_MODLAR'daki ile ayni; birebir tutmayan satirlar
   asagida ACIKCA yaziyor:

     Guc        seviye basina +3 hasar
     Can Artisi seviye basina +4 CAN (2 kalp)  -> +20 can = V
     Direnc     seviye basina %20
     Yavaslik   seviye basina %15 (elmas ve dort kol AGIR)

   TASINAMAYANLAR (Bedrock'ta karsiligi yok, uydurulmadi):
     knockback_resistance +255  -> oyuncuya verilemiyor
     freeze_immunity            -> boyle bir efekt yok
     step_height / entity_reach -> ayarlanamiyor              */
export const BEN10_ACIK   = true;
export const BEN10_TARAMA = 20;    // kac tick'te bir bakilsin
export const BEN10_SURE   = 120;   // efekt suresi (TARAMA x 6)

/* Bicimler: Ben 10'un kendi zaman cizgisi.
     Prototip  ilk Omnitrix        (2005 dizisi)
     Recal     yeniden ayarlanmis  (Alien Force)  <- modun "default"i
     10K       Ben 10.000          (gelecek)
   Uc bicim AYNI turun uc gorunumu: modun powers/<tur>.json
   dosyasi da tek, yani gucleri de ayni. Gorunum farkli, guc
   ayni -- referansta da oyle.                                */
export const BEN10_BICIM = [
  ["",       "Recal"],
  ["_proto", "Prototip"],
  ["_10k",   "10K"]
];

/* Turler ve gucleri. Bicimler asagida CARPILIYOR, elle
   yazilmiyor -- kol_uret.py:BEN10_TABAN ile ayni sira.       */
const BEN10_TABAN = [
  ["elmas", {
    ad: "Elmas Kafa", tur: "Petrosapien", kaynak: "petrosapien",
    ozet: "armor +20 · attack +14 · max_health +20 · ağır",
    /* +14 hasar 3'e tam bolunmuyor: Guc V = +15, en yakin.
       max_health +20 = Can Artisi V, BIREBIR.               */
    efektler: [["resistance", 0, 2], ["strength", 0, 4],
               ["health_boost", 0, 4], ["slowness", 0, 1]]
  }],
  ["dortkol", {
    ad: "Dört Kol", tur: "Tetramand", kaynak: "tetramand",
    ozet: "armor +60 · max_health +40 · attack +12.3 · ağır",
    /* v6.0: kaynakta bu turun `wall_climb` yetenegi de var
       (powers/tetramand.json) -- v4.92'de atlanmisti. */
    mekanikler: ["tirmanma"],
    /* max_health +40 = Can Artisi X, BIREBIR.
       attack +12.3 -> Guc IV (+12), neredeyse birebir.       */
    efektler: [["resistance", 0, 3], ["strength", 0, 3],
               ["health_boost", 0, 9], ["slowness", 0, 2],
               ["jump_boost", 0, 0]]
  }],
  ["cene", {
    ad: "Yüzen Çene", tur: "Piscciss Volann", kaynak: "piscciss_volann",
    ozet: "swim_speed +4 · destroy_speed +10 · attack +5",
    /* v6.0: kaynakta bu turun `wall_climb` yetenegi de var
       (powers/piscciss_volann.json) -- v4.92'de atlanmisti. */
    mekanikler: ["tirmanma"],
    efektler: [["water_breathing", 0, 0], ["conduit_power", 0, 0],
               ["haste", 0, 4], ["strength", 0, 1],
               ["resistance", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["ates", {
    ad: "Ateş Topu", tur: "Pyronite", kaynak: "pyronite",
    ozet: "ateş bağışıklığı · armor +12 · max_health +10 · ışın 9",
    /* max_health +10: Can Artisi II = +12 ve III = +8 esit
       uzaklikta -- yukari yuvarlandi.                        */
    efektler: [["fire_resistance", 0, 0], ["health_boost", 0, 2],
               ["strength", 0, 0], ["resistance", 0, 0],
               ["speed", 0, 0]]
  }],

  /* ============================================================
     v6.0'DA EKLENEN ON BES UZAYLI

     Kullanici: "ben 10'den almadigimiz uzaylilari ve formlari
     eklemeyi dusunuyorum... uzaylilarin guclerini birebir
     yapmaya calisacagiz."

     ---- SAYILAR TURETILDI, YAZILMADI ----
     Her satir `powers/<tur>.json` dosyasindan hesaplandi.
     Cevirinin kurallari (hepsi zaten bu dosyada tanimliydi,
     yenisi UYDURULMADI):

       Direnc  : Java zirh formulu (bkz. bu dosyada "DIRENC COK
                 DUSUKTU" notu, satir ~2939). 10 hasarlik
                 referans vurus, tavan Direnc IV.
       Guc     : seviye basina +3 hasar, esitlikte ASAGI
       Can     : seviye basina +4 can, esitlikte ASAGI
       Hiz     : Palladium'un movement_speed'i oyuncunun taban
                 hizina (0.1) orani; Hiz seviye basina %20.
                 TAVAN Hiz V -- kaynaktaki +1.65 taban hizin 16
                 KATI ve Bedrock'ta oynanmaz. Ayni gerekce
                 zirh tablosunda da yaziyor.
       Acele   : destroy_speed / 2, tavan Acele V
       Ziplama : leaping / 0.3
       Yenilenme: kaynagin `healing` yetenegi tick basina X can
                 veriyor; Bedrock'ta Yenilenme I = 50 tick'te 1
                 can, her seviye yariya iniyor.

     ---- HANGI DURUM SAYILDI ----
     Kaynakta bir ozelligin uc hali var: kosulsuz, beceri
     agacindan ACILAN, ve bir moda basiliyken GECICI. Ilk
     ikisi sayildi (ikisi de KALICI), ucuncunun POZITIFLERI de
     sayildi -- bizde o modlari acip kapayan bir dugme yok,
     yaratik "acik" geliyor. Gecici CEZALAR sayilmadi: Gulle'nin
     yuvarlanirken donan hizi ya da Hayalet'in fazdayken
     kaybettigi hasar, bizde hic girmedigimiz bir durumun
     bedeli olurdu.

     ---- TASINAMAYANLAR (uydurulmadi) ----
       flight_speed          Bedrock'ta pasif ucus efekti yok.
                             Ucan yaratiklara "suzulme"
                             mekanigi verildi (Marvel'den).
       freeze_immunity       Bedrock'ta donma bagisikligi yok
       is_projectile/explosion bagisikligi  efekti yok
       knockback_resistance  oyuncuya verilemiyor
       step_height, entity_gravity, entity_reach  ayarlanamiyor

     ---- ALINMAYAN IKI TUR ----
       Kryptonian    MODELI YOK. Guc dosyasi var ama jar'da
                     tek bir modeli/dokusu yok, render_layer'i
                     bos. Uydurma model cizilmedi.
       Crystalsapien MODU BITMEMIS. Modelini aldik ama guc
                     dosyasinda tek is yapan satir
                     `say Under Construction`. Gucsuz bir
                     yaratik kostumden ibaret olurdu.
     ============================================================ */
  ["vahsi", {
    ad: "Vahşi Sırtlan", tur: "Vulpimancer", kaynak: "vulpimancer",
    ozet: "direnç III · güç III · hız III · acele V · yavaş düşüş · gece görüşü",
    mekanikler: ["tirmanma"],
    efektler: [["resistance", 0, 2], ["strength", 0, 2], ["speed", 0, 2], ["haste", 0, 4], ["slow_falling", 0, 0], ["night_vision", 0, 0]]
  }],
  ["xlr", {
    ad: "Şimşek Hız", tur: "Kineceleran", kaynak: "kineceleran",
    ozet: "direnç II · güç II · hız V · acele II · yavaş düşüş · tokluk",
    efektler: [["resistance", 0, 1], ["strength", 0, 1], ["speed", 0, 4], ["haste", 0, 1], ["slow_falling", 0, 0], ["saturation", 0, 0]]
  }],
  ["gri", {
    /* v6.1 DUZELTME. v6.0'da bu satirda Direnc IV ve Guc II
       vardi; o sayilar `armor +56` ile `attack +7`den geliyordu
       ve ONLAR CIPLAK GALVAN'IN DEGIL, zirhinin/uzuvlarinin/
       takiminin sayilariymis (powers/galvan.json: armor_defense
       galvan_armor'a, suit_armor galvan_suit'e bagli).

       Formlar ayri esya olunca sayilar da yerine gitti: ciplak
       Gri Madde modun kendisinde de ZAYIF -- zirhi yok, ustelik
       `max_health -10` yiyor (Bedrock'ta negatif can artisi
       verilemiyor, o ceza TASINAMADI).                       */
    ad: "Gri Madde", tur: "Galvan", kaynak: "galvan",
    ozet: "hız V · zıplama IV · su solunumu · yavaş düşüş",
    mekanikler: ["tirmanma", "suzulme"],
    efektler: [["speed", 0, 4], ["jump_boost", 0, 3], ["water_breathing", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["sinek", {
    ad: "Sinek Suratlı", tur: "Lepidopterran", kaynak: "lepidopterran",
    ozet: "direnç II · güç II · yavaş düşüş",
    mekanikler: ["suzulme"],
    efektler: [["resistance", 0, 1], ["strength", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["yukseltme", {
    ad: "Yükseltme", tur: "Galvanic Mechamorph", kaynak: "galvanic_mechamorph",
    ozet: "direnç II · güç IV · su solunumu · yavaş düşüş · ateş direnci · yenilenme IV · tokluk",
    mekanikler: ["faz", "suzulme"],
    efektler: [["resistance", 0, 1], ["strength", 0, 3], ["water_breathing", 0, 0], ["slow_falling", 0, 0], ["fire_resistance", 0, 0], ["regeneration", 0, 3], ["saturation", 0, 0]]
  }],
  ["hayalet", {
    ad: "Hayalet", tur: "Ectonurite", kaynak: "ectonurite",
    ozet: "direnç II · güç II · su solunumu · yavaş düşüş · yenilenme II",
    mekanikler: ["faz", "suzulme"],
    efektler: [["resistance", 0, 1], ["strength", 0, 1], ["water_breathing", 0, 0], ["slow_falling", 0, 0], ["regeneration", 0, 1]]
  }],
  ["gulle", {
    ad: "Gülle", tur: "Arburian Pelarota", kaynak: "arburian_pelarota",
    ozet: "direnç III · güç II · can artışı V · hız I · yavaş düşüş",
    efektler: [["resistance", 0, 2], ["strength", 0, 1], ["health_boost", 0, 4], ["speed", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["jet", {
    bicim: 1,
    ad: "Jet Işını", tur: "Aerophibian", kaynak: "aerophibian",
    ozet: "direnç I · güç II · su solunumu · kanal gücü · yavaş düşüş",
    mekanikler: ["suzulme"],
    efektler: [["resistance", 0, 0], ["strength", 0, 1], ["water_breathing", 0, 0], ["conduit_power", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["atomik", {
    bicim: 1,
    ad: "Atomik", tur: "Nucleonix", kaynak: "nucleonix",
    ozet: "direnç IV · güç 33 · can artışı 20 · yavaş düşüş · yenilenme III",
    mekanikler: ["suzulme"],
    efektler: [["resistance", 0, 3], ["strength", 0, 32], ["health_boost", 0, 19], ["slow_falling", 0, 0], ["regeneration", 0, 2]]
  }],
  ["ejder", {
    bicim: 1,
    ad: "Ejderha", tur: "Dragonoid", kaynak: "dragonoid",
    ozet: "yavaş düşüş · ateş direnci",
    mekanikler: ["suzulme"],
    efektler: [["slow_falling", 0, 0], ["fire_resistance", 0, 0]]
  }],
  ["astro", {
    bicim: 1,
    ad: "Astro Bot", tur: "Astrobot", kaynak: "astrobot",
    ozet: "yavaş düşüş",
    mekanikler: ["sicrayis"],
    efektler: [["slow_falling", 0, 0]]
  }],
  ["bataklik", {
    bicim: 1,
    ad: "Bataklık Ateşi", tur: "Methanosian", kaynak: "methanosian",
    ozet: "direnç II · güç III · can artışı II · yavaş düşüş · ateş direnci · yenilenme I",
    mekanikler: ["faz", "suzulme"],
    efektler: [["resistance", 0, 1], ["strength", 0, 2], ["health_boost", 0, 1], ["slow_falling", 0, 0], ["fire_resistance", 0, 0], ["regeneration", 0, 0]]
  }],
  ["buz", {
    bicim: 1,
    ad: "Büyük Üşütük", tur: "Necrofriggian", kaynak: "necrofriggian",
    ozet: "direnç II · güç II · yavaş düşüş",
    mekanikler: ["faz", "suzulme"],
    efektler: [["resistance", 0, 1], ["strength", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["yanki", {
    bicim: 1,
    ad: "Yankı Yankı", tur: "Sonorosian", kaynak: "sonorosian",
    ozet: "direnç IV · güç II · hız II · zıplama II · yavaş düşüş",
    mekanikler: ["suzulme"],
    efektler: [["resistance", 0, 3], ["strength", 0, 1], ["speed", 0, 1], ["jump_boost", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["devasa", {
    bicim: 1,
    ad: "Devasaur", tur: "Vaxasaurian", kaynak: "vaxasaurian",
    ozet: "direnç IV · güç X · can artışı X · yavaş düşüş · ateş direnci",
    efektler: [["resistance", 0, 3], ["strength", 0, 9], ["health_boost", 0, 9], ["slow_falling", 0, 0], ["fire_resistance", 0, 0]]
  }],

  /* ============================================================
     v6.1'DE EKLENEN BES EK FORM

     Kullanici: "aldiklarimizin ek formlarina... hepsinin modeli
     jar'da var."

     Bunlar kaynakta bir TUSLA gecilen haller. Gecince hem
     gorunus hem NITELIK degisiyor -- yani ayri bir gucler
     kumesi, sadece baska bir kilik degil. Bizde tus yok, her
     form ayri esya (butun Ben 10 sistemi zaten boyle).

     Hangi hâlde hangi kosullu yetenegin acik oldugu
     powers/galvan.json'dan okundu:
       galvan_armor  -> armor +20 · flight_speed 1
       galvan_limbs  -> armor +10 · attack +2      · x5
       galvan_suit   -> armor +24 · attack +5 · ates bagisikligi
                        · knockback 255 · can cezasi YOK · x6.6
       ball_roll     -> tokluk +10                 · x1.03
     Cubuk AYRI bir guc dosyasi (powers/galvanic_rod.json).
     ============================================================ */
  ["gri_zirh", {
    ad: "Gri Madde · Zırh", tur: "Galvan", kaynak: "galvan",
    ozet: "direnç III · hız V · zıplama IV · su solunumu · yavaş düşüş",
    mekanikler: ["tirmanma", "suzulme"],
    efektler: [["resistance", 0, 2], ["speed", 0, 4], ["jump_boost", 0, 3], ["water_breathing", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["gri_uzuv", {
    ad: "Gri Madde · Uzuv", tur: "Galvan", kaynak: "galvan",
    ozet: "direnç I · güç I · hız V · zıplama IV · su solunumu · yavaş düşüş",
    mekanikler: ["tirmanma", "suzulme"],
    efektler: [["resistance", 0, 0], ["strength", 0, 0], ["speed", 0, 4], ["jump_boost", 0, 3], ["water_breathing", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["gri_takim", {
    ad: "Gri Madde · Takım", tur: "Galvan", kaynak: "galvan",
    ozet: "direnç IV · güç II · hız V · zıplama IV · su solunumu · yavaş düşüş · ateş direnci",
    mekanikler: ["tirmanma", "suzulme"],
    efektler: [["resistance", 0, 3], ["strength", 0, 1], ["speed", 0, 4], ["jump_boost", 0, 3], ["water_breathing", 0, 0], ["slow_falling", 0, 0], ["fire_resistance", 0, 0]]
  }],
  ["gulle_top", {
    /* Top halinin GUCLERI Gulle ile ayni: tek fark tokluk
       +10 -> +20 ve o Bedrock formulunde bir Direnc seviyesi
       kaydirmiyor (ikisi de Direnc III). Fark GORUNUSTE ve
       BOYUTTA: x1.33 -> x1.03, ayri model.                  */
    ad: "Gülle · Top", tur: "Arburian Pelarota", kaynak: "arburian_pelarota",
    ozet: "direnç III · güç II · can artışı V · hız I · yavaş düşüş",
    efektler: [["resistance", 0, 2], ["strength", 0, 1], ["health_boost", 0, 4], ["speed", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["yukseltme_cubuk", {
    ad: "Yükseltme · Çubuk", tur: "Galvanic Rod", kaynak: "galvanic_rod",
    ozet: "direnç II · güç I · yavaş düşüş · ateş direnci",
    efektler: [["resistance", 0, 1], ["strength", 0, 0], ["slow_falling", 0, 0], ["fire_resistance", 0, 0]]
  }],
];

/* BICIM SAYISI HER UZAYLIDA UC DEGIL (v6.0). Modun ilk on bir
   uzaylisinda uc model var; alien_34/60/100/101 ve afomni'nin
   uzaylilarinda TEK model var. Olmayan bir bicim uydurulmadi --
   `bicim: 1` yazan satir tek modelle geliyor ve adina bicim
   eklenmiyor ("Jet Isini · Recal" diye bir sey yok).
   kol_uret.py:BEN10_TABAN'daki bicim sayisiyla AYNI olmali;
   ben10.mjs ikisini karsilastiriyor.                          */
export const BEN10 = new Map();
for (const [kisa, t] of BEN10_TABAN) {
  const kac = t.bicim || BEN10_BICIM.length;
  for (const [son, bicimAd] of BEN10_BICIM.slice(0, kac)) {
    BEN10.set("ben_" + kisa + son, {
      ad: kac > 1 ? t.ad + " · " + bicimAd : t.ad,
      taban: kisa, bicim: kac > 1 ? bicimAd : "",
      tur: t.tur, kaynak: t.kaynak, ozet: t.ozet,
      mekanikler: t.mekanikler || [],
      efektler: t.efektler
    });
  }
}

/* ============================================================
   BEN 10 SALDIRILARI                                    v6.1

   Kullanici: "aktif saldirilari da bitirelim... referanstan
   bakmaman icin dosyayi tekrardan atacagim."

   Sayilar jar'dan YENIDEN okundu (md5 18b2b7b1...), referans
   dosyasindan degil. Her satirin `kaynak` alani modun kendi
   yetenek adi; ben10_saldiri.mjs o adi jar'da arayip sayiyi
   karsilastiriyor.

   ---- UC TUR, TEK MOTOR ----
   Modda ~15 ayri yetenek turu var ama Bedrock'ta ucune
   iniyorlar:

     mermi   ucan mermi. palladium:projectile ve
             alienevo:custom_projectile.
     alan    anlik cevre hasari. alienevo:aoe_damage,
             sonic_clap, explosion, astro_punch_damage,
             astro_laser_damage, roll_damage.
     atilma  itme. alienevo:motion, motion_dash, charge_leap,
             vax_leap, astrojump, roll_leap.

   ---- HASAR CEVRILMEDI ----
   Java'da `Damage: 25` de Bedrock'ta applyDamage(25) de ayni
   olcek (yarim kalp basina 1). Isinlardaki x20 kurali BURAYA
   GIRMIYOR: o kural SUREKLI isinlar icindi (her tick hasar),
   bunlar TEK VURUS.

   ---- MENZIL TAVANI ----
   Kaynakta mermi menzili = hiz x Lifetime ve Java'da bu bir
   TAVAN, mermi zaten bir yere carpip duruyor. Duz alinsaydi
   Kaya Firlatma 630, Nukleer Top 300 blok tarardi -- bizim
   mermimiz script'le ilerliyor ve her tick onunu tariyor,
   yani 630 blok = 300 tick surekli tarama. BEN10_MERMI_TAVAN
   ile 64 blokta kesiliyor; kesilen satirlarda kaynagin kendi
   sayisi `kaynakMenzil` olarak duruyor.

   ---- `hasarKaynak: "oyuncu"` ----
   Iki mermide (Yukseltme ve Devasaur'un super yumrugu) modda
   Damage alani YOK, `damage_from_player: true` var: hasar
   oyuncunun saldiri niteliginden geliyor. O da turun kendi
   attack_damage'i -- tablodaki sayi oradan.

   ---- ALINMAYAN IKI ISIN ----
   Yukseltme'nin `upgrade_beam`i ile Cubuk'un `lightning_beam`i
   HASAR TASIMIYOR (energy_beams/*.json dosyalari yalnizca
   renk/boy; hasar yetenekte yaziyor ve o iki yetenekte
   `damage` alani yok). Gorsel/islevsel isinlar -- uydurma
   hasar verilmedi.
   ============================================================ */
export const BEN10_SALDIRI_ACIK = true;
/* Iki atis arasi en az bekleme (tick). Kaynakta her yetenegin
   kendi cooldown'i yok; Palladium tusa basili tutmaya gore
   calisiyor. Bizde tek deger -- isinlardaki ile ayni el
   hissi.                                                     */
export const BEN10_SALDIRI_BEKLEME = 20;
/* Mermi menzil tavani (blok). Gerekce yukarida.              */
export const BEN10_MERMI_TAVAN = 64;
/* Mermi her tick kac blok ilerlesin. Kaynaktaki `velocity`
   Java'nin blok/tick'i ile ayni olcek, dogrudan kullaniliyor;
   bu yalniz TAVAN -- 5'ten hizli mermi duvarin icinden gecer
   (bir tick'te 5 blok atlar).                                */
export const BEN10_MERMI_HIZ_TAVAN = 2.5;
/* Bir alan saldirisinda en fazla kac hedef islensin. Supernova
   15 blok yariçapta; tavansiz bir kalabalikta tek atis yuzlerce
   varlik dolasirdi.                                          */
export const BEN10_ALAN_TAVAN = 24;
/* Jest sirasi buradan sayilmaya baslar. Var olanlarin en
   yukarisi 400 (zirh matkabi); 420 hepsinin ustunde.         */
export const BEN10_SALDIRI_SIRA = 420;

export const BEN10_SALDIRI = new Map([
  ["ben_sald_elmas_diamond_shards_base", {
   ad: "Elmas Şarapneli", yaratik: "elmas", tur: "mermi",
   kaynak: "diamond_shards_base", hasar: 7, hiz: 2, menzil: 64,
   yaricap: 0.8, kaynakMenzil: 200
  }],
  ["ben_sald_elmas_shield_damage", {
   ad: "Kalkan Vuruşu", yaratik: "elmas", tur: "alan",
   kaynak: "shield_damage", hasar: 4, yaricap: 1.75
  }],
  ["ben_sald_elmas_sonic_boom_knockback", {
   ad: "Sonik Alkış", yaratik: "elmas", tur: "alan",
   kaynak: "sonic_boom_knockback", hasar: 0, yaricap: 5,
   itme: 2.5
  }],
  ["ben_sald_dortkol_boulder_projectile", {
   ad: "Kaya Fırlatma", yaratik: "dortkol", tur: "mermi",
   kaynak: "boulder_projectile", hasar: 25, hiz: 2.1, menzil: 64,
   yaricap: 1.5, patlama: 0.7, blokKirar: true, kaynakMenzil: 630
  }],
  ["ben_sald_dortkol_sonic_boom_projectile", {
   ad: "Sonik Yumruk", yaratik: "dortkol", tur: "mermi",
   kaynak: "sonic_boom_projectile", hasar: 10, hiz: 4, menzil: 40,
   yaricap: 3, itme: 4
  }],
  ["ben_sald_dortkol_sonic_boom_knockback", {
   ad: "Sonik Alkış", yaratik: "dortkol", tur: "alan",
   kaynak: "sonic_boom_knockback", hasar: 0, yaricap: 5, itme: 3
  }],
  ["ben_sald_dortkol_tetramand_spin_damage", {
   ad: "Dönme Savurması", yaratik: "dortkol", tur: "alan",
   kaynak: "tetramand_spin_damage", hasar: 10, yaricap: 5
  }],
  ["ben_sald_dortkol_fall_damage", {
   ad: "Yer Çarpması", yaratik: "dortkol", tur: "alan",
   kaynak: "fall_damage", hasar: 10, yaricap: 5, patlama: 2.5
  }],
  ["ben_sald_dortkol_leap", {
   ad: "Sıçrayış", yaratik: "dortkol", tur: "atilma",
   kaynak: "leap", guc: 2
  }],
  ["ben_sald_cene_bite_pro", {
   ad: "Isırık", yaratik: "cene", tur: "mermi",
   kaynak: "bite_pro", hasar: 20, hiz: 1.2, menzil: 4.2,
   yaricap: 2.5
  }],
  ["ben_sald_cene_aqua_damage", {
   ad: "Su Jeti", yaratik: "cene", tur: "alan",
   kaynak: "aqua_damage", hasar: 6, yaricap: 2.5, itisGuc: 3
  }],
  ["ben_sald_cene_tail_damage", {
   ad: "Kuyruk Savurma", yaratik: "cene", tur: "alan",
   kaynak: "tail_damage", hasar: 10, yaricap: 2.5
  }],
  ["ben_sald_cene_tornado_damage", {
   ad: "Su Girdabı", yaratik: "cene", tur: "alan",
   kaynak: "tornado_damage", hasar: 3, yaricap: 5
  }],
  ["ben_sald_cene_slash_damage", {
   ad: "Pençe", yaratik: "cene", tur: "alan",
   kaynak: "slash_damage", hasar: 8, yaricap: 3
  }],
  ["ben_sald_cene_leap", {
   ad: "Sıçrayış", yaratik: "cene", tur: "atilma", kaynak: "leap",
   guc: 1.5
  }],
  ["ben_sald_ates_fire_ball", {
   ad: "Ateş Topu", yaratik: "ates", tur: "mermi",
   kaynak: "fire_ball", hasar: 12, hiz: 2, menzil: 64,
   yaricap: 1.3, patlama: 0.7, yakma: 5, kaynakMenzil: 120
  }],
  ["ben_sald_ates_firebreath_pro_knockback", {
   ad: "Ateş Nefesi", yaratik: "ates", tur: "mermi",
   kaynak: "firebreath_pro_knockback", hasar: 5, hiz: 1.2,
   menzil: 12, yaricap: 0.5, yakma: 5, itme: 0.5
  }],
  ["ben_sald_ates_supernova_damage", {
   ad: "Süpernova", yaratik: "ates", tur: "alan",
   kaynak: "supernova_damage", hasar: 100, yaricap: 15, yakma: 5
  }],
  ["ben_sald_ates_pyronite_tornado_damage", {
   ad: "Ateş Girdabı", yaratik: "ates", tur: "alan",
   kaynak: "pyronite_tornado_damage", hasar: 6, yaricap: 5,
   yakma: 5
  }],
  ["ben_sald_ates_leap", {
   ad: "Sıçrayış", yaratik: "ates", tur: "atilma", kaynak: "leap",
   guc: 1.7
  }],
  ["ben_sald_vahsi_bite_pro", {
   ad: "Isırık", yaratik: "vahsi", tur: "mermi",
   kaynak: "bite_pro", hasar: 21, hiz: 1.2, menzil: 3.6,
   yaricap: 1.2
  }],
  ["ben_sald_vahsi_quill_barrage", {
   ad: "Diken Yağmuru", yaratik: "vahsi", tur: "mermi",
   kaynak: "quill_barrage", hasar: 10, hiz: 2, menzil: 64,
   yaricap: 1, kaynakMenzil: 200
  }],
  ["ben_sald_vahsi_leap", {
   ad: "Sıçrayış", yaratik: "vahsi", tur: "atilma",
   kaynak: "leap", guc: 2.5
  }],
  ["ben_sald_xlr_dash_dam_5", {
   ad: "Tekme Atılışı", yaratik: "xlr", tur: "alan",
   kaynak: "dash_dam_5", hasar: 18, yaricap: 1, itisGuc: 5
  }],
  ["ben_sald_xlr_tornado_damage", {
   ad: "Kasırga", yaratik: "xlr", tur: "alan",
   kaynak: "tornado_damage", hasar: 3, yaricap: 5, itisGuc: 1.5
  }],
  ["ben_sald_xlr_motion_damage", {
   ad: "Yumruk Yağmuru", yaratik: "xlr", tur: "alan",
   kaynak: "motion_damage", hasar: 15, yaricap: 1
  }],
  ["ben_sald_gri_tongue_pro", {
   ad: "Dil Atışı", yaratik: "gri", tur: "mermi",
   kaynak: "tongue_pro", hasar: 4, hiz: 4, menzil: 8,
   yaricap: 0.5
  }],
  ["ben_sald_gri_leap", {
   ad: "Sıçrayış", yaratik: "gri", tur: "atilma", kaynak: "leap",
   guc: 2
  }],
  ["ben_sald_sinek_slime_beam", {
   ad: "Balçık Işını", yaratik: "sinek", tur: "mermi",
   kaynak: "slime_beam", hasar: 6, hiz: 1, menzil: 10,
   yaricap: 0.5
  }],
  ["ben_sald_sinek_toxic_breath", {
   ad: "Zehirli Nefes", yaratik: "sinek", tur: "mermi",
   kaynak: "toxic_breath", hasar: 1, hiz: 1.7, menzil: 51,
   yaricap: 0.5
  }],
  ["ben_sald_yukseltme_super_punch_projectile", {
   ad: "Süper Yumruk", yaratik: "yukseltme", tur: "mermi",
   kaynak: "super_punch_projectile", hasar: 13, hiz: 3,
   menzil: 12, yaricap: 1, itme: 2.5, hasarKaynak: "oyuncu"
  }],
  ["ben_sald_yukseltme_cubuk_lightning_shot", {
   ad: "Yıldırım Atışı", yaratik: "yukseltme_cubuk", tur: "mermi",
   kaynak: "lightning_shot", hasar: 5, hiz: 2, menzil: 40,
   yaricap: 0.5, yakma: 3
  }],
  ["ben_sald_yukseltme_cubuk_lightning_throw", {
   ad: "Yıldırım Fırlatma", yaratik: "yukseltme_cubuk",
   tur: "mermi", kaynak: "lightning_throw", hasar: 10, hiz: 3,
   menzil: 64, yaricap: 1, kaynakMenzil: 300
  }],
  ["ben_sald_hayalet_tentacle_pro", {
   ad: "Dokunaç", yaratik: "hayalet", tur: "mermi",
   kaynak: "tentacle_pro", hasar: 15, hiz: 0.3, menzil: 4.5,
   yaricap: 1.2
  }],
  ["ben_sald_hayalet_shadow_strike_damage", {
   ad: "Gölge Vuruşu", yaratik: "hayalet", tur: "alan",
   kaynak: "shadow_strike_damage", hasar: 10, yaricap: 2.5,
   itisGuc: 0.9
  }],
  ["ben_sald_gulle_motion_damage_dash", {
   ad: "Yuvarlanma Çarpması", yaratik: "gulle", tur: "alan",
   kaynak: "motion_damage_dash", hasar: 22, yaricap: 1.5,
   itisGuc: 2.5
  }],
  ["ben_sald_gulle_damage_slam", {
   ad: "Yer Çarpması", yaratik: "gulle", tur: "alan",
   kaynak: "damage_slam", hasar: 18, yaricap: 4
  }],
  ["ben_sald_gulle_motion_damage", {
   ad: "Top Vuruşu", yaratik: "gulle", tur: "alan",
   kaynak: "motion_damage", hasar: 10, yaricap: 1
  }],
  ["ben_sald_gulle_top_motion_damage_dash", {
   ad: "Yuvarlanma Çarpması", yaratik: "gulle_top", tur: "alan",
   kaynak: "motion_damage_dash", hasar: 22, yaricap: 1.5,
   itisGuc: 2.5
  }],
  ["ben_sald_gulle_top_damage_slam", {
   ad: "Yer Çarpması", yaratik: "gulle_top", tur: "alan",
   kaynak: "damage_slam", hasar: 18, yaricap: 4
  }],
  ["ben_sald_atomik_nuke_winner", {
   ad: "Nükleer Top", yaratik: "atomik", tur: "mermi",
   kaynak: "nuke_winner", hasar: 250, hiz: 3, menzil: 64,
   yaricap: 1.3, patlama: 6, blokKirar: true, yakma: 5,
   kaynakMenzil: 300
  }],
  ["ben_sald_ejder_fire_ball", {
   ad: "Ateş Topu", yaratik: "ejder", tur: "mermi",
   kaynak: "fire_ball", hasar: 10, hiz: 2.3, menzil: 64,
   yaricap: 0.5, patlama: 0.6, blokKirar: true, yakma: 5,
   kaynakMenzil: 138
  }],
  ["ben_sald_ejder_firebreath_pro_knockback", {
   ad: "Ateş Nefesi", yaratik: "ejder", tur: "mermi",
   kaynak: "firebreath_pro_knockback", hasar: 3, hiz: 3,
   menzil: 60, yaricap: 0.5, yakma: 5, itme: 0.3
  }],
  ["ben_sald_astro_punch_ability_ground", {
   ad: "Astro Yumruk", yaratik: "astro", tur: "alan",
   kaynak: "punch_ability_ground", hasar: 7, yaricap: 2.75
  }],
  ["ben_sald_astro_punch_ability_air", {
   ad: "Havada Yumruk", yaratik: "astro", tur: "alan",
   kaynak: "punch_ability_air", hasar: 10, yaricap: 2
  }],
  ["ben_sald_astro_astro_laser_damage", {
   ad: "Astro Lazer", yaratik: "astro", tur: "alan",
   kaynak: "astro_laser_damage", hasar: 10, yaricap: 0.5,
   yukseklik: 10
  }],
  ["ben_sald_astro_laser_jump", {
   ad: "Astro Sıçrayış", yaratik: "astro", tur: "atilma",
   kaynak: "laser_jump", guc: 0.65
  }],
  ["ben_sald_bataklik_fire_ball", {
   ad: "Ateş Topu", yaratik: "bataklik", tur: "mermi",
   kaynak: "fire_ball", hasar: 10, hiz: 2, menzil: 64,
   yaricap: 1.3, patlama: 0.7, yakma: 5, kaynakMenzil: 120
  }],
  ["ben_sald_bataklik_dual_beam_pro", {
   ad: "Çifte Alev", yaratik: "bataklik", tur: "mermi",
   kaynak: "dual_beam_pro", hasar: 4, hiz: 1.2, menzil: 12,
   yaricap: 0.5, yakma: 5
  }],
  ["ben_sald_buz_ice_shards", {
   ad: "Buz Parçası", yaratik: "buz", tur: "mermi",
   kaynak: "ice_shards", hasar: 10, hiz: 2, menzil: 60,
   yaricap: 1
  }],
  ["ben_sald_yanki_scream", {
   ad: "Çığlık", yaratik: "yanki", tur: "mermi", kaynak: "scream",
   hasar: 5, hiz: 1, menzil: 10, yaricap: 2
  }],
  ["ben_sald_yanki_wall_of_sound_scream", {
   ad: "Ses Duvarı", yaratik: "yanki", tur: "mermi",
   kaynak: "wall_of_sound_scream", hasar: 7, hiz: 1, menzil: 10,
   yaricap: 2
  }],
  ["ben_sald_devasa_super_punch_projectile", {
   ad: "Süper Yumruk", yaratik: "devasa", tur: "mermi",
   kaynak: "super_punch_projectile", hasar: 30, hiz: 3, menzil: 6,
   yaricap: 1, itme: 1.5, hasarKaynak: "oyuncu"
  }],
  ["ben_sald_devasa_tail_spin_damage", {
   ad: "Kuyruk Savurma", yaratik: "devasa", tur: "alan",
   kaynak: "tail_spin_damage", hasar: 10, yaricap: 5
  }],
]);

/* Ben 10 ISINLARI. Isinlar surekli oldugu icin ZIRH_ISIN ile
   AYNI kural: tek atis = tick basina hasar x
   ZIRH_ISIN_BEKLEME. Motor da ayni (isinlar.js) -- ucuncu bir
   kapi turu eklendi, yeni dosya acilmadi.

   Ates Topu'nun isini v4.92'den beri ozette VAAT EDILIYORDU
   ("isin 9") ama ortada yoktu; v6.1'de gercekten geldi.     */
export const BEN10_ISIN = new Map([
  ["ben_isin_ates", {
    ad: "Ateş Işını", yaratik: "ates", kaynak: "dual_beam_pro",
    kaynakHasar: 9, hasar: 180, menzil: 15, yakma: 6,
    parcacik: "minecraft:basic_flame_particle"
  }],
  ["ben_isin_buz", {
    ad: "Buz Nefesi", yaratik: "buz", kaynak: "ice_breath",
    kaynakHasar: 3, hasar: 60, menzil: 10, yakma: 0,
    parcacik: "minecraft:snowflake_particle"
  }]
]);

/* ============================================================
   KONSEY  (CodeMan / Astra Studios + BoraLo / Dragon Studios)
                                                        v6.2

   Kullanici: "yeni boralo notlari buldum, bunlardan
   alabildigimizi alalim, esya dahil her sey."

   ---- 54 PARCA ----
   6 Konsey kostumu (Okazor · Miskel · Kajaros · Harkos ·
   Raxxan · CodeMan -- bunlar LORE.md'deki KENDI
   karakterlerimiz), 4 deri, 4 maske, 14 kol, 7 asa, 5 Earl
   aleti, 8 zirh parcasi, 2 silah, 4 Dusmus asamasi.

   Sayilar (hasar, koruma, dayaniklilik) kaynagin kendi esya
   JSON'undan; tablo kol_uret.py:KONSEY'de.

   ---- BU DOSYANIN TUTTUGU TEK SEY: GORUNMEZLIK ----
   Kaynagin teknigi: giyilebilir esya + attachable + OYUNCUYA
   GORUNMEZLIK. Ucu birden olmadan kostum calismiyor -- oyuncu
   kendi derisiyle kostumun icinden gorunur.

   Hangi parcanin gorunmezlik verdigi UYDURULMADI: kaynak
   pakette her biri icin bir `<ad>_effect.mcfunction` var ve
   icinde tek satir:
       effect @e[hasitem={item=klezy:X,location=slot.armor.head}]
              invisibility 1 0 true
   O ondort dosya asagidaki liste. Kemik Maskesi ve kollar
   LISTEDE YOK -- onlar oyuncunun ustune BINIYOR, yerine
   gecmiyor.                                                  */
export const KONSEY_ACIK   = true;
export const KONSEY_TARAMA = 20;    // kac tick'te bir bakilsin
/* Efekt suresi taramadan UZUN: tam taramada bitse, iki tarama
   arasinda bir kare gorunur olurdun.                         */
export const KONSEY_SURE   = 60;
export const KONSEY_ONEK   = "kns_";

/* Giyince oyuncuyu gizleyen parcalar (kaynakta `_effect`
   dosyasi olanlar). Yuva da yazili: gorunmezlik yalniz DOGRU
   yuvada takiliyken verilmeli.                               */
export const KONSEY_GORUNMEZ = new Map([
  ["kns_okazor",          "Head"],
  ["kns_miskel",          "Head"],
  ["kns_kajaros",         "Head"],
  ["kns_harkos",          "Head"],
  ["kns_raxxan",          "Head"],
  ["kns_codeman",         "Head"],
  ["kns_deri_toprak",     "Head"],
  ["kns_deri_dusmus",     "Head"],
  ["kns_deri_tas",        "Head"],
  ["kns_deri_zehir",      "Head"],
  ["kns_guczirhi_baslik", "Head"],
  ["kns_maske_deadmau5",  "Chest"],
  ["kns_maske_redmau5",   "Chest"],
  ["kns_maske_kanli",     "Chest"]
]);

/* ============================================================
   KONSEY SILAHLARI VE ASA SESI                          v6.3

   Kullanici: "Biyo Silah'in 'vurdugunu zehirli yap'i bizde
   zaten var... Ay Isigi'nin sesi de pakette duruyor. Bunu da
   hallet kankam, iznini veriyorum."

   ---- KAYNAKTA GERCEKTEN NE VAR ----
   Iki silahin da MERMISI carpinca bir fonksiyon cagiriyor
   (entities/klezy_bio_gun_bullet.json -> `biogunyap1`):

     biogunyap1     tag toxic1 · hareket/kamera/egilme KAPALI
                    · kafaya klezy:toxic_skin · gorunmezlik
     bobbygundirt1  ayni sey, deri `dirt1`

   Yani ikisi de "vurdugunu DONDURUP baska bir seye cevir".
   Bu tam olarak tas.js'in isi -- oradaki kurallar burada da
   gecerli.

   `bobbygunshot1` ve `moonlightstaffsong1` fonksiyonlari
   kaynakta BOS dosyalar; ses dosyasi pakette duruyor ama
   modun kendisi HIC CALMIYOR. Ay Isigi'nin sesini biz
   bagliyoruz -- uydurma degil, kaynagin BAGLAMADIGI kendi
   dosyasi; kullanici acikca istedi.

   ---- BIZDE UC SEY FARKLI, ucu de tas.js'ten devralindi ----
   1. SURE VAR ve IKI cikis yolu var: sure doluyor ya da
      Freedom Stone ile kiriliyor. Kaynagin `invisibility
      99999 255` + `item_lock` kombinasyonu kurbani KALICI
      olarak hapsediyor.
   2. ESYA KAYBI YOK. Kaynak kurbanin kafasindakini SILIYOR
      (`replaceitem ... slot.armor.head 1 air`). Bizde deri
      YALNIZ kafa yuvasi BOSSA takiliyor; doluysa gorunum
      atlaniyor, etki yine uygulaniyor. Bu depoda esya
      kaybettiren hicbir sey yok.
   3. GORUNMEZLIK 255 DEGIL. Kaynak kurbani tamamen siliyor
      ve derinin kendisi de gorunmuyordu; bizde deri
      GORUNSUN diye konsey.js'in normal gorunmezligi
      yetiyor.
   ============================================================ */
export const KONSEY_SILAH_ACIK   = true;
export const KONSEY_SILAH_MENZIL = 32;   // nisan menzili (blok)
export const KONSEY_SILAH_SURE   = 600;  // 30 sn -- TAS_SURE ile ayni
export const KONSEY_SILAH_BEKLEME = 100; // 5 sn  -- TAS_BEKLEME ile ayni
export const KONSEY_SILAH_TAVAN  = 8;    // ayni anda kac kurban

/* esya -> ne yaptigi. `deri` kurbanin kafasina takilan parca,
   `etki` ek efekt (Biyo Silah zehirliyor -- adi bunu vaat
   ediyor ve kaynakta deri zaten `toxic`).                    */
export const KONSEY_SILAH = new Map([
  ["kns_silah_biyo", {
    ad: "Biyo Silah", kaynak: "biogunyap1",
    deri: "pa:kns_deri_zehir", ses: "kns.silah_biyo",
    etki: [["poison", KONSEY_SILAH_SURE, 1]]
  }],
  ["kns_silah_bobby", {
    ad: "Bobby Silahı", kaynak: "bobbygundirt1",
    deri: "pa:kns_deri_toprak", ses: "kns.silah_bobby",
    etki: []
  }]
]);

/* Ay Isigi Asasi: kaynakta ses DOSYASI var, calan kod yok.
   Menzili yok -- calan sey bir sarki, silah degil.           */
export const KONSEY_ASA_SESI = new Map([
  ["kns_asa_ayisigi", { ad: "Ay Işığı Asası", ses: "kns.asa_ayisigi" }]
]);
/* Sarki uzun; ust uste binmesin diye bekleme.                */
export const KONSEY_SES_BEKLEME = 400;   // 20 sn

/* ============================================================
   DUSMUS VIRUSU  (Fallen)                                v6.4

   Kullanici duzeltti: "sen fallen'i bir zirh olarak
   eklemissin, zirh olmayacak bir BLOK olacak. Ustune
   ciktigimiz zaman dort asamadan olusuyor; dorde geldikten
   sonra otomatik olarak bedenden CIKMAYAN bir zirha
   donusuyor. Fallen temel olarak VIRUS gibi bir sey, tek
   zaafi ATES: cakmakla yaktiginizda ayni dort asamadan ama
   bu sefer normale donuyorsunuz."

   ---- KAYNAKTA NE VAR, NE YOK ----
   BoraLo'nun `fallen.js`'i blogu ve dort asamayi yapiyor
   (bes tick'te bir altindaki bloga bakiyor). AMA:
     - kaynakta 4. asama KALICI DEGIL: blogun ustunden
       inince her sey siliniyor
     - kaynakta ATES CARESI YOK -- iki paketin butun
       script'leri, fonksiyonlari ve varlik JSON'lari
       tarandi, tek bir iz yok
   Ikisi de kullanicinin tarifi. Uydurma degil, ISTENEN
   davranis -- ve nereden geldigi burada yaziyor.

   ---- EN ONEMLI FARK: ZIRHIN GERI VERILIYOR ----
   Kaynak kurbanin dort zirh yuvasini da SILIYOR
   (`replaceitem ... air`). Bu depoda esya kaybettiren hicbir
   sey yok. Bulasmadan ONCE dort yuvadaki gercek zirhin
   deftere yaziliyor, iyilesince aynen geri takiliyor.
   Defter DUNYA OZELLIGINDE duruyor: dunyadan cikip girsen de
   zirhin kayip degil.
   ============================================================ */
export const DUSMUS_ACIK    = true;
export const DUSMUS_BLOK    = "pa:kns_dusmus_blok";
export const DUSMUS_TARAMA  = 5;    // kac tick'te bir bakilsin (kaynakla ayni)
/* Asama araligi: kaynakta 2 saniye (40 tick). Dort asama =
   6 saniyede tam yozlasma.                                   */
export const DUSMUS_ASAMA_ARA = 40;
export const DUSMUS_ASAMA_SAYISI = 4;
/* Asama -> hangi parca hangi yuvaya. Kaynagin kendi sirasi
   (fallen.js): her asama IKI yuva degistiriyor, dorduncude
   dordu birden.                                              */
export const DUSMUS_ASAMALAR = [
  { parca: "pa:kns_dusmus_1", yuvalar: ["Chest", "Head"],
    yazi: "§5§lDÜŞMÜŞ: §fDönüşmeye başladın..." },
  { parca: "pa:kns_dusmus_2", yuvalar: ["Chest", "Legs"],
    yazi: "§d§lDÜŞMÜŞ: §fBedenin ağırlaşıyor..." },
  { parca: "pa:kns_dusmus_3", yuvalar: ["Chest", "Feet"],
    yazi: "§5§lDÜŞMÜŞ: §fKaranlık seni yutuyor!" },
  { parca: "pa:kns_dusmus_4", yuvalar: ["Head", "Chest", "Legs", "Feet"],
    yazi: "§4§lDÜŞMÜŞ: §fTAM YOZLAŞMA" }
];
/* Dorduncu asamada verilen korluk. Kaynakta `blindness 99999
   255`; bizde de surekli ama iyilesince kaldiriliyor.        */
export const DUSMUS_KORLUK = true;
/* ---- ATES CARESI ----
   Cakmakla yakinca (ya da alev alinca) tersine dort asama.
   Kaynakta yok; kullanicinin tarifi.                         */
export const DUSMUS_CAKMAK  = "minecraft:flint_and_steel";
export const DUSMUS_ATES_TICK = 20;  // bu kadar yanmak tetikliyor
/* ---- IYILESTIKTEN SONRA KISA BAGISIKLIK ----
   Ates carasini yazdiktan sonra testte goruldu: kurban
   iyilesiyor ama HALA BLOGUN USTUNDE oldugu icin ayni tarama
   turunda yeniden bulasiyor ve dort asama bastan basliyor.
   Yani ates hicbir ise yaramiyordu.

   Bu pencere kadar bagisik kaliyor -- blogun ustunden inmeye
   yetecek kadar. Kaynakta boyle bir sey yok cunku kaynakta
   ates caresi de yok.                                       */
export const DUSMUS_BAGISIKLIK = 100;   // 5 saniye

/* ---- SECILME VE YEMIN  (v6.5) ----
   Kullanici: "dort asamadayken uzun sure kalirsak korluk
   gitsin, ekrana 'Yucelerin Yucesi tarafindan secildin, artik
   secilmis oyunculardan bir tanesisin' yazsin. Sohbet ekranina
   da bir yemin yazdiralim; onu yazarsa 'artik tam anlamiyla
   bir asker oldun' desin."

   Yani dorduncu asama bir SON degil, bir ESIK: dayanirsan
   karanlik geciyor ve seciliyorsun.

   ---- YEMIN NASIL KARSILASTIRILIYOR ----
   sohbet.js:sadelestir ile: kucuk harf + Turkce harfler ASCII
   karsiligi + fazla bosluklar tek. Yani "Yücelerin" de
   "yucelerin" de kabul. Tabletten yazan biri icin buyuk/kucuk
   harf ve sapkalarla ugrasmak eziyet olurdu.                */
export const DUSMUS_SECILME_SURE = 1200;   // 60 sn, 4. asamada
export const DUSMUS_SECILME_BASLIK = "§5§lSEÇİLDİN";
export const DUSMUS_SECILME_ALT =
  "§fYücelerin Yücesi tarafından seçildin — artık seçilmiş " +
  "oyunculardan birisin";
/* Sohbete yazilan yonerge ve beklenen yemin. */
export const DUSMUS_YEMIN_YONERGE =
  "§5§lYEMİN §7— aşağıdaki satırı sohbete yaz:\n" +
  "§f  Yücelerin Yücesine and olsun karanlıkta yürürüm";
export const DUSMUS_YEMIN =
  "Yücelerin Yücesine and olsun karanlıkta yürürüm";
export const DUSMUS_ASKER_BASLIK = "§4§lASKER";
export const DUSMUS_ASKER_MESAJ =
  "§a§lArtık tam anlamıyla bir asker oldun.";
/* Yemin yonergesi kac tick'te bir tekrarlansin (kaybolmasin). */
export const DUSMUS_YEMIN_TEKRAR = 400;    // 20 sn
export const DUSMUS_KAYIT_ANAHTAR = "simsek:dusmus";

export const BOT_KIMLIKLER = new Set([BOT_KIMLIK, SEY_KIMLIK, SEY_KILIK_KIMLIK]);
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


/* ================================================================
   KANLI KOL                                                v6.7

   Kaynak: Bobby1545 Mod (V3). Kullanici ekran goruntusu de
   gonderdi: iki dev turuncu-kanli yumruk, ince kirmizi kollarin
   ucunda. Model ve doku kaynagin kendisi (kok kemikleri
   rightArm/leftArm oldugu icin oyuncunun IKI koluna birden
   baglaniyor).

   ---- KAYNAKTAKI SEKIZ ESYA -> BIR KOL ----
   Kaynak her yetenek icin AYRI bir esya veriyor ve "Aktif Et"e
   basinca yedisini birden envanterine dolduruyor. Bizde tek
   esya var, yetenekler menuden secliyor -- depodaki alti kolun
   duzeni bu.

   ---- KAYNAKTAN ALINMAYAN TEK SEY ----
   "Kapat" esyasi `Envanteri_Sil` fonksiyonunu cagiriyor ve o
   fonksiyon tek satir: `clear @s`. Yani kolu kapatmak
   OYUNCUNUN BUTUN ENVANTERINI SILIYOR. Bu depoda esya
   kaybettiren hicbir sey yok; alinmadi.

   ---- IKI YENI YETENEK ----
   Kanli Ors  : kaynagin `Anvil_Cokert`i. Bizdeki `ors` TEK bir
                noktaya yagiyor (nisan aldigin yere); bu ise
                MENZILDEKI HER VARLIGIN tepesine. Farkli sey.
   Ulti Simsek: kaynagin `Ulti_Simsek`i, `execute at @e run
                summon lightning_bolt`. Bizdeki `coklu_simsek`
                en yakin COKLU_HEDEF taneyi vuruyor ve cok
                yakindakini atliyor; bu hepsini vuruyor.

   Kaynaktaki digerleri bizde ZATEN vardi ve yeniden
   yazilmadi: Meteor -> meteor, Super Meteor -> guclu_tnt,
   Kendini Ucur -> toprak_ucus, Baya Yildirim -> yon_simsegi.
   ================================================================ */
/* ================================================================
   VOID TAKIMI                                              v7.1

   Kaynak: Falen Mod V2 (Trb1545). Kullanici dosyayi tekrar
   gonderdi: "canli olarak bakmani istedim ki referanstan
   bakarak birazcik riskli oluyor." Dogru karar -- asagidaki
   uc sey ancak dosyalarin kendisinde goruluyor.

   ---- 1. VOID COKLU ALET: KAYNAKTAKI HALI ESYA SILIYOR ----
   `Void.mcfunction` tek satir:
     replaceitem entity @a slot.armor.head 1 sp:voidol 1 0
       {"item_lock":{"mode":"lock_in_slot"}}
   Uc ayri sorun:
     a) `@a` -- vurdugun kisi degil, DUNYADAKI HERKES.
     b) `replaceitem` kafadaki migferi YOK EDIYOR. Elmas
        migferin varsa gidiyor.
     c) `lock_in_slot` -- cikaramiyorsun. Tek cikis
        `Herkesi_Void_Kurtae` (= `clear @a sp:voidol`), o da
        yine HERKESI kurtariyor.
   Bizimki: yalniz VURDUGUNA bulasiyor, eski migferi deftere
   yaziliyor ve arinca AYNEN geri takiliyor. Dusmus virusunde
   kurulan kalibin aynisi.

   ---- 2. ENDER KILICI 400 BLOK YUKARI ISINLIYOR ----
   `RasgeleRp.mcfunction`:
     execute positioned ^^^2 run tp @e[r=10,c=1] ~~400~
   400 blok dusus kesin olum ve `@e` oyuncuyu da, evcil
   hayvanini da kapsiyor. Bizde yukseklik sinirli ve dusen
   yavas dusuyor -- firlatma bir SALDIRI, infaz degil.

   ---- 3. VOID KILICI 255 HASAR ----
   Kaynakta gercekten 255 (Bedrock'un tavani). Netherite
   kilic 8, bu depodaki en guclu esya 62. Degistirilmedi;
   gerekcesi KONSEY tablosunda yaziyor.
   ================================================================ */
/* ================================================================
   ZAMAN SAATI                                              v7.2

   Kaynak: "Zaman Saati Ifsa" (f.a. eymoxa). Bu, elimize gecen
   komut listelerinin aksine GERCEK script tasiyan bir eklenti;
   bes modu var ve modlar egilerek acilan bir menuden seciliyor.

   ---- KAYNAKTAKI IKI KILITLENME ----
   1. SAATE ALINAN OYUNCU DUNYA YENIDEN YUKLENINCE ORADA KALIYOR.
      Kaynak hedefi y=-500'e isinliyor ve eski konumunu YALNIZ
      bellekteki bir Map'te tutuyor (`saatteOlanlar`). Dunya
      kapanip acilinca o Map bosaliyor: kurban yerin 500 blok
      altinda, korlukle, hareketi kapali, geri donus bilgisi
      YOK. Kalici bir kilitlenme. Bizde kayit DUNYA OZELLIGINDE
      ve ustune bir de sure siniri var.
   2. `saatteOlanlar` OYUNCU BASINA DEGIL, GENEL. Kaynakta
      `if (saatteOlanlar.size > 0)` deniyor ve sirali ilk kurban
      birakiliyor -- yani iki kisi saatteyse hangisini
      birakacagini SECEMIYORSUN. Bizde defter saati tutana
      bagli.

   ---- ALINMAYAN UCUNCU SATIR ----
      hedefEntity.runCommand("effect @s clear")
   Kurbani birakirken BUTUN efektlerini siliyor -- ictigi iksir
   dahil. Bu kalibi ucuncu kez reddediyoruz (ucurma.js,
   kanli kol, Code-Man listesi).

   ---- KAYNAKTAN AYNEN ALINANLAR ----
   Bes modun kendisi, telekinezin "yakala sonra firlat" iki
   asamasi, 15 blokluk menzil, 4 blok onde tutma.            */
export const SAAT_ACIK = true;
export const SAAT_ESYA = "pa:zaman_saati";

/* Zamani durdur: kaynak `slowness 999 255` + `jump_boost 999`
   + inputpermission kapali diyor. 999 SANIYE, yani ~16 dakika,
   ve tek cikisi "Zamani Ac" modu. Bizde sure sinirli: saati
   tutan cikarsa ya da unutursa dunya sonsuza kadar donmuyor. */
export const SAAT_DONDURMA_SURE = 600;     // 30 sn
export const SAAT_DONDURMA_SEVIYE = 255;   // kaynaktaki gibi

/* ---- TELEKINEZ  (kaynagin sayilari, v7.6'da guclendirildi) ----
   Kullanici: "zaman saati telekinezisi var ya, onu daha da
   guclendirebilir misin acaba."

   Kaynak: menzil 15, onde 4, firlat 15, HASAR YOK. Yani hedefi
   kaldirip firlatiyordun ve hedef hicbir sey hissetmiyordu --
   yalnizca yer degistiriyordu. Guclendirme iki yonlu:

     1. SAYILAR   menzil 15->25, firlat 15->30, onde 4->5
     2. YENI IS   tutmak artik EZIYOR, firlatmak VURUYOR

   Ikincisi bilincli: v4.78'in dersi "toplu +1 hicbir sey
   degistirmiyor, hissedilen sey YENI BIR YETENEK". Menzili
   buyutmek tek basina ayni yetenegi biraz uzaga tasirdi.

   FIRLATMA HALA INFAZ DEGIL: slow_falling duruyor (Ender
   Kilici'nda verilen ayni karar). Hedef vurulur ama dusus
   hasariyla ayrica oldurulmez -- oldurmek isteyen zaten
   vurabilir.                                                  */
export const SAAT_TELEKINEZ_MENZIL = 25;
export const SAAT_TELEKINEZ_ONDE = 5;      // kac blok onde tutuluyor
export const SAAT_TELEKINEZ_FIRLAT = 30;
/* Firlatma carpmasi. LAZER_HASAR (500) ile kiyaslanmasin: lazer
   bir infaz silahi, bu bir kontrol yetenegi. */
export const SAAT_TELEKINEZ_HASAR = 60;
/* Havada tutarken her taramada verilen ezme hasari. Kucuk
   tutuluyor: SAAT_TELEKINEZ_ARALIK 2 tick, yani saniyede 10
   kez -- 4 hasar saniyede 40 eder, on saniyede 400. */
export const SAAT_TELEKINEZ_EZME = 4;
/* Kaynak hedefi HER IKI TICK'te bir yeniden isinliyor ve bunu
   yaparken `dimension.getEntities()` cagiriyor -- SUZGECSIZ,
   yani boyuttaki her varlik saniyede on kez taraniyor. Tablette
   bunun bedeli var. Bizde hedef dogrudan kimlikle tutuluyor. */
export const SAAT_TELEKINEZ_ARALIK = 2;

/* Saate alma. Kaynak y=-500 diyor; dunya tabani -64 oldugu icin
   orasi bosluk. Sure siniri kaynakta YOK.                    */
export const SAAT_HAPIS_Y = -500;
export const SAAT_HAPIS_SURE = 1200;       // 60 sn
export const SAAT_HAPIS_TARAMA = 20;
export const SAAT_KAYIT_ANAHTAR = "simsek:zaman_saati";

/* Zamani geri al: kaynak `time add -500`. */
export const SAAT_GERI_TICK = -500;

export const VOID_ACIK = true;

/* Void Coklu Alet: vurdugunu Void'e cevirir. */
export const VOID_ALET = "pa:kns_void_alet";
export const VOID_MIGFER = "pa:kns_void_migfer";
/* Bulasma suresi. Kaynakta sure YOK -- kalici, tek cikisi
   baska bir esyayla temizlemek. Bizde kendiliginden geciyor
   ve gecince eski migfer geri geliyor.                      */
export const VOID_SURE = 600;              // 30 saniye
export const VOID_TARAMA = 20;
export const VOID_KAYIT_ANAHTAR = "simsek:void";
export const VOID_MESAJ = "§5§lVOID §7— miğferin 30 saniye sonra geri gelecek";

/* Ender Kilici: vurdugunu firlatir. */
export const ENDER_KILIC = "pa:kns_ender_kilic";
/* Kaynak 400 blok diyor -- kesin olum. Bu yukseklikten dusen
   hasar aliyor ama olmuyor, ustelik yumusak dusus veriliyor. */
export const ENDER_FIRLATMA = 24;          // blok
export const ENDER_YUMUSAK = 200;          // slow_falling tick

export const KANLI_ACIK = true;

/* Menzil: kaynakta menzil YOK (butun dunya). Tablette butun
   dunyaya yildirim indirmek oyunu kilitler.                  */
export const KANLI_MENZIL = 40;
export const KANLI_MUAF = [
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:lightning_bolt",
  "minecraft:arrow",
  "minecraft:falling_block"
];
/* Kaynak `type=!player` diyor: oyunculari vurmuyor. Ayni
   kaldi -- arkadasiyla oynayan biri yanlislikla herkesi
   yakmasin.                                                  */
export const KANLI_OYUNCU_VUR = false;

/* Ors: kaynak `fill ~~15~ ~~11~ anvil keep` diyor, yani her
   hedefin 11-15 blok ustune bes katli bir ors sutunu. Bes ors
   ust uste dusen bir varligi kesin olduruyor; biz tek ors
   birakiyoruz ve YUKSEKLIGI koruyoruz.                       */
export const KANLI_ORS_YUKSEK = 12;
export const KANLI_ORS_BLOK = "minecraft:anvil";
export const KANLI_ORS_ARALIK = 2;

/* Simsek: her hedef arasi bekleme. Kaynak hepsini TEK TICK'te
   dogurluyor; 30 varlik varsa o tick kilitleniyor.           */
export const KANLI_SIMSEK_ARALIK = 2;

/* Ekran sarsintisi: kaynak `camerashake add @a 3` diyor, yani
   dunyadaki HERKESI sarsiyor -- olayla ilgisi olmayan
   oyuncular dahil. Bizde yalniz vuran kisi sarsiliyor.       */
export const KANLI_SARSINTI = 1.4;
export const KANLI_SARSINTI_SURE = 0.6;


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


/* ============================================================
   EFSANE YAPISI  (v4.71)

   Kullanici: "bu modu kurduktan sonra arkadaslarimla beraber
   oynayabilecegim bir dunya acarsam, beni bir efsane gibi
   zannetsinler diye bir tane lapisten piramit, etrafina da
   kiziltas mesalesi, yaninda da bizim secegimiz dillerden bir
   tanesi olsun ama bu diller gercekten cozmek icin ugrastirici
   dillerden olsun."

   Sectikleri: iki katmanli sifre (SGA -> Baconian) ve
   KOORDINAT ZINCIRI (yaziti cozunce bir sonraki durak cikiyor).

   ---- ZINCIR NASIL KURULUYOR ----
   Duraklar ONCEDEN belirleniyor, hepsi ayni anda INSA
   EDILMIYOR. Sebep teknik: Bedrock sadece YUKLU chunk'lari
   isliyor; 400 blok oteye blok koymak denense getBlock
   undefined donerdi ve yapi yarim kalirdi.

   Onun yerine: ilk durak nereye kurulursa zincirin tamami
   ORADAN turetiliyor (sabit adimlarla). Her durak kendi
   yazitinda BIR SONRAKININ koordinatini tasiyor. Sonraki
   duraga gidip orada yeniden "efsane kur" dendiginde o durak
   dikiliyor. Yani koordinat once YAZILIYOR, sonra gidilip
   dogrulaniyor -- arkadaslarin icin de senin icin de ayni.

   ---- KATMANLAR ----
   SGA yazisi   yerdeki harf tarlasi, gercek bir kelime.
                Cozunce ikinci sifrenin ADINI soyluyor.
   Bacon bandi  iki cesit bloktan serit, harf basina bes blok.
                Cozunce koordinat cikiyor.
   Ayrintili gerekce _sifre.js'in basinda.

   ---- GIANT ALEX GONDERMESI ----
   Kullanici efsaneleri inceletiyor; Giant Alex'in lore'unda
   yurudugu yerde 3x2x2'lik CUKURLAR birakiyor. Duraklarin
   cevresine o cukurlardan serpistiriliyor: arkadaslarin once
   cukurlari bulup "burada bir sey var" diyor, sonra yapiyi.
   ============================================================ */
export const EFSANE_ACIK = true;

/* Yapi malzemeleri */
export const EFSANE_BLOK    = "minecraft:lapis_block";        // piramit
export const EFSANE_MESALE  = "minecraft:redstone_torch";     // cevre
export const EFSANE_ZEMIN   = "minecraft:polished_blackstone";
export const EFSANE_SGA_BLOK = "minecraft:gold_block";        // SGA harfleri
export const EFSANE_BACON_A = "minecraft:quartz_block";       // Bacon "A"
export const EFSANE_BACON_B = "minecraft:coal_block";         // Bacon "B"

/* Piramit taban kenari. TEK SAYI olmali: cift sayida merkez
   blogu olmaz ve piramit tepesi duz biter.                   */
export const EFSANE_TABAN = 11;

/* ---- SGA katmaninin metni ----
   Kullanici: "yazacagin kelimeyi daha korkutucu bir seye
   donusturelim; Mojang'in bile ugrasamadigi bir dunya,
   onlar cozemezse biz hic cozemeyiz gibi bir mesaj biraksin."

   Sectigi metin bu. Buurokratik dil bilincli: "silindi",
   "kayit yok" -- birinin bunu GIZLEMEYE calistigini ima
   ediyor, ki creepypasta'da en urpertici olan bu.

   Son iki kelime ANAHTAR BACON: ikinci sifrenin adi.
   Kullanici "ipucu var" dedi -- ipucu olmadan bandi cozmek
   neredeyse imkansiz olurdu ve arkadaslari gunlerce bosa
   ugrasirdi.

   Turkce harfler otomatik katlaniyor (C->C, I->I ...), SGA'da
   yalniz A-Z var. Metin uzun oldugu icin SATIRLARA bolunuyor
   (sgaBlok); tek satir olsaydi 400 blok genisliginde bir serit
   olurdu ve kimse okuyamazdi.                                */
export const EFSANE_YAZI = "MOJANG BU TOHUMU SILDI KAYIT YOK ANAHTAR BACON";
export const EFSANE_SATIR_HARF = 14;   // satir basina en fazla harf

/* ---- SON DURAGIN YUKU: BIR TOHUM ----
   Kullanici "son durakta sahte seed" dedi.

   Secilen sayi GIANT ALEX'IN GERCEK TOHUMU. Sebep: cozen kisi
   elinde bir seed'le kaliyor, aratiyor, ve karsisina Giant
   Alex efsanesi cikiyor -- yazitin "Mojang bu tohumu sildi"
   sozu birdenbire bir yere oturuyor. Uydurma bir sayi bu
   kapanisi vermezdi.

   Degistirmek istersen tek satir; sadece RAKAM olmali
   (harfe cevrilip Baconian'a giriyor).                       */
export const EFSANE_TOHUM = "7778749381209293789578";

/* Zincir: kac durak ve duraklar arasi adim.
   Adim buyuk secildi ki arkadaslarin gercekten yola ciksin. */
export const EFSANE_DURAK_SAYISI = 3;
export const EFSANE_ADIM_X = 420;
export const EFSANE_ADIM_Z = 260;

/* Giant Alex ayak izleri: durak cevresine serpistirilen
   3x2x2 cukurlar. Lore'dan birebir olcu.                     */
export const EFSANE_IZ_ACIK   = true;
export const EFSANE_IZ_ADET   = 6;
export const EFSANE_IZ_EN     = 2;   // genislik
export const EFSANE_IZ_BOY    = 3;   // uzunluk
export const EFSANE_IZ_DERIN  = 2;   // derinlik
export const EFSANE_IZ_UZAK   = 22;  // merkezden kac blok oteye

export const EFSANE_KAYIT_ANAHTAR = "simsek:efsane";

/* ---- YAZIT ARTIK YERDE DEGIL: DIKILI TABELA ----      v6.6
   Kullanici: "o kadar yaziyi neden yere yazdin, yani
   bloklarla tabela yapsaydin ya."

   Haklıydı. Yazit alani OLCULDU: 116 blok genisliginde,
   41 blok yuksekliginde. Yere serilince 4756 bloklu bir
   HALI oluyor ve yerden bakan hicbir sey goremiyor -- ancak
   ucarak okunuyordu. Ayni harfler DIKEY durunca yapinin
   onunde 116x41'lik bir levha oluyor ve yurudukce
   okunabiliyor.

   Ayni harfler, ayni sifre, ayni blok sayisi -- yalniz
   duzlem degisti (XZ -> XY).                                */
export const EFSANE_TABELA_AYAK = 4;    // panelin yerden yuksekligi
export const EFSANE_TABELA_UZAK = 4;    // piramit kenarindan kac blok onde
export const EFSANE_TABELA_CERCEVE = "minecraft:polished_blackstone_bricks";
export const EFSANE_TABELA_DIREK   = "minecraft:polished_blackstone_bricks";
/* Tabelanin dibindeki meydan: tabela cimenin ustunde asili
   durmasin. Yazi degil, sadece zemin -- yere serilen sey
   yaziysa okunmuyor, meydan ise yapiyi tamamliyor.          */
export const EFSANE_TABELA_MEYDAN = 3;  // tabelanin onunde kac sira zemin

/* ---- UC DURAGI DA GORENE MUZIK ----                    v6.6
   Kullanici: "bir tane muzik dosyasi yukledim, bunun bir
   dakikalik kismini alalim; benim efsane yapisinin ucunu de
   gordukten sonra bu bir dakikalik kisim calmaya baslasin."

   Kaynak 7:34'luk parca. Alinan kisim 4:10 - 5:10: parcanin
   ENERJI PROFILI olculdu, 4:10'da bir sessizlesme (breakdown)
   var ve 4:14'ten itibaren parcanin en yuksek enerjili
   dakikasi geliyor. Yani kesit sessizlikten baslayip patliyor
   -- "ucunu de buldun" anina uyan tek yer orasi. Basta 0.4 sn
   acilma, sonda 2.5 sn kapanma var ki kesim duyulmasin.     */
export const EFSANE_MUZIK_ACIK = true;
export const EFSANE_MUZIK_SES = "simsek.efsane_muzik";
export const EFSANE_MUZIK_TARAMA = 20;   // her saniyede bir bak
/* Bir duragi "gordum" saymak icin kac blok yakina gelmeli.
   Yapi 116 blok genisliginde; 64 blok icinde olan onun
   onunde duruyordur.                                        */
export const EFSANE_MUZIK_MENZIL = 64;
export const EFSANE_MUZIK_BASLIK = "§b§lEFSANE TAMAMLANDI";
export const EFSANE_MUZIK_ALT =
  "§fUc duragi da buldun.";
export const EFSANE_MUZIK_KAYIT_ANAHTAR = "simsek:efsane_muzik";

/* ---- OZEL SIS: SKININ RENGI ----                       v6.6
   Kullanici: "/fog @a push minecraft:fog_hell 12 havayi
   kirmiziya cevirmeye yariyormus, biz bunu benim skinimin
   rengine cevirelim -- mavi mi bilmiyorum ama."

   OLCULDU, tahmin edilmedi. Simsek_Skin/uzak_akraba.png
   64x64, 1632 dolu piksel:
     %95,6  siyaha yakin  (#0A0A0D, #060608, #16181B)
     %1,8   #145E53   koyu turkuaz
     %1,6   #20C5B5   ana vurgu  <-- skinin RENGI bu
     %0,9   #4AEDD9   acik turkuaz
     %0,2   #8CD2FF   acik mavi
   Yani mavi degil TURKUAZ (H=174). Siyah sisi kimse goremez;
   sisin rengi vurgu tonu oldu.

   Bu sabitler kol_uret.py'nin yazdigi fogs/*.json ile AYNI
   kalmali -- tek kaynak orasi, burasi komutu yazdirmak icin. */
export const SIS_KIMLIK = "pa:sis_simsek";
export const SIS_KIMLIK_HAFIF = "pa:sis_simsek_hafif";
export const SIS_ETIKET = "12";        // /fog ... push <kimlik> <etiket>

/* ================================================================
   TEKNOLOJI ZIRHLARI                                       v5.1

   Kullanici: "bunlar direkt zirh modlari degil ama bizim
   odaklanacagimiz sey bunlarin verdigi zirhlar, sadece onlari
   alacagiz, hicbir seyi almayacagiz onlardan baska. Ayrica
   zirh verdigi ozellikler falan varsa alabildiklerini al,
   Java ile Bedrock farkli oldugu icin alabildigini al."

   Uc mod: ProjectE 1.21.1 · Mekanism 1.21.1 ·
   Draconic Evolution 1.20.4.

   ALINMAYANLAR: makine, kablo, enerji agi, EMC/donusturme,
   modul esyalari, aletler, silahlar. Hicbiri.

   Butun sayilar jar'larin BYTECODE'undan okundu. Nereden
   okundugu REFERANS_TEKNOLOJI.md'de dosya/sinif adiyla
   yazili -- bu dosyadaki her satirin oradan bir karsiligi var.

   ---- MOD CEKIRDEKLERINDEN FARKI ----
   Max Steel cekirdegi ELDE tutuluyor, cunku o bir DONUSUM:
   oyuncunun kendi modeli degisiyor ve Molang zirh yuvasini
   okuyamiyor (query.get_equipped_item_name yalniz el yuvalari).

   Bunlar ZIRH. Gercekten giyiliyorlar, cunku:
     - kaynakta da zirh yuvalarina giriyorlar,
     - gorunusu attachable ciziyor (Molang'a gerek yok),
     - script zirh yuvalarini equippable ile OKUYABILIYOR --
       kisit yalniz Molang'da.
   ================================================================ */
export const TEKNOLOJI_ACIK   = true;
export const TEKNOLOJI_TARAMA = 20;    // kac tick'te bir bakilsin
export const TEKNOLOJI_SURE   = 120;   // efekt suresi (TARAMA x 6)
export const TEKNOLOJI_ONEK   = "pa:";

/* Yuva adlari Bedrock'in equippable bileseninde gectigi gibi.
   Sira PARCALAR ile birebir: bas, govde, bacak, ayak.        */
export const TEKNOLOJI_YUVALAR  = ["Head", "Chest", "Legs", "Feet"];
export const TEKNOLOJI_PARCALAR = ["bas", "govde", "bacak", "ayak"];

/* Zirh puani. UC MODDA DA AYNI dagilim cikti -- ProjectE
   `DIAMOND_RESISTANCES` kullaniyor, MekaSuit `NETHERITE`
   uzerinden okuyor, ikisi de 3/8/6/3 = 20. Tesaduf degil:
   vanilla elmas ve netherite ayni dagilimi paylasiyor.       */
export const TEKNOLOJI_KORUMA = { bas: 3, govde: 8, bacak: 6, ayak: 3 };

/* ProjectE'nin PARCA ETKINLIGI (PEArmor.getPieceEffectiveness):
   bot/baslik 0.2 · gogusluk/pantolon 0.3. Toplami 1.0, yani
   tam takimda azaltma taban degere esit. Eksik parcayla
   azaltma da eksik -- bu davranis aynen tasindi.             */
export const TEKNOLOJI_ETKINLIK = { bas: 0.2, govde: 0.3, bacak: 0.3, ayak: 0.2 };

/* ---- AZALTMA -> DIRENC ----
   Bedrock'ta "yuzde su kadar az hasar al" diye bir bilesen yok;
   olan sey Direnc efekti ve o SEVIYE BASINA %20 veriyor.

   Donusum: seviye = floor(azaltma / 0.2), amp = seviye - 1.
   Esitlik ASAGI yuvarlaniyor (v4.96'da konan kural: kaynaktan
   FAZLASINI asla verme).

   TAVAN Direnc IV (=%80). Direnc V (amp 4) bagisiklik demek ve
   o StarOxine'e ayrilmis durumda -- teknoloji zirhi oyuncuyu
   olumsuz yapmiyor.                                           */
export const TEKNOLOJI_DIRENC_ADIM  = 0.2;
export const TEKNOLOJI_DIRENC_TAVAN = 3;   // amp 3 = Direnc IV = %80

/* ---- TAVANIN USTU: GERI KAZANIM ----
   Kizil Madde ve Mucevher takimlari kaynakta %90 azaltiyor.
   Direnc IV %80'de duruyor, aradaki %10 yalnizca Direnc V ile
   verilebilirdi -- o da yasak.

   Bos birakmak "vaat edilen verilmiyor" demek olurdu; v4.95'te
   cekirdeklerde tam bu sikayet gelmisti. Onun yerine hasar
   ALINDIKTAN SONRA geri kazandiriliyor:

     geriKazanim = 1 - (1 - azaltma) / (1 - 0.80)

   Kizil/Mucevher icin (1 - 0.10/0.20) = 0.5, yani alinan
   hasarin yarisi geri veriliyor. Sonuc ham hasarin %10'u --
   kaynagin tam olarak vaat ettigi sey.

   Kara Madde'de azaltma zaten 0.80, geriKazanim 0 cikiyor ve
   hicbir sey olmuyor.                                         */
export const TEKNOLOJI_GERI_KAZANIM_ACIK = true;

/* ---- KALKAN (Draconic) ----
   Kaynakta kalkan bir enerji havuzu: dolu, harcanan, yavas
   yavas dolan. Bedrock'ta en yakin sey Absorption -- ayni
   sekilde harcaniyor ama KENDILIGINDEN dolmuyor.

   Bu yuzden kalkan sabit araliklarla TAZELENIYOR, her taramada
   degil. Aralik kaynagin kendi dolum suresinden hesaplandi:
       kapasite / (kalkan_tazeleme + kapasite_modulu_tazeleme)
   Wyvern  25 / (0.1 + 1.0)  = 22.7 sn -> 455 tick
   Draconic 50 / (0.25 + 2.5) = 18.2 sn -> 364 tick
   Chaotic 100 / (0.5 + 5.0)  = 18.2 sn -> 364 tick
   Her taramada tazelenseydi zirh pratikte olumsuzluk olurdu.

   HANGI MODULLER: gogusluk kendi basina hicbir sey vermiyor,
   her sey takilan modulden geliyor ve kac tane taktigin sana
   kalmis. Burada her kademenin KENDI kademesinden BIRER modul
   takilmis kabul edildi (buyuk kalkan modulu DEGIL, sirasi
   modul). Bu bir varsayim ve gizlenmiyor.                    */
export const TEKNOLOJI_KALKAN_BIRIM = 4;   // Absorption amp basina can

/* ---- OLMEZLIK (Draconic Undying) ----
   Kaynak: olumcul hasarda oyuncuyu ayaga kaldiriyor, can ve
   kalkan veriyor, bir sure dokunulmaz yapiyor, sonra uzun bir
   sarj bekliyor. Sayilar undyingData(can, kalkan, kalkanSure,
   sarjSure, enerji, dokunulmazlik) cagrisindan.               */
export const TEKNOLOJI_OLMEZLIK_ACIK = true;

/* ---- TAKIMLAR ----
   anahtar  : esya kimliginin onu (pa:<anahtar>_<parca>)
   parcalar : hangi zirh parcalari VAR. Draconic'te yalniz
              "govde" -- 1.20.4'te dort parcali takim yok,
              tek Moduler Gogusluk var. Uydurulmadi.
   azaltma  : tam takim taban azaltmasi (0 = yok)
   efektler : [ad, sure(0 = TEKNOLOJI_SURE), amp]
   yetenek  : script tarafinda ek is (su an yalniz "ucus")    */
export const TEKNOLOJI_TAKIMLAR = new Map([

  /* ---------------- ProjectE ---------------- */
  ["pe_kara", {
    ad: "Kara Madde", mod: "ProjectE", kaynak: "projecte:dm_*",
    parcalar: ["bas", "govde", "bacak", "ayak"],
    /* DMArmor.getFullSetBaseReduction() = 0.8f */
    azaltma: 0.80,
    ozet: "tam takım: %80 hasar azaltma · 20 zırh",
    efektler: []
  }],
  ["pe_kizil", {
    ad: "Kızıl Madde", mod: "ProjectE", kaynak: "projecte:rm_*",
    parcalar: ["bas", "govde", "bacak", "ayak"],
    /* RMArmor.getFullSetBaseReduction() = 0.9f */
    azaltma: 0.90,
    ozet: "tam takım: %90 hasar azaltma · 20 zırh",
    efektler: []
  }],
  ["pe_mucevher", {
    ad: "Mücevher", mod: "ProjectE", kaynak: "projecte:gem_*",
    parcalar: ["bas", "govde", "bacak", "ayak"],
    /* GemArmorBase.getFullSetBaseReduction() = 0.9f */
    azaltma: 0.90,
    /* Parca yetenekleri (yalniz bu takimda var):
         GemHelmet : can tazeleme + gece gorusu
         GemChest  : otomatik doyurma + ates korumasi
         GemLegs   : yavas inis
         GemFeet   : dusme hasari yok + adim yardimi 0.4
       Saldiri yetenekleri (doZap yildirimi, doExplode
       patlamasi, yercekimi caktisi) ALINMADI: kaynakta
       ayri bir tusla acilip kapaniyorlar, Bedrock'ta o tus
       yok. Ozet de onlari vaat etmiyor.                     */
    parcaEfektleri: {
      bas:   [["regeneration", 0, 0], ["night_vision", 0, 0]],
      govde: [["saturation", 0, 0], ["fire_resistance", 0, 0]],
      bacak: [["slow_falling", 0, 0]],
      ayak:  [["jump_boost", 0, 0]]
    },
    ozet: "tam takım: %90 hasar azaltma · 20 zırh · " +
          "parça parça: can tazeleme, gece görüşü, doyma, " +
          "ateş bağışıklığı, yavaş iniş, düşme hasarı yok",
    efektler: []
  }],

  /* ---------------- Mekanism ---------------- */
  ["meka", {
    ad: "MekaSuit", mod: "Mekanism", kaynak: "mekanism:mekasuit_*",
    parcalar: ["bas", "govde", "bacak", "ayak"],
    /* mekasuit_absorption.json: destekli hasar turlerinde 1.0,
       sonic_boom 0.75, "belirtilmemis" 1.0. Yani sarjliyken
       takim hasari TAMAMEN yiyor.

       %100 AKTARILMADI. Kaynakta bu ENERJIYE bagli: sarj
       bitince sıradan bir netherite takimi oluyor. Bizde
       enerji sistemi yok (modu almadik, zirhi aldik), yani
       %100 verirsek "hic bitmeyen olumsuzluk" olurdu --
       kaynakta olmayan bir sey. Tavan olan %80'de birakildi
       ve ozet de %80 diyor.                                  */
    azaltma: 0.80,
    /* Ates/lav/sicak zemin ve dusme icin efekt karsiligi TAM:
       fire_resistance ve slow_falling zaten %100 kesiyor --
       kaynagin o hasar turleri icin verdiginin aynisi.       */
    efektler: [
      ["fire_resistance", 0, 0],   // in_fire · on_fire · lava · hot_floor
      ["slow_falling", 0, 0],      // fall
      ["night_vision", 0, 0],      // VisionEnhancement
      ["water_breathing", 0, 0],   // ElectrolyticBreathing
      ["conduit_power", 0, 0],     // HydrostaticRepulsor (su ici hiz)
      ["saturation", 0, 0],        // NutritionalInjection
      /* HydraulicPropulsion ULTRA: ziplama hizina +0.1*5.0 = 0.5.
         Bedrock Ziplama seviye basina +0.1 -> 5 seviye -> amp 4. */
      ["jump_boost", 0, 4],
      /* LocomotiveBoosting ULTRA: yerde moveRelative(0.5/5) yani
         tik basina +0.1 ileri IVME. Bedrock'ta ivme diye bir
         efekt yok, Hiz dogrudan hizi carpiyor.

         BU TEK TAHMINI DONUSUM. Otekilerin hepsi olculu bir
         sayidan geliyor; bu, "gozle gorulur ama ucurmayan"
         diye Hiz III'te birakildi.                            */
      ["speed", 0, 2]
    ],
    /* GravitationalModulating: serbest ucus.                  */
    yetenek: "ucus",
    ozet: "%80 hasar azaltma · 20 zırh · UÇUŞ · ateş bağışıklığı · " +
          "düşme hasarı yok · gece görüşü · su altında nefes · " +
          "doyma · zıplama V · hız III"
  }],

  /* ---------------- Draconic Evolution ----------------
     UC PARCA YOK, UC GOGUSLUK VAR. 1.20.4'te dort parcali
     takim kaldirilmis; oyuna kayitli zirh esyasi tam olarak
     wyvern/draconic/chaotic_chestpiece. Baslik/pantolon/bot
     UYDURULMADI.

     Zirh puani ucunde de ayni: ModularChestpiece kurucusu
     ArmorMaterials.DIAMOND + CHESTPLATE = 8. Fark modullerden.

     Hiz: MOVEMENT_SPEED'e yuzde ekleniyor, Bedrock Hiz'i da
     seviye basina %20 -- birebir cevrilebiliyor.
     Ziplama: onLivingJumpEvent -> push(0, 0.1*(1+p), 0), yani
     ek DIKEY HIZ. Bedrock Ziplama da seviye basina +0.1.      */
  ["draco_wyvern", {
    ad: "Wyvern Göğüslüğü", mod: "Draconic Evolution",
    kaynak: "draconicevolution:wyvern_chestpiece",
    parcalar: ["govde"],
    azaltma: 0,
    /* hiz +%25 -> 1.25 seviye -> 1 -> amp 0
       ziplama +%75 -> 0.1*1.75 = 0.175 -> 1.75 seviye -> amp 0 */
    efektler: [["speed", 0, 0], ["jump_boost", 0, 0],
               ["night_vision", 0, 0], ["saturation", 0, 0]],
    kalkan: { can: 25, aralik: 455 },
    olmezlik: { can: 6, kalkan: 25, dokunulmaz: 40, sarj: 2400 },
    ozet: "8 zırh · 25 kalkan · ölmezlik (6 can) · hız I · " +
          "zıplama I · gece görüşü · doyma"
  }],
  ["draco_draconic", {
    ad: "Draconic Göğüslüğü", mod: "Draconic Evolution",
    kaynak: "draconicevolution:draconic_chestpiece",
    parcalar: ["govde"],
    azaltma: 0,
    /* hiz +%50 -> 2.5 -> 2 seviye -> amp 1
       ziplama +%125 -> 0.1*2.25 = 0.225 -> 2.25 -> amp 1     */
    efektler: [["speed", 0, 1], ["jump_boost", 0, 1],
               ["saturation", 0, 0]],
    /* flightData(elytra=true, creative=true, 2.0)             */
    yetenek: "ucus",
    kalkan: { can: 50, aralik: 364 },
    olmezlik: { can: 12, kalkan: 50, dokunulmaz: 60, sarj: 1200 },
    ozet: "8 zırh · 50 kalkan · UÇUŞ · ölmezlik (12 can) · " +
          "hız II · zıplama II · doyma"
  }],
  ["draco_chaotic", {
    ad: "Chaotic Göğüslüğü", mod: "Draconic Evolution",
    kaynak: "draconicevolution:chaotic_chestpiece",
    parcalar: ["govde"],
    azaltma: 0,
    /* hiz +%150 -> 7.5 -> 7 seviye -> amp 6
       ziplama +%400 -> 0.1*5.0 = 0.5 -> 5 seviye -> amp 4    */
    efektler: [["speed", 0, 6], ["jump_boost", 0, 4]],
    /* flightData(elytra=true, creative=true, 3.5)             */
    yetenek: "ucus",
    kalkan: { can: 100, aralik: 364 },
    olmezlik: { can: 20, kalkan: 100, dokunulmaz: 60, sarj: 900 },
    ozet: "8 zırh · 100 kalkan · UÇUŞ · ölmezlik (20 can) · " +
          "hız VII · zıplama V"
  }]
]);

/* ---- AKTARILAMAYANLAR (ozetlerde vaat EDILMIYOR) ----
   - Tokluk (toughness): Bedrock'ta ozel esyaya verilemiyor,
     boyle bir bilesen yok. Uc takimda da kaybediliyor
     (ProjectE 2.0 · MekaSuit 3.0 · Draconic 2.0).
   - Geri tepme direnci: ayni sebep (0.1 / 0.2 / 0.25 / 0.1).
   - Mucevher takiminin SALDIRI yetenekleri (yildirim,
     patlama, yercekimi caktisi): kaynakta ayri bir tusla
     aciliyor, Bedrock'ta o tus yok.
   - MekaSuit'in donma/wither sogurmasi: Bedrock'ta karsilik
     efekt yok.
   - Draconic'in kismi dusme azaltmasi (ziplama x2 blok):
     Bedrock'ta ya tam bagisiklik var ya hic; kismi yok.
   - Draconic'in GIYILEN MODELI: kaynak modeli Blender'dan
     cikma serbest ucgen agi, Bedrock varlik geometrisi yalniz
     kutu kabul ediyor. Gogusluk esya ikonuyla geliyor,
     uzerine cizilen model YOK.
   - Adim yardimi (Mucevher botu 0.4, MekaSuit 2.0): Bedrock'ta
     oyuncuya verilebilen bir adim yuksekligi yok.             */

/* DUNYA KAYDI YOK -- bilerek. Cekirdek ve kahraman
   defterlerinden farki bu: durumun kaynagi UZERINDEKI ZIRH,
   yani oyunun kendi kaydi. Ayrica bir dunya ozelligi tutmak
   iki dogruluk kaynagi yaratirdi ve ikisi ayrisirdi.        */

/* ================================================================
   MARVEL PROJECT                                           v5.2

   Kullanici: "bir tane daha mod kurdum, bu sefer ugrasmana gerek
   kalmayacak cunku bedrock uzerine kurulu. Eski kahramanlari
   tamamen atiyoruz, Fisk modunu bos veriyoruz artik. Onun yerine
   bunu ekle, bunun tum kahramanlarini."

   FISK GITTI. Dokuz kahraman, yedi isini, kostum dokulari,
   ikonlari ve REFERANS_FISK.md silindi -- kalinti birakilmadi.

   ---- KAYNAK ----
   Marvel Project Addon v3.0.1 (.mcaddon). BEDROCK paketi:
   ne bytecode var ne Java modeli. Geometri, doku ve ikon
   DOGRUDAN alindi; guclerin kodu da okunabilir JavaScript
   (92 dosya). Yani bu surumde tek bir sayi bile tahmin
   edilmedi.

   ---- NE ALINDI ----
   268 parca:
     142 kostum  (ayak yuvasi -- kaynakta da oyle)
      85 maske   (kafa yuvasi)
      41 guc     (bacak yuvasi; kaynagin kendi kalibi)
   41 kahraman. Zirh puani, dayaniklilik, ad, yuva: hepsi
   modun kendi esyasindan. Dokum REFERANS_MARVEL.md'de.

   ---- UCLU KALIP NEDEN KORUNDU ----
   Kaynakta kostum GORUNUS + zirh, maske KAFA, guc ise
   YETENEK tasiyor. Ucunu tek esyada birlestirmek daha kolay
   olurdu ama modun dengesini bozardi: kostumu giyip gucu
   takmamak kaynakta gecerli bir secim.

   ---- KIMLIK BICIMI ----
       pa:mrv_<kahraman>__<anahtar>
   Cift alt cizgi bilerek: kahraman adinda da, anahtar icinde
   de tek alt cizgi var (ironman_mark50). Ayirici tek olsaydi
   calisma zamani kahramani yanlis okurdu. Boylece 268 satirlik
   bir esleme tablosunu iki yerde tutmak GEREKMIYOR -- kimlik
   kendi kahramanini soyluyor.
   ================================================================ */
export const MARVEL_ACIK   = true;
export const MARVEL_ONEK   = "pa:mrv_";
export const MARVEL_AYIRAC = "__";
export const MARVEL_TARAMA = 20;    // kac tick'te bir bakilsin
export const MARVEL_SURE   = 120;   // efekt suresi (TARAMA x 6)

/* Zirh yuvalari: kostum ayakta, maske kafada, guc bacakta.
   Sira TEKNOLOJI_YUVALAR ile ayni bicimde.                  */
export const MARVEL_YUVALAR = ["Head", "Chest", "Legs", "Feet"];

/* ---- AKTARILAMAYANLAR (ozetlerde vaat EDILMIYOR) ----
   - DUVAR TIRMANMA (spiderman, hulk, black_panther, wolverine,
     white_tiger, moon_knight, iron_fist, squirrel_girl,
     rocket_raccoon, venom -- kaynakta `*_climb` etiketi):
     Bedrock'ta oyuncuya tirmanma verilemiyor.
   - AG SALLANMA / KANCA (spiderman, venom, hawkeye, daredevil,
     reed): kaynakta kendi mermi varligi ve fizigi var; bizde
     karsiligi yok.
   - BOY DEGISTIRME (antman/wasp): oyuncuya minecraft:scale
     verilemiyor. Kaynak nausea ile "kuculdum" hissi veriyor,
     biz onu taklit etmiyoruz -- sahte olurdu.
   - GORUNUS VARYANTLARI: modun attachable'lari kendi varlik
     ozelliklerine (`arathnido:SuitTexture0`) bakip bir kostumun
     alti dokusu arasinda geciyor. O ozellikler bizim pakette
     yok; VARSAYILAN doku aliniyor.                            */

/* ---------------- GUC KUMELERI ----------------

   Her kahramanin bacak yuvasindaki GUC esyasi ne veriyor.
   Kaynak: modun kendi script/function dosyalari; hangi
   etiketten geldigi satirlarda yazili.

   efektler: [ad, sure(0 = MARVEL_SURE), amp]
   yetenek : script tarafinda ek is ("ucus" ya da bir isin)   */
export const MARVEL_GUCLER = new Map([

  /* ---- UCANLAR ---- kaynakta `<ad>_fly` etiketi var ---- */
  ["ironman", {
    ad: "Iron Man",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "UÇUŞ · UNIBEAM · ateş bağışıklığı · düşme hasarı yok",
    /* scripts/fly_system/ironman.js -> "ironman_fly"
       scripts/ironman/ironman_weapons.js -> unibeam/repulsor  */
    yetenek: "ucus", isin: "marvel_isin_unibeam",
    efektler: [["fire_resistance", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["thor", {
    ad: "Thor", ozet: "UÇUŞ · güç IV · yıldırım bağışıklığı yok (aktarılamadı)",
    /* scripts/... -> "thor_fly"; Mjolnir ayri bir esya       */
    yetenek: "ucus",
    efektler: [["strength", 0, 3], ["slow_falling", 0, 0]]
  }],
  ["sentry", {
    ad: "Sentry", ozet: "UÇUŞ · güç VI · direnç III · düşme hasarı yok",
    /* scripts/sentry.js -> "sentry_fly", "sentry_attackfly"  */
    yetenek: "ucus",
    efektler: [["strength", 0, 5], ["resistance", 0, 2],
               ["slow_falling", 0, 0]]
  }],
  ["silver_surfer", {
    ad: "Silver Surfer", ozet: "UÇUŞ · ateş bağışıklığı · su altında nefes · düşme hasarı yok",
    /* functions/silver_surfer/silver_surfer_table.mcfunction:
       levitation 1/2, 1/5, 1/9 (bakis acisina gore) +
       slow_falling 1/0. Bizde tek "ucus" yetenegi.           */
    yetenek: "ucus",
    efektler: [["fire_resistance", 0, 0], ["water_breathing", 0, 0],
               ["slow_falling", 0, 0]]
  }],
  ["galactus", {
    ad: "Galactus", ozet: "UÇUŞ · IŞIN · direnç IV · güç X · ateş bağışıklığı",
    /* "galactus_fly", "galactus_punch"; guc esyasinin zirhi
       da tek istisna: 10 (otekiler 5).                       */
    yetenek: "ucus", isin: "marvel_isin_galactus",
    efektler: [["resistance", 0, 3], ["strength", 0, 9],
               ["fire_resistance", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["scarlet_witch", {
    ad: "Scarlet Witch", ozet: "UÇUŞ · KAOS IŞINI · düşme hasarı yok",
    /* "scarlet_witch_fly"; buyu mermileri ayri esya          */
    yetenek: "ucus", isin: "marvel_isin_kaos",
    efektler: [["slow_falling", 0, 0]]
  }],
  ["dr_strange", {
    ad: "Doctor Strange",
    mekanikler: ["gecit"],
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "UÇUŞ · gece görüşü · düşme hasarı yok",
    /* "dr_strange_fly", "dr_strange_wind"; portallar
       aktarilamadi (kendi varlik sistemi).                   */
    yetenek: "ucus",
    efektler: [["night_vision", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["dr_doom", {
    ad: "Doctor Doom", ozet: "UÇUŞ · direnç III · ateş bağışıklığı",
    /* "dr_doom_fly"                                          */
    yetenek: "ucus",
    efektler: [["resistance", 0, 2], ["fire_resistance", 0, 0]]
  }],
  ["falcon", {
    ad: "Falcon",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "UÇUŞ · düşme hasarı yok · hız II",
    /* "falcon_fly"                                           */
    yetenek: "ucus",
    efektler: [["slow_falling", 0, 0], ["speed", 0, 1]]
  }],
  ["starlord", {
    ad: "Star-Lord",
    mekanikler: ["sicrayis"],
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "UÇUŞ · su altında nefes · düşme hasarı yok",
    /* "starlord_fly", "starlord_skip"                        */
    yetenek: "ucus",
    efektler: [["water_breathing", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["rogue", {
    ad: "Rogue", ozet: "UÇUŞ · güç V · direnç II · düşme hasarı yok",
    /* "rogue_fly", "rogue_attack"                            */
    yetenek: "ucus",
    efektler: [["strength", 0, 4], ["resistance", 0, 1],
               ["slow_falling", 0, 0]]
  }],
  ["vision", {
    ad: "Vision",
    mekanikler: ["atilma", "faz"], ozet: "UÇUŞ · ZIHIN TAŞI IŞINI · direnç III · gece görüşü",
    /* "vision_fly", "vision_punch", "vision_impulse";
       faz gecisi (bloktan gecme) aktarilamadi.               */
    yetenek: "ucus", isin: "marvel_isin_zihin",
    efektler: [["resistance", 0, 2], ["night_vision", 0, 0],
               ["slow_falling", 0, 0]]
  }],
  ["adam_warlock", {
    ad: "Adam Warlock",
    mekanikler: ["sicrayis"], ozet: "UÇUŞ · güç IV · direnç II · düşme hasarı yok",
    /* "adam_warlock_fly", "adam_warlock_punch"               */
    yetenek: "ucus",
    efektler: [["strength", 0, 3], ["resistance", 0, 1],
               ["slow_falling", 0, 0]]
  }],
  ["johnny", {
    ad: "Human Torch", ozet: "UÇUŞ · ateş bağışıklığı · ATEŞ IŞINI",
    /* "johnny_fly", "johnny_flame_on", "johnny_punches"      */
    yetenek: "ucus", isin: "marvel_isin_alev",
    efektler: [["fire_resistance", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["venom", {
    ad: "Venom",
    mekanikler: ["tirmanma", "sallanma", "atilma"], ozet: "UÇUŞ · güç V · can tazeleme · düşme hasarı yok",
    /* "venom_fly", "venom_force", "venom_impulse";
       functions/venom/venom_regeneration.mcfunction:
       regeneration 3/3 + saturation.
       Ag sallanma ve tirmanma aktarilamadi.                  */
    yetenek: "ucus",
    efektler: [["strength", 0, 4], ["regeneration", 0, 2],
               ["saturation", 0, 0], ["slow_falling", 0, 0]]
  }],
  ["antman", {
    ad: "Ant-Man / Wasp",
    mekanikler: ["boy"], ozet: "UÇUŞ (Wasp kanadı) · düşme hasarı yok",
    /* "wasp_fly"; boy degistirme aktarilamadi (bkz. yukarisi) */
    yetenek: "ucus",
    efektler: [["slow_falling", 0, 0]]
  }],

  /* ---- YERDEKILER ---- */
  ["daredevil", {
    ad: "Daredevil",
    mekanikler: ["sallanma", "atilma"],
    ozet: "gece görüşü · can tazeleme · emilim V · hız II",
    /* functions/daredevil/skill.mcfunction BIREBIR:
         darkness 2/0 · absorption 15/4 · regeneration 10/0
         · night_vision 20/0
       darkness ALINMADI: kaynakta bu "duyu" efektinin gorsel
       parcasi, bizde oyuncuyu kor eder.                      */
    efektler: [["night_vision", 0, 0], ["regeneration", 0, 0],
               ["absorption", 0, 4], ["speed", 0, 1]]
  }],
  ["spiderman", {
    ad: "Spider-Man",
    mekanikler: ["tirmanma", "sallanma", "atilma"], ozet: "hız III · zıplama III · düşme hasarı yok · direnç II",
    /* "spiderman_climb", "spiderman_impulse", "spiderman_web";
       functions/spiderman/off_swing.mcfunction slow_falling.
       Ag ve tirmanma aktarilamadi -- ozet onlari vaat etmiyor. */
    efektler: [["speed", 0, 2], ["jump_boost", 0, 2],
               ["slow_falling", 0, 0], ["resistance", 0, 1]]
  }],
  ["hulk", {
    ad: "Hulk",
    mekanikler: ["tirmanma", "sicrayis"], ozet: "güç X · direnç IV · zıplama V · düşme hasarı yok",
    /* "hulk_climb", "hulk_falling"; hulk_powers bacak
       yuvasinda ve skin secimi avengers_id_card'da.          */
    efektler: [["strength", 0, 9], ["resistance", 0, 3],
               ["jump_boost", 0, 4], ["slow_falling", 0, 0]]
  }],
  ["wolverine", {
    ad: "Wolverine",
    mekanikler: ["tirmanma", "atilma"], ozet: "can tazeleme III · güç IV · direnç II",
    /* "wolverine_impulse1/2", "wolverine_run_wall";
       pencelerin kendisi ayri esya (wolverine_claws.js).     */
    efektler: [["regeneration", 0, 2], ["strength", 0, 3],
               ["resistance", 0, 1]]
  }],
  ["deadpool", {
    ad: "Deadpool", ozet: "can tazeleme IV · güç III · direnç II",
    /* Iyilesme faktoru; katanalar ayri esya.                 */
    efektler: [["regeneration", 0, 3], ["strength", 0, 2],
               ["resistance", 0, 1]]
  }],
  ["black_panther", {
    ad: "Black Panther",
    mekanikler: ["tirmanma", "atilma"], ozet: "hız III · zıplama II · direnç III · gece görüşü",
    /* "black_panther_claws/climb/kick/spin"                  */
    efektler: [["speed", 0, 2], ["jump_boost", 0, 1],
               ["resistance", 0, 2], ["night_vision", 0, 0]]
  }],
  ["captain_america", {
    ad: "Captain America", ozet: "güç III · hız II · direnç II · doyma",
    /* Guc esyasi kaynakta `super_soldier_powers` adiyla;
       kahraman eslemesi MARVEL_TAKMA_AD'da.                  */
    efektler: [["strength", 0, 2], ["speed", 0, 1],
               ["resistance", 0, 1], ["saturation", 0, 0]]
  }],
  ["black_widow", {
    ad: "Black Widow", ozet: "hız III · zıplama II · gece görüşü",
    efektler: [["speed", 0, 2], ["jump_boost", 0, 1],
               ["night_vision", 0, 0]]
  }],
  ["cyclops", {
    ad: "Cyclops",
    mekanikler: ["atilma"], ozet: "OPTİK IŞIN · hız II",
    /* "cyclops_impulse"; scripts/cyclops.js optik atis        */
    isin: "marvel_isin_optik",
    efektler: [["speed", 0, 1]]
  }],
  ["moon_knight", {
    ad: "Moon Knight",
    mekanikler: ["tirmanma", "atilma"], ozet: "gece görüşü · hız II · zıplama II · düşme hasarı yok",
    /* "moon_knight_climb", "moon_knight_impulse"             */
    efektler: [["night_vision", 0, 0], ["speed", 0, 1],
               ["jump_boost", 0, 1], ["slow_falling", 0, 0]]
  }],
  ["ghost", {
    ad: "Ghost",
    mekanikler: ["faz", "atilma"], ozet: "görünmezlik · hız II",
    /* "ghost_blocks", "ghost_kick_effect"                    */
    efektler: [["invisibility", 0, 0], ["speed", 0, 1]]
  }],
  ["ghost_rider", {
    ad: "Ghost Rider", ozet: "ateş bağışıklığı · güç V · direnç II",
    efektler: [["fire_resistance", 0, 0], ["strength", 0, 4],
               ["resistance", 0, 1]]
  }],
  ["iron_fist", {
    ad: "Iron Fist",
    mekanikler: ["tirmanma", "atilma"], ozet: "güç VI · hız II · zıplama II",
    /* "iron_fist_spin", "iron_fist_kick_effect"              */
    efektler: [["strength", 0, 5], ["speed", 0, 1],
               ["jump_boost", 0, 1]]
  }],
  ["luke_cage", {
    ad: "Luke Cage", ozet: "direnç IV · güç IV · geri tepme yok (aktarılamadı)",
    efektler: [["resistance", 0, 3], ["strength", 0, 3]]
  }],
  ["white_tiger", {
    ad: "White Tiger",
    mekanikler: ["tirmanma", "atilma"],
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "hız III · zıplama III · gece görüşü",
    /* "white_tiger_claws/climb/kick"                         */
    efektler: [["speed", 0, 2], ["jump_boost", 0, 2],
               ["night_vision", 0, 0]]
  }],
  ["squirrel_girl", {
    ad: "Squirrel Girl",
    mekanikler: ["tirmanma"], ozet: "zıplama IV · hız II · düşme hasarı yok",
    /* "squirrel_girl_claws/climb"                            */
    efektler: [["jump_boost", 0, 3], ["speed", 0, 1],
               ["slow_falling", 0, 0]]
  }],
  ["rocket_raccoon", {
    ad: "Rocket Raccoon",
    mekanikler: ["tirmanma"], ozet: "hız III · zıplama II · acele II",
    efektler: [["speed", 0, 2], ["jump_boost", 0, 1], ["haste", 0, 1]]
  }],
  ["groot", {
    ad: "Groot", ozet: "direnç IV · can tazeleme II · güç III",
    efektler: [["resistance", 0, 3], ["regeneration", 0, 1],
               ["strength", 0, 2]]
  }],
  ["mantis", {
    ad: "Mantis", ozet: "can tazeleme III · doyma · gece görüşü",
    efektler: [["regeneration", 0, 2], ["saturation", 0, 0],
               ["night_vision", 0, 0]]
  }],
  ["gambit", {
    ad: "Gambit",
    mekanikler: ["atilma"], ozet: "hız II · zıplama II · patlama direnci yok (aktarılamadı)",
    /* "gambit_impulse"; kart mermileri ayri esya             */
    efektler: [["speed", 0, 1], ["jump_boost", 0, 1]]
  }],
  ["hawkeye", {
    ad: "Hawkeye",
    mekanikler: ["sallanma", "atilma"], ozet: "hız II · düşme hasarı yok · gece görüşü",
    /* "hawkeye_swing", "hawkeye_hook_end";
       functions/hawkeye/off_swing.mcfunction slow_falling    */
    efektler: [["speed", 0, 1], ["slow_falling", 0, 0],
               ["night_vision", 0, 0]]
  }],
  ["gwenpool", {
    ad: "Gwenpool", ozet: "can tazeleme III · hız II · zıplama II",
    efektler: [["regeneration", 0, 2], ["speed", 0, 1],
               ["jump_boost", 0, 1]]
  }],
  ["loki", {
    ad: "Loki", ozet: "görünmezlik · hız II · direnç II",
    efektler: [["invisibility", 0, 0], ["speed", 0, 1],
               ["resistance", 0, 1]]
  }],
  ["thanos", {
    ad: "Thanos", ozet: "güç VIII · direnç IV · ateş bağışıklığı",
    /* Sonsuzluk eldiveni AYRI esya (guantelete.js) --
       aktarilmadi, kaynakta da zirhin parcasi degil.         */
    efektler: [["strength", 0, 7], ["resistance", 0, 3],
               ["fire_resistance", 0, 0]]
  }],
  ["shang_chi", {
    ad: "Shang-Chi", ozet: "güç IV · hız III · zıplama II",
    efektler: [["strength", 0, 3], ["speed", 0, 2],
               ["jump_boost", 0, 1]]
  }],
  ["red_guardian", {
    ad: "Red Guardian", ozet: "güç IV · direnç III",
    efektler: [["strength", 0, 3], ["resistance", 0, 2]]
  }],
  ["taskmaster", {
    ad: "Taskmaster",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "hız II · güç III · zıplama II",
    efektler: [["speed", 0, 1], ["strength", 0, 2],
               ["jump_boost", 0, 1]]
  }],
  ["punisher", {
    ad: "Punisher",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "direnç II · gece görüşü",
    efektler: [["resistance", 0, 1], ["night_vision", 0, 0]]
  }],
  ["winter_soldier", {
    ad: "Winter Soldier",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "güç III · direnç II · hız II",
    efektler: [["strength", 0, 2], ["resistance", 0, 1],
               ["speed", 0, 1]]
  }],
  ["ms_marvel", {
    ad: "Ms. Marvel",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "zıplama III · direnç II · düşme hasarı yok",
    efektler: [["jump_boost", 0, 2], ["resistance", 0, 1],
               ["slow_falling", 0, 0]]
  }],
  ["muse", {
    ad: "Muse",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "hız II · güç III",
    efektler: [["speed", 0, 1], ["strength", 0, 2]]
  }],
  ["jeff_the_land_shark", {
    ad: "Jeff the Land Shark", ozet: "su altında nefes · su gücü · hız II",
    efektler: [["water_breathing", 0, 0], ["conduit_power", 0, 0],
               ["speed", 0, 1]]
  }],
  ["reed", {
    ad: "Mister Fantastic",
    mekanikler: ["sallanma"], ozet: "direnç III · düşme hasarı yok",
    /* Uzama ve kanca aktarilamadi (reed_hook.js kendi mermisi) */
    efektler: [["resistance", 0, 2], ["slow_falling", 0, 0]]
  }],
  ["sue", {
    ad: "Invisible Woman",
    mekanikler: ["kuvvet_alani"], ozet: "görünmezlik · direnç III",
    /* sue_force_physics.js kuvvet alani aktarilamadi          */
    efektler: [["invisibility", 0, 0], ["resistance", 0, 2]]
  }],
  ["mole", {
    ad: "The Thing", ozet: "direnç IV · güç VI · düşme hasarı yok",
    efektler: [["resistance", 0, 3], ["strength", 0, 5],
               ["slow_falling", 0, 0]]
  }],
  ["guardians", {
    ad: "Guardians of the Galaxy",
    /* Bu kahramanin modda GUC ESYASI YOK -- gucu
       kostumun kendisi tasiyor. Uydurma bir guc esyasi
       uretmedik; calisma zamani kostume bakiyor.        */
    gucKostumden: true, ozet: "su altında nefes · hız II",
    efektler: [["water_breathing", 0, 0], ["speed", 0, 1]]
  }]
]);

/* Kaynakta guc esyasinin adi kostumun kahramaniyla birebir
   tutmuyor: Kaptan Amerika'nin gucu `super_soldier_powers`,
   Fantastic Four'un kostumleri ortak ama gucler dort ayri
   esya (reed/sue/johnny/mole).

   YON ONEMLI: soldaki ad KARSILIGI OLMAYAN, sagdaki GERCEK
   guc kumesi. Iki tarafi da MARVEL_GUCLER'e koymak ilk
   denemede yapilmisti ve takma ad OLU KALDI -- testte
   yakalandi.                                                */
export const MARVEL_TAKMA_AD = new Map([
  ["super_soldier", "captain_america"],
  ["fantastic_4", "reed"]
]);

/* ---------------- MARVEL ISINLARI ----------------

   Isin motoru (isinlar.js) Max Steel modlarindan beri
   duruyor; buraya YENI KAPI geldi: isin, o kahramanin GUC
   esyasi bacaginda takiliyken aciliyor.

   Hasarlar kaynakta tek bir sayida durmuyor (her isin kendi
   mermi varligini doguruyor ve carpma hasarini o varlik
   tasiyor). Bu yuzden hasarlar KAYNAKTAN OLCULMEDI, bizim
   olcegimize gore verildi ve boyle oldugu burada yaziyor.
   Olcek: Isi isini 400, Titan lazeri 1000 (v4.95).           */
/* ================================================================
   KOL ISINLARI                                             v6.8

   Kullanici bir komut listesi gonderdi. Ice-Man'in buz saldirisi
   orada dokuz ayri satirdi:
     execute at @a[hasitem={item=lever,...}] run particle
       minecraft:cauldron_explosion_emitter ^^^2
     ... ayni satir ^^^3, ^^^4 ... ^^^10 icin dokuz kez
     execute ... positioned ^^^10 run damage @e[r=10,c=1] 3
     execute ... positioned ^^^10 run effect @e[r=10,c=1] slowness 255 255

   Yani: on blokluk bir parcacik cizgisi, ucundakine hasar ve
   agir yavaslik. Bizde ZATEN bir isin motoru var (isinlar.js);
   dokuz satir tek tabloya indi.

   ---- KAYNAKTAN ALINMAYAN SATIR ----
     execute at @a[...] run effect @p clear
   Kaynak bunu koymus cunku kendi isini KENDINE de deger
   (`@e` ayirt etmiyor). Bizim motorda atici zaten haric --
   ve `effect @p clear` oyuncunun ictigi iksiri de silerdi.
   Ayni tuzagi ucurma.js'te de reddetmistik (orada
   `effect @s clear` yaziyordu).

   ---- NEDEN AYRI TABLO ----
   ZIRH_ISIN cekirdege, MARVEL_ISIN bacaktaki guce, BEN10_ISIN
   eldeki yaratiga bakiyor. Bu ELDEKI KOLA bakiyor -- dorduncu
   kapi turu. Motor ayni, kapi farkli.                        */
/* ================== WILL1545 KILICI  (v7.8) ==================
   Kullanicinin komut listesinden. Kaynak komutlar (komut
   bloguyla calisiyor) OLDUGU GIBI:

     isinlanma  execute at @a[hasitem={item=golden_sword,
                location=slot.weapon.mainhand}] run tp @p ^^^+8
     ucma       ... run effect @p levitation 1 2
     parcacik   ... run execute positioned ^^^3..^^^8 run
                particle minecraft:redstone_ore_dust_particle
     hasar      ... run execute positioned ^^^8 run
                damage @e[r=10,c=1] 2
     yatirma    playanimation @p animation.player.sleeping x 1 "0"
     duzelme    playanimation @p animation.humanoid.base_pose ...

   ---- GORUNUM: VANILLA ALTIN KILIC ----
   Kullanici "gorunum altin kilic ile ayni" dedi. Kendi ikonumuzu
   CIZMEDIK -- cizilen sey "benzer" olurdu, "ayni" degil. Esya
   dogrudan vanilla `golden_sword` doku anahtarini gosteriyor.
   Bunun sarti: BIZ o anahtari kendi item_texture.json'umuzda
   TANIMLAMAYACAGIZ, yoksa vanilla dokusunu ezeriz. Test bunu
   kilitliyor.

   ---- DAYANIKLILIK ----
   Netherite kilic 2031. Kullanici "5,5 kati olsun" dedi:
       2031 x 5,5 = 11170,5  ->  11171
   Hasar DEGISMEDI: kullanici yalniz dayanikliligi istedi,
   gorunum ve gerisi altin kilicin kendisi (altin kilic 4). */
export const WILL_ACIK        = true;
export const WILL_KILIC       = "pa:will_kilic";
/* Dayaniklilik ELLE YAZILMIYOR, HESAPLANIYOR. Ilk yazimda
   11171 sabit yazilmisti ve WILL_NETHERITE/WILL_KAT hicbir
   yerde okunmuyordu -- tarama.mjs'in "oksuz ayar" bekcisi
   ucunu birden yakaladi. Sabit yazmak ayrica sinsi: kat
   degistiginde sayi degismezdi ve kimse fark etmezdi.
   2031 x 5,5 = 11170,5 -> 11171                            */
export const WILL_NETHERITE   = 2031;    // netherite kilicin dayanikliligi
export const WILL_KAT         = 5.5;     // kullanicinin istedigi kat
export const WILL_DAYANIKLILIK = Math.ceil(WILL_NETHERITE * WILL_KAT);
export const WILL_HASAR       = 4;       // altin kilicin kendisi

/* Isinlanma: kaynak `tp @p ^^^+8`. Sekiz blok ILERI, bakis
   dogrultusunda. Kaynakta engel kontrolu YOK -- duvarin icine
   isinlanabiliyorsun. Bizde guvenli yer araniyor (ISIN_ADIM
   ile ayni kalip), cunku duvara gomulmek olum demek.        */
export const WILL_ISIN_MESAFE = 8;
export const WILL_ISIN_BEKLEME = 20;   // kaynagin "onay gecikme suresi: 20"

/* Ucma: kaynak `effect @p levitation 1 2`. Bir tick, seviye 3
   -- yani kisa bir sicrayis, ucus degil. Aynen alindi.      */
export const WILL_UCUS_SURE   = 1;
export const WILL_UCUS_SIDDET = 2;

/* Yatirma: kaynak iki animasyonu ust uste biniyor
   (player.sleeping + agent.move) ve geri donus
   humanoid.base_pose. Bizde hedefe uygulaniyor, kendine
   degil -- kaynakta @p vardi, yani komutu calistiran.       */
export const WILL_YATIR_MENZIL = 10;
export const WILL_YATIR_SURE   = 100;   // 5 sn sonra kendiliginden duzelir
export const WILL_YATIR_ANIM   = "animation.player.sleeping";
export const WILL_YATIR_DUZEL  = "animation.humanoid.base_pose";

/* Gogusteki kan: kaynak ayni parcacigi UC KEZ yaziyor
   ("daha belirgin olsun diye"). Bizde tek cagri, sayi
   ayarda -- uc satiri kopyalamak yerine.                    */
export const WILL_KAN_PARCACIK = "minecraft:redstone_ore_dust_particle";
export const WILL_KAN_KAT      = 3;     // kac kez basilsin
export const WILL_KAN_YUKSEK   = 1.2;   // ~ ~1.2 ~
export const WILL_KAN_ARALIK   = 10;    // kac tick'te bir (kaynakta surekli)

export const KOL_ISIN = new Map([
  /* ---- WILL1545 KILICININ KAN ISINI  (v7.8) ----
     Kaynak parcacigi ^^^3'ten ^^^8'e kadar AYRI AYRI komutlarla
     ve farkli "onay gecikme" sureleriyle basiyor (5, 10, 20,
     30, 40 ve uc tane 25). Yani elle yapilmis bir zamanlama:
     parcaciklar sirayla ileri gidiyor.

     Bizim motor menzil boyunca SUREKLI ciziyor -- ayni gorunum,
     sekiz ayri komut blogu olmadan. Hasar da kaynagin kendi
     satiri: `damage @e[r=10,c=1] 2` yani 2 hasar, TEK hedef.  */
  ["will_isini", {
    ad: "Kan Işını", elde: WILL_KILIC,
    hasar: 2, menzil: 8, yakma: 0,
    parcacik: WILL_KAN_PARCACIK
  }],

  ["buz_isini", {
    ad: "Buz Işını", elde: "pa:kol_buz",
    /* Kaynak `damage @e[r=10,c=1] 3` diyor: 3 hasar, TEK
       hedef (c=1). Menzil ^^^10.                            */
    hasar: 3, menzil: 10, yakma: 0,
    parcacik: "minecraft:cauldron_explosion_emitter",
    /* Kaynagin "doldurma" satiri: slowness 255 255. Seviye
       255 motor sinirinda ama pratikte KALICI felc -- kaynakta
       geri alan hicbir sey de yok. Yamultmada ayni sayiyla
       ayni karari vermistik: sure sinirli tutuluyor.

       Buz Adam'in yavasligiyla ayni seviyede (BUZ_YAVASLIK),
       iki buz yetenegi ayni sertlikte olsun.                */
    yavaslik: BUZ_YAVASLIK, yavaslikSure: BUZ_SURE
  }],

  /* ---- CODE-MAN: SIYAH GUC  (v6.9) ----
     Kullanicinin Code-Man listesinden. Listede IKI ayri isim
     altinda ama AYNI sey:
       "Siyah Guc Saldirisi"  particle evoker_spell ^^^20
       "Ahtapot Kol Saldirisi" particle evoker_spell ^^^5/10/15/20
     ikisinin de hasari `damage @e[r=10,c=1] 2` ve menzili 20.
     Tek yetenek yazildi; ikisini ayri ayri yazmak ayni seyin
     iki kopyasi olurdu.

     Kaynak parcacigi DORT noktaya koyuyor (5, 10, 15, 20);
     bizim motor menzil boyunca surekli ciziyor -- isin kesik
     kesik degil, duz bir cizgi.

     KAPI: Code-Man KOSTUMU (kafada). Kaynak kapiyi kaldiraca
     bagliyordu; bizde o karakterin kendi kostumu var
     (v6.2'de CodeMan modundan gelmisti).                    */
  ["codeman_isini", {
    ad: "Siyah Güç", kafa: "pa:kns_codeman",
    hasar: 2, menzil: 20, yakma: 0,
    parcacik: "minecraft:evoker_spell",
    /* Listedeki "tahta dugme alinca ekran siyah olsun" satiri:
         camera @p fade time 0.1 0.1 0.1 color 0 0 0
       Ayri bir dugmeye baglamak yerine SIYAH GUCE baglandi --
       karanlik saldirinin kendi flasi olsun. Sayilar
       kaynaktaki gibi.                                      */
    karart: [0, 0, 0], karartSure: [0.1, 0.1, 0.1]
  }],

  /* ---- SIMSEK KILICI  (v6.9) ----
     Kullanici: "Code-man Simsek Kilic ozelligi sadece bu Demir
     kilicla calisir digerleri salterle!"
       execute at @a[hasitem={item=iron_sword,...}] run
         execute at @p run summon lightning_bolt ^^^10
     ve "8 kere tekrarla".

     Bu tablodaki tek satir ki HASAR VERMIYOR: isi yildirimlar
     yapiyor. Kaynakta da oyle.                              */
  ["simsek_kilici", {
    ad: "Şimşek Kılıcı", elde: "minecraft:iron_sword",
    hasar: 0, menzil: 10, yakma: 0,
    parcacik: undefined,          // kaynakta parcacik yok
    /* Kaynak sekiz kez `summon lightning_bolt ^^^10` diyor --
       hepsi AYNI noktaya. Sekizi de tek noktaya dusurmek bir
       yildirimdan farksiz gorunur; kucuk bir yayilma veriliyor
       ki sekizi de gorunsun.                                */
    simsek: 8, simsekYayilma: 2.5
  }]
]);

export const MARVEL_ISIN = new Map([
  ["marvel_isin_unibeam", {
    ad: "Unibeam", kahraman: "ironman", hasar: 400, menzil: 24, yakma: 0,
    parcacik: "minecraft:electric_spark_particle"
  }],
  ["marvel_isin_optik", {
    ad: "Optik Işın", kahraman: "cyclops", hasar: 300, menzil: 28, yakma: 0,
    parcacik: "minecraft:redstone_wire_dust_particle"
  }],
  ["marvel_isin_kaos", {
    ad: "Kaos Işını", kahraman: "scarlet_witch", hasar: 350, menzil: 22, yakma: 0,
    parcacik: "minecraft:redstone_wire_dust_particle"
  }],
  ["marvel_isin_zihin", {
    ad: "Zihin Taşı Işını", kahraman: "vision", hasar: 350, menzil: 24, yakma: 0,
    parcacik: "minecraft:endrod"
  }],
  ["marvel_isin_alev", {
    ad: "Alev Işını", kahraman: "johnny", hasar: 300, menzil: 18, yakma: 5,
    parcacik: "minecraft:basic_flame_particle"
  }],
  ["marvel_isin_galactus", {
    ad: "Galactus Işını", kahraman: "galactus", hasar: 1000, menzil: 40, yakma: 8,
    parcacik: "minecraft:endrod"
  }]
]);

/* ================================================================
   MARVEL MEKANIKLERI                                       v5.3

   Kullanici hakliydi ve duzeltmem gerekti:

     "duvar tirmanma, ag sallanma, boy degistirme, faz gecisi,
      kuvvet alani, portallar... bunlari almayacaksan zaten
      kahraman diye bir sey kalmiyor, kostum oluyor. Kahramanda
      ozellik denilen bir sey kalmiyorsa o kahraman degil,
      normal insandir."

   v5.2'de bunlara "Bedrock'ta oyuncuya EFEKTLE verilemiyor"
   demistim. Cumle dogruydu ama YANILTICIYDI: mod bunlari
   efektle degil SCRIPT'le yapiyor ve mod zaten Bedrock. Yani
   aktarilabilirler. Aktarildilar.

   ---- SAYILAR NEREDEN ----
   Hepsi modun kendi script dosyalarindan, satir satir:
     bp/scripts/black_panther.js:72        tirmanma  x0.5
     bp/scripts/spiderman/swing.js:19      cengel menzili 72
     bp/scripts/spiderman/swing.js:42      sallanma cekisi x3.5
     bp/scripts/spiderman/swing.js:159     suzulme x1, dikey -0.1
     bp/scripts/spiderman/swing.js:175     atilma x2
     bp/scripts/spiderman/swing.js:189     sicrayis x8
     bp/scripts/spiderman/swing.js:218     hamle x4
     bp/scripts/ghost/ghost.js:10,24       faz: geri x-1, ileri x2.5
     bp/scripts/sue_force_physics.js:3-13  kuvvet alani sabitleri
     bp/entities/player.json               boy: 0.05 / 1.0 / 5.0

   ---- ITME NEDEN applyKnockback ----
   applyImpulse OYUNCULARDA islemiyor (cekme.js'te v4.x'te
   olculmustu); modun kendisi de her yerde applyKnockback
   kullaniyor. Ayni cagri bicimi korundu:
       applyKnockback(dx, dz, hypot(dx, dz), dy)
   ================================================================ */
export const MARVEL_MEKANIK_ACIK = true;

/* Tirmanma: cömelme + duvara bakma + havada olma. Kaynakta
   durum makinesi bir ANIMASYON DENETLEYICISINDE duruyor ve
   etiket ekleyip cikariyor; script de etikete bakip itiyor.
   Bizde durum makinesi script'te -- ayni kosullar, tek yerde.  */
export const MARVEL_TIRMANMA_GUC    = 0.5;   // black_panther.js:72
export const MARVEL_TIRMANMA_MENZIL = 1.6;   // duvar kac blok otede
export const MARVEL_TIRMANMA_TARAMA = 2;     // kac tick'te bir

/* Sallanma: bakisla bir noktaya cengel at, oraya dogru cek.  */
export const MARVEL_CENGEL_MENZIL = 72;      // swing.js:19
export const MARVEL_SALLANMA_GUC  = 3.5;     // swing.js:42
export const MARVEL_SALLANMA_TICK = 30;      // kac tick cekilsin
export const MARVEL_SUZULME_GUC   = 1.0;     // swing.js:159
export const MARVEL_SUZULME_DIKEY = -0.1;    // swing.js:165

export const MARVEL_ATILMA_GUC  = 4.0;       // swing.js:218
export const MARVEL_SICRAYIS_GUC = 8.0;      // swing.js:189

/* Faz gecisi: kaynakta once GERI (x-1) sonra ILERI (x2.5)
   itiyor -- yani duvarin icinden gecirmiyor, hizla gecip
   gidiyor. Bizde duvarin OTESINDEKI ilk bos yere isinlanma
   var, cunku salt itme Bedrock'ta duvarda takiliyor.
   Fark BURADA yaziyor, gizlenmedi.                            */
export const MARVEL_FAZ_MENZIL = 6;          // kac blok otesine
/* Kaynagin itme carpani (ghost.js:24 -> x2.5) BURADA
   KULLANILMIYOR ve bilerek yazilmadi: bizimki itmiyor,
   isinliyor. Olu bir sabit birakmak "aktarildi" izlenimi
   verirdi.                                                    */

/* Kuvvet alani (Invisible Woman): sue_force_physics.js       */
export const MARVEL_ALAN_YARICAP     = 12;   // ATTRACT_RADIUS
export const MARVEL_ALAN_HASAR_MENZIL = 16;  // MAX_DAMAGE_DISTANCE
export const MARVEL_ALAN_EN_YAKIN    = 4;    // MIN_PULL_DISTANCE
export const MARVEL_ALAN_HIZ         = 3;    // MAGNET_SPEED_I
export const MARVEL_ALAN_HASAR       = 2;    // DAMAGE_AMOUNT
export const MARVEL_ALAN_HASAR_ARA   = 10;   // DAMAGE_INTERVAL_TICKS
export const MARVEL_ALAN_YAVASLIK    = 1;    // SLOWNESS_AMPLIFIER
export const MARVEL_ALAN_YAVASLIK_SURE = 20; // SLOWNESS_DURATION_TICKS
export const MARVEL_ALAN_SURE        = 100;  // alan kac tick acik kalsin

/* Portal (Doctor Strange): kaynakta iki ucu olan gercek bir
   varlik. Bizde tek atislik isinlanma -- baktigin yerdeki ILK
   GUVENLI noktaya. Iki uclu portal ayri bir varlik sistemi
   ister ve o kadari alinmadi; ozet de "portal" demiyor,
   "gecit" diyor.                                              */
export const MARVEL_GECIT_MENZIL = 48;

/* Boy degistirme (Ant-Man / Wasp): entities/player.json'daki
   bilesen gruplari. Degerler modun kendi dosyasindan.         */
export const MARVEL_BOY_OLAY = {
  kucuk:    "pa:boy_kucuk",
  normal:   "pa:boy_normal",
  buyuk:    "pa:boy_buyuk"
};
export const MARVEL_BOY_OLCEK = { kucuk: 0.05, normal: 1.0, buyuk: 5.0 };

/* ================================================================
   MAHOU TSUKAI  (Büyücü)                                   v5.4

   Kullanici: "bir tane daha mod buldum, bunu da ekle aynı
   şekilde... kalıcı olarak aktar."

   ---- KAYNAK ----
   mahoutsukai 1.21.1 v1.36.27. Sayilarin TAMAMI modun kendi
   yapilandirmasindan:
       stepsword/mahoutsukai/config/MTConfig$Server.class
   448 ayar `intconfig/doubleconfig/booleanconfig` cagrilariyla
   tanimli; mahou_coz.py bytecode'u okuyup her ayarin
   VARSAYILAN degerini cikardi (mahou_config.json). Asagidaki
   her sayinin oradan bir karsiligi var ve test ikisini
   karsilastiriyor.

   ---- MANA ----
   Modun kalbi. Bizde de kalbi: her buyunun bir bedeli var ve
   manan yoksa buyu CALISMIYOR. Bedelller kaynagin kendi
   sayilari -- Gandr 5 (en az), Fallen Down 2000, Projection
   1000. Yani ucuz buyu cok, pahali buyu az kullanilir; modun
   dengesi bu.

   ---- NE ALINMADI (ozetler vaat etmiyor) ----
   - BUYU CEMBERLERI: modun asil arayuzu yere cizilen cember
     (blok deseni + ritel). Bedrock'ta blok deseni okuyup
     ritüel calistirmak ayri bir sistem; buyuler bizde
     PARSOMENI TUTUP tetikleniyor.
   - BUYUYEN KILICLAR: Caliburn/Clarent/Morgan kaynakta bir
     ritüelle guclenıyor (POWER_CONSOLIDATION_SWORD_MANA_COST
     5000, gol esigi 150). Ritüel sistemi alinmadi, kiliclar
     TABAN gucleriyle geliyor.
   - FAMILYA (familiar), GERCEKLIK MERMERI (reality marble) ve
     KADEH (grail): kendi boyutlari ve varliklari var.
   - William: modda 2B IKONU YOK (builtin/entity ile
     ciziliyor), bu yuzden ALINMADI. Uydurma ikon cizilmedi.
   ================================================================ */
export const MAHOU_ACIK   = true;
export const MAHOU_ONEK   = "pa:mahou_";
export const MAHOU_TARAMA = 20;

/* ---- MANA (MTConfig$Server) ----
   MANA_REGEN_PER_TICK 1 · MAX_MANA_CAP 200000
   MANA_RECOVERY_SLEEP 0.5 (uyurken carpan)

   TAVAN 200000 kaynakta oyuncunun ULASABILECEGI en yuksek
   deger; baslangic degil. Baslangic modda 0 ve ritüellerle
   artiyor (MANA_INCREASE 1). Ritüel sistemi alinmadigi icin
   baslangici BASLANGIC_MANA yaptik ve bu sayinin kaynakta
   karsiligi YOK -- uydurma olmasin diye burada yaziyor.     */
export const MAHOU_MANA_TAVAN     = 200000;  // MAX_MANA_CAP
export const MAHOU_MANA_TICK      = 1;       // MANA_REGEN_PER_TICK
export const MAHOU_BASLANGIC_MANA = 2000;    // bizim secimimiz
export const MAHOU_KAYIT_ANAHTAR  = "simsek:mahou";

/* ---- ESYALAR ----
   (anahtar, TR ad, EN ad, java hasar modifier, dayaniklilik)
   java hasar -> Bedrock: +1 (WoM'daki olculmus kural).
   `null` hasar = silah degil, alet/odak.

   Tier/hasar kaynak siniflarindan:
     Caliburn/Clarent/Morgan  GrowSwordItem(Tiers.IRON, 3.0f)
     RuleBreaker              SwordItem(Tiers.IRON)  -> +5
     TheRipper                RIPPER_DAMAGE 2.5
     Nobu                     NOBU_BULLET_DAMAGE 8.0
     Dagger/Hammer            ItemBase -- hasar bileseni YOK
   Dayaniklilik:
     CLARENT_DURABILITY 1500 · NOBU_DURABILITY 10000
     RIPPER_DURABILITY 1200 · POWER_CONSOLIDATION_DURABILITY 1000 */
export const MAHOU_ESYALAR = new Map([
  ["caliburn", {
    ad: "Caliburn", en: "Caliburn", hasar: 3, dayaniklilik: 1000,
    ozet: "kutsal kılıç · taban güç (büyüme ritüeli aktarılmadı)"
  }],
  ["clarent", {
    ad: "Clarent", en: "Clarent", hasar: 3, dayaniklilik: 1500,
    /* CLARENT_WOUND_TICKS 600 · CLARENT_WOUND_DAMAGE 0.2
       CLARENT_WOUND_DAMAGE_HITS 3                          */
    yetenek: "mahou_yara",
    ozet: "ihanet kılıcı · YARA (3 vuruşta 600 tik kanama)"
  }],
  ["morgan", {
    ad: "Morgan", en: "Morgan", hasar: 3, dayaniklilik: 1000,
    /* MORGAN_HEAL_FACTOR 30 · MORGAN_RAGE_TIME 120          */
    yetenek: "mahou_ofke",
    ozet: "cadı kılıcı · ÖFKE (120 tik) · vuruşta can çalar"
  }],
  ["rule_breaker", {
    ad: "Rule Breaker", en: "Rule Breaker", hasar: 5, dayaniklilik: 1000,
    yetenek: "mahou_kural_kirici",
    ozet: "büyü bozan hançer · hedefin bütün etkilerini siler"
  }],
  ["rhongomyniad", {
    ad: "Rhongomyniad", en: "Rhongomyniad", hasar: 3, dayaniklilik: 1000,
    /* RHONGOMYNIAD_RANGE 20 · MAX_SMITES 10 · MANA_COST 300 */
    yetenek: "mahou_kutsal_mizrak", mana: 300,
    ozet: "kutsal mızrak · 20 blokta 10 yıldırım (300 mana)"
  }],
  ["theripper", {
    ad: "The Ripper", en: "The Ripper", hasar: 2.5, dayaniklilik: 1200,
    /* RIPPER_DAMAGE 2.5 · ARKADAN +6.0 · FOG_RANGE 20
       RIPPER_FOG_MANA_COST 200 · RIPPER_COOLDOWN 800        */
    yetenek: "mahou_sis", mana: 200,
    ozet: "karanlık hançer · SİS (20 blok, 200 mana) · arkadan +6 hasar"
  }],
  ["nobu", {
    ad: "Nobu", en: "Nobu", hasar: 8, dayaniklilik: 10000,
    /* NOBU_BULLET_DAMAGE 8.0 · NOBU_MANA_PER_SHOT 20        */
    ozet: "ateşli silah · 8 hasar (top çağırma ritüeli aktarılmadı)"
  }],
  ["staff_emrys", {
    ad: "Emrys", en: "Emrys", hasar: null, dayaniklilik: 1000,
    /* EMRYS_MAX_RANGE 22 · DAMAGE_FOCUSED_PER_SECOND 4.0
       EMRYS_MANA_COST_FOCUSED 200                           */
    yetenek: "mahou_yildirim_asasi", mana: 200,
    ozet: "yıldırım asası · 22 blok · saniyede 4 hasar (200 mana)"
  }],
  ["mystic_staff", {
    ad: "Patlayıcı Mana Asası", en: "Mystic Staff", hasar: null,
    dayaniklilik: 1000,
    /* MYSTIC_STAFF_SUMMON_MANA_COST 100 · BIG_SIZE 30       */
    yetenek: "mahou_mana_patlamasi", mana: 100,
    ozet: "mana yoğunlaştırma asası · patlayan ışın (100 mana)"
  }],
  ["spatial_staff", {
    ad: "Uzamsal Karışıklık Asası", en: "Spatial Disorientation Staff",
    hasar: null, dayaniklilik: 1000,
    /* SPATIAL_DISORIENTATION_SPEED 7.0 · AOE_RADIUS 4.0
       MANA_COST 100                                          */
    yetenek: "mahou_savrul", mana: 100,
    ozet: "baktığını fırlatır · hız 7 · 4 blok alan (100 mana)"
  }],
  ["treasury_projection_gauntlet", {
    ad: "Hazine Yansıtma Eldiveni", en: "Treasury Projection Gauntlet",
    hasar: null, dayaniklilik: 1000,
    /* TREASURY_PROJECTION_SCROLL_MANA_COST 1000              */
    yetenek: "mahou_hazine", mana: 1000,
    ozet: "silah yağmuru (1000 mana)"
  }],
  ["dagger", {
    ad: "Hançer", en: "Dagger", hasar: null, dayaniklilik: null,
    ozet: "kan çemberi hançeri · alet (kaynakta da hasarı yok)"
  }],
  ["hammer", {
    ad: "Çekiç", en: "Hammer", hasar: null, dayaniklilik: null,
    ozet: "ritüel çekici · alet (kaynakta da hasarı yok)"
  }],
  ["kodoku", {
    ad: "Kodoku", en: "Kodoku", hasar: null, dayaniklilik: null,
    ozet: "sempatik büyü kavanozu"
  }],
  ["attuned_diamond", {
    ad: "Uyumlu Elmas", en: "Attuned Diamond", hasar: null,
    dayaniklilik: null, ozet: "mana odağı"
  }],
  ["attuned_emerald", {
    ad: "Uyumlu Zümrüt", en: "Attuned Emerald", hasar: null,
    dayaniklilik: null, ozet: "mana odağı"
  }]
]);

/* ---- BUYULER (parsomenler) ----
   Hepsi PARSOMEN esyasi; tutup tetikliyorsun. Mana bedelleri
   kaynagin kendi ayarlarindan, yanlarinda ayar adi yazili.

   efektler: [ad, sure, amp]  -- sure kaynagin kendi tik degeri
   yetenek : script tarafinda is yapan buyuler                */
export const MAHOU_BUYULER = new Map([
  ["fay_gorusu", {
    ad: "Fay Görüşü", en: "Scroll of Fay Sight",
    mana: 100,        // FAY_SIGHT_MANA_COST
    /* FAY_SIGHT_TIME 600 */
    efektler: [["night_vision", 600, 0]],
    ozet: "600 tik gece görüşü (100 mana)"
  }],
  ["icgoru", {
    ad: "İçgörü", en: "Scroll of the Mystic Eyes of Insight",
    mana: 320,        // INSIGHT_MANA_COST
    /* INSIGHT_TIME 1200. Kaynakta hedefin zayifligini
       gosteriyor; Bedrock'ta karsiligi PARLAMA -- yakindaki
       canlilar gorunur oluyor.                              */
    yetenek: "mahou_icgoru",
    ozet: "1200 tik: yakındaki canlılar parlar (320 mana)"
  }],
  ["kehanet", {
    ad: "Kehanet", en: "Scroll of the Mystic Eyes of Clairvoyance",
    mana: 220,        // CLAIRVOYANCE_MANA_COST
    /* CLAIRVOYANCE_TIME 1200 · CLAIRVOYANCE_RANGE 30        */
    efektler: [["night_vision", 1200, 0], ["speed", 1200, 0]],
    ozet: "1200 tik gece görüşü + hız (220 mana)"
  }],
  ["baglama", {
    ad: "Bağlama Gözleri", en: "Scroll of the Mystic Eyes of Binding",
    mana: 320,        // MYSTIC_EYES_MANA_COST
    /* MYSTIC_EYES_TIME 600 · RANGE_FROM_USER 5             */
    yetenek: "mahou_baglama",
    ozet: "5 blokta baktığını 600 tik dondurur (320 mana)"
  }],
  ["guclendirme", {
    ad: "Güçlendirme", en: "Scroll of Strengthening",
    mana: 50,         // STRENGTHENING_MANA_COST
    /* STRENGTHENING_CAP 50 -- kaynakta ESYAYI guclendiriyor;
       Bedrock'ta esya gucu degistirilemiyor, o yuzden
       OYUNCUYU gucledirıyor ve ozet de oyle diyor.          */
    efektler: [["strength", 600, 1]],
    ozet: "600 tik güç II (50 mana) · kaynakta eşyayı güçlendirir"
  }],
  ["bagisiklik_takasi", {
    ad: "Bağışıklık Takası", en: "Scroll of Immunity Exchange",
    mana: 400,        // IMMUNITY_EXCHANGE_MANA_COST
    /* IMMUNITY_EXCHANGE_TIME 1200 */
    efektler: [["resistance", 1200, 2], ["fire_resistance", 1200, 0]],
    ozet: "1200 tik direnç III + ateş bağışıklığı (400 mana)"
  }],
  ["gizlenme", {
    ad: "Varlık Gizleme", en: "Scroll of Presence Concealment",
    mana: 100,
    /* Kaynakta ayri bir mana ayari YOK; Fay Sight ile ayni
       kademede duruyor ve 100 alindi. Bu TEK tahmini bedel
       ve boyle oldugu burada yaziyor.                       */
    efektler: [["invisibility", 600, 0]],
    ozet: "600 tik görünmezlik (100 mana · bedeli tahmini)"
  }],
  ["gandr", {
    ad: "Gandr", en: "Scroll of Gandr",
    mana: 5,          // GANDR_MIN_DAMAGE ile ayni olcek
    /* GANDR_MIN_DAMAGE 5.0 · MAX_DAMAGE 1000.0
       GANDR_HIT_RADIUS 6.0 · CLOUD_DURATION 200            */
    yetenek: "mahou_gandr",
    ozet: "kara mermi · 5-1000 hasar · 6 blok alan (5 mana)"
  }],
  ["kara_alev", {
    ad: "Kara Alev Gözleri", en: "Scroll of the Mystic Eyes of the Black Flame",
    mana: 300,        // BLACK_FLAME_MANA_COST
    /* BLACK_FLAME_RANGE_FROM_USER 30 · TIME 100
       BLACK_FLAME_DEBUFF_TIME 180                          */
    yetenek: "mahou_kara_alev",
    ozet: "30 blokta kara alev · 100 tik yanma (300 mana)"
  }],
  ["dusus", {
    ad: "Düşüş", en: "Scroll of Fallen Down",
    mana: 2000,       // FALLEN_DOWN_MANA_COST
    /* FALLEN_DOWN_BEAM_DAMAGE 2.0 · RADIUS 30
       TARGET_HEALTH_PERCENTAGE_DAMAGE 0.05                 */
    yetenek: "mahou_dusus",
    ozet: "30 blokluk yıkım ışını · +%5 can hasarı (2000 mana)"
  }],
  ["rho_aias", {
    ad: "Rho Aias", en: "Scroll of Rho Aias",
    mana: 300,        // RHO_AIAS_MANA_COST
    /* RHO_AIAS_LIFE 1200 */
    efektler: [["absorption", 1200, 4], ["resistance", 1200, 1]],
    ozet: "1200 tik kalkan (emilim V + direnç II) (300 mana)"
  }],
  ["can_emme_siniri", {
    ad: "Can Emme Sınırı", en: "Scroll of the Boundary of Drain Life",
    mana: 5,          // DRAIN_LIFE_BARRIER_MANA_COST
    /* DRAIN_LIFE_BARRIER_RADIUS 10 · DAMAGE 2.0
       HEAL_FACTOR 0.5 · BARRIER_CYCLE 20                   */
    yetenek: "mahou_can_emme",
    ozet: "10 blokta 2 hasar, yarısı sana can olur (5 mana/çevrim)"
  }],
  ["yercekimi_siniri", {
    ad: "Yerçekimi Sınırı", en: "Scroll of the Gravity Boundary",
    mana: 1,          // GRAVITY_BARRIER_MANA_COST
    /* GRAVITY_BARRIER_RADIUS 10 · FACTOR 1.4 · CYCLE 1     */
    yetenek: "mahou_yercekimi",
    ozet: "10 blokta canlıları yere çeker (1 mana/çevrim)"
  }],
  ["alarm_siniri", {
    ad: "Alarm Sınırı", en: "Scroll of the Alarm Boundary",
    mana: 1,          // ALARM_BARRIER_MANA_COST
    /* ALARM_BARRIER_RADIUS 10 · CYCLE 20                   */
    yetenek: "mahou_alarm",
    ozet: "10 blokta canlıları parlatır (1 mana/çevrim)"
  }],
  ["yer_degistirme", {
    ad: "Zihinsel Yer Değiştirme", en: "Scroll of Mental Displacement",
    mana: 300,        // MENTAL_DISPLACEMENT_MANA_COST
    /* MENTAL_DISPLACEMENT_RANGE 20 */
    yetenek: "mahou_yer_degistir",
    ozet: "20 blokta baktığınla yer değiştirir (300 mana)"
  }],
  ["uzamsal_karisiklik", {
    ad: "Uzamsal Karışıklık", en: "Scroll of Spatial Disorientation",
    mana: 100,        // SPATIAL_DISORIENTATION_MANA_COST
    /* SPEED 7.0 · AOE_RADIUS 4.0 */
    yetenek: "mahou_savrul",
    ozet: "4 blok alandakileri 7 hızla fırlatır (100 mana)"
  }],
  ["yukselis", {
    ad: "Yükseliş", en: "Scroll of Ascension",
    mana: 30,         // ASCENSION_SCROLL_MANA_COST
    /* ASCENSION_BLOCK_CYCLE 4 */
    yetenek: "mahou_yukselis",
    ozet: "seni yukarı kaldırır (30 mana)"
  }],
  ["olum_toplama", {
    ad: "Ölüm Toplama Gözleri", en: "Scroll of the Mystic Eyes of Death Collection",
    mana: 400,        // DEATH_COLLECTION_MANA_COST
    /* DEATH_COLLECTION_TIME 600 · RANGE_FROM_USER 10
       SOUL_VALUE_MOB 0.25 · REVIVE_VALUE 12.0              */
    yetenek: "mahou_olum_toplama",
    ozet: "600 tik: 10 blokta ölen her canlı sana can verir (400 mana)"
  }],
  ["kelebek_etkisi", {
    ad: "Kelebek Etkisi", en: "Scroll of the Butterfly Effect",
    mana: 100,        // BUTTERFLY_EFFECT_MANA_COST
    /* BUTTERFLY_EFFECT_DURATION 400 */
    efektler: [["speed", 400, 1], ["jump_boost", 400, 1],
               ["slow_falling", 400, 0]],
    ozet: "400 tik hız II + zıplama II + düşme hasarı yok (100 mana)"
  }],
  ["hasar_takasi", {
    ad: "Hasar Takası", en: "Scroll of Damage Exchange",
    mana: 40,         // DAMAGE_EXCHANGE_MANA_COST
    /* DAMAGE_EXCHANGE_CAP 5 · REDUCE_TO 1 · MANA_GAIN 20   */
    efektler: [["resistance", 600, 3]],
    ozet: "600 tik direnç IV (40 mana)"
  }]
]);
