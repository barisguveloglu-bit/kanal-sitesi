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
değil, yayına çıkmıyor.** Ayrıntı: [`.claude/DONGULER.md`](.claude/DONGULER.md).
Sürüm: `python3 .claude/surum.py goster` — işaret: `python3 .claude/logo.py yaz`
(`.claude/marka/` altındaki SVG'ler üretilmiş dosyalar, elle düzenlenmez.)

- `python3 .claude/dogrula.py` — yukarıdaki kuralları makine tarafından
  denetler (menü, site haritası, gizleme, odak, `defer`, sahte içerik,
  yeni video, kontrast, LORE senkronu, belge senkronu).
  Dış bağımlılığı yok.
  Çıkış kodu `0` temiz, `1` kural ihlali, `3` insan onayı gerekiyor.
- Bir `.html`/`.css`/`.js`/`.xml` ya da `LORE.md` düzenlendiğinde bu denetim
  `.claude/kanca.py` üzerinden kendiliğinden çalışır.
- `python3 .claude/ara.py "<soru>"` — canon içinde arar, cevabı **satır
  numarasıyla** döndürür. Bu evren hakkında hafızadan cevap verme; her
  iddiayı `LORE.md:201` gibi adresle.
- `python3 .claude/sinav.py`, `python3 .claude/degerlendir.py` ve
  `python3 .claude/arac-sinavi.py` — sırasıyla denetleyiciyi, aramayı ve
  araçları (kesici, yargıç, geri bildirim, kanca) ölçer.
- `python3 .claude/butunluk.py` — canon ↔ veri ↔ site bütünlüğünü ölçer
  (74 vaka): 81 ilin plakası resmî kodla eşleşiyor mu, aynı derebeyi iki
  ile atanmış mı, `data.js`'teki her isim `LORE.md`'de geçiyor mu, canon'da
  dayanağı olmayan sıralama iddiası var mı. `dogrula.py` kuralları denetler,
  bu sınav gerçekleri. `data.js`'i `okuyucu.py` dış bağımlılık olmadan okur.
- `python3 .claude/eniyile.py tur --halka <ad>` — değerlendirici-optimize
  edici döngü. Denetimi ikili değil **puanlı** çalıştırır, eksikleri geri
  bildirim olarak verir ve **puan artmayınca durur** (kısır tur). İnsan
  kapısını optimize etmeye çalışmaz, insana çıkar.
- `python3 .claude/olay.py tablo` / `defter` — olay döngüsü dağıtıcısı.
  Bütün kancalar buradan geçiyor; hangi olayın hangi işleyiciye gittiği ve
  ne karar verildiği deftere yazılıyor. `settings.json` artık işleyiciyi
  değil dağıtıcıyı çağırıyor.
- `python3 .claude/tirmanma.py komsular|tirman` — tepe tırmanma. Parametre
  komşularını `degerlendir.py`'ye karşı ölçer. Plato, sırt ve **ezber tepe**
  tuzaklarını raporlar; yalıtık tepeyi reddeder ve hiçbir ayarı kendiliğinden
  uygulamaz.
- `python3 .claude/elestirmen.py brief|denetle` — eleştirmen-üretici döngüsü.
  İkinci bir ajan çıktıyı eleştirir; raporu mekanik denetlenir. "KUSUR YOK"
  derken denetleyiciler kusur buluyorsa **lastik damga** sayılır ve reddedilir.
- `python3 .claude/tdd.py kirmizi|yesil|duzenle` — kırmızı-yeşil-düzenle.
  Kırmızı adımı bir kapıdır: şu an geçen bir vakayla TDD başlatılamaz.
  Düzenleme adımı vaka sayısının düşmesine izin vermez.
- `python3 .claude/mutasyon.py` — testlerin kendisini ölçer: aracı kasten
  bozar, sınavın yakalayıp yakalamadığına bakar. Ölü test buradan çıkar.
- `python3 .claude/gorev.py` — alt ajana verilecek sözleşmeli brief üretir
  ve gelen raporun atıflarını denetler. Sözleşmesiz görev `kanca-gorev.py`
  tarafından gönderilmeden engellenir.
- `python3 .claude/havuz.py ekle|kadro|dagit|birlestir` — görev havuzu ve
  **değişken kadro**. Kaç ajan çalışacağını zorluk belirler (1-10), hangi
  görevlerin aynı ajana gideceğini **paylaşılan kaynak** belirler: aynı
  dosyaya dokunan görevler ayrılırsa biri diğerini ezer.
- `.claude/agents/` — yedi denetçi ajan tanımı, hepsi **Sonnet 5** ve
  **salt okunur**. Model çağrıda değil tanımda; `dogrula.py` sapmayı ve
  denetçiye verilmiş yazma aracını yakalar.
- `python3 .claude/disajan.py brief|kapi` — dış ajan (Codex) köprüsü.
  Şef Claude, uzman Codex: brief PR akışına göre yazılır, gelen dal dört
  ölçümden geçer. `.claude/` altına dokunan dal reddedilir; koşmayan kapı
  geçmiş sayılmaz.
- `python3 .claude/hedef.py` — değişmez hedef sözleşmesi ve görev ağacı.
  Hedefin parmak izi alınır; sessiz hedef kayması `kontrol` ile yakalanır.
- `python3 .claude/seyir.py` — uzun koşuların hafızası. `ozet` yeni tura
  kararları ve çözülmemişleri verir, ham tur izini vermez (bağlam çürümesi).
- `python3 .claude/devre.py` — döngülere mekanik tur sınırı koyar (devre
  kesici). Üç sınır: tur sayısı, duvar saati ve ilerleme (tekrar/salınım).
- `python3 .claude/yargi.py` — verilen cevapları altın sete karşı yargılar:
  atıf gerçekten doğru satırı gösteriyor mu, uydurma var mı.
- `python3 .claude/geri-bildirim.py` — yanlış çıkan bir cevabı kalıcı test
  vakasına çevirir. Bir kayıt **koruyan testi adıyla söylenmeden
  kapatılamaz** (`kapat --vaka`); `korumasiz` testsiz kapatılmışları
  listeler. Testsiz kapatılan hata, düzeltilmiş değil ertelenmiş hatadır.
- Komutlar: `/dongu` (tam akış), `/planla` (sadece plan), `/sor` (dayanaklı
  cevap), `/denetle` (sadece denetim), `/degerlendir` (sistemin ölçümü), `/yargila` (cevap kalitesi),
  `/geri-bildirim` (hatayı teste çevir), `/surekli` (sınırlı otonom döngü),
  `/orkestra` (çok parçalı büyük iş).

Bu katman Claude Code'a bağlı: betikler kabuk, kancalar hook sistemi ister.
claude.ai tarafında kullanmak için `.claude/tasima/claude-projesi.md` —
kurallar taşınır, zorlama taşınmaz.

Denetleyici kural ihlalini yakalar ama canon'un anlamca tutarlı olduğunu
göremez — içerik değişikliğinde `LORE.md`'yi yine de okumak gerekiyor.
Arama da en yakın parçayı verir, doğru parçayı değil: geleni oku, kabul etme.

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
