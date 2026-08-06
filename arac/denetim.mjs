/*
 * KANLI GÖZ — Denetim
 * ---------------------------------------------------------------
 * Sitenin kendi içinde tutarlı olup olmadığını ölçer. Bağımlılık yok,
 * derleme yok — düz Node. Çalıştırmak için:
 *
 *     node arac/denetim.mjs
 *
 * Neyi denetler:
 *   1. data.js kendi içinde tutarlı mı (81 il, tekrarsız isim, geçerli taraf...)
 *   2. LORE.md ile data.js aynı şeyi mi söylüyor (canon ↔ veri senkronu)
 *   3. Site bütünlüğü (menü, sitemap, iç bağlantılar)
 *
 * Çıkış kodu: hata varsa 1, yoksa 0. CI bu koda bakıyor.
 *
 * NEDEN VAR: Otonom ajan haftada bir bu betiği çalıştırıp çıktısına göre
 * iş yapıyor. Ajanın "iyi görünüyor" deyip geçmesini engelleyen şey bu
 * dosya — ölçemediği bir şeyi düzeltmesini bekleyemeyiz.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Menüde ve site haritasında görünmemesi normal olan sayfalar */
const MENU_DISI = new Set(["404.html", "gizli.html"]);

const hatalar = [];
const uyarilar = [];
const bilgiler = [];

const hata = (mesaj) => hatalar.push(mesaj);
const uyari = (mesaj) => uyarilar.push(mesaj);
const bilgi = (mesaj) => bilgiler.push(mesaj);

/* ------------------------------------------------------------------ */
/* data.js yükleme                                                     */
/* ------------------------------------------------------------------ */

/*
 * data.js tarayıcı için yazılmış düz bir betik — modül değil, dışa aktarım
 * yok. Bu yüzden metnini okuyup yalıtılmış bir bağlamda çalıştırıyor,
 * sonunda istediğimiz sabitleri toplu hâlde geri alıyoruz.
 */
function veriyiYukle() {
  const kaynak = readFileSync(join(KOK, "assets/js/data.js"), "utf8");
  const disaAktar = `
    ({ KANAL, SITE_ADRESI, VIDEOLAR, YAPIMCI, DURUM, SEBEPLER, KARAKTERLER,
       ICRAATLER, IRADE_KADEMELERI, MAFYA_TEPE, KOMUTANLAR,
       KOMUTAN_CEKISMESI, IL_DEREBEYLERI, TARAF_ETIKET })
  `;
  return vm.runInNewContext(kaynak + disaAktar, Object.create(null), {
    filename: "data.js",
  });
}

/* ------------------------------------------------------------------ */
/* 1. data.js kendi içinde tutarlı mı                                  */
/* ------------------------------------------------------------------ */

