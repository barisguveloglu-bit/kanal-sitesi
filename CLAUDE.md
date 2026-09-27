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

`.claude/` altında **Echo** adlı bir iş akışı katmanı var — **siteye ait
değil, yayına çıkmıyor.** Bu dosya her oturumda baştan sona bağlama
yükleniyor; burada yalnız **her oturumda geçerli kurallar** duruyor.
Her aracın ne yaptığı ve neden var olduğu:
[`.claude/DONGULER.md`](.claude/DONGULER.md) → **Araç dizini**.
Bu dosyanın boyut bütçesi `dogrula.py`'de; aşılırsa ayrıntı oraya taşınır.
Sürüm: `python3 .claude/surum.py goster` — işaret: `python3 .claude/logo.py yaz`
(`.claude/marka/` altındaki SVG'ler üretilmiş dosyalar, elle düzenlenmez.)

**Kapılar.** `python3 .claude/dogrula.py` yukarıdaki kuralları makine
tarafından denetler. Çıkış kodu `0` temiz, `1` kural ihlali, `3` insan
onayı gerekiyor; **0/1/3 dışında bir kod "geçti" sayılmaz.**
`.html`/`.css`/`.js`/`.xml` ya da `LORE.md` düzenlenince kendiliğinden
koşar (`settings.json` → `olay.py dagit` → `kanca.py`); GitHub'da
`.github/workflows/denetim.yml` her push ve PR'da aynılarını koşturur.
Commit'ten önce hepsi: `python3 .claude/kapi.py <dogrula|butunluk|sinav|arac-sinavi|degerlendir>`
— kod 0 dönüp özet basmayan kapı **koşmadı** sayılır. Bütünlük sınavı
canon ↔ veri ↔ site tutarlılığını ölçer (78 vaka).

**Canon hakkında cevap.** `python3 .claude/ara.py "<soru>"` canon içinde
arar ve satır numarası döndürür. Bu evren hakkında **hafızadan cevap
verme**; her iddiayı `LORE.md:201` gibi adresle. Arama en yakın parçayı
verir, doğru parçayı değil: geleni oku, kabul etme.

**Ölçüm katmanı.** Ölçen dosyalara (`bekci.py` listesi) dokunan commit,
mesajında `ÖLÇÜM-DEĞİŞTİ: <gerekçe>` satırı taşır; merge kararı insanın.
Hatayı düzeltmek için testi gevşetme — hata teste çevrilir
(`geri-bildirim.py`, `iz.py`), kural değil.

**Alt ajanlar.** Gönderimden önce `python3 .claude/butce.py ajan`; brief
`gorev.py` ile sözleşmeli yazılır (sözleşmesiz görev kancada engellenir).
`.claude/agents/` altında **22 denetçi + 5 üretici ajan**, hepsi salt
okunur. Model tanımda: Sonnet 5; Opus yalnız `canon-denetci`,
`kurgu-denetci`, `hikaye-yazari`; Haiku yalnız `tarama-denetci`.

**Oturum açılışı.** Ders defteri (`ders.py`), iş ve karar defteri
(`defter.py`) ve zemin denetimi (`duman.py`) kendiliğinden gelir;
okunmadan işe başlanmaz. Yarım kalan iş `defter.py`'ye `yarim` ve devam
noktasıyla yazılır; reddedilen öneri gerekçesiyle. Yeni bir öneriden önce
`defter.py oner "<fikir>"` (çıkış 3: daha önce reddedildi). LORE.md
değişince `etki.py --taban HEAD` bağlı yerleri listeler. Döngüler
`devre.py` ile sınırlıdır — çıkış `1` dur ve insana çık, çıkış `4`
başka bir koşu aynı halkayı tutuyor, turu atla.

**Acil kapatma: `ECHO_KAPALI=1`.** `olay.py` hiçbir işleyiciyi
koşturmaz; sessiz değildir, deftere yazılır. `settings.json`'ın `env`
alanına kalıcı yazma — `dogrula.py` yakalar.

**AGENTS.md.** Dış ajanlar (Codex) bu dosyayı değil `AGENTS.md`'yi
okur. Sitenin değişmez kuralları ve açık işler **ikisinde de** yazılı
olmalı; birinde değişen kural öbüründe de değişir (`dogrula.py`
ortak kural çapalarını iki dosyada arar).

Komutlar: `/dongu` (tam akış), `/planla` (sadece plan), `/sor` (dayanaklı
cevap), `/denetle` (sadece denetim), `/degerlendir` (sistemin ölçümü),
`/yargila` (cevap kalitesi), `/geri-bildirim` (hatayı teste çevir),
`/surekli` (sınırlı otonom döngü), `/orkestra` (çok parçalı büyük iş).

Denetleyici kural ihlalini yakalar ama canon'un anlamca tutarlı olduğunu
göremez — içerik değişikliğinde `LORE.md`'yi yine de okumak gerekiyor.

## Bekleyen işler

`LORE.md` dosyasının sonundaki "Açık Uçlar" bölümüne bak. Şu an açık olanlar:
irade kademelerinin son hâli, Yılmaz sonrası zaman çizelgesi (1730 mu 1731 mi)
ve video bağlantıları.

**Derebeyi isimleri kapandı** — 81 ilin 81'i de dolu, `ad: null` kalmadı.

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
