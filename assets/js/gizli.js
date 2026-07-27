/*
 * KANLI GÖZ — Gizli Sayfa (kilit)
 * ---------------------------------------------------------------
 * Bu sayfaya menüden gidilmiyor. Kapıyı bulmak da açmak da uğraş.
 *
 * Cevaplar burada DÜZ YAZILMIYOR — SHA-256 özetleri tutuluyor.
 * Kaynağa bakan cevabı göremez, sadece özetini görür.
 *
 * Dürüst sınır: bu bir tarayıcı kilidi. Kararlı biri kısa cevapları
 * deneyerek kırabilir. Arkasındaki şey bir lore sayfası olduğu için
 * bu seviye yeterli — para veya kişisel veri korumuyor.
 *
 * ---------------------------------------------------------------
 * YENİ SORU EKLEMEK / CEVAP DEĞİŞTİRMEK
 * ---------------------------------------------------------------
 * Özeti şu komutla üretiyorsun (cevap küçük harfe çevrilip
 * Türkçe harfler sadeleştiriliyor):
 *
 *   node -e "const c=require('crypto');const n=s=>s.toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]/g,'');console.log(c.createHash('sha256').update(n('CEVAP')).digest('hex'))"
 */

/* Kanal adresi data.js içinde tanımlı */

/* --- Güven usulü adımlar (site bunları doğrulayamaz) --- */
const SART_LISTESI = [
  {
    id: "abone",
    metin: "Kanala abone ol",
    link: KANAL + "?sub_confirmation=1",
    linkMetin: "Kanalı aç",
  },
  {
    id: "begeni",
    metin: "Son 5 videoyu beğen",
    link: KANAL + "/videos",
    linkMetin: "Videoları aç",
  },
];

/* --- Bulmacalar — cevapları sitede aramadan bulunamaz --- */
const SORULAR = [
  {
    soru: "Kanlı Göz kaç yılda bir doğar?",
    ipucu: "Ana sayfada, ilk cümlede.",
    ozet: "983bd614bb5afece5ab3b6023f71147cd7b6bc2314f9d27af7422541c6558389",
  },
  {
    soru: "Barış'tan önceki taşıyıcının adı ne?",
    ipucu: "Efsane sayfasındaki eski belgede.",
    ozet: "39343e241e472bfa799b5c1212b4b07c45e691afa7043405c50adf191d6d158f",
  },
  {
    soru: "Ağaç hangi yıl kurudu?",
    ipucu: "Vakayinamenin son satırı.",
    ozet: "76d6a8153b2e6ea49abf44111408f3d25887ddab9af37284a025d1b8febac3c1",
  },
  {
    soru: "Doğu Cephesi'nin komutanı kim?",
    ipucu: "Mafya haritasında, üç komutandan biri.",
    ozet: "6451a0acb2b816f1dbcba9e23ca23949cdbfb8923e6617b7ea8907b8bf8292ef",
  },
  {
    soru: "Yoğurt Yiyen Adam kaç tır kaldırdı?",
    ipucu: "İcraatler sayfasında yazıyor.",
    ozet: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
  },
];

/*
 * Videoda söylenen parola.
 * Kullanmak için: acik: true yap ve ozet alanına kendi kelimenin
 * özetini koy (üstteki komutla üretiyorsun).
 */
const VIDEO_PAROLASI = {
  acik: false,
  soru: "Son videoda söylenen gizli kelime ne?",
  ipucu: "Videoyu sonuna kadar izlemek lazım.",
  ozet: "",
};

/* --- Yardımcılar --- */