function denetleVeri(veri) {
  const {
    SEBEPLER,
    KARAKTERLER,
    ICRAATLER,
    IRADE_KADEMELERI,
    MAFYA_TEPE,
    KOMUTANLAR,
    IL_DEREBEYLERI,
    TARAF_ETIKET,
  } = veri;

  const gecerliTaraflar = new Set(Object.keys(TARAF_ETIKET));
  const komutanKimlikleri = new Set(KOMUTANLAR.map((k) => k.id));
  const kademeNumaralari = new Set(IRADE_KADEMELERI.map((k) => k.kademe));

  /* --- 81 il derebeyi --- */
  if (IL_DEREBEYLERI.length !== 81) {
    hata(`IL_DEREBEYLERI ${IL_DEREBEYLERI.length} kayıt içeriyor, 81 olmalı.`);
  }

  const gorulenPlakalar = new Map();
  const gorulenIller = new Map();
  const gorulenDerebeyleri = new Map();

  for (const kayit of IL_DEREBEYLERI) {
    const yer = `plaka ${kayit.plaka} (${kayit.il})`;

    if (gorulenPlakalar.has(kayit.plaka)) {
      hata(`Plaka ${kayit.plaka} iki kez geçiyor: ${gorulenPlakalar.get(kayit.plaka)} ve ${kayit.il}.`);
    }
    gorulenPlakalar.set(kayit.plaka, kayit.il);

    if (gorulenIller.has(kayit.il)) {
      hata(`${kayit.il} iki kez geçiyor (plaka ${gorulenIller.get(kayit.il)} ve ${kayit.plaka}).`);
    }
    gorulenIller.set(kayit.il, kayit.plaka);

    if (kayit.ad) {
      if (gorulenDerebeyleri.has(kayit.ad)) {
        hata(`Derebeyi adı "${kayit.ad}" iki ilde birden: ${gorulenDerebeyleri.get(kayit.ad)} ve ${kayit.il}.`);
      }
      gorulenDerebeyleri.set(kayit.ad, kayit.il);
    } else {
      uyari(`${yer} için derebeyi adı henüz yok.`);
    }

    if (!komutanKimlikleri.has(kayit.komutan)) {
      hata(`${yer} tanımsız bir komutana bağlı: "${kayit.komutan}".`);
    }
  }

  for (let plaka = 1; plaka <= 81; plaka++) {
    if (!gorulenPlakalar.has(plaka)) hata(`Plaka ${plaka} eksik.`);
  }

  /* Canon "81 il üçe eşit bölünmüş" diyor — her cepheye 27 il. */
  for (const komutan of KOMUTANLAR) {
    const sayi = IL_DEREBEYLERI.filter((k) => k.komutan === komutan.id).length;
    if (sayi !== 27) {
      hata(`${komutan.ad} cephesinde ${sayi} il var, 27 olmalı (LORE: eşit bölünmüş).`);
    }
  }

  /* --- Karakterler --- */
  const gorulenKimlikler = new Set();
  for (const karakter of KARAKTERLER) {
    if (gorulenKimlikler.has(karakter.id)) {
      hata(`Karakter kimliği tekrar ediyor: "${karakter.id}".`);
    }
    gorulenKimlikler.add(karakter.id);

    if (!gecerliTaraflar.has(karakter.taraf)) {
      hata(`${karakter.ad} geçersiz taraf taşıyor: "${karakter.taraf}".`);
    }

    if (karakter.iradeKademe !== undefined && !kademeNumaralari.has(karakter.iradeKademe)) {
      hata(`${karakter.ad} tanımsız irade kademesi taşıyor: ${karakter.iradeKademe}.`);
    }

    denetleTirEtiketi(karakter.ad, karakter.tir, karakter.gucEtiketi);

    for (const form of karakter.formlar ?? []) {
      if (typeof form.tir !== "number") {
        hata(`${karakter.ad} → "${form.ad}" formunun tır değeri sayı değil.`);
      }
    }
  }

  /* --- Komutanlar --- */
  for (const komutan of KOMUTANLAR) {
    if (komutan.tir !== 3) {
      hata(`${komutan.ad} ${komutan.tir} tır taşıyor — LORE üç komutanın da 3 tır olduğunu söylüyor.`);
    }
    if (!kademeNumaralari.has(komutan.iradeKademe)) {
      hata(`${komutan.ad} tanımsız irade kademesi taşıyor: ${komutan.iradeKademe}.`);
    }
  }

  /* --- İrade kademeleri --- */
  const tumIsimler = new Set([
    ...KARAKTERLER.map((k) => k.ad),
    ...KOMUTANLAR.map((k) => k.ad),
  ]);

  for (const kademe of IRADE_KADEMELERI) {
    if (kademe.ornek && !tumIsimler.has(kademe.ornek)) {
      hata(`İrade kademesi ${kademe.kademe} örnek olarak "${kademe.ornek}" gösteriyor ama böyle bir karakter yok.`);
    }
  }

  /* --- İcraatler --- */
  const tarafSahibi = new Map([
    ...KARAKTERLER.map((k) => [k.ad, k.taraf]),
    ...KOMUTANLAR.map((k) => [k.ad, "kotu"]),
  ]);

  for (const icraat of ICRAATLER) {
    if (!tumIsimler.has(icraat.karakter)) {
      hata(`İcraat listesinde tanımsız karakter: "${icraat.karakter}".`);
      continue;
    }
    const beklenen = tarafSahibi.get(icraat.karakter);
    if (icraat.taraf !== beklenen) {
      hata(`${icraat.karakter} icraatlerde "${icraat.taraf}" tarafında ama tanımı "${beklenen}".`);
    }
    if (!icraat.liste?.length) {
      uyari(`${icraat.karakter} için icraat listesi boş.`);
    }
  }

  /* --- Mafya tepesi karakterlere bağlı mı --- */
  for (const tepe of MAFYA_TEPE) {
    if (!gorulenKimlikler.has(tepe.id)) {
      hata(`Mafya tepesindeki "${tepe.ad}" (${tepe.id}) KARAKTERLER içinde yok.`);
    }
  }

  /* --- Sebep bağlantıları --- */
  for (const sebep of SEBEPLER) {
    if (sebep.yol && !existsSync(join(KOK, sebep.yol))) {
      hata(`"${sebep.baslik}" sebebi olmayan bir sayfaya işaret ediyor: ${sebep.yol}`);
    }
  }

  /* --- Videolar: eksik ama hata değil --- */
  const videoDolu =
    veri.VIDEOLAR.baslangic.kimlik ||
    veri.VIDEOLAR.baslangic.baglanti ||
    veri.VIDEOLAR.oneCikan.kimlik ||
    veri.VIDEOLAR.oneCikan.baglanti ||
    veri.VIDEOLAR.rota.some((v) => v.kimlik || v.baglanti);

  if (!videoDolu) {
    bilgi("VIDEOLAR tamamen boş — ana sayfadaki video bölümleri basılmıyor. (Bilinçli: sahte içerik üretilmiyor.)");
  }
}

