/*
 * KANLI GÖZ — Sayfa oluşturucular
 * data.js içindeki veriyi HTML'e çevirir.
 */

/* HTML kaçışı — veriye tırnak/açılı parantez yazılırsa bozulmasın */
function kacir(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* --- Üst menü ---
 *
 * DİKKAT: Menü artık JavaScript ile ÜRETİLMİYOR, her sayfanın HTML'inde
 * yazılı duruyor. Sebebi: JS yüklenmezse ziyaretçi sitede mahsur kalmasın.
 * Buradaki iş sadece zenginleştirme — aktif sayfayı işaretlemek ve
 * telefonda menüyü katlamak.
 *
 * YENİ SAYFA EKLERSEN: bağlantıyı 9 HTML dosyasındaki <nav class="menu">
 * bloğuna da eklemen gerekiyor. (Bkz. README → "Yeni sayfa eklemek".)
 */
function menuyuHazirla() {
  const menu = document.querySelector(".ust-bar .menu");
  if (!menu) return;

  /* Aktif sayfa — hem görsel sınıf hem de ekran okuyucu için aria-current */
  const suan = location.pathname.split("/").pop() || "index.html";
  menu.querySelectorAll("a").forEach((a) => {
    const yol = a.getAttribute("href");
    if (yol !== suan) return;
    a.classList.add("aktif");
    a.setAttribute("aria-current", "page");
  });

  const dugme = document.querySelector(".menu-dugme");
  if (!dugme) return;

  /* Düğme HTML'de gizli duruyor; ancak JS varsa anlamı var. */
  dugme.hidden = false;

  const ac = (acik) => {
    menu.classList.toggle("acik", acik);
    dugme.setAttribute("aria-expanded", acik ? "true" : "false");
  };

  dugme.addEventListener("click", () => ac(!menu.classList.contains("acik")));

  /* Escape kapatsın ve odak düğmeye dönsün */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menu.classList.contains("acik")) return;
    ac(false);
    dugme.focus();
  });

  /* Menünün dışına tıklanınca kapansın */
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("acik")) return;
    if (e.target.closest(".ust-bar")) return;
    ac(false);
  });

  /* Bir bağlantıya gidilince açık kalmasın */
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) ac(false);
  });

  /* Masaüstü genişliğine dönülürse katlama durumu takılı kalmasın */
  const genis = window.matchMedia("(min-width: 821px)");
  const sifirla = () => { if (genis.matches) ac(false); };
  genis.addEventListener ? genis.addEventListener("change", sifirla) : genis.addListener(sifirla);
}

/*
 * Gizli kapı.
 * Üst bardaki nabız atan kırmızı noktaya üç kez basınca açılıyor.
 * Menüde yok, hiçbir yerden bağlantı verilmiyor — bulunması gerekiyor.
 */
function gizliKapiyiKur() {
  const goz = document.querySelector(".marka .goz");
  if (!goz) return;

  let sayi = 0;
  let zaman;

  goz.addEventListener("click", (e) => {
    e.preventDefault();
    clearTimeout(zaman);
    sayi++;

    // arka arkaya basılmazsa sayaç sıfırlanır
    zaman = setTimeout(() => { sayi = 0; }, 1200);

    // her basışta göz biraz daha uyanır
    goz.classList.add("uyandi");
    setTimeout(() => goz.classList.remove("uyandi"), 400);

    if (sayi < 3) return;
    sayi = 0;

    if (document.querySelector(".kapi-serit")) return;

    const serit = document.createElement("div");
    serit.className = "kapi-serit";
    serit.innerHTML =
      'Bir kapı açıldı · <a href="gizli.html">içeri gir</a>';
    document.querySelector(".ust-bar")?.insertAdjacentElement("afterend", serit);
  });
}

/* --- Hatırlanan tercihler (spoiler kapakları) --- */
function tercihOku(anahtar) {
  try { return localStorage.getItem(anahtar); } catch (e) { return null; }
}
function tercihYaz(anahtar, deger) {
  try { localStorage.setItem(anahtar, deger); } catch (e) { /* gizli sekme */ }
}

/*
 * Bir düğme ile bir gövdeyi eşleyen ortak açma/kapama kurulumu.
 * Gizleme "hidden" özniteliğiyle yapılıyor — opacity değil.
 * Sebebi: hareket azaltma açıkken style.css bütün geçişleri kapatıyor,
 * opacity ile gizlenen bir şey bir daha asla görünmez hâle gelirdi.
 */
