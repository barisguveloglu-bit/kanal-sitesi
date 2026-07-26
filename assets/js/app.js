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

/* --- Üst menü --- */
const SAYFALAR = [
  { yol: "index.html", ad: "Ana Sayfa" },
  { yol: "karakterler.html", ad: "Karakterler" },
  { yol: "irade.html", ad: "İrade Sistemi" },
  { yol: "efsane.html", ad: "Kanlı Göz Efsanesi" },
  { yol: "orgut.html", ad: "Örgüt Haritası" },
  { yol: "guc-tablosu.html", ad: "Güç Tablosu" },
];

function menuyuKur() {
  const hedef = document.querySelector("[data-menu]");
  if (!hedef) return;

  const suan = location.pathname.split("/").pop() || "index.html";

  hedef.innerHTML = `
    <div class="kapsayici">
      <a class="marka" href="index.html"><span class="goz"></span> Kanlı Göz</a>
      <nav class="menu">
        ${SAYFALAR.map(
          (s) =>
            `<a href="${s.yol}" class="${s.yol === suan ? "aktif" : ""}">${kacir(s.ad)}</a>`
        ).join("")}
      </nav>
    </div>`;
}

function altBilgiyiKur() {
  const hedef = document.querySelector("[data-alt-bilgi]");
  if (!hedef) return;
  hedef.innerHTML = `
    <div class="kapsayici">
      <span>Kanlı Göz — hikaye evreni arşivi</span>
      <span>Yaşayan belge · sürekli güncelleniyor</span>
    </div>`;
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
    <article class="kart" data-taraf="${kacir(k.taraf)}" id="${kacir(k.id)}">
      <div class="kart-ust">
        <h3>${kacir(k.ad)}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
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

/* --- Güç tablosu --- */
function gucTablosunuKur() {
  const hedef = document.querySelector("[data-guc]");
  if (!hedef) return;

  const enYuksek = Math.max(...GUC_SIRALAMASI.map((g) => g.tir));

  hedef.innerHTML = GUC_SIRALAMASI.map((g) => {
    const oran = enYuksek > 0 ? (g.tir / enYuksek) * 100 : 0;
    const deger = g.tir > 0
      ? `${g.tir} tır`
      : '<span class="guc-yok">fiziksel güç yok</span>';
    return `
      <div class="guc-satir" data-taraf="${kacir(g.taraf)}">
        <div class="isim">${kacir(g.ad)}<small>${kacir(g.not)}</small></div>
        <div class="guc-cubuk"><div class="guc-dolgu" data-oran="${oran}"></div></div>
        <div class="guc-deger">${deger}</div>
      </div>`;
  }).join("");

  // Çubukları bir kare sonra doldur ki animasyon çalışsın
  requestAnimationFrame(() => {
    hedef.querySelectorAll(".guc-dolgu").forEach((el) => {
      el.style.width = el.dataset.oran + "%";
    });
  });
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

/* --- Örgüt hiyerarşisi --- */
function orgutuKur() {
  const tepe = document.querySelector("[data-orgut-tepe]");
  if (tepe) {
    tepe.innerHTML = ORGUT_TEPE.map(
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

  const alt = document.querySelector("[data-derebeyleri]");
  if (alt) {
    const bilinen = DEREBEYLERI.filter((d) => d.ad).length;
    alt.innerHTML = DEREBEYLERI.map(
      (d) => `
      <div class="derebeyi ${d.ad ? "" : "bos"}">
        <div class="derebeyi-il">${d.il ? kacir(d.il) : "?"}</div>
        <div class="derebeyi-ad">${d.ad ? kacir(d.ad) : "İsimsiz Derebeyi"}</div>
        <div class="derebeyi-not">${kacir(d.not)}</div>
      </div>`
    ).join("");

    const sayac = document.querySelector("[data-derebeyi-sayac]");
    if (sayac) {
      sayac.textContent = `${bilinen} / ${DEREBEYLERI.length} derebeyi isimlendirildi`;
    }
  }
}

/* --- Başlat --- */
document.addEventListener("DOMContentLoaded", () => {
  menuyuKur();
  altBilgiyiKur();
  karakterleriKur();
  gucTablosunuKur();
  iradeyiKur();
  orgutuKur();
});
