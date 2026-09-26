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
  kendiliğinden çalışır: `settings.json` → `olay.py dagit` → `kanca.py`.
  Dağıtıcı araya sonradan girdi; kancayı doğrudan çağıran bir yol kalmadı.
- Aynı denetimler **GitHub'da da** koşuyor: `.github/workflows/denetim.yml`
  her push ve PR'da `dogrula`, `butunluk`, `sinav`, `arac-sinavi`,
  `degerlendir` çalıştırır ve koşu sonrası deponun temiz kaldığını doğrular.
  Kanca yerelde, iş akışı sunucuda — biri atlanırsa diğeri yakalar.
  Mutasyon sınavı yavaş olduğu için orada haftalık ve elle tetiklenir.
  Çıkış kodu sözleşmesi orada da geçerli; **0/1/3 dışında bir kod
  "geçti" sayılmaz.**
- `python3 .claude/ara.py "<soru>"` — canon içinde arar, cevabı **satır
  numarasıyla** döndürür. Bu evren hakkında hafızadan cevap verme; her
  iddiayı `LORE.md:201` gibi adresle.
- `python3 .claude/sinav.py`, `python3 .claude/degerlendir.py` ve
  `python3 .claude/arac-sinavi.py` — sırasıyla denetleyiciyi, aramayı ve
  araçları (kesici, yargıç, geri bildirim, kanca) ölçer.
- `python3 .claude/butunluk.py` — canon ↔ veri ↔ site bütünlüğünü ölçer
  (78 vaka): 81 ilin plakası resmî kodla eşleşiyor mu, canon'daki il
  tablosu satır satır `data.js` ile aynı mı, aynı derebeyi iki
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
- `python3 .claude/elestirmen.py brief|denetle|tur` — eleştirmen-aktör döngüsü.
  İkinci bir ajan çıktıyı eleştirir; raporu mekanik denetlenir. "KUSUR YOK"
  derken denetleyiciler kusur buluyorsa **lastik damga** sayılır ve reddedilir.
  `tur` döngünün kendisini sürer: turları sayar ve **aynı yer iki turda arka
  arkaya geliyorsa durur** (çıkış 3) — aktör düzeltmiyor demektir. Nazikçe
  sonsuza dönen döngü, hiç dönmeyenden kötüdür: çalışıyormuş gibi görünür.
- `python3 .claude/ders.py yaz|oku|ara|koru|korumasiz|bayat|tazele|durum` —
  **ders defteri, oturumlar arası hafıza.** `seyir.jsonl` koşuya özel ve
  `.gitignore`'da; oturum bitince ders kayboluyordu. `dersler.jsonl`
  **kalıcı ve depoda.** Her ders bir `koruma` taşır (onu engelleyen test);
  korumasız dersler sayılır. Defter **oturum açılışında kendiliğinden
  yüzeye çıkar** — `SessionStart` → `olay.py` → `kanca-ders.py`.
  Okunmasını hatırlamaya bırakmak, kuralı yazıya bırakmaktır.
  Koruma **serbest metin olamaz**, iki doğrulanabilir biçimden biridir:
  `vaka:<sınav vakası adı>` ya da `dosya:<yol>#<çapa metni>` — `evrim.py`
  ile aynı disiplin. Ölçüldü: 11 korumanın 5'i var olmayan bir şeyi
  gösteriyordu ve defter hepsini korumalı sayıyordu. Korumanın **içeriği
  de özetlenip saklanır**; vakanın adı durup iddiası boşaltılırsa `bayat`
  bunu **kaymış koruma** olarak bildirir (`tazele` bilerek değişeni
  onaylar). Bir dersi başka bir korumaya bağlamak **`--degistir` ister**:
  aynı kayıt farklı içerikle iki kez yazılırsa hangisinin doğru olduğu
  bilinemez.
- `python3 .claude/tdd.py kirmizi|yesil|duzenle` — kırmızı-yeşil-düzenle.
  Kırmızı adımı bir kapıdır: şu an geçen bir vakayla TDD başlatılamaz.
  Düzenleme adımı vaka sayısının düşmesine izin vermez.
- `python3 .claude/mutasyon.py` — testlerin kendisini ölçer: aracı kasten
  bozar, sınavın yakalayıp yakalamadığına bakar. Ölü test buradan çıkar.
