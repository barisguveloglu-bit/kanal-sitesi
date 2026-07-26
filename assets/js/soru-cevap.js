/*
 * KANLI GÖZ — Soru-Cevap
 * ---------------------------------------------------------------
 * Hem herkese açık soru-cevap sayfasını hem yönetim panelini
 * çalıştırır. Hangi sayfadaysa ona ait bölümü kurar.
 *
 * Bütün güvenlik sunucuda (bkz. supabase-kurulum.sql).
 * Buradaki gizleme/gösterme işleri sadece arayüz kolaylığı —
 * kimse buradan yetki kazanamaz.
 */

/* Supabase kütüphanesi CDN'den geliyor. En üstte "import" yazarsak
   CDN'e ulaşılamadığında dosya hiç çalışmıyor ve sayfa sessizce ölüyor.
   Bu yüzden aşağıda, hata yakalanabilir şekilde yükleniyor. */
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const AYAR = window.KANLI_GOZ_AYAR || {};
const KATEGORI_AD = {
  site: "Site / Lore",
  video: "Kanal videoları",
  diger: "Diğer",
};

let sb = null;
let kullanici = null;
let yoneticiMi = false;

/* --- Yardımcılar --- */

function ka(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function tarih(t) {
  return new Date(t).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function bilgi(hedef, metin, tur = "notr") {
  const el = document.querySelector(hedef);
  if (!el) return;
  el.className = `sistem-mesaj ${tur}`;
  el.textContent = metin;
  el.hidden = !metin;
}

/* --- Sayfayı bilgi kutusuyla değiştir --- */

function bolumuDegistir(icerik) {
  document.querySelectorAll("[data-sb-gerekli]").forEach((el) => {
    el.innerHTML = `<div class="kapsayici"><div class="not-kutu">${icerik}</div></div>`;
  });
  // Cevaplar bölümü boş başlıkla asılı kalmasın
  document.querySelectorAll("[data-cevaplar-bolum]").forEach((el) => {
    el.hidden = true;
  });
}

/*
 * Ziyaretçiye teknik ayrıntı gösterilmiyor — dosya adları, hangi servisi
 * kullandığımız ve sistemin kurulu olup olmadığı dışarıyı ilgilendirmez.
 * O bilgi yalnızca geliştirici konsoluna yazılıyor.
 */
function kurulumUyarisi() {
  console.info(
    "[Kanlı Göz] Soru-cevap kapalı. Açmak için ayarlar dosyasına Supabase " +
    "bilgileri girilmeli ve kurulum SQL'i bir kez çalıştırılmalı. " +
    "Adımlar depodaki README içinde."
  );
  bolumuDegistir(
    "<strong>Soru-cevap bölümü yakında açılacak.</strong> " +
    "Hazır olduğunda sorularını buradan sorabilecek, cevapları yine " +
    "burada okuyabileceksin."
  );
}

function baglantiHatasi() {
  console.warn("[Kanlı Göz] Soru-cevap için gereken kütüphane yüklenemedi.");
  bolumuDegistir(
    "<strong>Soru-cevap şu anda açılamıyor.</strong> " +
    "Biraz sonra tekrar dener misin? Sitenin geri kalanı normal çalışıyor."
  );
}

/* --- Oturum --- */

let yasakliMi = false;

async function oturumuKur() {
  /* getSession(), OAuth dönüşündeki adres işlenene kadar bekler.
     getUser() ile başlarsak giriş yapmış kullanıcıyı ıskalayabiliyoruz. */
  const { data: { session } } = await sb.auth.getSession();
  kullanici = session?.user || null;

  if (kullanici) {
    const [{ data: y }, { data: b }] = await Promise.all([
      sb.rpc("yonetici_mi"),
      sb.rpc("yasakli_mi"),
    ]);
    yoneticiMi = y === true;
    yasakliMi = b === true;
  }

  const kutu = document.querySelector("[data-oturum]");
  if (kutu) {
    kutu.innerHTML = kullanici
      ? `<div class="oturum">
           <span class="oturum-ad">${ka(kullaniciAdi())}</span>
           ${yoneticiMi ? '<span class="rozet oynanan">Yönetici</span>' : ""}
           ${yasakliMi ? '<span class="rozet esir">Erişim kapalı</span>' : ""}
           <button class="dugme kucuk" data-cikis>Çıkış yap</button>
         </div>`
      : `<button class="dugme birincil" data-giris>Google ile giriş yap</button>
         <p class="oturum-not">Soru sormak için giriş gerekiyor. Sadece adın ve
         e-postan alınır; başka hiçbir bilgi tutulmuyor.</p>`;

    kutu.querySelector("[data-giris]")?.addEventListener("click", girisYap);
    kutu.querySelector("[data-cikis]")?.addEventListener("click", cikisYap);
  }

  /* Yasaklıysa soru formunu tamamen kaldır — asıl engel sunucuda,
     bu sadece boşuna yazmasını önlemek için. */
  if (yasakliMi) {
    const form = document.querySelector("[data-soru-form]");
    if (form) {
      form.outerHTML = `
        <div class="not-kutu">
          <strong>Bu hesap soru soramaz.</strong>
          Soru sorma erişimin kapatılmış.
        </div>`;
    }
  }

  document.querySelectorAll("[data-yonetici-alani]").forEach((el) => {
    el.hidden = !yoneticiMi;
  });
}

function kullaniciAdi() {
  const m = kullanici?.user_metadata || {};
  return m.full_name || m.name || kullanici?.email || "İsimsiz";
}

async function girisYap() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.href.split("#")[0] },
  });
  if (error) bilgi("[data-mesaj]", "Giriş açılamadı: " + error.message, "hata");
}

