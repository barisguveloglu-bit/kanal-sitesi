/*
 * KANLI GÖZ — Animasyonlar
 * ---------------------------------------------------------------
 * app.js'ten SONRA yüklenmeli. İçeriğin çoğu JS ile basıldığı için
 * "icerik-hazir" olayını bekliyor.
 *
 * Bu dosya hiçbir mevcut davranışı değiştirmiyor; sadece sınıf ekliyor.
 * Silinirse site aynen çalışmaya devam eder.
 */

(function () {
  "use strict";

  /*
   * Azaltılmış hareket açıksa hiçbir şey yapma.
   * ÖNEMLİ: style.css içinde "* { transition: none !important }" var.
   * Gizleme sınıfını ekleyip geçişe güvenirsek içerik opacity:0'da
   * kilitlenir ve hiç görünmez. O yüzden burada tamamen çekiliyoruz.
   */
  const AZALTILMIS =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (AZALTILMIS) return;

  const ADIM = 70;      // kardeşler arası gecikme (ms)
  const EN_COK = 350;   // toplam gecikme tavanı (ms)
  const TARAMA = 820;   // 81 ilin toplam beliriş süresi (ms)

  /* --- Gözlemci --- */

  const gozlemci = new IntersectionObserver(
    (girisler) => {
      girisler.forEach((g) => {
        if (!g.isIntersecting) return;
        g.target.classList.add("gorundu");
        gozlemci.unobserve(g.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  /* Aynı elemanı iki kez hazırlama — "icerik-hazir" birden çok kez gelebilir */
  function hazirla(el, sinif, gecikme) {
    if (el.dataset.animHazir) return false;
    el.dataset.animHazir = "1";
    if (gecikme) el.style.setProperty("--gecikme", gecikme + "ms");
    el.classList.add(sinif);
    gozlemci.observe(el);
    return true;
  }

  /* Bir grubu sırayla hazırla */
  function grupHazirla(secici, sinif, secenek) {
    const ayar = secenek || {};
    document.querySelectorAll(secici).forEach((kap) => {
      const cocuklar = [...kap.children];
      cocuklar.forEach((el, i) => {
        const sira = ayar.tersten ? cocuklar.length - 1 - i : i;
        hazirla(el, sinif, Math.min(sira * ADIM, EN_COK));
      });
    });
  }

  /* Kapsayıcısı olmayan tekil elemanlar */
  function tekilHazirla(secici, sinif) {
    document.querySelectorAll(secici).forEach((el) => hazirla(el, sinif, 0));
  }

  /* --- 2 · 81 il · rastgele tarama --- */

  function illeriHazirla() {
    document.querySelectorAll(".derebeyi-izgara").forEach((izgara) => {
      if (izgara.dataset.animHazir) return;
      const kutular = [...izgara.children];
      if (!kutular.length) return;
      izgara.dataset.animHazir = "1";

      // Fisher-Yates ile karıştırılmış sıra
      const sira = kutular.map((_, i) => i);
      for (let i = sira.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sira[i], sira[j]] = [sira[j], sira[i]];
      }

      kutular.forEach((el, i) => {
        el.dataset.animHazir = "1";
        el.style.setProperty(
          "--gecikme",
          Math.round((sira[i] / kutular.length) * TARAMA) + "ms"
        );
        el.classList.add("tarama");
      });

      /*
       * Kutuları tek tek gözlemiyoruz. Öyle yapınca yalnızca ekranda olanlar
       * beliriyor ve "veri akıyor" hissi kayboluyordu. Kapsayıcı görününce
       * o cephenin 27 kutusu birlikte, karışık sırayla açılıyor.
       */
      const izgaraGozlemci = new IntersectionObserver(
        (girisler) => {
          girisler.forEach((g) => {
            if (!g.isIntersecting) return;
            kutular.forEach((el) => el.classList.add("gorundu"));
            izgaraGozlemci.unobserve(izgara);
          });
        },
        { rootMargin: "0px 0px -5% 0px", threshold: 0.02 }
      );
      izgaraGozlemci.observe(izgara);

      /* Emniyet: içerik görünmez kalmasın */
      setTimeout(() => kutular.forEach((el) => el.classList.add("gorundu")), 6000);
    });
  }

  /* --- 4 · Vakayiname · kâğıt açılışı --- */

  function kagidiHazirla() {
    document.querySelectorAll(".eski-kayit").forEach((kagit) => {
      if (kagit.dataset.animHazir) return;
      kagit.dataset.animHazir = "1";
      kagit.classList.add("kagit-kapali");

      function ac() {
        if (!kagit.classList.contains("kagit-kapali")) return;
        kagit.classList.add("kagit-aciliyor");
        kagit.addEventListener(
          "animationend",
          () => kagit.classList.remove("kagit-kapali", "kagit-aciliyor"),
          { once: true }
        );
      }

      /*
       * DİKKAT: Kâğıdın kendisini gözlemek İŞE YARAMIYOR.
       * clip-path ile tamamen kırpıldığı için tarayıcı onu "ekranda değil"
       * sayıyor ve olay hiç gelmiyor — kâğıt sonsuza kadar görünmez kalıyor.
       * Bu yüzden kırpılmamış olan kapsayıcısı gözleniyor.
       */
      const gozlenen = kagit.parentElement || kagit;
      const kagitGozlemci = new IntersectionObserver(
        (girisler) => {
          girisler.forEach((g) => {
            if (!g.isIntersecting) return;
            ac();
            kagitGozlemci.unobserve(gozlenen);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
      );
      kagitGozlemci.observe(gozlenen);

      /* Emniyet: ne olursa olsun içerik görünmez kalmasın */
      setTimeout(ac, 6000);
    });
  }

  /* --- 5 · Göz · imleci hafifçe takip --- */

  const EN_UZAK = 9; // piksel

  function gozuBagla() {
    const sarmal = document.querySelector(".goz-sarmal");
    const svg = sarmal && sarmal.querySelector(".goz-svg");
    if (!svg || sarmal.dataset.gozBagli) return;
    sarmal.dataset.gozBagli = "1";

    let hedefX = 0;
    let hedefY = 0;
    let bekliyor = false;

    function yaz() {
      bekliyor = false;
      svg.style.setProperty("--goz-x", hedefX.toFixed(2) + "px");
      svg.style.setProperty("--goz-y", hedefY.toFixed(2) + "px");
    }

    function hesapla(x, y) {
      const k = sarmal.getBoundingClientRect();
      const dx = x - (k.left + k.width / 2);
      const dy = y - (k.top + k.height / 2);
      const uzaklik = Math.hypot(dx, dy) || 1;
      const oran = Math.min(uzaklik, 400) / 400; // uzaklaştıkça tam açılsın
      hedefX = (dx / uzaklik) * EN_UZAK * oran;
      hedefY = (dy / uzaklik) * EN_UZAK * oran;
      if (!bekliyor) {
        bekliyor = true;
        requestAnimationFrame(yaz);
      }
    }

    window.addEventListener(
      "pointermove",
      (e) => hesapla(e.clientX, e.clientY),
      { passive: true }
    );

    // İmleç pencereden çıkınca göz ortaya dönsün
    document.addEventListener("pointerleave", () => {
      hedefX = 0;
      hedefY = 0;
      if (!bekliyor) {
        bekliyor = true;
        requestAnimationFrame(yaz);
      }
    });
  }

  /* --- 6 · Sinyal kaybı şeridi --- */

  function seridiKur() {
    if (document.querySelector(".sinyal-serit")) return;
    const serit = document.createElement("div");
    serit.className = "sinyal-serit";
    serit.setAttribute("aria-hidden", "true");
    document.body.appendChild(serit);
  }

  /* --- Hepsini kur --- */

  function kur() {
    // 1 · beliren bölümler
    grupHazirla(".sebep-liste", "beliren");
    grupHazirla(".izgara", "beliren");
    grupHazirla(".icraat-izgara", "beliren");
    grupHazirla(".komutan-izgara", "beliren");
    // .sc-liste bilerek yok: içeriği Supabase'den sonradan geliyor,
    // burada işaretlenen eleman silinip yerine yenisi geliyor.
    tekilHazirla(".hiyerarsi-kutu", "beliren");
    tekilHazirla(".yonetim-kart", "beliren");

    // 2 · 81 il
    illeriHazirla();

    // 3 · irade merdiveni — en alttaki basamak ilk dolsun
    grupHazirla(".merdiven", "cizgi-buyur", { tersten: true });
    document.querySelectorAll(".merdiven .basamak").forEach((el) => {
      el.classList.add("beliren");
    });

    // 4 · vakayiname
    kagidiHazirla();

    // 5 · göz
    gozuBagla();
  }

  seridiKur();
  document.addEventListener("icerik-hazir", kur);

  // İçerik statik olan sayfalar için (olay gelmezse) emniyet
  document.addEventListener("DOMContentLoaded", () => setTimeout(kur, 0));
})();
