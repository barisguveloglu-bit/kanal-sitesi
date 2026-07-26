/*
 * KANLI GÖZ — Evren Verisi
 * ---------------------------------------------------------------
 * Sitedeki tüm içerik bu dosyadan gelir. Yeni karakter eklemek için
 * KARAKTERLER dizisine yeni bir nesne eklemen yeterli; sayfalar
 * kendiliğinden güncellenir. HTML'e dokunmana gerek yok.
 *
 * taraf: "iyi" | "kotu" | "belirsiz"
 * tir:   kaldırabildiği tır sayısı (gücü yoksa null)
 */

/*
 * Hikayenin şu anki durumu. Site genelindeki uyarı şeridi buradan geliyor.
 * Durum değişince sadece burayı güncelle.
 */
const DURUM = {
  baslik: "Kameracı Barış ele geçirildi",
  ozet:
    "Barış şu anda kötülerin elinde. Ama beynini nasıl yıkayacaklarını bilmiyorlar — " +
    "dilek hakkı hâlâ kilitli.",
  sizanCumle: "O GERÇEK BARIŞ'I BULACAK",
};

const KARAKTERLER = [
  {
    id: "kameraci-baris",
    ad: "Kameracı Barış",
    unvan: "Kanlı Göz'ün Taşıyıcısı",
    taraf: "iyi",
    oynanan: true,
    esir: true,
    tir: null,
    gucEtiketi: "Güç yok",
    ozet:
      "Ailesiz bir gazeteci. Zengin ama herkese fakir gibi görünüyor. " +
      "Hiçbir gücü yok — sahip olduğu tek şey iradesi. Bu neslin Kanlı Göz'ünü " +
      "taşıyor, ama bundan haberi bile yok.",
    ozellikler: [
      "Gazeteci / kameraman",
      "Ailesiz",
      "Zengin — ama fakir gibi davranıyor",
      "Azimli ve kararlı",
      "Verdiği hiçbir karardan vazgeçmez",
    ],
    iradeKademe: 5,
    detay:
      "Şu anda kötülerin elinde. Ama beynini nasıl yıkayacaklarını bilmiyorlar, " +
      "yani dilek hakkı hâlâ kilitli. Onu kaybetmek iyilerin en büyük gücünü " +
      "kaybetmesi demek — hiçbir yeteneği yoktu ama hikayenin tek anahtarı oydu.",
  },
  {
    id: "cips-yiyen-adam",
    ad: "Cips Yiyen Adam",
    unvan: "Öfkeli Dost",
    taraf: "iyi",
    oynanan: false,
    tir: 2,
    gucEtiketi: "2 tır",
    ozet:
      "Her cips yediğinde güçleniyor. Ciddi bir savaşa girdiğinde yoğurda " +
      "geçiyor ve çok daha tehlikeli bir forma bürünüyor.",
    ozellikler: [
      "İnsanüstü güç",
      "İnsanüstü hız",
      "İnsanüstü çeviklik",
      "İnsanüstü dayanıklılık",
      "Cips yedikçe güçlenir",
    ],
    formlar: [
      { ad: "Cips Yiyen Adam", tir: 2, aciklama: "Normal form. İki tır kaldırır." },
      {
        ad: "Yoğurt Yiyen Adam",
        tir: 5,
        aciklama: "Ciddi savaş modu. Beş tır kaldırır.",
      },
    ],
    iradeKademe: 4,
    detay:
      "Samara Kadın'ın yüzünü gördü. İradesi güçlü olduğu için hâlâ ona aşık — " +
      "ama emirleri üzerinde hiçbir etkisi yok. Bu evrende aşık olmakla itaat " +
      "etmenin farklı şeyler olduğunun canlı kanıtı.",
  },
  {
    id: "sari-gulucuk",
    ad: "Sarı Gülücük",
    unvan: "Mucit",
    taraf: "iyi",
    oynanan: false,
    tir: null,
    gucEtiketi: "Zekâ",
    ozet:
      "Aşırı zeki bir mucit. İcatlar ve tuzaklar kuruyor. Kendi şirketi var — " +
      "ayı kapanı satıyor ve icatlarının parasını oradan çıkarıyor.",
    ozellikler: [
      "Olağanüstü zekâ",
      "İcat yapabilme",
      "Tuzak kurabilme",
      "Kendi şirketi (ayı kapanı)",
      "Para sıkıntısı yok",
    ],
    detay:
      "Şu anda ağır yaralı Samara Kadın ile ilgileniyor. Fiziksel gücü olmayan " +
      "ama masanın üstündeki en tehlikeli ikinci beyin olan karakter.",
  },
  {
    id: "samara-kadin",
    ad: "Samara Kadın",
    unvan: "Dönek",
    taraf: "belirsiz",
    oynanan: false,
    tir: null,
    gucEtiketi: "Zihin kontrolü",
    ozet:
      "Yüzünü gören herkesi aşık eder ve iradesiz varlıklara dönüştürür. Ne " +
      "derse sorgusuz yapılır. Ama iradesi güçlü olanlar sadece aşık olur — " +
      "emirler onlarda işlemez.",
    ozellikler: [
      "Yüzünü görenleri aşık eder",
      "Kurbanları iradesizleşir",
      "Emirleri sorgulanmaz",
      "Güçlü iradeye karşı etkisiz",
    ],
    detay:
      "Başlangıçta kötülerin yanındaydı. İhaneti ortaya çıkınca çok ağır " +
      "yaralandı. Şu anda Sarı Gülücük'ün korumasında. Hangi tarafta olduğu " +
      "hâlâ net değil.",
  },
  {
    id: "gizemli-cocuk",
    ad: "Gizemli Çocuk",
    unvan: "Şimşek",
    taraf: "kotu",
    oynanan: true,
    tir: 4,
    gucEtiketi: "4 tır",
    ozet:
      "Dört tır kaldırabilen, elektriği manipüle edebilen genç bir savaşçı. " +
      "Elektrik kontrolü hâlâ temel seviyede — ama fiziksel olarak zaten çok güçlü.",
    ozellikler: [
      "4 tır kaldırma gücü",
      "İnsanüstü hız",
      "İnsanüstü çeviklik",
      "İnsanüstü dayanıklılık",
      "Elektrik manipülasyonu (temel)",
    ],
    detay:
      "Savaşsız dünya fikri abisinindi; o da bu fikre katıldı. Abisinin " +
      "gölgesinde büyüyor ve elektrik gücü abisininkinin ham hâli — " +
      "potansiyeli açık, kontrolü eksik.",
  },
  {
    id: "gizemli-cocugun-abisi",
    ad: "Gizemli Çocuğun Abisi",
    unvan: "Asıl Patron",
    taraf: "kotu",
    oynanan: false,
    tir: 4,
    gucEtiketi: "4 tır + tam elektrik",
    ozet:
      "Savaşsız dünya fikri onun. 81 ilin tamamında adamı var; üç cephe " +
      "komutanı doğrudan ona rapor veriyor. Elektriği tam anlamıyla kontrol " +
      "ediyor ve aşırı kurnaz.",
    ozellikler: [
      "4 tır kaldırma gücü",
      "İnsanüstü hız",
      "İnsanüstü çeviklik",
      "İnsanüstü dayanıklılık",
      "Elektriğe tam hâkimiyet",
      "Üç komutan, 81 il derebeyi",
      "Savaşsız dünya fikrinin sahibi",
    ],
    detay:
      "Hikayenin asıl patronu ve fikrin sahibi. Kavgasız bir dünya onun " +
      "düşüncesiydi; kardeşi Gizemli Çocuk sonradan ona katıldı. " +
      "\"O gerçek barışı bulacak\" cümlesindeki \"o\" işte bu adam.",
  },
];