async function cikisYap() {
  await sb.auth.signOut();
  location.reload();
}

/* --- Soru gönderme --- */

function formuKur() {
  const form = document.querySelector("[data-soru-form]");
  if (!form) return;

  const alan = form.querySelector("[name=soru]");
  const sayac = form.querySelector("[data-sayac]");

  alan?.addEventListener("input", () => {
    sayac.textContent = `${alan.value.length} / 500`;
    sayac.classList.toggle("uyari", alan.value.length > 480);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kullanici) {
      bilgi("[data-mesaj]", "Önce Google ile giriş yapman gerekiyor.", "hata");
      return;
    }

    const soru = alan.value.trim();
    if (soru.length < 10) {
      bilgi("[data-mesaj]", "Soru en az 10 karakter olmalı.", "hata");
      return;
    }

    const dugme = form.querySelector("button[type=submit]");
    dugme.disabled = true;
    bilgi("[data-mesaj]", "Gönderiliyor...", "notr");

    const { error } = await sb.from("sorular").insert({
      kullanici_id: kullanici.id,
      kullanici_ad: kullaniciAdi(),
      kategori: form.querySelector("[name=kategori]").value,
      soru,
      durum: "bekliyor",
    });

    dugme.disabled = false;

    if (error) {
      // RLS reddettiyse sebebi kullanıcıya anlaşılır şekilde söyle
      const y = await sb.rpc("yasakli_mi");
      if (y.data === true) {
        bilgi("[data-mesaj]",
          "Bu hesap soru soramaz. Erişimin kapatılmış.", "hata");
      } else {
        bilgi("[data-mesaj]",
          "Gönderilemedi. Saatte en fazla 3 soru sorabilirsin — " +
          "biraz sonra tekrar dene.", "hata");
      }
      return;
    }

    form.reset();
    sayac.textContent = "0 / 500";
    bilgi("[data-mesaj]",
      "Sorun alındı. Onaylandıktan sonra bu sayfada cevabıyla birlikte " +
      "yayınlanacak.", "basari");
    await benimSorularim();
  });
}

/* --- Yayındaki sorular --- */

async function yayindakiler() {
  const hedef = document.querySelector("[data-sorular]");
  if (!hedef) return;

  const { data, error } = await sb
    .from("sorular")
    .select("id, kullanici_ad, kategori, soru, cevap, cevap_tarihi")
    .eq("durum", "yayinda")
    .order("cevap_tarihi", { ascending: false })
    .limit(100);

  if (error) {
    hedef.innerHTML = `<div class="not-kutu">Sorular yüklenemedi.</div>`;
    return;
  }

  if (!data.length) {
    hedef.innerHTML = `
      <div class="not-kutu">
        Henüz yayınlanmış soru yok. İlk soruyu sen sorabilirsin.
      </div>`;
    return;
  }

  hedef.innerHTML = data.map((s) => `
    <article class="sc-kart">
      <div class="sc-ust">
        <span class="sc-kategori">${ka(KATEGORI_AD[s.kategori] || s.kategori)}</span>
        <span class="sc-tarih">${s.cevap_tarihi ? tarih(s.cevap_tarihi) : ""}</span>
      </div>
      <h3 class="sc-soru">${ka(s.soru)}</h3>
      <div class="sc-soran">${ka(s.kullanici_ad)} sordu</div>
      <div class="sc-cevap">${ka(s.cevap || "")}</div>
    </article>`).join("");

  const sayi = document.querySelector("[data-soru-sayisi]");
  if (sayi) sayi.textContent = `${data.length} cevaplanmış soru`;
}