function kapakKur(dugme, govde, anahtar) {
  const ac = (acik, yaz) => {
    govde.hidden = !acik;
    dugme.setAttribute("aria-expanded", acik ? "true" : "false");
    if (yaz && anahtar) tercihYaz(anahtar, acik ? "acik" : "kapali");
  };
  ac(anahtar ? tercihOku(anahtar) === "acik" : false, false);
  dugme.addEventListener("click", () => ac(govde.hidden, true));
}

/* --- Durum şeridi (her sayfada, menünün altında) ---
 *
 * Hikayenin şu anki hâli spoiler. Yeni gelen biri istemeden okumasın diye
 * kapalı başlıyor; bir kez açan kişinin tercihi hatırlanıyor.
 */
function durumSeridiniKur() {
  const hedef = document.querySelector("[data-durum]");
  if (!hedef) return;

  hedef.innerHTML = `
    <div class="kapsayici">
      <button class="durum-dugme" type="button"
              aria-expanded="false" aria-controls="durum-govde">
        <span class="durum-nokta"></span>
        <span class="durum-etiket">Hikayenin şu anki durumu</span>
        <span class="durum-uyari">spoiler</span>
        <span class="durum-ok" aria-hidden="true">▾</span>
      </button>
      <div class="durum-govde" id="durum-govde" hidden>
        <span class="durum-baslik">${kacir(DURUM.baslik)}</span>
        <span class="durum-ozet">${kacir(DURUM.ozet)}</span>
      </div>
    </div>`;

  kapakKur(
    hedef.querySelector(".durum-dugme"),
    hedef.querySelector(".durum-govde"),
    "kg-durum"
  );
}

/*
 * --- Sayfa içi spoiler kapakları ---
 * Kullanımı: <div data-spoiler="Şu anki durum"> ... </div>
 * JS yoksa içerik olduğu gibi görünür — hiçbir şey kaybolmaz.
 */
let spoilerSayaci = 0;
function spoilerlariKur() {
  document.querySelectorAll("[data-spoiler]").forEach((kap) => {
    if (kap.dataset.spoilerHazir) return;
    kap.dataset.spoilerHazir = "1";

    const kimlik = "spoiler-" + ++spoilerSayaci;
    const govde = document.createElement("div");
    govde.className = "spoiler-govde";
    govde.id = kimlik;
    while (kap.firstChild) govde.appendChild(kap.firstChild);

    const dugme = document.createElement("button");
    dugme.type = "button";
    dugme.className = "spoiler-dugme";
    dugme.setAttribute("aria-controls", kimlik);
    dugme.innerHTML =
      `<span class="durum-uyari">spoiler</span>` +
      `<span>${kacir(kap.dataset.spoiler)} — göstermek için bas</span>`;

    kap.appendChild(dugme);
    kap.appendChild(govde);
    kapakKur(dugme, govde, "kg-" + (kap.dataset.spoilerAnahtar || kimlik));
  });
}

/* --- Sızan cümle --- */
function sizintiyiKur() {
  document.querySelectorAll("[data-sizinti]").forEach((el) => {
    el.textContent = DURUM.sizanCumle;
  });
}

/* --- Kanal bağlantıları ---
 *
 * Adresler HTML'de de yazılı (JS yoksa çalışsınlar diye). Burada sadece
 * data.js'teki güncel değerle üzerine yazılıyor; tek kaynak yine data.js.
 */
function kanalBaglantilariniKur() {
  document.querySelectorAll("[data-kanal]").forEach((el) => {
    el.setAttribute("href", KANAL);
  });

  /* "İzlemeye başla" düğmesi: başlangıç videosu varsa oraya, yoksa kanala */
  const izle = videoAdresi(VIDEOLAR.baslangic);
  document.querySelectorAll("[data-izle]").forEach((el) => {
    el.setAttribute("href", izle || KANAL);
  });
}

/* --- YouTube yardımcıları --- */

/* Elde ne varsa ondan izlenebilir bir adres üret. Yoksa boş dön. */
function videoAdresi(v) {
  if (!v) return "";
  if (v.baglanti) return v.baglanti;
  if (v.kimlik) return "https://www.youtube.com/watch?v=" + encodeURIComponent(v.kimlik);
  return "";
}

/* Kapak görseli yalnızca video kimliği verilmişse üretilebiliyor. */
function videoKapagi(v) {
  return v && v.kimlik
    ? "https://i.ytimg.com/vi/" + encodeURIComponent(v.kimlik) + "/hqdefault.jpg"
    : "";
}

/* Gösterilmeye değer mi? Adresi ve başlığı olmayan video basılmıyor. */
function videoDolu(v) {
  return !!(videoAdresi(v) && v && v.baslik);
}

