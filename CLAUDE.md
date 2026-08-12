# Proje Notları

Bu depo bir **hikaye lore sitesi**. Türkçe bir kurgu evreninin arşivi.

## Önce bunu oku

Hikayenin canon kaynağı [`LORE.md`](LORE.md). Herhangi bir içerik değişikliği
yapmadan önce o dosyayı oku — karakterler, güçler ve efsane orada tanımlı.

## Yapı

- Statik site: HTML + CSS + vanilla JS. **Derleme adımı, paket yöneticisi yok.**
  Backend yok, veritabanı yok, hiçbir dış servise bağlı değil.
- Bütün içerik `assets/js/data.js` içinde veri olarak duruyor.
- `assets/js/app.js` bu veriyi HTML'e çeviriyor; menü ve alt bilgi de oradan geliyor.
- HTML sayfaları sadece iskelet + `data-*` bağlama noktaları içeriyor.

## Kurallar

- Yeni karakter/güç/kademe eklerken **HTML'e dokunma** — `data.js` yeterli.
- İçerik değişince `LORE.md` ile `data.js` senkron kalmalı.
- Arayüz metinleri **Türkçe**.
- Kod içindeki değişken ve fonksiyon isimleri de Türkçe (mevcut düzene uy).
- **Sitede hiç kullanıcı verisi toplanmıyor.** Form yok, giriş yok, çerez yok.
  Soru-cevap YouTube yorumlarında yapılıyor; site sadece oraya yönlendiriyor.
  Buraya backend eklemeden önce iki kez düşün — sadeliği bilinçli bir tercih.

## Çalışma döngüsü

`.claude/` altında bir iş akışı katmanı var — **siteye ait değil, yayına
çıkmıyor.** Ayrıntı: [`.claude/DONGULER.md`](.claude/DONGULER.md).

- `python3 .claude/dogrula.py` — yukarıdaki kuralları makine tarafından
  denetler (menü, site haritası, gizleme, odak, `defer`, sahte içerik,
  yeni video, kontrast, LORE senkronu). Dış bağımlılığı yok.
  Çıkış kodu `0` temiz, `1` kural ihlali, `3` insan onayı gerekiyor.
- Bir `.html`/`.css`/`.js`/`.xml` ya da `LORE.md` düzenlendiğinde bu denetim
  `.claude/kanca.py` üzerinden kendiliğinden çalışır.
- `python3 .claude/ara.py "<soru>"` — canon içinde arar, cevabı **satır
  numarasıyla** döndürür. Bu evren hakkında hafızadan cevap verme; her
  iddiayı `LORE.md:201` gibi adresle.
- `python3 .claude/sinav.py` ve `python3 .claude/degerlendir.py` —
  denetleyicinin ve aramanın kendisini ölçer.
- `python3 .claude/geri-bildirim.py` — yanlış çıkan bir cevabı kalıcı test
  vakasına çevirir.
- Komutlar: `/dongu` (tam akış), `/planla` (sadece plan), `/sor` (dayanaklı
  cevap), `/denetle` (sadece denetim), `/degerlendir` (sistemin ölçümü),
  `/geri-bildirim` (hatayı teste çevir), `/orkestra` (çok parçalı büyük iş).

Denetleyici kural ihlalini yakalar ama canon'un anlamca tutarlı olduğunu
göremez — içerik değişikliğinde `LORE.md`'yi yine de okumak gerekiyor.
Arama da en yakın parçayı verir, doğru parçayı değil: geleni oku, kabul etme.

## Bekleyen işler

`LORE.md` dosyasının sonundaki "Açık Uçlar" bölümüne bak — irade kademelerinin
son hâli, derebeyi isimleri ve zaman çizelgesi henüz netleşmedi.

## Denetim sonrası eklenen kurallar

Bu kısım dış bir kullanıcı deneyimi denetiminden sonra eklendi.
Aşağıdakiler bilinçli kararlar — "düzeltilecek eksik" değil.

- **Menü artık `app.js` üretmiyor**, her HTML'de yazılı. JavaScript
  yüklenmezse navigasyon kaybolmasın diye. Yeni sayfa eklersen menüyü
  bütün HTML dosyalarında ve `sitemap.xml` içinde güncelle.
- **Sahte içerik yasak.** `VIDEOLAR` boşken ana sayfadaki video bölümleri
  `hidden` kalır. Örnek başlık, "yakında", uydurma bağlantı **üretme** —
  boş bırak, eksik olduğunu rapor et.
- **Gizleme her zaman `hidden` özniteliğiyle** yapılır, `opacity: 0` ile
  değil. Hareket azaltma açıkken `style.css` bütün geçişleri kapatıyor;
  opacity ile gizlenen bir şey bir daha asla görünmez.
  Bu yüzden `[hidden] { display: none !important; }` kuralı var — silme.
- **Renk paleti ölçülerek belirlendi.** `--text-3`, `--kotu-metin` ve
  `--bolge-renk` değerleri WCAG AA (4.5:1) sınırına göre hesaplandı.
  Değiştireceksen önce kontrastı ölç.
- **Odak halkası silinmez.** `outline: none` yazma; `:focus-visible`
  tasarımı bilerek var.
- Betikler `defer` ile yükleniyor (ilk boyama ~%28 hızlandı). Sıra korunur,
  bozma.