/* "3 tır" etiketi ile sayısal tır alanı birbirini tutuyor mu */
function denetleTirEtiketi(ad, tir, etiket) {
  if (!etiket) return;
  const eslesme = etiket.match(/^(\d+)\s*tır/);
  if (!eslesme) return;
  const etiketteki = Number(eslesme[1]);
  if (etiketteki !== tir) {
    hata(`${ad} etiketinde "${etiket}" yazıyor ama tır değeri ${tir}.`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. LORE.md ↔ data.js senkronu                                       */
/* ------------------------------------------------------------------ */

/*
 * LORE'daki üç derebeyi tablosunu okuyup data.js ile karşılaştırır.
 * Tablo bulunamazsa bunu sessizce geçmiyor, hata sayıyor — çünkü
 * "kontrol edemedim" ile "sorun yok" aynı şey değil.
 */
function denetleLoreSenkronu(veri) {
  const lore = readFileSync(join(KOK, "LORE.md"), "utf8");

  const cepheBasliklari = [
    { baslik: "#### Batı Cephesi", komutan: "bati" },
    { baslik: "#### Orta Cephe", komutan: "orta" },
    { baslik: "#### Doğu Cephesi", komutan: "dogu" },
  ];

  const loredekiler = new Map();

  for (const { baslik, komutan } of cepheBasliklari) {
    const baslangic = lore.indexOf(baslik);
    if (baslangic === -1) {
      hata(`LORE.md içinde "${baslik}" bölümü bulunamadı — derebeyi senkronu doğrulanamıyor.`);
      continue;
    }

    /* Bir sonraki "####" ya da "###" başlığına kadar olan kısım */
    const kalan = lore.slice(baslangic + baslik.length);
    const sonrakiBaslik = kalan.search(/\n#{2,4} /);
    const bolum = sonrakiBaslik === -1 ? kalan : kalan.slice(0, sonrakiBaslik);

    const satirlar = bolum
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => /^\|\s*\d+\s*\|/.test(s));

    if (satirlar.length === 0) {
      hata(`LORE.md "${baslik}" bölümünde derebeyi tablosu okunamadı.`);
      continue;
    }

    for (const satir of satirlar) {
      const hucreler = satir.split("|").map((h) => h.trim()).filter(Boolean);
      const [plakaMetni, il, adHam] = hucreler;
      const plaka = Number(plakaMetni);
      const ad = adHam?.replace(/\*/g, "").trim();
      loredekiler.set(plaka, { plaka, il, ad, komutan });
    }
  }

  /* LORE tarafı hiç okunamadıysa karşılaştırmanın anlamı yok */
  if (loredekiler.size === 0) return;

  if (loredekiler.size !== veri.IL_DEREBEYLERI.length) {
    hata(
      `LORE.md ${loredekiler.size} derebeyi listeliyor, data.js ${veri.IL_DEREBEYLERI.length} tane. İkisi senkron değil.`,
    );
  }

  for (const kayit of veri.IL_DEREBEYLERI) {
    const loredeki = loredekiler.get(kayit.plaka);
    if (!loredeki) {
      hata(`Plaka ${kayit.plaka} (${kayit.il}) data.js'de var ama LORE.md'de yok.`);
      continue;
    }
    if (loredeki.il !== kayit.il) {
      hata(`Plaka ${kayit.plaka}: LORE "${loredeki.il}" diyor, data.js "${kayit.il}" diyor.`);
    }
    if (loredeki.ad !== kayit.ad) {
      hata(`${kayit.il}: LORE derebeyini "${loredeki.ad}" diye anıyor, data.js "${kayit.ad}" diyor.`);
    }
    if (loredeki.komutan !== kayit.komutan) {
      hata(`${kayit.il}: LORE'da ${loredeki.komutan} cephesinde, data.js'de ${kayit.komutan} cephesinde.`);
    }
  }

  for (const plaka of loredekiler.keys()) {
    if (!veri.IL_DEREBEYLERI.some((k) => k.plaka === plaka)) {
      hata(`Plaka ${plaka} LORE.md'de var ama data.js'de yok.`);
    }
  }

  /* Komutan adları canon'da geçiyor mu */
  for (const komutan of veri.KOMUTANLAR) {
    if (!lore.includes(komutan.ad)) {
      hata(`Komutan "${komutan.ad}" LORE.md'de hiç geçmiyor.`);
    }
  }

  /* Karakter adları canon'da geçiyor mu */
  for (const karakter of veri.KARAKTERLER) {
    if (!lore.includes(karakter.ad)) {
      hata(`Karakter "${karakter.ad}" LORE.md'de hiç geçmiyor — canon ile veri ayrışmış.`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 3. Site bütünlüğü                                                   */
/* ------------------------------------------------------------------ */

function denetleSite() {
  const sayfalar = readdirSync(KOK).filter((d) => d.endsWith(".html"));

  /* --- Menü bütün sayfalarda aynı mı --- */
  const menuler = new Map();

  for (const sayfa of sayfalar) {
    const icerik = readFileSync(join(KOK, sayfa), "utf8");
    const eslesme = icerik.match(/<nav[^>]*id="ana-menu"[^>]*>([\s\S]*?)<\/nav>/);

    if (!eslesme) {
      if (sayfa !== "404.html") {
        hata(`${sayfa} içinde ana menü yok. (Menü her sayfada yazılı olmalı — JS yüklenmezse navigasyon kaybolmasın diye.)`);
      }
      continue;
    }

    const hedefler = [...eslesme[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    menuler.set(sayfa, hedefler.join(" › "));

    for (const hedef of hedefler) {
      if (!existsSync(join(KOK, hedef))) {
        hata(`${sayfa} menüsü olmayan bir sayfaya bağlanıyor: ${hedef}`);
      }
    }
  }

  const benzersizMenuler = new Set(menuler.values());
  if (benzersizMenuler.size > 1) {
    hata("Menü sayfalar arasında farklılaşmış:");
    for (const [sayfa, menu] of menuler) {
      hata(`    ${sayfa}: ${menu}`);
    }
  }

  /* --- İç bağlantılar --- */
  for (const sayfa of sayfalar) {
    const icerik = readFileSync(join(KOK, sayfa), "utf8");
    const baglantilar = [...icerik.matchAll(/href="([^"#?:]+\.html)([#?][^"]*)?"/g)];

    for (const [, hedef] of baglantilar) {
      if (!existsSync(join(KOK, hedef))) {
        hata(`${sayfa} → kırık bağlantı: ${hedef}`);
      }
    }
  }

  /* --- Site haritası --- */
  const siteHaritasi = readFileSync(join(KOK, "sitemap.xml"), "utf8");

  for (const sayfa of sayfalar) {
    if (MENU_DISI.has(sayfa)) continue;

    /* Ana sayfa site haritasında kök adres olarak geçiyor */
    const aranan = sayfa === "index.html" ? "kanal-sitesi/</loc>" : `/${sayfa}<`;
    if (!siteHaritasi.includes(aranan)) {
      hata(`${sayfa} sitemap.xml içinde yok.`);
    }
  }

  const haritadakiler = [...siteHaritasi.matchAll(/<loc>[^<]*?\/([^/<]*\.html)<\/loc>/g)].map((m) => m[1]);
  for (const hedef of haritadakiler) {
    if (!existsSync(join(KOK, hedef))) {
      hata(`sitemap.xml olmayan bir sayfayı listeliyor: ${hedef}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Rapor                                                              */
/* ------------------------------------------------------------------ */

function raporla() {
  const yaz = (satir = "") => process.stdout.write(satir + "\n");

  yaz();
  yaz("═══ KANLI GÖZ — DENETİM ═══");
  yaz();

  if (bilgiler.length) {
    yaz(`BİLGİ (${bilgiler.length})`);
    for (const satir of bilgiler) yaz(`  · ${satir}`);
    yaz();
  }

  if (uyarilar.length) {
    yaz(`UYARI (${uyarilar.length}) — eksik ama site çalışıyor`);
    for (const satir of uyarilar) yaz(`  ! ${satir}`);
    yaz();
  }

  if (hatalar.length) {
    yaz(`HATA (${hatalar.length}) — düzeltilmeli`);
    for (const satir of hatalar) yaz(`  ✕ ${satir}`);
    yaz();
    yaz(`Sonuç: ${hatalar.length} hata bulundu.`);
    return 1;
  }

  yaz("Sonuç: hata yok. Canon ile veri senkron, site bütün.");
  return 0;
}

/* ------------------------------------------------------------------ */

try {
  const veri = veriyiYukle();
  denetleVeri(veri);
  denetleLoreSenkronu(veri);
  denetleSite();
} catch (sorun) {
  hata(`Denetim çalışırken çöktü: ${sorun.message}`);
}

process.exit(raporla());
