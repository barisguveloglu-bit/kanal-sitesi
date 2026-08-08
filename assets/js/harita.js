/*
 * KANLI GÖZ — Ülke haritası ve merkezden yayılan ağ
 * ---------------------------------------------------------------
 * data.js içindeki HARITALAR kaydını alır, SVG'ye çevirir.
 * Sayfada tek satır yeter:
 *
 *   <div data-harita="turkiye"></div>
 *
 * Ne yapıyor:
 *   1) Boylam/enlem çiftlerini ekran koordinatına çevirir (izdüşüm).
 *   2) Merkez şehirden 360 dereceye eşit aralıklı ışınlar atar.
 *   3) Her ışının ülke sınırına ÇARPTIĞI ilk noktayı hesaplar ve
 *      çizgiyi orada keser. Sınır içbükey (körfezler, yarımadalar)
 *      olduğu için "ilk kesişim" şart: ışın karadan çıktığı anda biter.
 *   4) Güvenlik için ışın katmanı ayrıca sınır yoluna clip'lenir —
 *      hesap şaşsa bile hiçbir piksel ülkenin dışına taşamaz.
 *
 * Bu dosya silinirse site aynen çalışır; sadece harita basılmaz.
 * data.js'ten SONRA, app.js'ten ÖNCE yüklenmeli (app.js'in
 * "icerik-hazir" olayı haritayı da kapsasın diye).
 */