function kapakHtml(v, sinif, tembel) {
  const kapak = videoKapagi(v);
  const gorsel = kapak
    ? `<img src="${kacir(kapak)}" alt="" width="480" height="360"${tembel ? ' loading="lazy" decoding="async"' : ""}>`
    : "";
  return `
    <a class="${sinif}" href="${kacir(videoAdresi(v))}" target="_blank" rel="noopener"
       tabindex="-1" aria-hidden="true">
      ${gorsel}<span class="oynat-isaret">▶</span>
    </a>`;
}

/* --- Öne çıkan video ---
 * data.js'te doldurulmadıysa bölüm hiç basılmıyor: ziyaretçi boş kutu görmüyor.
 */
function oneCikanVideoyuKur() {
  const bolum = document.querySelector("[data-one-cikan]");
  if (!bolum) return;
  const v = VIDEOLAR.oneCikan;
  if (!videoDolu(v)) return; // hidden kalır

  const hedef = bolum.querySelector("[data-one-cikan-govde]") || bolum;
  hedef.innerHTML = `
    <div class="one-cikan">
      ${kapakHtml(v, "one-cikan-kapak", false)}
      <div>
        <h3>${kacir(v.baslik)}</h3>
        ${v.sure ? `<div class="sure">${kacir(v.sure)}</div>` : ""}
        ${v.aciklama ? `<p class="ozet">${kacir(v.aciklama)}</p>` : ""}
        <a class="dugme birincil" href="${kacir(videoAdresi(v))}"
           target="_blank" rel="noopener">
          YouTube'da izle<span class="gizli-metin"> (yeni sekmede açılır)</span>
        </a>
      </div>
    </div>`;
  bolum.hidden = false;
}

/* --- Üç videoda evrene gir --- */
function rotayiKur() {
  const bolum = document.querySelector("[data-rota]");
  if (!bolum) return;
  const liste = (VIDEOLAR.rota || []).filter(videoDolu);
  if (!liste.length) return; // hidden kalır

  const hedef = bolum.querySelector("[data-rota-govde]") || bolum;
  hedef.innerHTML = `
    <div class="rota-izgara">
      ${liste.map((v, i) => `
        <article class="rota-kart">
          <div class="rota-no">${String(i + 1).padStart(2, "0")}</div>
          ${videoKapagi(v) ? kapakHtml(v, "rota-kapak", true) : ""}
          <h3>${kacir(v.baslik)}</h3>
          ${v.sure ? `<div class="sure">${kacir(v.sure)}</div>` : ""}
          ${v.aciklama ? `<p>${kacir(v.aciklama)}</p>` : ""}
          <a class="izle" href="${kacir(videoAdresi(v))}" target="_blank" rel="noopener">
            YouTube'da izle →<span class="gizli-metin"> (yeni sekmede açılır)</span>
          </a>
        </article>`).join("")}
    </div>`;
  bolum.hidden = false;
}

/* --- Kanalı kim yapıyor --- */
function yapimciyiKur() {
  const hedef = document.querySelector("[data-yapimci]");
  if (!hedef) return;
  hedef.innerHTML = `
    <div class="yapimci">
      <div class="yapimci-govde">
        <div class="yapimci-ad">${kacir(YAPIMCI.ad)}</div>
        <div class="yapimci-rol">${kacir(YAPIMCI.rol)}</div>
        <p>${kacir(YAPIMCI.metin)}</p>
      </div>
      <a class="dugme" data-kanal href="${kacir(KANAL)}" target="_blank" rel="noopener">
        Kanala git<span class="gizli-metin"> (yeni sekmede açılır)</span>
      </a>
    </div>`;
}

/* --- Neden bakmalısın --- */
function sebepleriKur() {
  const hedef = document.querySelector("[data-sebepler]");
  if (!hedef) return;

  hedef.innerHTML = SEBEPLER.map((s, i) => `
    <li class="sebep">
      <div class="sebep-no">${String(i + 1).padStart(2, "0")}</div>
      <div class="sebep-govde">
        <h3>${kacir(s.baslik)}</h3>
        <p>${kacir(s.metin)}</p>
        <a href="${kacir(s.yol)}">${kacir(s.yolAd)} →</a>
      </div>
    </li>`).join("");
}

