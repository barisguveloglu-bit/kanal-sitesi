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

const KARAKTERLER = [
  {
    id: "kameraci-baris",
    ad: "Kameracı Barış",
    unvan: "Kanlı Göz'ün Taşıyıcısı",
    taraf: "iyi",
    oynanan: true,
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
      "Hikayenin merkezinde o var, çünkü kötülerin istediği dilek ancak onun " +
      "beyni yıkanırsa doğuyor. Kendi kaderinden habersiz olması onu en " +
      "savunmasız hâle getiren şey.",
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
      "Abisinin gölgesinde büyüyor. Elektrik gücü abisininkinin ham hâli — " +
      "yani potansiyeli açık, kontrolü eksik.",
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
      "Her ilde bir adamı var. Her ili yöneten derebeyi doğrudan ona bağlı. " +
      "Elektriği tam anlamıyla kontrol ediyor ve aşırı kurnaz.",
    ozellikler: [
      "4 tır kaldırma gücü",
      "İnsanüstü hız",
      "İnsanüstü çeviklik",
      "İnsanüstü dayanıklılık",
      "Elektriğe tam hâkimiyet",
      "Her ilde bir derebeyi",
    ],
    detay:
      "Hikayenin asıl patronu. Kanlı Göz'ün dileğini isteyen ve bütün ağı yöneten kişi. " +
      "Amacı kavgasız bir dünya — ama ona giden yolu güçle döşüyor.",
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

const TARAF_ETIKET = {
  iyi: "İyi",
  kotu: "Kötü",
  belirsiz: "Belirsiz",
};