(function () {
  "use strict";

  const GENISLIK = 1000; // viewBox genişliği — SVG kendi içinde ölçekleniyor
  const KENAR = 26;      // çeperin viewBox kenarına değmemesi için pay
  const ISIN_PAYI = 4;   // ışın ucu sınırdan bu kadar içeride durur
  const ISIN_SAYISI = 72;

  let sayac = 0; // aynı sayfada birden fazla harita olursa id'ler çakışmasın

  /* --- Küçük yardımcılar --- */

  /* HTML kaçışı. app.js'teki kacir() ile aynı iş; burada yerelde
     duruyor ki bu dosya tek başına da çalışsın. */
  function metin(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  const yuvarla = (n) => Math.round(n * 100) / 100;

  /* --- İzdüşüm ---
   *
   * Basit eşdikdörtgen izdüşüm: boylam, ülkenin orta enlemindeki
   * kosinüsle daraltılıyor. Mercator gibi kutuplara doğru şişirmiyor;
   * Türkiye gibi dar bir enlem kuşağında gözle görülür sapma yapmıyor
   * ve tersi kolay hesaplanıyor.
   */
  function izdusumKur(sinir) {
    const enlemler = sinir.map((n) => n[1]);
    const ortaEnlem = (Math.min.apply(null, enlemler) + Math.max.apply(null, enlemler)) / 2;
    const daralma = Math.cos((ortaEnlem * Math.PI) / 180);

    const xler = sinir.map((n) => n[0] * daralma);
    const yler = sinir.map((n) => -n[1]); // enlem yukarı, ekran aşağı

    const xEn = Math.min.apply(null, xler);
    const yEn = Math.min.apply(null, yler);
    const xBoy = Math.max.apply(null, xler) - xEn;
    const yBoy = Math.max.apply(null, yler) - yEn;

    const olcek = (GENISLIK - 2 * KENAR) / xBoy;

    return {
      yukseklik: yBoy * olcek + 2 * KENAR,
      /* [boylam, enlem] → [x, y] */
      nokta: function (k) {
        return [
          KENAR + (k[0] * daralma - xEn) * olcek,
          KENAR + (-k[1] - yEn) * olcek,
        ];
      },
    };
  }

  /* Ekran noktalarını SVG yoluna çevirir (kapalı çokgen). */
  function yol(noktalar) {
    return (
      noktalar
        .map((p, i) => (i ? "L" : "M") + yuvarla(p[0]) + " " + yuvarla(p[1]))
        .join(" ") + " Z"
    );
  }

  /*
   * Bir nokta çokgenin içinde mi? (çift-tek kuralı)
   * Merkez şehir yanlış yazılmışsa ışın atmadan önce anlaşılsın diye var.
   */
  function icerideMi(nokta, cokgen) {
    let icerde = false;
    for (let i = 0, j = cokgen.length - 1; i < cokgen.length; j = i++) {
      const a = cokgen[i];
      const b = cokgen[j];
      const kesiyor = a[1] > nokta[1] !== b[1] > nokta[1];
      if (!kesiyor) continue;
      const x = ((b[0] - a[0]) * (nokta[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (nokta[0] < x) icerde = !icerde;
    }
    return icerde;
  }

  /*
   * Merkezden (m) yon yönüne giden ışın, çokgenin hangi kenarını önce keser?
   * Dönen değer: merkezden kesişime olan uzaklık. Bulunamazsa 0.
   *
   * Çözülen denklem:  m + t·yon = a + u·(b - a)
   * Kabul şartı: t > 0 (ileri yön) ve 0 ≤ u ≤ 1 (kenarın üstü).
   * Birden fazla kesişim varsa EN KÜÇÜK t alınır — karadan ilk çıkış noktası.
   */
  function ilkKesisim(m, yon, cokgen) {
    let enYakin = Infinity;

    for (let i = 0, j = cokgen.length - 1; i < cokgen.length; j = i++) {
      const a = cokgen[j];
      const b = cokgen[i];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];

      const belirtec = ex * yon[1] - ey * yon[0];
      if (Math.abs(belirtec) < 1e-9) continue; // kenar ışına paralel

      const fx = a[0] - m[0];
      const fy = a[1] - m[1];

      const t = (ex * fy - ey * fx) / belirtec;
      const u = (yon[0] * fy - yon[1] * fx) / belirtec;

      if (t > 0 && u >= 0 && u <= 1 && t < enYakin) enYakin = t;
    }

    return enYakin === Infinity ? 0 : enYakin;
  }

  /* Merkezden her yöne birer ışın. Açı adımı = 360 / sayı. */
  function isinlariHesapla(merkez, cokgen, sayi) {
    const isinlar = [];

    for (let i = 0; i < sayi; i++) {
      const aci = (i * 2 * Math.PI) / sayi;
      const yon = [Math.cos(aci), Math.sin(aci)];
      const uzaklik = ilkKesisim(merkez, yon, cokgen);
      if (uzaklik <= ISIN_PAYI) continue; // sınıra çok yakın: çizecek yer yok

      const boy = uzaklik - ISIN_PAYI; // ucu sınırın içinde kalsın
      isinlar.push({
        derece: Math.round((aci * 180) / Math.PI),
        boy: boy,
        x: merkez[0] + yon[0] * boy,
        y: merkez[1] + yon[1] * boy,
      });
    }

    return isinlar;
  }

  /* --- Çizim --- */

  function haritaCiz(kap) {
    const anahtar = kap.dataset.harita;
    const veri = typeof HARITALAR === "object" && HARITALAR ? HARITALAR[anahtar] : null;
    if (!veri || !veri.sinir || !veri.merkez) return;

    const iz = izdusumKur(veri.sinir);
    const sinir = veri.sinir.map(iz.nokta);
    const merkez = iz.nokta(veri.merkez.konum);

    /* Merkez sınırın dışında kalıyorsa ışın çizmek anlamsız — harita yine basılır. */
    const merkezIcerde = icerideMi(merkez, sinir);
    if (!merkezIcerde) {
      console.warn("harita.js: " + anahtar + " merkezi sınırın dışında kalıyor.");
    }

    const isinlar = merkezIcerde
      ? isinlariHesapla(merkez, sinir, veri.isinSayisi || ISIN_SAYISI)
      : [];

    const enUzak = isinlar.reduce((a, i) => Math.max(a, i.boy), 1);
    const yukseklik = yuvarla(iz.yukseklik);

    const no = ++sayac;
    const kirpId = "harita-kirp-" + no;
    const sonumId = "harita-sonum-" + no;
    const maskeId = "harita-maske-" + no;
    const korId = "harita-kor-" + no;
    const basId = "harita-baslik-" + no;
    const acikId = "harita-aciklama-" + no;

    const sinirYolu = yol(sinir);

    const denizler = (veri.denizler || [])
      .map(
        (d) =>
          '<path class="harita-deniz" d="' +
          yol(d.cokgen.map(iz.nokta)) +
          '"><title>' + metin(d.ad) + "</title></path>"
      )
      .join("");

    /*
     * Işınlar. Gecikme uzunlukla orantılı: kısa ışın önce, uzun ışın
     * sonra tamamlanıyor — yayılma merkezden dışa doğru okunuyor.
     * (Gecikmeyi animasyon.css kullanıyor; hareket azaltmada devre dışı.)
     */
    const isinHtml = isinlar
      .map(
        (i) =>
          '<line class="harita-isin" x1="' + yuvarla(merkez[0]) +
          '" y1="' + yuvarla(merkez[1]) +
          '" x2="' + yuvarla(i.x) +
          '" y2="' + yuvarla(i.y) +
          '" style="--gecikme:' + yuvarla((i.boy / enUzak) * 0.55) + 's"></line>'
      )
      .join("");

    const merkezAd = metin(veri.merkez.ad);
    const ulkeAd = metin(veri.ad);

    kap.innerHTML =
      '<figure class="harita">' +
      /* Dar ekranda harita küçülüp okunmaz hâle gelmesin diye kaydırılabilir
         bir çerçevede duruyor; klavyeyle de kaydırılabilsin diye tabindex var. */
      '<div class="harita-cerceve" tabindex="0">' +
      '<svg class="harita-svg" viewBox="0 0 ' + GENISLIK + " " + yukseklik +
      '" role="img" aria-labelledby="' + basId + " " + acikId + '">' +
      "<title id=\"" + basId + '">' + ulkeAd + " haritası — " + merkezAd +
      " merkezli ağ</title>" +
      '<desc id="' + acikId + '">' + merkezAd +
      " üzerindeki kırmızı merkezden " + isinlar.length +
      " yöne düz çizgiler çıkıyor; her çizgi " + ulkeAd +
      " sınırına değdiği yerde bitiyor, sınırın dışına taşmıyor.</desc>" +

      "<defs>" +
      /* 1) Kırpma: kırmızı katmanın tamamı bu yolun içinde kalır */
      '<clipPath id="' + kirpId + '"><path d="' + sinirYolu + '"></path></clipPath>' +
      /* 2) Sönümleme: merkezden uzaklaştıkça kırmızı zayıflar */
      '<radialGradient id="' + sonumId + '" gradientUnits="userSpaceOnUse" cx="' +
      yuvarla(merkez[0]) + '" cy="' + yuvarla(merkez[1]) + '" r="' + yuvarla(enUzak) + '">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="1"></stop>' +
      '<stop offset="0.3" stop-color="#fff" stop-opacity="0.62"></stop>' +
      '<stop offset="0.65" stop-color="#fff" stop-opacity="0.3"></stop>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0.12"></stop>' +
      "</radialGradient>" +
      '<mask id="' + maskeId + '"><rect x="0" y="0" width="' + GENISLIK +
      '" height="' + yukseklik + '" fill="url(#' + sonumId + ')"></rect></mask>' +
      /* 3) Merkezdeki kızıllık */
      '<radialGradient id="' + korId + '" gradientUnits="userSpaceOnUse" cx="' +
      yuvarla(merkez[0]) + '" cy="' + yuvarla(merkez[1]) + '" r="' +
      yuvarla(enUzak * 0.38) + '">' +
      '<stop class="kor-ic" offset="0"></stop>' +
      '<stop class="kor-orta" offset="0.45"></stop>' +
      '<stop class="kor-dis" offset="1"></stop>' +
      "</radialGradient>" +
      "</defs>" +

      '<path class="harita-zemin" d="' + sinirYolu + '"></path>' +
      denizler +

      '<g clip-path="url(#' + kirpId + ')" mask="url(#' + maskeId + ')">' +
      '<circle class="harita-kor" cx="' + yuvarla(merkez[0]) + '" cy="' +
      yuvarla(merkez[1]) + '" r="' + yuvarla(enUzak * 0.5) + '" fill="url(#' + korId + ')"></circle>' +
      '<g class="harita-isinlar">' + isinHtml + "</g>" +
      "</g>" +

      /* Sınır çizgisi ışınların üstünde: çeper her zaman net kalsın */
      '<path class="harita-sinir" d="' + sinirYolu + '"></path>' +

      '<g class="harita-merkez">' +
      '<circle class="harita-nabiz" cx="' + yuvarla(merkez[0]) + '" cy="' +
      yuvarla(merkez[1]) + '" r="14"></circle>' +
      '<circle class="harita-cekirdek" cx="' + yuvarla(merkez[0]) + '" cy="' +
      yuvarla(merkez[1]) + '" r="5"></circle>' +
      '<text class="harita-etiket" x="' + yuvarla(merkez[0] + 14) + '" y="' +
      yuvarla(merkez[1] - 12) + '">' + merkezAd + "</text>" +
      "</g>" +
      "</svg>" +
      "</div>" +

      '<figcaption class="harita-alt">' +
      "<strong>" + ulkeAd + "</strong> · " + merkezAd + " merkezli " +
      isinlar.length + " yön" +
      (veri.aciklama ? "<span>" + metin(veri.aciklama) + "</span>" : "") +
      "</figcaption>" +
      "</figure>";

    /* Dar ekranda harita yana kayıyor; ilk bakışta merkez şehir görünsün. */
    const cerceve = kap.querySelector(".harita-cerceve");
    if (cerceve) {
      const oran = merkez[0] / GENISLIK;
      cerceve.scrollLeft = Math.max(
        0,
        oran * cerceve.scrollWidth - cerceve.clientWidth / 2
      );
    }

    /*
     * Yayılma animasyonu. Sınıf eklenmezse (JS hatası, hareket azaltma)
     * ışınlar zaten görünür durumda — animasyon.css sadece görünürü
     * geciktiriyor, hiçbir şeyi kalıcı gizlemiyor.
     */
    yayilmayiBaslat(kap.querySelector(".harita"));
  }

  function yayilmayiBaslat(harita) {
    if (!harita) return;

    const ac = () => harita.classList.add("yayildi");

    if (!("IntersectionObserver" in window)) {
      ac();
      return;
    }

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        girisler.forEach((g) => {
          if (!g.isIntersecting) return;
          ac();
          gozlemci.disconnect();
        });
      },
      { threshold: 0.25 }
    );
    gozlemci.observe(harita);

    /* Ne olursa olsun görünsün */
    setTimeout(ac, 6000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-harita]").forEach(haritaCiz);
  });
})();