/* --- Karakter kartları --- */
function karakterKarti(k) {
  const formlarHtml = k.formlar
    ? `<div class="formlar">
        ${k.formlar
          .map(
            (f) => `
          <div class="form-kutu">
            <div class="ad">${kacir(f.ad)} <span class="tir-sayi">${f.tir} tır</span></div>
            <div class="aciklama">${kacir(f.aciklama)}</div>
          </div>`
          )
          .join("")}
      </div>`
    : "";

  const ozelliklerHtml = k.ozellikler
    ? `<ul class="ozellik-listesi">
        ${k.ozellikler.map((o) => `<li>${kacir(o)}</li>`).join("")}
      </ul>`
    : "";

  return `
    <article class="kart" data-taraf="${kacir(k.taraf)}" data-esir="${k.esir ? "evet" : "hayir"}" id="${kacir(k.id)}">
      <div class="kart-ust">
        <h3>${kacir(k.ad)}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          ${k.esir ? '<span class="rozet esir">Esir</span>' : ""}
          ${k.oynanan ? '<span class="rozet oynanan">Oynanan</span>' : ""}
          <span class="rozet" data-taraf="${kacir(k.taraf)}">${kacir(TARAF_ETIKET[k.taraf])}</span>
        </div>
      </div>
      <div class="unvan">${kacir(k.unvan)} · ${kacir(k.gucEtiketi)}</div>
      <p class="ozet">${kacir(k.ozet)}</p>
      ${formlarHtml}
      ${ozelliklerHtml}
      ${k.detay ? `<p class="detay">${kacir(k.detay)}</p>` : ""}
    </article>`;
}

function karakterleriKur() {
  // Bir sayfada birden fazla bölüm olabilir (iyiler / kötüler / belirsiz)
  document.querySelectorAll("[data-karakterler]").forEach((hedef) => {
    const sadece = hedef.dataset.karakterler; // "iyi" / "kotu" / "belirsiz" / "" (hepsi)
    const liste = sadece
      ? KARAKTERLER.filter((k) => k.taraf === sadece)
      : KARAKTERLER;

    hedef.innerHTML = liste.map(karakterKarti).join("");
  });
}

/* --- İcraatler --- */
function icraatleriKur() {
  // Bir sayfada birden fazla bölüm olabilir (iyi / kotu / belirsiz)
  document.querySelectorAll("[data-icraat]").forEach((hedef) => {
  const sadece = hedef.dataset.icraat; // "" (hepsi) veya taraf
  const liste = sadece ? ICRAATLER.filter((k) => k.taraf === sadece) : ICRAATLER;

  hedef.innerHTML = liste.map((k) => `
    <article class="icraat-blok" data-taraf="${kacir(k.taraf)}">
      <h3>${kacir(k.karakter)}</h3>
      <ul class="icraat-liste">
        ${k.liste.map((i) => `
          <li>
            <span class="icraat-ne">${kacir(i.ne)}</span>
            ${i.video
              ? `<span class="icraat-kaynak">${
                  i.baglanti
                    ? `<a href="${kacir(i.baglanti)}" target="_blank" rel="noopener">${kacir(i.video)}</a>`
                    : kacir(i.video)
                }</span>`
              : ""}
          </li>`).join("")}
      </ul>
    </article>`).join("");
  });

  const sayac = document.querySelector("[data-icraat-sayisi]");
  if (sayac) {
    const toplam = ICRAATLER.reduce((a, k) => a + k.liste.length, 0);
    sayac.textContent = `${toplam} kayıt`;
  }
}

/* --- İrade merdiveni --- */
function iradeyiKur() {
  const hedef = document.querySelector("[data-irade]");
  if (!hedef) return;

  hedef.innerHTML = IRADE_KADEMELERI.map(
    (i) => `
      <div class="basamak" data-kademe="${i.kademe}">
        <div class="no">${i.kademe}</div>
        <div>
          <h3>${kacir(i.ad)}</h3>
          <p>${kacir(i.etki)}</p>
          ${i.ornek ? `<span class="ornek">Örnek: ${kacir(i.ornek)}</span>` : ""}
        </div>
      </div>`
  ).join("");
}