- `python3 .claude/bekci.py --taban <ref>` — **ölçüm katmanı bekçisi.**
  Fay enjeksiyonu, mutasyon ve TDD kapısı denetleyicinin gücünü ölçüyor;
  hiçbiri ajanın **denetleyiciyi kendisi değiştirerek geçmesini**
  engellemiyordu. Ölçüm dosyalarına dokunmak yasak değil, **beyansız**
  dokunmak yasak: commit mesajında `ÖLÇÜM-DEĞİŞTİ: <gerekçe>` satırı
  olmalı. Kilit dosyası değil **taban commit'i** çapa — kilidi yazabilen
  kilidi de açar, ama dalı ajan yazar, tabanı insan merge eder. Ölçüm
  listesi de tabandan okunur ve yerel listeyle **birleştirilir**: dosya
  eklemek hemen etkili, çıkarmak insan kararı. Çıkış `0` dokunulmamış,
  `1` beyansız, `3` beyanlı (insan kapısı).
- `python3 .claude/golge.py kos|durum|ekle|terfi|indir` — **gölge modu**
  (Beyin V3'ün `jev shadow` → `jev on` sırası). Yeni bir kapı önce
  **gölgede** koşar: kararını hesaplar ve kaydeder ama kimseyi durdurmaz.
  Bir günde eklenen üç araç (`iz`, `ablasyon`, `bekci`) ilk gerçek
  kullanımda kendi kusurunu gösterdi; o an kapı olsalardı yanlış yeşil
  geçireceklerdi. `ekle` **her zaman gölge** ekler — deneme süresi
  atlanabilir olsaydı atlanırdı. `terfi` en az 5 kayıtlı koşu ve **sıfır
  "koşmadı"** ister: kod 0 dönüp özet desenini basmayan kapı temiz değil
  koşmadı sayılır. Terfi ve indirme `golge.json`'ı değiştirir, o dosya
  bekçinin listesinde — yani `ÖLÇÜM-DEĞİŞTİ` beyanı ve insan merge'ü ister.
  CI `kos`'u `--kaydet` olmadan koşar (depo temiz kalmalı); kanıt yerelde
  birikir.
- **Acil kapatma anahtarı: `ECHO_KAPALI=1`** (Beyin V3'ün
  `BEYIN_JEV_DISABLE` fikri). Ortam değişkeni açıkken `olay.py` hiçbir
  işleyiciyi koşturmaz — ders defteri, zemin denetimi, düzenleme denetimi
  ve alt ajan sözleşmesi dahil. Kayıtlı hiçbir ayarı değiştirmez;
  kaldırılınca her şey eski hâline döner. Bir kanca bozulursa telefondan
  hızlı kapatmak için. **Sessiz değil:** atlanan her olay deftere yazılır,
  oturum açılışında `ECHO KAPALI` satırı basılır, `olay.py tablo` uyarır.
  `settings.json`'ın `env` alanına kalıcı yazılırsa Echo her oturumda
  sessizce ölür — ve bunu fark edecek kancalar da kapalıdır; bu yüzden
  `dogrula.py` onu dışarıdan yakalar.
- `python3 .claude/kapi.py <kapı>` — **kapı sarmalayıcısı.** Kapıyı
  koşturur ve özet satırını arar; kod 0 dönüp özet basmayan kapı **2
  (koşmadı)** sayılır. 23. ders (çıkış kodu 0 iş yapıldı demek değil)
  ablasyona uygulanmış, duman ve CI'a uygulanmamıştı: ölü bir bütünlük
  sınavına ikisi de "tutarlı" diyordu. Desenler başarıyı VE başarısızlığı
  kapsar, TEK yerde durur; duman da CI da buradan okur.
- `python3 .claude/duman.py` — **oturum başı zemin denetimi.** CI işin
  sonunda, kanca dosya düzenlendiğinde koşuyor; ikisi de *bu oturumda*
  yapılanı denetliyor. İki oturum arası dışarıdan giren bir düzenleme
  (telefondan GitHub web arayüzü, başka oturumun yarım işi) hiçbirini
  tetiklemiyordu. `SessionStart` → `olay.py` → `kanca-duman.py` ile
  kendiliğinden koşar (~0,4 sn), **oturumu engellemez** — kırmızıysa
  söyler, durdurma kararı okuyanın. Kapsamı CI'den dar (fay enjeksiyonu
  ve araç sınavı burada koşmaz); bu eksiklik değil, hız tercihi.
  Ayrıca **sahipsiz worktree**'leri sayar ve açılışta söyler (kapı değil
  uyarı, hiçbirini silmez — içinde merge edilmemiş iş olabilir). "git
  worktree sızdırır" dersi bununla korumalı hâle geldi.