/* --- Kullanıcının kendi soruları --- */

async function benimSorularim() {
  const hedef = document.querySelector("[data-benim]");
  if (!hedef) return;

  if (!kullanici) { hedef.innerHTML = ""; return; }

  const { data } = await sb
    .from("sorular")
    .select("soru, durum, olusturma")
    .eq("kullanici_id", kullanici.id)
    .order("olusturma", { ascending: false })
    .limit(10);

  if (!data?.length) { hedef.innerHTML = ""; return; }

  const etiket = { bekliyor: "Sırada", yayinda: "Yayında", reddedildi: "Yayınlanmadı" };
  hedef.innerHTML = `
    <h3>Senin soruların</h3>
    <div class="benim-liste">
      ${data.map((s) => `
        <div class="benim-satir" data-durum="${ka(s.durum)}">
          <span>${ka(s.soru)}</span>
          <span class="benim-durum">${ka(etiket[s.durum] || s.durum)}</span>
        </div>`).join("")}
    </div>`;
}

/* --- Yönetim paneli --- */

async function yonetimPaneli() {
  const hedef = document.querySelector("[data-yonetim]");
  if (!hedef) return;

  if (!kullanici) {
    hedef.innerHTML = `<div class="not-kutu">Bu sayfayı görmek için giriş yap.</div>`;
    return;
  }
  if (!yoneticiMi) {
    console.info(
      "[Kanlı Göz] Bu hesap yönetici listesinde değil. Yönetici ekleme " +
      "adımları kurulum SQL dosyasının sonunda."
    );
    hedef.innerHTML = `
      <div class="not-kutu">
        <strong>Bu sayfaya erişimin yok.</strong>
      </div>`;
    return;
  }

  const { data, error } = await sb
    .from("sorular")
    .select("*")
    .order("olusturma", { ascending: false })
    .limit(200);

  if (error) {
    hedef.innerHTML = `<div class="not-kutu">Sorular yüklenemedi: ${ka(error.message)}</div>`;
    return;
  }

  const bekleyen = data.filter((s) => s.durum === "bekliyor");
  const digerleri = data.filter((s) => s.durum !== "bekliyor");

  hedef.innerHTML = `
    <div class="yonetim-ozet">
      <div class="ozet-kutu"><b>${bekleyen.length}</b><span>bekleyen</span></div>
      <div class="ozet-kutu"><b>${data.filter(s=>s.durum==="yayinda").length}</b><span>yayında</span></div>
      <div class="ozet-kutu"><b>${data.filter(s=>s.durum==="reddedildi").length}</b><span>reddedilen</span></div>
    </div>

    <h3>Bekleyen sorular</h3>
    <div>${bekleyen.length
      ? bekleyen.map(yonetimKarti).join("")
      : '<div class="not-kutu">Bekleyen soru yok.</div>'}</div>

    <h3 style="margin-top:40px">İşlem görmüşler</h3>
    <div>${digerleri.length
      ? digerleri.map(yonetimKarti).join("")
      : '<div class="not-kutu">Henüz yok.</div>'}</div>`;

  hedef.querySelectorAll("[data-islem]").forEach((b) => {
    b.addEventListener("click", () => islemYap(b.dataset.islem, b.dataset.id, b));
  });

  await yasakliListesi();
}

function yonetimKarti(s) {
  return `
    <article class="yonetim-kart" data-durum="${ka(s.durum)}">
      <div class="sc-ust">
        <span class="sc-kategori">${ka(KATEGORI_AD[s.kategori] || s.kategori)}</span>
        <span class="sc-tarih">${tarih(s.olusturma)} · ${ka(s.kullanici_ad)}</span>
      </div>
      <p class="sc-soru">${ka(s.soru)}</p>
      <textarea class="cevap-alani" data-cevap="${ka(s.id)}"
        placeholder="Cevabını buraya yaz..." rows="3">${ka(s.cevap || "")}</textarea>
      <div class="yonetim-dugmeler">
        <button class="dugme kucuk birincil" data-islem="yayinla" data-id="${ka(s.id)}">
          Cevapla ve yayınla</button>
        <button class="dugme kucuk" data-islem="reddet" data-id="${ka(s.id)}">Reddet</button>
        <button class="dugme kucuk" data-islem="sil" data-id="${ka(s.id)}">Sil</button>
        <button class="dugme kucuk tehlike" data-islem="banla"
          data-id="${ka(s.id)}">Kullanıcıyı banla</button>
      </div>
    </article>`;
}

