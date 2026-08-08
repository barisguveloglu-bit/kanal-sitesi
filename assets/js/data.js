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

/* Kanalın adresi — hem alt bilgide hem gizli sayfada kullanılıyor */
const KANAL = "https://www.youtube.com/@mahmutguveloglu473";

/* Sitenin yayındaki adresi — paylaşım önizlemeleri ve site haritası için */
const SITE_ADRESI = "https://barisguveloglu-bit.github.io/kanal-sitesi/";

/*
 * VİDEOLAR — sitenin YouTube tarafı.
 * ---------------------------------------------------------------
 * BURAYI BARIŞ DOLDURACAK. Şu an hepsi boş ve bu bilinçli:
 * boş kalan bölüm siteye HİÇ basılmıyor. Yani ziyaretçi asla
 * "yakında", "örnek video" gibi sahte bir kart görmüyor.
 *
 * kimlik: YouTube video kimliği — izleme adresindeki v= kısmı.
 *         Örnek: youtube.com/watch?v=AbCdEf12345  →  kimlik: "AbCdEf12345"
 *         Yazılırsa hem izleme bağlantısı hem kapak görseli ondan üretilir.
 *
 * baglanti: Elinde kimlik yoksa (oynatma listesi gibi) tam adresi buraya yaz.
 *           İkisi birden varsa "baglanti" öncelikli.
 */
const VIDEOLAR = {
  /* Ana sayfadaki birincil düğme. Boşsa düğme kanal adresine gider. */
  baslangic: { kimlik: "", baglanti: "", baslik: "" },

  /* Ana sayfanın üst kısmındaki büyük kart. Boşsa bölüm basılmaz. */
  oneCikan: { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },

  /*
   * "Üç videoda evrene gir" rotası — yeni gelen biri neyi hangi sırayla
   * izlemeli. Boş bırakılan satır atlanır; hiçbiri dolu değilse bölüm basılmaz.
   * Açıklamalar SPOILERSIZ olmalı: ne olduğunu değil, neye bakacağını söyle.
   */
  rota: [
    { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },
    { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },
    { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" },
  ],
};

/*
 * Kanalı kim yapıyor. Ana sayfanın altındaki kısa tanıtım.
 * Buradaki metin yalnızca sitede zaten yazan doğrulanabilir şeyleri
 * söylüyor. Barış kendi cümleleriyle değiştirmek isterse "metin" alanını
 * düzenlemesi yeterli.
 */
const YAPIMCI = {
  ad: "Barış Güveloğlu",
  rol: "Kanalın sahibi · hikayenin anlatıcısı",
  metin:
    "Kanlı Göz evrenini Barış Güveloğlu anlatıyor. Hikaye YouTube'da bölüm " +
    "bölüm ilerliyor; bu site de anlatılanların arşivi. Videolarda hem " +
    "kamerayı tutan hem de hikayedeki Kameracı Barış o.",
};

/*
 * Hikayenin şu anki durumu. Site genelindeki uyarı şeridi buradan geliyor.
 * Durum değişince sadece burayı güncelle.
 */
const DURUM = {
  baslik: "Kameracı Barış ele geçirildi",
  ozet:
    "Barış şu anda kötülerin elinde. Ama beynini nasıl yıkayacaklarını bilmiyorlar — " +
    "dilek hakkı hâlâ kilitli. İyiler kaçırıldığını biliyor, neden önemli " +
    "olduğunu bilmiyor.",
  sizanCumle: "O GERÇEK BARIŞ'I BULACAK",
};

/*
 * Ana sayfadaki "neden bakmalısın" bölümü.
 * Beş madde — her biri sitede gerçekten var olan bir şeye işaret etsin.
 * Uzatma: burası vitrin, arşiv değil.
 */
const SEBEPLER = [
  {
    baslik: "Barış için savaş çıkarıyorlar",
    metin:
      "Kötülerin dileği kavgasız bir dünya. Ama o dileği almak için ele " +
      "geçirmeleri gereken adamın adı da Barış. Söyledikleri cümle aynı anda " +
      "iki şey anlatıyor.",
    yol: "efsane.html",
    yolAd: "Efsaneyi oku",
  },
  {
    baslik: "1728'de, gerçek bir sarayın önünde başlıyor",
    metin:
      "Hikayenin kökü Lâle Devri'ne uzanıyor: Bâb-ı Hümâyun önüne dikilen bir " +
      "ağaç, III. Ahmed'in yanlış anladığı bir cümle ve vurulan bir kelle.",
    yol: "efsane.html",
    yolAd: "Vakayinameyi gör",
  },
  {
    baslik: "Aşık olmak ile itaat etmek ayrı şeyler",
    metin:
      "Samara Kadın'ın yüzünü gören herkes ona aşık oluyor. Ama iradesi güçlü " +
      "olan emir almıyor. Bu evrende her şeyin ölçüsü irade.",
    yol: "irade.html",
    yolAd: "İrade sistemine bak",
  },
  {
    baslik: "81 ilin her birinde bir isim var",
    metin:
      "Batıda Yunan, ortada Hitit, doğuda Pers. Her derebeyinin adı bulunduğu " +
      "ilin kendi tarihinden seçildi — Çanakkale'de Akhilleus, Çorum'da Arinnitti.",
    yol: "mafya.html",
    yolAd: "Haritayı aç",
  },
  {
    baslik: "Kimin kazanacağı burada yazmıyor",
    metin:
      "Güç sıralaması yok, puan yok. Sadece şimdiye kadar ne olduğu var — ve " +
      "videolar ilerledikçe bu arşiv de büyüyor.",
    yol: "icraatler.html",
    yolAd: "İcraatlere git",
  },
];

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
      "Serveti anne babasından kalan miras",
      "Azimli ve kararlı",
      "Verdiği hiçbir karardan vazgeçmez",
    ],
    iradeKademe: 5,
    detay:
      "Ailesi bir kazada öldü — öyle sanıyor. Bütün servet ona kaldı ama tek " +
      "kuruşuna dokunmuyor; o parayı harcamak, onların gidişini kabul etmek " +
      "gibi geliyor. Fakir gibi yaşamasının sebebi bu.\n\n" +
      "Şu anda kötülerin elinde. Beynini nasıl yıkayacaklarını bilmiyorlar, " +
      "yani dilek hakkı hâlâ kilitli. Hiçbir yeteneği yoktu — ama hikayenin " +
      "tek anahtarı oydu.",
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
      "İradesiz bir insanın ne demek olduğunu dünyada en iyi bilen kişi o — " +
      "çünkü onu her gün kendi eliyle yapıyor. Kötülerin dileğini duyduğunda " +
      "ne anlama geldiğini herkesten önce anladı: kimsenin itiraz etmediği bir " +
      "dünya, kimsenin iradesi olmayan bir dünyadır.\n\n" +
      "Reddetti. İhaneti ortaya çıkınca çok ağır yaralandı. Şu anda Sarı " +
      "Gülücük'ün korumasında.",
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