/* Güç tablosu — formlar dahil, büyükten küçüğe */
const GUC_SIRALAMASI = [
  { ad: "Yoğurt Yiyen Adam", tir: 5, not: "Cips Yiyen Adam'ın savaş modu", taraf: "iyi" },
  { ad: "Gizemli Çocuğun Abisi", tir: 4, not: "Tam elektrik kontrolü", taraf: "kotu" },
  { ad: "Gizemli Çocuk", tir: 4, not: "Temel elektrik manipülasyonu", taraf: "kotu" },
  { ad: "Nemesis", tir: 3, not: "Batı Cephesi — misilleme", taraf: "kotu" },
  { ad: "Teşup", tir: 3, not: "Orta Cephe — basınç ve fırtına", taraf: "kotu" },
  { ad: "Ahriman", tir: 3, not: "Doğu Cephesi — çürütme", taraf: "kotu" },
  { ad: "Cips Yiyen Adam", tir: 2, not: "Normal form", taraf: "iyi" },
  { ad: "İl Derebeyi (ortalama)", tir: 1, not: "81 ilin her birinde bir tane", taraf: "kotu" },
  { ad: "Samara Kadın", tir: 0, not: "Fiziksel güç yok — zihin kontrolü", taraf: "belirsiz" },
  { ad: "Sarı Gülücük", tir: 0, not: "Fiziksel güç yok — zekâ ve icat", taraf: "iyi" },
  { ad: "Kameracı Barış", tir: 0, not: "Hiçbir gücü yok — sadece iradesi", taraf: "iyi" },
];