async function islemYap(islem, id, dugme) {
  dugme.disabled = true;
  const kart = dugme.closest(".yonetim-kart");
  const cevap = kart.querySelector("[data-cevap]")?.value.trim() || null;

  try {
    if (islem === "yayinla") {
      if (!cevap) {
        bilgi("[data-mesaj]", "Yayınlamadan önce cevap yazman gerekiyor.", "hata");
        dugme.disabled = false;
        return;
      }
      await guncelle(id, { cevap, durum: "yayinda", cevap_tarihi: new Date().toISOString() });
    } else if (islem === "reddet") {
      await guncelle(id, { durum: "reddedildi" });
    } else if (islem === "sil") {
      if (!confirm("Bu soru tamamen silinecek. Emin misin?")) { dugme.disabled = false; return; }
      const { error } = await sb.from("sorular").delete().eq("id", id);
      if (error) throw error;
    } else if (islem === "banla") {
      await banla(id);
    }
    await yonetimPaneli();
  } catch (e) {
    bilgi("[data-mesaj]", "İşlem başarısız: " + e.message, "hata");
    dugme.disabled = false;
  }
}

async function guncelle(id, alanlar) {
  const { error } = await sb.from("sorular").update(alanlar).eq("id", id);
  if (error) throw error;
}

async function banla(soruId) {
  const { data: s, error: e1 } = await sb
    .from("sorular").select("kullanici_id, kullanici_ad").eq("id", soruId).single();
  if (e1) throw e1;

  const sebep = prompt(`"${s.kullanici_ad}" banlanacak.\n\nSebep (isteğe bağlı):`);
  if (sebep === null) return;

  const { error } = await sb.from("yasaklilar").insert({
    kullanici_id: s.kullanici_id,
    kullanici_ad: s.kullanici_ad,
    sebep: sebep || null,
  });
  if (error && !error.message.includes("duplicate")) throw error;
}

async function yasakliListesi() {
  const hedef = document.querySelector("[data-yasaklilar]");
  if (!hedef || !yoneticiMi) return;

  const { data } = await sb
    .from("yasaklilar").select("*").order("tarih", { ascending: false });

  hedef.innerHTML = `
    <h3>Yasaklılar <span class="sayac">${data?.length || 0} kişi</span></h3>
    ${data?.length ? `
      <div class="yasakli-liste">
        ${data.map((y) => `
          <div class="yasakli-satir">
            <div>
              <div class="yasakli-ad">${ka(y.kullanici_ad || "İsimsiz")}</div>
              <div class="yasakli-sebep">${ka(y.sebep || "sebep yazılmamış")} · ${tarih(y.tarih)}</div>
            </div>
            <button class="dugme kucuk" data-ban-kaldir="${ka(y.kullanici_id)}">Kaldır</button>
          </div>`).join("")}
      </div>`
      : '<div class="not-kutu">Yasaklı kimse yok.</div>'}`;

  hedef.querySelectorAll("[data-ban-kaldir]").forEach((b) => {
    b.addEventListener("click", async () => {
      b.disabled = true;
      const { error } = await sb.from("yasaklilar")
        .delete().eq("kullanici_id", b.dataset.banKaldir);
      if (error) bilgi("[data-mesaj]", "Kaldırılamadı: " + error.message, "hata");
      await yasakliListesi();
    });
  });
}

/* --- Başlat --- */

(async function baslat() {
  if (!AYAR.SUPABASE_HAZIR) {
    kurulumUyarisi();
    return;
  }

  let createClient;
  try {
    ({ createClient } = await import(SUPABASE_CDN));
  } catch (e) {
    console.error("Supabase kütüphanesi yüklenemedi:", e);
    baglantiHatasi();
    return;
  }

  sb = createClient(AYAR.SUPABASE_URL, AYAR.SUPABASE_ANON_KEY);

  await oturumuKur();
  formuKur();
  await yayindakiler();
  await benimSorularim();
  await yonetimPaneli();
})();