/* --- Mafya hiyerarşisi --- */
function mafyayiKur() {
  const tepe = document.querySelector("[data-mafya-tepe]");
  if (tepe) {
    tepe.innerHTML = MAFYA_TEPE.map(
      (o, i) => `
      <div class="hiyerarsi-kat">
        <div class="hiyerarsi-kutu" data-seviye="${i + 1}">
          <div class="seviye-etiket">Seviye ${i + 1}</div>
          <h3>${kacir(o.ad)}</h3>
          <div class="unvan">${kacir(o.unvan)}</div>
          <p>${kacir(o.not)}</p>
        </div>
      </div>
      <div class="hiyerarsi-cizgi"></div>`
    ).join("");
  }

  /* Üç komutan */
  const kom = document.querySelector("[data-komutanlar]");
  if (kom) {
    kom.innerHTML = KOMUTANLAR.map((k) => {
      const iller = IL_DEREBEYLERI.filter((d) => d.komutan === k.id);
      return `
      <div class="komutan ${k.ad ? "" : "bos"}" data-bolge="${kacir(k.id)}">
        <div class="seviye-etiket">${kacir(k.bolge)} Cephesi</div>
        <h3>${k.ad ? kacir(k.ad) : "İsimsiz Komutan"}</h3>
        <div class="unvan">${kacir(k.unvan)}</div>
        ${k.mitoloji
          ? `<div class="komutan-kaynak">
               <span class="mitoloji">${kacir(k.mitoloji)}</span>
               ${k.kaynak ? kacir(k.kaynak) : ""}
             </div>`
          : ""}
        ${k.gucAdi
          ? `<div class="komutan-guc">
               <div class="guc-adi">${kacir(k.gucAdi)} <span>${k.tir} tır</span></div>
               <p class="guc-aciklama">${kacir(k.gucAciklama)}</p>
               <ul class="ozellik-listesi">
                 ${(k.ozellikler || []).map((o) => `<li>${kacir(o)}</li>`).join("")}
               </ul>
               <p class="guc-zaaf"><strong>Zaafı:</strong> ${kacir(k.zaaf)}</p>
             </div>`
          : ""}
        <p>${kacir(k.not)}</p>
        <div class="komutan-sayi">${iller.length} il</div>
      </div>`;
    }).join("");
  }

  /* 81 il derebeyi — komutanlara göre gruplanmış */
  const alt = document.querySelector("[data-derebeyleri]");
  if (alt) {
    alt.innerHTML = KOMUTANLAR.map((k) => {
      const iller = IL_DEREBEYLERI.filter((d) => d.komutan === k.id);
      const kutular = iller
        .map(
          (d) => `
        <div class="derebeyi ${d.ad ? "" : "bos"}" data-bolge="${kacir(k.id)}">
          <div class="derebeyi-plaka">${d.plaka}</div>
          <div class="derebeyi-il">${kacir(d.il)}</div>
          <div class="derebeyi-ad">${d.ad ? kacir(d.ad) : "isimsiz"}</div>
          ${d.kim ? `<div class="derebeyi-kim">${kacir(d.kim)}</div>` : ""}
        </div>`
        )
        .join("");
      return `
      <div class="cephe" data-bolge="${kacir(k.id)}">
        <h3 class="cephe-baslik">
          ${kacir(k.bolge)} Cephesi
          <span>${k.ad ? kacir(k.ad) : "isimsiz komutan"} · ${iller.length} il</span>
        </h3>
        <div class="derebeyi-izgara">${kutular}</div>
      </div>`;
    }).join("");

    const sayac = document.querySelector("[data-derebeyi-sayac]");
    if (sayac) {
      const bilinen = IL_DEREBEYLERI.filter((d) => d.ad).length;
      const komBilinen = KOMUTANLAR.filter((k) => k.ad).length;
      sayac.textContent =
        `${komBilinen} / ${KOMUTANLAR.length} komutan · ` +
        `${bilinen} / ${IL_DEREBEYLERI.length} il derebeyi isimlendirildi`;
    }
  }
}

/* --- Komutanlar arası çekişme --- */
function cekismeyiKur() {
  const hedef = document.querySelector("[data-cekisme]");
  if (!hedef) return;
  hedef.innerHTML = `
    <h3>${kacir(KOMUTAN_CEKISMESI.baslik)}</h3>
    <p>${kacir(KOMUTAN_CEKISMESI.metin)}</p>
    <p style="margin-bottom:0">${kacir(KOMUTAN_CEKISMESI.sonuc)}</p>`;
}

/* --- Başlat --- */
document.addEventListener("DOMContentLoaded", () => {
  menuyuHazirla();
  gizliKapiyiKur();
  durumSeridiniKur();
  spoilerlariKur();
  sizintiyiKur();
  if (typeof gozuKur === "function") gozuKur();
  oneCikanVideoyuKur();
  rotayiKur();
  yapimciyiKur();
  kanalBaglantilariniKur();
  sebepleriKur();
  karakterleriKur();
  icraatleriKur();
  iradeyiKur();
  mafyayiKur();
  cekismeyiKur();

  /*
   * Sayfadaki içeriğin çoğu buraya kadar JS ile basıldı.
   * Kaydırma animasyonu gibi şeylerin elemanları bulabilmesi için
   * bittiğini duyuruyoruz. Dinlemek için:
   *   document.addEventListener("icerik-hazir", () => { ... });
   */
  document.dispatchEvent(new CustomEvent("icerik-hazir"));
});