/*
 * İCRAATLER — karakterlerin yaptığı işler.
 *
 * Burada SIRALAMA YOK, PUAN YOK. "Kim kimi yener" sorusunun cevabı burada
 * aranmaz; burada yalnızca ne olduğu yazar. Sıralı bir güç tablosu
 * "en üstteki yenilmez" sözü verir ve hikaye onu tutmak zorunda kalır.
 * İcraat listesi böyle bir söz vermez.
 *
 * Yeni icraat eklemek: ilgili karakterin liste dizisine bir satır ekle.
 *   { ne: "Ne yaptığı", video: "Video adı", baglanti: "https://..." }
 * video ve baglanti isteğe bağlı — yoksa yazma.
 */
const ICRAATLER = [
  {
    karakter: "Cips Yiyen Adam",
    taraf: "iyi",
    liste: [
      { ne: "İki tır kaldırdı." },
      { ne: "Yoğurda geçip beş tır kaldırdı." },
      { ne: "Samara Kadın'ın yüzünü gördü ve emirlerinin hiçbirine uymadı." },
    ],
  },
  {
    karakter: "Sarı Gülücük",
    taraf: "iyi",
    liste: [
      { ne: "Ayı kapanı satan bir şirket kurdu ve icatlarını onunla finanse etti." },
      { ne: "Ağır yaralı Samara Kadın'ı ayakta tuttu." },
    ],
  },
  {
    karakter: "Kameracı Barış",
    taraf: "iyi",
    liste: [
      { ne: "Ailesinden kalan servete bugüne kadar hiç dokunmadı." },
      { ne: "Hiçbir gücü olmadan Kanlı Göz'ü taşıdı." },
    ],
  },
  {
    karakter: "Samara Kadın",
    taraf: "belirsiz",
    liste: [
      { ne: "Yüzünü gösterdiği insanları iradesiz hâle getirdi." },
      { ne: "Kötülerin dileğinin ne anlama geldiğini herkesten önce anladı ve reddetti." },
    ],
  },
  {
    karakter: "Gizemli Çocuk",
    taraf: "kotu",
    liste: [
      { ne: "Dört tır kaldırdı." },
      { ne: "Elektriği manipüle etti." },
    ],
  },
  {
    karakter: "Gizemli Çocuğun Abisi",
    taraf: "kotu",
    liste: [
      { ne: "Dört tır kaldırdı." },
      { ne: "Elektriği tam anlamıyla kontrol etti." },
      { ne: "81 ilin tamamına yayılan bir ağ kurdu." },
      { ne: "Üç komutana sonsuz para vaat edip hepsini bağladı." },
      { ne: "Kameracı Barış'ı buldu ve ele geçirdi." },
    ],
  },
  {
    karakter: "Nemesis",
    taraf: "kotu",
    liste: [
      { ne: "Üç tır kaldırdı." },
      { ne: "Yediği darbeyi katlayarak geri verdi." },
    ],
  },
  {
    karakter: "Teşup",
    taraf: "kotu",
    liste: [
      { ne: "Üç tır kaldırdı." },
      { ne: "Hava basıncını kontrol edip kasırga çıkardı." },
      { ne: "Barış'ı kendi cephesinde tuttu." },
    ],
  },
  {
    karakter: "Ahriman",
    taraf: "kotu",
    liste: [
      { ne: "Üç tır kaldırdı." },
      { ne: "Dokunduğu makineleri ve tuzakları çürüttü." },
    ],
  },
];