/* İrade kademeleri — TASLAK, birlikte detaylandırılacak */
const IRADE_KADEMELERI = [
  {
    kademe: 1,
    ad: "Kırılgan İrade",
    etki: "Anında iradesizleşir. Kişilik yok olur, geriye sadece emir bekleyen bir varlık kalır.",
    ornek: null,
  },
  {
    kademe: 2,
    ad: "Zayıf İrade",
    etki: "Aşık olur ve emirlerin neredeyse tamamına uyar. Nadiren duraksar.",
    ornek: null,
  },
  {
    kademe: 3,
    ad: "Dirençli İrade",
    etki: "Aşık olur. Emirler zorlayıcı bir baskı gibi gelir ama bazılarını reddedebilir.",
    ornek: null,
  },
  {
    kademe: 4,
    ad: "Güçlü İrade",
    etki: "Aşık olur ama emirler hiç işlemez. Bilinç tamamen kendisindedir.",
    ornek: "Cips Yiyen Adam",
  },
  {
    kademe: 5,
    ad: "Kanlı Göz İradesi",
    etki: "300 yılda bir doğar. Kırılması neredeyse imkânsızdır.",
    ornek: "Kameracı Barış",
  },
];

/*
 * Mafya hiyerarşisi — dört kademe:
 *   1. Gizemli Çocuğun Abisi (asıl patron, fikrin sahibi)
 *   2. Gizemli Çocuk (kardeşi, fikre katılan)
 *   3. Üç Komutan Derebeyi (81 ili üçe bölüp yönetirler, abiye rapor verirler)
 *   4. 81 il derebeyi (her ilde bir tane)
 *
 * İsim vermek için ilgili satırdaki ad: null yerine ad: "İsim" yaz.
 */
const MAFYA_TEPE = [
  {
    id: "gizemli-cocugun-abisi",
    ad: "Gizemli Çocuğun Abisi",
    unvan: "Asıl Patron",
    not: "Savaşsız dünya fikri onun. Bütün ağ ona bağlı, üç komutan doğrudan ona rapor veriyor. Elektriğe tam hâkim.",
  },
  {
    id: "gizemli-cocuk",
    ad: "Gizemli Çocuk",
    unvan: "Kardeşi",
    not: "Abisinin fikrine katıldı. Hiyerarşide komutanların üstünde. Elektrik kontrolü hâlâ temel seviyede.",
  },
];

/*
 * Üç komutan derebeyi.
 * Her biri iyilerin bir kozunu etkisiz bırakacak şekilde tasarlandı:
 *   Nemesis  -> ham gücü (Cips Yiyen Adam)
 *   Teşup    -> alan ve hareket kabiliyetini
 *   Ahriman  -> icat ve tuzakları (Sarı Gülücük)
 * Üçü de 3 tır: kardeşlerin (4 tır) altında, Cips Yiyen Adam'ın normal
 * formunun (2 tır) üstünde, Yoğurt formunun (5 tır) altında.
 */
