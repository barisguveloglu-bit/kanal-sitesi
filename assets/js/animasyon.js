/*
 * KANLI GÖZ — Animasyon sürücüsü
 * ---------------------------------------------------------------
 * animasyon.css'in beklediği sınıfları ekler, başka hiçbir şey yapmaz.
 * app.js'ten SONRA yüklenmeli: içeriğin çoğu JS ile basıldığı için
 * "icerik-hazir" olayını bekliyor.
 *
 * CSS ile sözleşme (animasyon.css bunları bekliyor):
 *   html.animasyon-acik          — animasyon katmanının ana anahtarı
 *   .beliren / .belirdi / .hemen — kaydırınca beliren bölümler
 *   .derebeyi-izgara.tarandi     — 81 il taraması
 *   .merdiven.doldu + --gecikme  — irade merdiveninin dolması
 *   .eski-kayit.kagit / .acildi  — 1728 vakayinamesinin açılışı
 *   .goz-svg.takipli             — imleci takip eden göz
 *   .gurultu-serit               — sayfa altındaki sinyal şeridi
 *
 * Bu dosya silinirse hiçbir sınıf eklenmez ve site animasyonsuz,
 * ama eksiksiz çalışır.
 */

(function () {
  "use strict";

  /*
   * Azaltılmış hareket açıksa hiç devreye girmiyoruz.
   * ÖNEMLİ: style.css'in sonunda "* { transition: none !important }" var.
   * Gizleme sınıfını ekleyip geçişe güvenirsek içerik opacity:0'da
   * kilitlenir ve hiç görünmez. O yüzden burada tamamen çekiliyoruz.
   */
  const AZALTILMIS =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (AZALTILMIS) return;

  /*
   * Ana anahtar. Bu satır çalışmazsa animasyon.css'teki hiçbir gizleme
   * kuralı eşleşmez — yani bir hata olursa içerik görünür kalır.
   * Script gövdenin en sonunda olduğu için sınıf ilk boyamadan önce ekleniyor.
   */
  document.documentElement.classList.add("animasyon-acik");

  const ADIM = 70;       // kardeşler arası gecikme (ms)
  const EN_COK = 350;    // toplam gecikme tavanı (ms)
  const MERDIVEN = 90;   // basamaklar arası gecikme (ms)
  const TARAMA = 820;    // 81 ilin toplam beliriş süresi (ms)
  const EMNIYET = 6000;  // "ne olursa olsun göster" süresi (ms)

  /* ----------------------------------------------------------------
     Ortak yardımcılar
     ---------------------------------------------------------------- */

  /* Bir kapsayıcı ekrana girince verilen işi bir kez yap. */
  function gorununceYap(el, isle, secenek) {
    const ayar = secenek || {};
    let yapildi = false;

    function calistir() {
      if (yapildi) return;
      yapildi = true;
      isle();
    }

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        girisler.forEach((g) => {
          if (!g.isIntersecting) return;
          gozlemci.unobserve(el);
          calistir();
        });
      },
      {
        rootMargin: ayar.kenar || "0px 0px -8% 0px",
        threshold: ayar.esik === undefined ? 0.05 : ayar.esik,
      }
    );
    gozlemci.observe(el);

    /* Emniyet: gözlemci bir sebeple hiç tetiklenmezse içerik gizli kalmasın. */
    setTimeout(calistir, EMNIYET);
  }

  /* ----------------------------------------------------------------
     1 · Kaydırınca beliren bölümler
     ---------------------------------------------------------------- */

  const belirenGozlemci = new IntersectionObserver(
    (girisler) => {
      girisler.forEach((g) => {
        if (!g.isIntersecting) return;
        belirenGozlemci.unobserve(g.target);
        goster(g.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  function goster(el) {
    el.classList.add("belirdi");
    /*
     * Geçiş bitince "beliren" sınıfını ve inline gecikmeyi kaldırıyoruz.
     * Sebebi: .beliren'in transition'ı style.css'teki kart geçişini
     * (border-color/transform 0.2s) eziyor; temizleyince kart kendi
     * hover davranışına dönüyor. Son görünüm zaten aynı, sıçrama olmuyor.
     */
    const bekle = (parseFloat(el.style.transitionDelay) || 0) + 900;
    setTimeout(() => {
      el.classList.remove("beliren", "hemen");
      el.style.transitionDelay = "";
    }, bekle);
  }

  function belirenYap(el, gecikme) {
    if (el.dataset.animHazir) return;
    el.dataset.animHazir = "1";
    el.classList.add("beliren");

    /*
     * Açılışta ekranda görünen (ucu bile görünen) içerik beklemesin.
     * Sınır tam pencere yüksekliği: aksi halde katlama çizgisinden
     * hafifçe sarkan bir kutu boş bir boşluk gibi duruyor.
     */
    const kutu = el.getBoundingClientRect();
    if (kutu.top < window.innerHeight && kutu.bottom > 0) {
      el.classList.add("hemen", "belirdi");
      requestAnimationFrame(() => el.classList.remove("beliren", "hemen"));
      return;
    }

    if (gecikme) el.style.transitionDelay = gecikme + "ms";
    belirenGozlemci.observe(el);
  }

  /* Bir kapsayıcının çocuklarını sırayla hazırla */
  function grupHazirla(secici) {
    document.querySelectorAll(secici).forEach((kap) => {
      [...kap.children].forEach((el, i) => {
        belirenYap(el, Math.min(i * ADIM, EN_COK));
      });
    });
  }

  /* Kapsayıcısı olmayan tekil elemanlar */
  function tekilHazirla(secici) {
    document.querySelectorAll(secici).forEach((el) => belirenYap(el, 0));
  }

  /* ----------------------------------------------------------------
     2 · 81 il · rastgele sırayla tarama
     ---------------------------------------------------------------- */

  function illeriHazirla() {
    document.querySelectorAll(".derebeyi-izgara").forEach((izgara) => {
      if (izgara.dataset.animHazir) return;
      const kutular = [...izgara.children];
      if (!kutular.length) return;
      izgara.dataset.animHazir = "1";

      /* Fisher-Yates: her açılışta farklı bir tarama sırası */
      const sira = kutular.map((_, i) => i);
      for (let i = sira.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sira[i], sira[j]] = [sira[j], sira[i]];
      }
      kutular.forEach((el, i) => {
        el.style.transitionDelay =
          Math.round((sira[i] / kutular.length) * TARAMA) + "ms";
      });

      /*
       * Kutular tek tek gözlenmiyor. Öyle yapınca yalnızca ekrandakiler
       * beliriyor ve "veri akıyor" hissi kayboluyor. Kapsayıcı görününce
       * o cephenin bütün kutuları birlikte, karışık sırayla açılıyor.
       */
      gorununceYap(izgara, () => izgara.classList.add("tarandi"), {
        kenar: "0px 0px -5% 0px",
        esik: 0.02,
      });
    });
  }

  /* ----------------------------------------------------------------
     3 · İrade merdiveni · alttan üste dolma
     ---------------------------------------------------------------- */

  function merdiveniHazirla() {
    document.querySelectorAll(".merdiven").forEach((merdiven) => {
      if (merdiven.dataset.animHazir) return;
      const basamaklar = [...merdiven.children];
      if (!basamaklar.length) return;
      merdiven.dataset.animHazir = "1";

      basamaklar.forEach((el, i) => {
        /* Ters sıra: en alttaki basamak ilk dolar. */
        const gecikme = Math.min((basamaklar.length - 1 - i) * MERDIVEN, 450);
        /* --gecikme dolan çizgiyi (::after), transitionDelay basamağın
           kendisini sürüyor. */
        el.style.setProperty("--gecikme", gecikme + "ms");
        el.style.transitionDelay = gecikme + "ms";
      });

      gorununceYap(merdiven, () => merdiven.classList.add("doldu"), {
        esik: 0.04,
      });
    });
  }

  /* ----------------------------------------------------------------
     4 · 1728 vakayinamesi · kâğıdın açılışı
     ---------------------------------------------------------------- */

  function kagidiHazirla() {
    document.querySelectorAll(".eski-kayit").forEach((kagit) => {
      if (kagit.dataset.animHazir) return;
      kagit.dataset.animHazir = "1";
      kagit.classList.add("kagit");

      gorununceYap(kagit, () => kagit.classList.add("acildi"), {
        kenar: "0px 0px -10% 0px",
        esik: 0.02,
      });
    });
  }

  /* ----------------------------------------------------------------
     5 · Dev göz · imleci hafifçe takip
     ---------------------------------------------------------------- */

  const EN_UZAK = 9; // piksel

  function gozuBagla() {
    const sarmal = document.querySelector(".goz-sarmal");
    const svg = sarmal && sarmal.querySelector(".goz-svg");
    if (!svg || sarmal.dataset.gozBagli) return;
    sarmal.dataset.gozBagli = "1";
    svg.classList.add("takipli");

    let hedefX = 0;
    let hedefY = 0;
    let bekliyor = false;

    function yaz() {
      bekliyor = false;
      svg.style.transform =
        "translate3d(" + hedefX.toFixed(2) + "px," + hedefY.toFixed(2) + "px,0)";
    }

    function sirala() {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(yaz);
    }

    function hesapla(x, y) {
      const k = sarmal.getBoundingClientRect();
      const dx = x - (k.left + k.width / 2);
      const dy = y - (k.top + k.height / 2);
      const uzaklik = Math.hypot(dx, dy) || 1;
      const oran = Math.min(uzaklik, 400) / 400; // uzaklaştıkça tam açılsın
      hedefX = (dx / uzaklik) * EN_UZAK * oran;
      hedefY = (dy / uzaklik) * EN_UZAK * oran;
      sirala();
    }

    window.addEventListener("pointermove", (e) => hesapla(e.clientX, e.clientY), {
      passive: true,
    });

    /* İmleç pencereden çıkınca göz ortaya dönsün */
    document.addEventListener("pointerleave", () => {
      hedefX = 0;
      hedefY = 0;
      sirala();
    });
  }

  /* ----------------------------------------------------------------
     6 · Sayfa altındaki sinyal şeridi
     ---------------------------------------------------------------- */

  function seridiKur() {
    if (!document.body || document.querySelector(".gurultu-serit")) return;
    const serit = document.createElement("div");
    serit.className = "gurultu-serit";
    serit.setAttribute("aria-hidden", "true");
    document.body.appendChild(serit);
  }

  /* ----------------------------------------------------------------
     Kurulum
     ---------------------------------------------------------------- */

  function kur() {
    grupHazirla(".sebep-liste");
    grupHazirla(".izgara");
    grupHazirla(".icraat-izgara");
    grupHazirla(".komutan-izgara");
    tekilHazirla(".hiyerarsi-kutu");

    illeriHazirla();
    merdiveniHazirla();
    kagidiHazirla();
    gozuBagla();
  }

  seridiKur();
  document.addEventListener("icerik-hazir", kur);

  /* İçeriği statik olan sayfalar için (olay hiç gelmezse) emniyet */
  document.addEventListener("DOMContentLoaded", () => setTimeout(kur, 0));
})();