/* İrade kademeleri */
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
      "Üçü arasında iradesi en zayıf olan da o.\n\n" +
      "Barış şu anda onun cephesinde tutuluyor. Elindeki en değerli şeyi " +
      "kaybetmekten korkuyor — ve korkan bir komutan, kırılabilecek bir " +
      "komutandır.",
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
  { plaka: 15, il: "Burdur", komutan: "bati", ad: "Leto", kim: "Apollon ve Artemis'in annesi" },
  { plaka: 16, il: "Bursa", komutan: "bati", ad: "Kronos", kim: "babasını deviren titan" },
  { plaka: 17, il: "Çanakkale", komutan: "bati", ad: "Akhilleus", kim: "Truva Savaşı'nın en büyük Akha savaşçısı" },
  { plaka: 18, il: "Çankırı", komutan: "orta", ad: "Miyatanzipa", kim: "büyüme ve bolluk tanrısı" },
  { plaka: 19, il: "Çorum", komutan: "orta", ad: "Arinnitti", kim: "Arinna'nın güneş tanrıçası — Hitit devletinin baş tanrıçası" },
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
  { plaka: 31, il: "Hatay", komutan: "orta", ad: "Kubaba", kim: "Geç Hitit dünyasının kraliçe tanrıçası" },
  { plaka: 32, il: "Isparta", komutan: "bati", ad: "Athena", kim: "savaş ve akıl tanrıçası" },
  { plaka: 33, il: "Mersin", komutan: "orta", ad: "Runtiya", kim: "Luvi geyik ve av tanrısı" },
  { plaka: 34, il: "İstanbul", komutan: "bati", ad: "Kharon", kim: "ölüleri karşı kıyıya geçiren kayıkçı" },
  { plaka: 35, il: "İzmir", komutan: "bati", ad: "Artemis", kim: "av ve vahşi doğa tanrıçası — Efes onun kenti" },
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
  { plaka: 55, il: "Samsun", komutan: "orta", ad: "Zaliyanu", kim: "Nerik'e yağmur getiren dağ tanrısı" },
  { plaka: 56, il: "Siirt", komutan: "dogu", ad: "Sraosha", kim: "itaat ve dinleyişin tanrısı" },
  { plaka: 57, il: "Sinop", komutan: "orta", ad: "Kaşku", kim: "Hatti ay tanrısı" },
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
  { plaka: 68, il: "Aksaray", komutan: "orta", ad: "Hannahanna", kim: "tanrıların büyükannesi" },
  { plaka: 69, il: "Bayburt", komutan: "dogu", ad: "Esfandiyar", kim: "yara almaz prens" },
  { plaka: 70, il: "Karaman", komutan: "orta", ad: "Ullikummi", kim: "tanrılara meydan okuyan taş dev" },
  { plaka: 71, il: "Kırıkkale", komutan: "orta", ad: "Zababa", kim: "savaş tanrısı" },
  { plaka: 72, il: "Batman", komutan: "dogu", ad: "Atar", kim: "ateşin kendisi" },
  { plaka: 73, il: "Şırnak", komutan: "dogu", ad: "Druj", kim: "yalanın ve bozgunun cini" },
  { plaka: 74, il: "Bartın", komutan: "bati", ad: "Thanatos", kim: "ölümün kendisi" },
  { plaka: 75, il: "Ardahan", komutan: "dogu", ad: "Arash", kim: "canı pahasına ok atan okçu" },
  { plaka: 76, il: "Iğdır", komutan: "dogu", ad: "Kiyumars", kim: "ilk insan, ilk kral" },
  { plaka: 77, il: "Yalova", komutan: "bati", ad: "Hebe", kim: "gençlik tanrıçası" },
  { plaka: 78, il: "Karabük", komutan: "orta", ad: "Hasameli", kim: "demircilerin tanrısı" },
  { plaka: 79, il: "Kilis", komutan: "dogu", ad: "Div-e Sepid", kim: "Ak Dev" },
  { plaka: 80, il: "Osmaniye", komutan: "orta", ad: "Yarri", kim: "salgın ve ok tanrısı" },
  { plaka: 81, il: "Düzce", komutan: "bati", ad: "Prometheus", kim: "ateşi çalıp insana veren titan" },
];