- `python3 .claude/ozellik.py` — **özellik sınavı.** Elle yazılmış vakalar
  yalnızca akla gelen durumu korur. Burada örnek değil **kural** yazılır
  ("okunan, yazılanın aynısı olmalı") ve üretilen yüzlerce girdide
  denenir; karşı-örnek **küçültülür** (okunabilir olsun diye). Tohum
  basılır — tekrar üretilemeyen kırmızı, düzeltildiği doğrulanamayan
  kırmızıdır. İlk koşusunda gerçek bir kusur buldu: `ara.py` son parçanın
  adresini dosyanın son satırından bir sonrası olarak veriyordu, yani var
  olmayan bir satıra atıf. **CI'de kapı değil uyarı** — ölçülmüş yanlış
  alarm oranı yüksek, yanlış alarmla kapı kapatmak kapıyı görmezden
  gelmeyi öğretir.
- `python3 .claude/ablasyon.py --halka <ad>|tara` — **halka ablasyonu.**
  Mutasyonun kardeşi, ters yönde: mutasyon *aracı bozar, sınav
  yakalamalı*; ablasyon *aracı kaldırır, sınav düşmeli*. Kaldırılınca
  hiçbir vaka düşmüyorsa o halkayı **hiçbir şey sınamıyor** demektir —
  kötü olduğu değil, ölçülmediği anlamına gelir. Büyüyen bir sistemde
  küçültme mekanizması olmaması tören biriktirmenin garantisidir.
  **Hiçbir halkayı silmez** (çıkış 3, insan kapısı): kanıtsızlık aracın
  değil sınavın kusuru olabilir, ve kendi kendini budayan bir araç en
  zayıf halkayı değil **en az sınanmış** halkayı silerdi. Mutasyon gibi
  yavaş — haftalık ve elle.