const KOMUTANLAR = [
  {
    id: "bati",
    ad: "Nemesis",
    bolge: "Batı",
    unvan: "Batı Cephesi Komutanı",
    mitoloji: "Yunan mitolojisi",
    kaynak: "İntikam ve ilahi adalet tanrıçası. Haddini aşanı cezalandırır.",
    tir: 3,
    gucAdi: "Misilleme",
    gucAciklama:
      "Yediği darbeyi soğurup katlayarak geri veriyor. Ona ne kadar sert " +
      "vurursan o kadar sert geri alıyorsun.",
    ozellikler: [
      "3 tır kaldırma gücü",
      "Aldığı hasarı biriktirir",
      "Biriken hasarı katlayarak iade eder",
      "Sert vuran düşmana karşı en güçlü",
    ],
    zaaf:
      "Vurulmazsa hiçbir şey yapamaz — sadece 3 tırlık sıradan bir savaşçı. " +
      "Ayrıca biriktirdiği hasarın bir sınırı var; taşarsa kendisi çöküyor.",
    iradeKademe: 4,
    not:
      "Marmara, Ege ve Batı Akdeniz — Trakya'dan Antalya'ya 27 il. " +
      "Cips Yiyen Adam'ın en büyük kozu olan ham güç, ona karşı en büyük zaafı.",
  },
  {
    id: "orta",
    ad: "Teşup",
    bolge: "Orta",
    unvan: "Orta Cephe Komutanı",
    mitoloji: "Hitit mitolojisi",
    kaynak: "Fırtına tanrısı. Elinde yıldırımla betimlenir.",
    tir: 3,
    gucAdi: "Basınç ve Fırtına",
    gucAciklama:
      "Hava basıncını kontrol ediyor. Kasırga çıkarıyor, şok dalgasıyla " +
      "insanı yere çiviliyor. Ama yıldırım atamıyor — o abisinde.",
    ozellikler: [
      "3 tır kaldırma gücü",
      "Hava basıncı kontrolü",
      "Kasırga ve şok dalgası",
      "Geniş alanda, kalabalığa karşı çok güçlü",
      "Yıldırım YOK — sadece fırtına",
    ],
    zaaf:
      "Kapalı ve dar alanda gücü kırılıyor. Tünelde, bodrumda, yer altında " +
      "sıradan bir savaşçıya dönüyor.",
    iradeKademe: 3,
    not:
      "İç Anadolu, Batı Karadeniz ve Çukurova — başkenti kapsayan 27 il. " +
      "Fırtına tanrısının adını taşıyor ama gerçek yıldırım abinin elinde. " +
      "Üçü arasında iradesi en zayıf olan da o.",
  },
  {
    id: "dogu",
    ad: "Ahriman",
    bolge: "Doğu",
    unvan: "Doğu Cephesi Komutanı",
    mitoloji: "Pers mitolojisi",
    kaynak: "Yıkımın ruhu. İyilik tanrısının tam karşıtı.",
    tir: 3,
    gucAdi: "Çürütme",
    gucAciklama:
      "Dokunduğu şeyin yapısını bozuyor. Metal çürüyor, makine duruyor, " +
      "mekanizma dağılıyor.",
    ozellikler: [
      "3 tır kaldırma gücü",
      "Dokunduğu maddeyi çürütür",
      "Makine ve mekanizmaları öldürür",
      "Tuzakları işlemez hâle getirir",
    ],
    zaaf:
      "Canlıya karşı çok yavaş etki ediyor; canlı beden direniyor. " +
      "Ayrıca temas etmesi şart — uzaktan hiçbir şey yapamıyor.",
    iradeKademe: 4,
    not:
      "Doğu Anadolu, Güneydoğu ve Doğu Karadeniz — en sert coğrafyadaki 27 il. " +
      "Sarı Gülücük'ün bütün icat ve tuzak avantajını silen adam.",
  },
];

/* Üç komutanı bir arada tutan ve birbirine düşüren şey */
const KOMUTAN_CEKISMESI = {
  baslik: "Sonsuz para",
  metin:
    "Gizemli Çocuğun Abisi üç komutana da aynı teklifi yaptı: iş başarıya " +
    "ulaşırsa sonsuz para. Üçü de kabul etti ve o günden sonra zamanla " +
    "güçlendiler — bugünkü seviyelerine parayla ulaştılar.",
  sonuc:
    "Ama ödül sonuca bağlı olduğu için birbirlerine rakipler. Aynı adama " +
    "rapor veriyorlar, aynı ödülü bekliyorlar ve gerektiğinde birbirleriyle " +
    "çatışıyorlar.",
};