const TARAF_ETIKET = {
  iyi: "İyi",
  kotu: "Kötü",
  belirsiz: "Belirsiz",
};

/*
 * HARİTALAR — ağın coğrafyası
 * ---------------------------------------------------------------
 * Her ülke burada tek bir kayıt. Sayfada göstermek için HTML'e
 * sadece şu satır yazılıyor:
 *
 *   <div data-harita="turkiye"></div>
 *
 * Geri kalan her şeyi assets/js/harita.js hesaplıyor: izdüşüm,
 * ölçek, merkezden çıkan ışınların açıları ve her ışının sınıra
 * kaç piksel sonra çarptığı. Yani yeni ülke eklemek = buraya yeni
 * bir kayıt yazmak. HTML'e ve JS'e dokunmaya gerek yok.
 *
 * Alanlar:
 *   ad          — ülkenin adı
 *   aciklama    — haritanın altındaki kısa açıklama
 *   merkez      — ışınların çıktığı şehir { ad, unvan, konum: [boylam, enlem] }
 *   isinSayisi  — kaç yöne ışın atılacak (360 / sayı = açı adımı)
 *   sinir       — ülkenin dış çeperi, [boylam, enlem] ikilileri
 *   denizler    — sadece görsel; ışın hesabına GİRMEZ
 *
 * Koordinatlar gerçek boylam/enlem. Sadeleştirilmiş: her burun, her
 * körfez yok — şekil tanınacak kadar nokta var, o kadar.
 *
 * NOT — Marmara ve boğazlar: dış çeper Trakya ile Anadolu'yu tek
 * parça sayıyor, yani Marmara Denizi çeperin İÇİNDE kalıyor. Bu
 * bilinçli: ışınlar ülkeyi tek bir bütün olarak tarasın diye. Denizin
 * kendisi "denizler" listesinden ayrıca çiziliyor, ışınlar üstünden
 * geçiyor.
 */
