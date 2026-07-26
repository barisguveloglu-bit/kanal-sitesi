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
  { ad: "Cips Yiyen Adam", tir: 2, not: "Normal form", taraf: "iyi" },
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
 * Örgüt hiyerarşisi — dört kademe:
 *   1. Gizemli Çocuğun Abisi (asıl patron, fikrin sahibi)
 *   2. Gizemli Çocuk (kardeşi, fikre katılan)
 *   3. Üç Komutan Derebeyi (81 ili üçe bölüp yönetirler, abiye rapor verirler)
 *   4. 81 il derebeyi (her ilde bir tane)
 *
 * İsim vermek için ilgili satırdaki ad: null yerine ad: "İsim" yaz.
 */
const ORGUT_TEPE = [
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

/* Üç komutan derebeyi — isimleri farklı mitolojilerden seçilecek */
const KOMUTANLAR = [
  {
    id: "bati",
    ad: null,
    bolge: "Batı",
    unvan: "Batı Cephesi Komutanı",
    mitoloji: null,
    not: "Marmara, Ege ve Batı Akdeniz. Trakya'dan Antalya'ya kadar 27 il.",
  },
  {
    id: "orta",
    ad: null,
    bolge: "Orta",
    unvan: "Orta Cephe Komutanı",
    mitoloji: null,
    not: "İç Anadolu, Batı Karadeniz ve Çukurova. Başkenti de kapsayan 27 il.",
  },
  {
    id: "dogu",
    ad: null,
    bolge: "Doğu",
    unvan: "Doğu Cephesi Komutanı",
    mitoloji: null,
    not: "Doğu Anadolu, Güneydoğu ve Doğu Karadeniz. En sert coğrafyadaki 27 il.",
  },
];

/* 81 il derebeyi — plaka sırasına göre */
const IL_DEREBEYLERI = [
  { plaka: 1, il: "Adana", komutan: "orta", ad: null },
  { plaka: 2, il: "Adıyaman", komutan: "dogu", ad: null },
  { plaka: 3, il: "Afyonkarahisar", komutan: "bati", ad: null },
  { plaka: 4, il: "Ağrı", komutan: "dogu", ad: null },
  { plaka: 5, il: "Amasya", komutan: "orta", ad: null },
  { plaka: 6, il: "Ankara", komutan: "orta", ad: null },
  { plaka: 7, il: "Antalya", komutan: "bati", ad: null },
  { plaka: 8, il: "Artvin", komutan: "dogu", ad: null },
  { plaka: 9, il: "Aydın", komutan: "bati", ad: null },
  { plaka: 10, il: "Balıkesir", komutan: "bati", ad: null },
  { plaka: 11, il: "Bilecik", komutan: "bati", ad: null },
  { plaka: 12, il: "Bingöl", komutan: "dogu", ad: null },
  { plaka: 13, il: "Bitlis", komutan: "dogu", ad: null },
  { plaka: 14, il: "Bolu", komutan: "bati", ad: null },
  { plaka: 15, il: "Burdur", komutan: "bati", ad: null },
  { plaka: 16, il: "Bursa", komutan: "bati", ad: null },
  { plaka: 17, il: "Çanakkale", komutan: "bati", ad: null },
  { plaka: 18, il: "Çankırı", komutan: "orta", ad: null },
  { plaka: 19, il: "Çorum", komutan: "orta", ad: null },
  { plaka: 20, il: "Denizli", komutan: "bati", ad: null },
  { plaka: 21, il: "Diyarbakır", komutan: "dogu", ad: null },
  { plaka: 22, il: "Edirne", komutan: "bati", ad: null },
  { plaka: 23, il: "Elazığ", komutan: "dogu", ad: null },
  { plaka: 24, il: "Erzincan", komutan: "dogu", ad: null },
  { plaka: 25, il: "Erzurum", komutan: "dogu", ad: null },
  { plaka: 26, il: "Eskişehir", komutan: "bati", ad: null },
  { plaka: 27, il: "Gaziantep", komutan: "dogu", ad: null },
  { plaka: 28, il: "Giresun", komutan: "orta", ad: null },
  { plaka: 29, il: "Gümüşhane", komutan: "dogu", ad: null },
  { plaka: 30, il: "Hakkari", komutan: "dogu", ad: null },
  { plaka: 31, il: "Hatay", komutan: "orta", ad: null },
  { plaka: 32, il: "Isparta", komutan: "bati", ad: null },
  { plaka: 33, il: "Mersin", komutan: "orta", ad: null },
  { plaka: 34, il: "İstanbul", komutan: "bati", ad: null },
  { plaka: 35, il: "İzmir", komutan: "bati", ad: null },
  { plaka: 36, il: "Kars", komutan: "dogu", ad: null },
  { plaka: 37, il: "Kastamonu", komutan: "orta", ad: null },
  { plaka: 38, il: "Kayseri", komutan: "orta", ad: null },
  { plaka: 39, il: "Kırklareli", komutan: "bati", ad: null },
  { plaka: 40, il: "Kırşehir", komutan: "orta", ad: null },
  { plaka: 41, il: "Kocaeli", komutan: "bati", ad: null },
  { plaka: 42, il: "Konya", komutan: "orta", ad: null },
  { plaka: 43, il: "Kütahya", komutan: "bati", ad: null },
  { plaka: 44, il: "Malatya", komutan: "dogu", ad: null },
  { plaka: 45, il: "Manisa", komutan: "bati", ad: null },
  { plaka: 46, il: "Kahramanmaraş", komutan: "orta", ad: null },
  { plaka: 47, il: "Mardin", komutan: "dogu", ad: null },
  { plaka: 48, il: "Muğla", komutan: "bati", ad: null },
  { plaka: 49, il: "Muş", komutan: "dogu", ad: null },
  { plaka: 50, il: "Nevşehir", komutan: "orta", ad: null },
  { plaka: 51, il: "Niğde", komutan: "orta", ad: null },
  { plaka: 52, il: "Ordu", komutan: "orta", ad: null },
  { plaka: 53, il: "Rize", komutan: "dogu", ad: null },
  { plaka: 54, il: "Sakarya", komutan: "bati", ad: null },
  { plaka: 55, il: "Samsun", komutan: "orta", ad: null },
  { plaka: 56, il: "Siirt", komutan: "dogu", ad: null },
  { plaka: 57, il: "Sinop", komutan: "orta", ad: null },
  { plaka: 58, il: "Sivas", komutan: "orta", ad: null },
  { plaka: 59, il: "Tekirdağ", komutan: "bati", ad: null },
  { plaka: 60, il: "Tokat", komutan: "orta", ad: null },
  { plaka: 61, il: "Trabzon", komutan: "orta", ad: null },
  { plaka: 62, il: "Tunceli", komutan: "dogu", ad: null },
  { plaka: 63, il: "Şanlıurfa", komutan: "dogu", ad: null },
  { plaka: 64, il: "Uşak", komutan: "bati", ad: null },
  { plaka: 65, il: "Van", komutan: "dogu", ad: null },
  { plaka: 66, il: "Yozgat", komutan: "orta", ad: null },
  { plaka: 67, il: "Zonguldak", komutan: "bati", ad: null },
  { plaka: 68, il: "Aksaray", komutan: "orta", ad: null },
  { plaka: 69, il: "Bayburt", komutan: "dogu", ad: null },
  { plaka: 70, il: "Karaman", komutan: "orta", ad: null },
  { plaka: 71, il: "Kırıkkale", komutan: "orta", ad: null },
  { plaka: 72, il: "Batman", komutan: "dogu", ad: null },
  { plaka: 73, il: "Şırnak", komutan: "dogu", ad: null },
  { plaka: 74, il: "Bartın", komutan: "bati", ad: null },
  { plaka: 75, il: "Ardahan", komutan: "dogu", ad: null },
  { plaka: 76, il: "Iğdır", komutan: "dogu", ad: null },
  { plaka: 77, il: "Yalova", komutan: "bati", ad: null },
  { plaka: 78, il: "Karabük", komutan: "orta", ad: null },
  { plaka: 79, il: "Kilis", komutan: "dogu", ad: null },
  { plaka: 80, il: "Osmaniye", komutan: "orta", ad: null },
  { plaka: 81, il: "Düzce", komutan: "bati", ad: null },
];

const TARAF_ETIKET = {
  iyi: "İyi",
  kotu: "Kötü",
  belirsiz: "Belirsiz",
};