/* 81 il derebeyi — plaka sırasına göre */
const IL_DEREBEYLERI = [
  { plaka: 1, il: "Adana", komutan: "orta", ad: "Şanta", kim: "Kilikya'nın veba ve savaş tanrısı" },
  { plaka: 2, il: "Adıyaman", komutan: "dogu", ad: "Mithra", kim: "ışık ve yemin tanrısı — Nemrut'taki dev" },
  { plaka: 3, il: "Afyonkarahisar", komutan: "bati", ad: "Marsyas", kim: "Apollon'a meydan okuyan Frig satiri" },
  { plaka: 4, il: "Ağrı", komutan: "dogu", ad: "Simurg", kim: "dağın tepesinde yuva kuran efsanevi kuş" },
  { plaka: 5, il: "Amasya", komutan: "orta", ad: "Lelwani", kim: "yeraltı dünyasının hükümdarı" },
  { plaka: 6, il: "Ankara", komutan: "orta", ad: "Kumarbi", kim: "tahttan indirilen tanrılar babası" },
  { plaka: 7, il: "Antalya", komutan: "bati", ad: "Khimaira", kim: "ateş püsküren Likya canavarı — Yanartaş" },
  { plaka: 8, il: "Artvin", komutan: "dogu", ad: "Zal", kim: "Simurg'un büyüttüğü ak saçlı kahraman" },
  { plaka: 9, il: "Aydın", komutan: "bati", ad: "Aphrodite", kim: "aşk tanrıçası — Afrodisias onun kenti" },
  { plaka: 10, il: "Balıkesir", komutan: "bati", ad: "Boreas", kim: "kuzey rüzgârı" },
  { plaka: 11, il: "Bilecik", komutan: "bati", ad: "Hypnos", kim: "uyku tanrısı" },
  { plaka: 12, il: "Bingöl", komutan: "dogu", ad: "Haoma", kim: "kutsal bitkinin tanrısı" },
  { plaka: 13, il: "Bitlis", komutan: "dogu", ad: "Apaosha", kim: "kuraklık cini" },
  { plaka: 14, il: "Bolu", komutan: "bati", ad: "Kerberos", kim: "yeraltının üç başlı bekçi köpeği" },
  { plaka: 15, il: "Burdur", komutan: "bati", ad: "Leto", kim: "Apollon ve Artemis'in annesi — Letoon" },
  { plaka: 16, il: "Bursa", komutan: "bati", ad: "Kronos", kim: "babasını deviren titan" },
  { plaka: 17, il: "Çanakkale", komutan: "bati", ad: "Akhilleus", kim: "Truva'nın en büyük savaşçısı" },
  { plaka: 18, il: "Çankırı", komutan: "orta", ad: "Miyatanzipa", kim: "büyüme ve bolluk tanrısı" },
  { plaka: 19, il: "Çorum", komutan: "orta", ad: "Arinnitti", kim: "Arinna'nın güneş tanrıçası — Hattuşa'nın baş tanrısı" },
  { plaka: 20, il: "Denizli", komutan: "bati", ad: "Hades", kim: "yeraltı tanrısı — Hierapolis'teki cehennem kapısı" },
  { plaka: 21, il: "Diyarbakır", komutan: "dogu", ad: "Verethragna", kim: "zaferin tanrısı" },
  { plaka: 22, il: "Edirne", komutan: "bati", ad: "Orpheus", kim: "Trakyalı ozan, yeraltına inen" },
  { plaka: 23, il: "Elazığ", komutan: "dogu", ad: "Zurvan", kim: "zamanın kendisi" },
  { plaka: 24, il: "Erzincan", komutan: "dogu", ad: "Ashi", kim: "talih ve bolluk tanrıçası" },
  { plaka: 25, il: "Erzurum", komutan: "dogu", ad: "Vayu", kim: "rüzgârın tanrısı" },
  { plaka: 26, il: "Eskişehir", komutan: "bati", ad: "Midas", kim: "dokunduğunu altına çeviren Frig kralı" },
  { plaka: 27, il: "Gaziantep", komutan: "dogu", ad: "Siyavash", kim: "ateşin içinden geçen prens" },
  { plaka: 28, il: "Giresun", komutan: "orta", ad: "Zithariya", kim: "koruyucu tanrı" },
  { plaka: 29, il: "Gümüşhane", komutan: "dogu", ad: "Kaveh", kim: "Zahhak'a başkaldıran demirci" },
  { plaka: 30, il: "Hakkari", komutan: "dogu", ad: "Aeshma", kim: "öfke ve şiddet cini" },
  { plaka: 31, il: "Hatay", komutan: "orta", ad: "Kubaba", kim: "Karkamış'ın kraliçe tanrıçası" },
  { plaka: 32, il: "Isparta", komutan: "bati", ad: "Athena", kim: "savaş ve akıl tanrıçası" },
  { plaka: 33, il: "Mersin", komutan: "orta", ad: "Runtiya", kim: "Luvi geyik ve av tanrısı" },
  { plaka: 34, il: "İstanbul", komutan: "bati", ad: "Kharon", kim: "ölüleri karşı kıyıya geçiren kayıkçı" },
  { plaka: 35, il: "İzmir", komutan: "bati", ad: "Artemis", kim: "av ve ay tanrıçası — Efes onun kenti" },
  { plaka: 36, il: "Kars", komutan: "dogu", ad: "Tishtrya", kim: "yağmur getiren yıldız tanrısı" },
  { plaka: 37, il: "Kastamonu", komutan: "orta", ad: "Pirwa", kim: "at tanrısı" },
  { plaka: 38, il: "Kayseri", komutan: "orta", ad: "İştanu", kim: "güneş ve adalet tanrısı — Kaneş" },
  { plaka: 39, il: "Kırklareli", komutan: "bati", ad: "Bendis", kim: "Trak av tanrıçası" },
  { plaka: 40, il: "Kırşehir", komutan: "orta", ad: "İnara", kim: "İlluyanka'yı tuzağa düşüren tanrıça" },
  { plaka: 41, il: "Kocaeli", komutan: "bati", ad: "Ares", kim: "savaş tanrısı" },
  { plaka: 42, il: "Konya", komutan: "orta", ad: "Telipinu", kim: "öfkelenip kaybolan bereket tanrısı" },
  { plaka: 43, il: "Kütahya", komutan: "bati", ad: "Apollon", kim: "ışık, kehanet ve ok tanrısı" },
  { plaka: 44, il: "Malatya", komutan: "dogu", ad: "Jamshid", kim: "altın çağın efsanevi kralı" },
  { plaka: 45, il: "Manisa", komutan: "bati", ad: "Niobe", kim: "taşa dönüşüp ağlayan anne — Ağlayan Kaya" },
  { plaka: 46, il: "Kahramanmaraş", komutan: "orta", ad: "Hepat", kim: "Hurri ana tanrıçası, Teşup'un eşi" },
  { plaka: 47, il: "Mardin", komutan: "dogu", ad: "Rashnu", kim: "ruhları tartan yargıç" },
  { plaka: 48, il: "Muğla", komutan: "bati", ad: "Nereus", kim: "denizin yaşlı bilgesi" },
  { plaka: 49, il: "Muş", komutan: "dogu", ad: "Garshasp", kim: "ejderha öldüren kahraman" },
  { plaka: 50, il: "Nevşehir", komutan: "orta", ad: "Kamrusepa", kim: "şifa ve büyü tanrıçası" },
  { plaka: 51, il: "Niğde", komutan: "orta", ad: "Halki", kim: "tahıl tanrısı" },
  { plaka: 52, il: "Ordu", komutan: "orta", ad: "Taşmişu", kim: "Teşup'un veziri ve kardeşi" },
  { plaka: 53, il: "Rize", komutan: "dogu", ad: "Fereydun", kim: "Zahhak'ı deviren kral" },
  { plaka: 54, il: "Sakarya", komutan: "bati", ad: "Sangarios", kim: "Sakarya ırmağının tanrısı" },
  { plaka: 55, il: "Samsun", komutan: "orta", ad: "Kaşku", kim: "ay tanrısı" },
  { plaka: 56, il: "Siirt", komutan: "dogu", ad: "Sraosha", kim: "itaat ve dinleyişin tanrısı" },
  { plaka: 57, il: "Sinop", komutan: "orta", ad: "Zaliyanu", kim: "yağmur getiren dağ tanrısı" },
  { plaka: 58, il: "Sivas", komutan: "orta", ad: "Wurunkatte", kim: "toprağın savaş tanrısı" },
  { plaka: 59, il: "Tekirdağ", komutan: "bati", ad: "Dionysos", kim: "şarap ve coşku tanrısı, Trakya kökenli" },
  { plaka: 60, il: "Tokat", komutan: "orta", ad: "Şauşka", kim: "aşk ve savaş tanrıçası" },
  { plaka: 61, il: "Trabzon", komutan: "orta", ad: "Şuwaliyat", kim: "fırtına tanrısının kardeşi" },
  { plaka: 62, il: "Tunceli", komutan: "dogu", ad: "Afrasiyab", kim: "Turan'ın efsanevi hükümdarı" },
  { plaka: 63, il: "Şanlıurfa", komutan: "dogu", ad: "Zahhak", kim: "omuzlarından yılan çıkan zalim kral" },
  { plaka: 64, il: "Uşak", komutan: "bati", ad: "Pan", kim: "kırların keçi ayaklı tanrısı, panik yaratan" },
  { plaka: 65, il: "Van", komutan: "dogu", ad: "Anahita", kim: "suların ve bereketin tanrıçası" },
  { plaka: 66, il: "Yozgat", komutan: "orta", ad: "Şarruma", kim: "dağ tanrısı, Hepat'ın oğlu" },
  { plaka: 67, il: "Zonguldak", komutan: "bati", ad: "Herakles", kim: "on iki görevin kahramanı — Herakleia Pontike" },
  { plaka: 68, il: "Aksaray", komutan: "orta", ad: "Hannahanna", kim: "her şeyi bilen ana tanrıça" },
  { plaka: 69, il: "Bayburt", komutan: "dogu", ad: "Esfandiyar", kim: "yara almaz prens" },
  { plaka: 70, il: "Karaman", komutan: "orta", ad: "Ullikummi", kim: "tanrılara meydan okuyan taş dev" },
  { plaka: 71, il: "Kırıkkale", komutan: "orta", ad: "Zababa", kim: "savaş tanrısı" },
  { plaka: 72, il: "Batman", komutan: "dogu", ad: "Atar", kim: "ateşin kendisi" },
  { plaka: 73, il: "Şırnak", komutan: "dogu", ad: "Druj", kim: "yalanın ve bozgunun cini" },
  { plaka: 74, il: "Bartın", komutan: "bati", ad: "Thanatos", kim: "ölümün kendisi" },
  { plaka: 75, il: "Ardahan", komutan: "dogu", ad: "Arash", kim: "canı pahasına ok atan okçu" },
  { plaka: 76, il: "Iğdır", komutan: "dogu", ad: "Kiyumars", kim: "ilk insan, ilk kral" },
  { plaka: 77, il: "Yalova", komutan: "bati", ad: "Hebe", kim: "gençlik tanrıçası" },
  { plaka: 78, il: "Karabük", komutan: "orta", ad: "Hasameli", kim: "demircilerin ve madencilerin tanrısı" },
  { plaka: 79, il: "Kilis", komutan: "dogu", ad: "Div-e Sepid", kim: "Ak Dev" },
  { plaka: 80, il: "Osmaniye", komutan: "orta", ad: "Yarri", kim: "salgın ve ok tanrısı" },
  { plaka: 81, il: "Düzce", komutan: "bati", ad: "Prometheus", kim: "ateşi çalıp insana veren titan" },
];

const TARAF_ETIKET = {
  iyi: "İyi",
  kotu: "Kötü",
  belirsiz: "Belirsiz",
};