- `python3 .claude/iz.py yaz|kume|oner|kuyruk|coken|kapat|durum` — **koşular
  arası hata analizi.** Her halka kendi turuna bakıyordu; hiçbiri "bu aynı
  hata üç ayrı koşuda dört kez oldu" diyemiyordu. `iz-defteri.jsonl`
  **kalıcı ve depoda** — ham iz değil, hata şekli. İki kümeleme var:
  **yer kümesi** kimliğini adresten alır (sağlam), **şekil kümesi**
  kelimeden alır ve bu yüzden insan kapısına çıkar (çıkış 3). `oner`
  tekrar eden ve hiçbir kapının yakalamadığı hataları gösterir ama
  **hiçbir kuralı, ayarı ya da prompt'u değiştirmez** — önerilebilecek
  şey kural değil TEST: yanlış bir test kırmızı yanar, yanlış bir kural
  sessizce yanlış şeyi savunmaya başlar. Bir iz, onu yakalayan vakanın
  **adıyla** kapanır ve ad gerçekten var olmalı (`ders.py`'nin çözücüsü);
  `coken` karşılığı sonradan silinen ya da içi boşaltılanı yakalar.
- `python3 .claude/rapor.py al|liste|ara|bulgular|ortak|parca|unut` —
  **ajan raporlarını pencereye yüklemeden sorgulama.** 26 ajan koşunca
  raporları kabuktan okumak bağlamı taşırıyordu; yasak doğruydu ama
  yerine bir şey konmamıştı. `okuyucu.py` ve `ara.py` ile aynı ilke —
  veri dış ortamda kalır, programlı sorgulanır — artı **özyineleme**:
  `parca` büyük raporu kararlı parçalara böler, model tamamını görmez.
  `al` içeriği **basmaz**, yalnızca ölçü basar. Serbest özet yok, dönen
  şey adresli satır. `ortak` birden fazla raporun gösterdiği adresi
  önceliklendirir ama bunun kanıt olmadığını söyler: aynı modelin N
  kopyası aynı kör noktayı paylaşır. Depo (`rapor-deposu/`) koşuya özel
  ve `.gitignore`'da.
- `python3 .claude/pano.py al|not|oku|bitir|temizle` — **ortak pano.**
  `havuz.py` işi başta bölüyor ama iş sırasında paralel ajanlar birbirini
  göremiyordu. Her ajan baktığı alanı panoya yazar; başkası o alanı
  tutuyorsa `al` çıkış 1 verir, üstüne gidilmez. Çakışma kelimeyle değil
  **adresle** ölçülür: aynı yol ya da biri diğerinin altı. Pano koşuya
  özel ve `.gitignore`'da; salt okunur ajanlar da yazabilir, depo değişmez.
- `python3 .claude/gorev.py` — alt ajana verilecek sözleşmeli brief üretir
  ve gelen raporun atıflarını denetler. Sözleşmesiz görev `kanca-gorev.py`
  tarafından gönderilmeden engellenir.
- `python3 .claude/havuz.py ekle|kadro|dagit|birlestir` — görev havuzu ve
  **değişken kadro**. Kaç ajan çalışacağını zorluk belirler (1-10), hangi
  görevlerin aynı ajana gideceğini **paylaşılan kaynak** belirler: aynı
  dosyaya dokunan görevler ayrılırsa biri diğerini ezer.
- `.claude/agents/` — **22 denetçi + 5 üretici ajan** tanımı, hepsi
  **salt okunur**. Denetçi bulur ve düzeltmez; üretici üretir ama canon'a
  kural koyamaz. Kadro **Sonnet 5**, üç istisna dışında: `canon-denetci`,
  `kurgu-denetci` ve `hikaye-yazari` **Opus**. Toplu, yargısız tarama için `tarama-denetci` **Haiku** (ucuz katman, `HAIKU_HAKKI` listesinde). Hak üçle sınırlı ve liste
  `dogrula.py`'de yazılı — dördüncüsü reddedilir, listedekilerden biri
  Sonnet'e düşerse o da yakalanır. Model çağrıda değil tanımda; `dogrula.py`
  hem model sapmasını, hem denetçiye verilmiş yazma aracını, hem de kadro
  sayısının belgeyle ayrışmasını yakalar.
- `python3 .claude/evrim.py baslat|alanlar|eksik|kapat|durum` — **evrim
  döngüsü.** Girilen işe göre Echo'nun kendini yenilemesi. Her iş alanı
  için gereken yetenekler tabloda yazılı; alana girildiğinde eksikler
  hesaplanır. **Bilinmeyen alan insan kapısına çıkar** (çıkış 3) — hangi
  yeteneklerin gerektiğini makine bilemez. Bir boşluk, onu kapatan
  ajanın/aracın **adıyla** kapatılır ve o ad **gerçekten var olmalı**;
  "hallettim" reddedilir. Kapanışın karşılığı sonradan silinirse
  `dogrula.py` bunu **çöken kapanış** olarak yakalar — evrim de çürür.
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
  Artı **çakışma kilidi**: her halka bir sahip (oturum kimliği) taşır;
  önceki koşu kendi süre bütçesi içindeyken başka bir koşu aynı halkada
  `dene` derse **çıkış 4** alır ve durum dosyasına dokunulmaz — turu
  atlar. Dışarıda gözlendi: turu aralıktan uzun süren zamanlanmış döngü
  kendi üstüne biniyor, iki koşu aynı alana giriyordu.
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
- `python3 .claude/butce.py ac|ajan|kilometre|devam|durum|kapat` — koşu
  bütçesi, vites ve kilometre taşları. Ajan gönderiminden **önce**
  `ajan` çağrılır; bütçe bittiyse **reddeder** (koşunun ortasında
  limite çarpıp ajanların düşmesi iki kez yaşandı). Bütçenin %30'u
  kalınca **vites küçültme** uyarısı verir — kapı değil uyarı.
  `kilometre` devam noktası bırakır; yarım kalan iş `--zorla` olmadan
  kapatılamaz. Token sayamaz (buradan görünmüyor), ajan ve süre sayar.
- `python3 .claude/evrim.py dongu --is "<iş>"` — **uyarlanabilir döngü
  seçimi.** İşin şekline göre hangi halkaların anlamlı olduğunu söyler.
  Eşleşme kaba bir anahtar kelime yöntemi; zayıf eşleşmede tahmin
  yürütmez, insan kapısına çıkar (çıkış 3).
- `python3 .claude/ders.py ozetle` — **bellek pekiştirme.** Koşu
  defterinden ders adayı ayıklar. Otomatik yazmaz: bir koşu kaydı ile
  gelecekteki koşulara ait genel bir kural aynı şey değildir.