const HARITALAR = {
  turkiye: {
    ad: "Türkiye",
    aciklama:
      "Ankara'dan çıkan her çizgi, ağın o yöndeki erişimi. Hiçbiri " +
      "sınırın dışına taşmıyor — bu ağ ülkenin dışına çıkmıyor, " +
      "içini tarıyor.",
    merkez: { ad: "Ankara", unvan: "Başkent · ağın merkezi", konum: [32.85, 39.93] },
    isinSayisi: 72, // 5 derecede bir

    /* Dış çeper — Enez'den başlayıp saat yönünde ülkeyi dolaşıyor */
    sinir: [
      /* Trakya · Meriç boyunca kuzeye (Yunanistan sınırı) */
      [26.06, 40.73], [26.32, 41.02], [26.36, 41.32], [26.53, 41.61], [26.62, 41.75],
      /* Bulgaristan sınırı · doğuya */
      [26.95, 42.00], [27.28, 42.10], [27.60, 42.02], [28.02, 41.98],
      /* Karadeniz · Trakya kıyısı ve İstanbul Boğazı ağzı */
      [28.10, 41.80], [28.32, 41.55], [28.80, 41.35], [29.09, 41.24],
      /* Karadeniz · Anadolu kıyısı, batıdan doğuya */
      [29.60, 41.18], [30.30, 41.13], [30.98, 41.13], [31.42, 41.30],
      [31.80, 41.45], [32.30, 41.75], [32.92, 41.90], [33.50, 41.96],
      [33.78, 41.98], [34.34, 41.96], [34.70, 41.94],
      [34.99, 42.09], /* İnce Burun — ülkenin en kuzey noktası */
      [35.17, 42.02], [35.55, 41.88], [35.90, 41.75], [36.12, 41.52],
      [36.33, 41.30], [36.72, 41.42], [37.28, 41.13], [37.88, 41.02],
      [38.39, 40.92], [39.00, 40.95], [39.45, 40.98], [39.72, 41.00],
      [40.30, 41.03], [40.52, 41.03], [41.02, 41.35],
      [41.53, 41.53], /* Sarp — Gürcistan sınırı */
      /* Gürcistan sınırı · güneydoğuya */
      [41.82, 41.44], [42.20, 41.50], [42.60, 41.55], [43.00, 41.30], [43.45, 41.12],
      /* Ermenistan sınırı · Arpaçay ve Aras boyunca güneye */
      [43.60, 40.90], [43.66, 40.55], [43.55, 40.30], [43.75, 40.10],
      [44.05, 40.02], [44.42, 40.03],
      [44.82, 39.72], /* Dilucu — ülkenin en doğu noktası */
      /* İran sınırı · güneye */
      [44.55, 39.55], [44.40, 39.42], [44.10, 39.10], [44.30, 38.80],
      [44.42, 38.35], [44.35, 38.00], [44.22, 37.80], [44.55, 37.45], [44.78, 37.15],
      /* Irak sınırı · batıya */
      [44.30, 37.30], [43.80, 37.22], [43.30, 37.32], [42.90, 37.20],
      [42.55, 37.25], [42.36, 37.11],
      /* Suriye sınırı · batıya, sonra Hatay'dan güneye */
      [41.90, 37.10], [41.22, 37.06], [40.70, 37.00], [40.20, 36.90],
      [39.80, 36.83], [39.15, 36.70], [38.75, 36.70], [38.20, 36.83],
      [37.98, 36.85], [37.60, 36.70], [37.10, 36.72], [36.66, 36.85],
      [36.45, 36.60], [36.35, 36.25],
      [36.17, 35.86], /* Yayladağı — ülkenin en güney noktası */
      /* Akdeniz kıyısı · doğudan batıya */
      [35.95, 36.10], [35.92, 36.45], [36.15, 36.60], [36.20, 36.85],
      [35.80, 36.80], [35.38, 36.56], [34.90, 36.70], [34.63, 36.79],
      [34.30, 36.60], [33.88, 36.32], [33.50, 36.15],
      [32.83, 36.02], /* Anamur — Anadolu'nun en güney ucu */
      [32.30, 36.20], [31.99, 36.54], [31.40, 36.75], [30.80, 36.85],
      [30.55, 36.30], [30.42, 36.22], [30.10, 36.30], [29.65, 36.20],
      [29.30, 36.30], [29.13, 36.60], [28.90, 36.68], [28.60, 36.72],
      [28.25, 36.80], [27.45, 36.72], [28.10, 37.02], [27.43, 37.03],
      /* Ege kıyısı · güneyden kuzeye */
      [27.30, 37.30], [27.26, 37.72], [27.28, 38.05], [26.30, 38.32],
      [26.75, 38.55], [26.88, 39.07], [26.69, 39.31], [26.63, 39.55],
      [26.04, 39.46], /* Baba Burnu — ülkenin en batı noktası */
      [26.20, 39.75], [26.19, 39.98],
      /* Çanakkale Boğazı ağzı ve Gelibolu yarımadası · Saros'a doğru */
      [26.19, 40.05], [26.32, 40.28], [26.70, 40.52], [26.88, 40.63], [26.50, 40.70],
    ],

    /* Sadece görsel: çeperin içinde kalan denizler */
    denizler: [
      {
        ad: "Marmara Denizi",
        cokgen: [
          [28.98, 41.00], [28.25, 41.05], [27.51, 40.97], [27.11, 40.60],
          [26.70, 40.40], [26.78, 40.30], [27.25, 40.33], [27.70, 40.40],
          [28.30, 40.38], [28.88, 40.38], [29.28, 40.66], [29.60, 40.71],
          [29.92, 40.74], [29.58, 40.78], [29.24, 40.76],
        ],
      },
      {
        ad: "Van Gölü",
        cokgen: [
          [42.35, 38.60], [42.75, 38.75], [43.30, 38.75], [43.35, 38.45],
          [43.05, 38.35], [42.65, 38.40], [42.40, 38.45],
        ],
      },
      {
        ad: "Tuz Gölü",
        cokgen: [
          [33.30, 39.05], [33.55, 38.90], [33.55, 38.55], [33.35, 38.45],
          [33.20, 38.65], [33.18, 38.95],
        ],
      },
    ],
  },
};