function sadelestir(s) {
  return String(s)
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

async function ozetle(metin) {
  const veri = new TextEncoder().encode(sadelestir(metin));
  const tampon = await crypto.subtle.digest("SHA-256", veri);
  return [...new Uint8Array(tampon)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ka(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* --- Kilidi kur --- */

const tumSorular = () =>
  VIDEO_PAROLASI.acik && VIDEO_PAROLASI.ozet
    ? [...SORULAR, VIDEO_PAROLASI]
    : SORULAR;

function kilidiKur() {
  const hedef = document.querySelector("[data-kilit]");
  if (!hedef) return;

  const sorular = tumSorular();

  hedef.innerHTML = `
    <div class="kilit">
      <div class="kilit-baslik">
        <span class="kilit-etiket">Kapalı bölüm</span>
        <h2 class="bozuk" data-metin="ERİŞİM YOK">ERİŞİM YOK</h2>
      </div>

      <div class="kilit-adim">
        <div class="adim-no">1</div>
        <div>
          <h3>Kanal</h3>
          <p class="adim-not">
            Bu ikisini biz kontrol edemiyoruz — söz sana kalmış.
          </p>
          <div class="sart-liste">
            ${SART_LISTESI.map((s) => `
              <label class="sart">
                <input type="checkbox" data-sart="${ka(s.id)}">
                <span>${ka(s.metin)}</span>
                <a href="${ka(s.link)}" target="_blank" rel="noopener">${ka(s.linkMetin)}</a>
              </label>`).join("")}
          </div>
        </div>
      </div>

      <div class="kilit-adim">
        <div class="adim-no">2</div>
        <div>
          <h3>Beş soru</h3>
          <p class="adim-not">
            Cevapların hepsi bu sitede. Okumadan bulunmaz.
          </p>
          <div class="soru-liste">
            ${sorular.map((s, i) => `
              <div class="kilit-soru" data-sira="${i}">
                <label>${ka(s.soru)}</label>
                <div class="kilit-giris">
                  <input type="text" data-cevap="${i}" autocomplete="off"
                         spellcheck="false" placeholder="cevabın">
                  <span class="kilit-durum" data-kd="${i}"></span>
                </div>
                <span class="kilit-ipucu">${ka(s.ipucu)}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>

      <div class="kilit-alt">
        <div class="kilit-sayac" data-sayac></div>
        <button class="dugme birincil" data-ac disabled>Kapıyı aç</button>
      </div>
      <div class="kilit-mesaj" data-kilit-mesaj></div>
    </div>`;

  const dogru = new Array(sorular.length).fill(false);
  const dugme = hedef.querySelector("[data-ac]");
  const sayac = hedef.querySelector("[data-sayac]");

  function tazele() {
    const sart = [...hedef.querySelectorAll("[data-sart]")].every((k) => k.checked);
    const bilmece = dogru.filter(Boolean).length;
    sayac.textContent =
      `${bilmece} / ${sorular.length} soru` + (sart ? " · kanal tamam" : " · kanal eksik");
    dugme.disabled = !(sart && bilmece === sorular.length);
  }

  hedef.querySelectorAll("[data-sart]").forEach((k) =>
    k.addEventListener("change", tazele)
  );

  hedef.querySelectorAll("[data-cevap]").forEach((alan) => {
    let zaman;
    alan.addEventListener("input", () => {
      clearTimeout(zaman);
      zaman = setTimeout(async () => {
        const i = Number(alan.dataset.cevap);
        const durum = hedef.querySelector(`[data-kd="${i}"]`);
        if (!alan.value.trim()) {
          durum.textContent = ""; durum.className = "kilit-durum";
          dogru[i] = false; tazele(); return;
        }
        dogru[i] = (await ozetle(alan.value)) === sorular[i].ozet;
        durum.textContent = dogru[i] ? "✓" : "✕";
        durum.className = "kilit-durum " + (dogru[i] ? "olur" : "olmaz");
        alan.closest(".kilit-soru").classList.toggle("cozuldu", dogru[i]);
        tazele();
      }, 350);
    });
  });

  dugme.addEventListener("click", () => {
    if (dugme.disabled) return;
    document.body.classList.add("kapi-aciliyor");
    setTimeout(() => {
      hedef.hidden = true;
      document.body.classList.remove("kapi-aciliyor");
      const oda = document.querySelector("[data-oda]");
      if (oda) {
        oda.hidden = false;
        oda.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 1400);
  });

  tazele();

  // kilit basıldı — geç gelen içerik için haber ver
  document.dispatchEvent(new CustomEvent("icerik-hazir"));
}

document.addEventListener("DOMContentLoaded", kilidiKur);
