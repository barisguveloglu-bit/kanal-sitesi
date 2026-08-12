# Döngü Sistemleri

Bu klasör siteye ait değil. Site hâlâ derleme adımı olmayan, backend'siz,
veri toplamayan statik bir arşiv — **buradaki hiçbir şey yayına çıkmıyor.**
Bu katman sadece *site üzerinde çalışırken* kullanılan iş akışı.

## Neden iç içe, yan yana değil

Döngüler birbirinin alternatifi değil. Farklı yüksekliklerde duruyorlar,
bu yüzden birleşebiliyorlar:

```
                    ┌──────────────────────────────────────────┐
                    │  DIŞ HALKA — Değerlendirme + Geri Bildirim│
                    │  sistemin kendisini ölçer ve öğretir      │
                    └───────────────┬──────────────────────────┘
                                    │ ölçüm düşerse / hata kaydedilirse
   ┌────────────────────────────────▼──────────────────────────┐
   │                                                            │
KAT 0   İnsan onayı          eşikte durur, karar Barış'ta       │
   │                                                            │
KAT 1   Orkestratör          işi uzmanlara böler, birleştirir   │
   │                         eksik kalırsa yeniden görev verir  │
KAT 2   Planla-Uygula        alt görevler + plana sadakat       │
   │                                                            │
KAT 3   ReAct                oku → uygula → gözlemle → karar    │
   │     └─ GERİ GETİRME     gözlem artık kanıtlı: ara.py       │
   │                                                            │
KAT 4   Yansıt-İyileştir     dogrula.py'ye test ettir           │
   │                                                            │
   └────────────────────────────────────────────────────────────┘

   Bütün katları saran mekanik sınır:  DEVRE KESİCİ (devre.py)
   Kapıya bağlı uzun soluklu koşu:     SINIRLI DÖNGÜ (/surekli)
```

Okuma yönü şöyle: orkestratör bir parçayı bir uzmana verir; uzman o parça
için **kendi** planını çıkarır; plandaki her adımı ReAct turuyla yürütür;
her adımın sonunda çıktı denetleyiciden geçer; denetleyicinin çözemediği
ya da canon'a dokunan bir şey çıkarsa KAT 0'a, yani sana çıkar.

Dış halka bu akışın **içinde** değil, **etrafında** durur. İç döngüler
"bu iş doğru mu?" diye sorar; dış halka "bu döngüler hâlâ çalışıyor mu?"
diye sorar. İkisi karıştırılırsa ölçüm, ölçtüğü şeyin parçası olur.

Kritik ayrım — orkestratör tek seferde dağıtıp toplarsa bu bir **iş akışı**
olur. Gelen sonuçtaki eksiğe göre yeniden görev veriyorsa **döngü** olur.
`/orkestra` 4. adımda bunu zorunlu tutuyor.

## Döngünün durduğu yer

Her döngünün bir çıkış koşulu var, yoksa sonsuza kadar döner:

| Döngü | Durma koşulu | Sınır nasıl uygulanıyor |
|---|---|---|
| Yansıt-İyileştir | Denetim temiz ya da 3 tur doldu | **Mekanik** — `devre.py` + kanca |
| Orkestratör | Boşluk kalmadı ya da 2 kez yeniden gönderildi | **Mekanik** — `devre.py` |
| Sınırlı döngü | Kapı yeşil ya da 8 tur doldu | **Mekanik** — `devre.py` |
| Planla-Uygula | Plandaki alt görevler bitti | Plan listesi |
| ReAct | Gözlem planı doğruladı | Gözlemin kendisi |
| İnsan onayı | Cevap geldi | İnsan |

Tur sınırları keyfi değil: üçüncü turda hâlâ çözülemeyen şey genelde
kodda değil, kararda eksiktir — orada insana çıkmak doğrusu.

"Mekanik" kelimesi burada önemli. Sınır komut dosyasında yazı olarak
dururken model onu konuşarak geçebiliyordu; sayaç dosyaya taşınınca
geçemez oldu.

## Yansıtma katmanı gerçek mi

Yapay zekanın kendi işini beğenmesi denetim değildir. Bu yüzden KAT 4
harici bir kural setine dayanıyor: `.claude/dogrula.py`.

Betik `CLAUDE.md`'de yazılı olan kararları ölçülebilir hâle getiriyor —
dışa bağımlılığı yok, sadece Python 3 standart kütüphanesi:

| Denetim | Ne bakar |
|---|---|
| `menu` | Menü her HTML'de yazılı mı, bağlantı eksik mi (JS'siz navigasyon) |
| `harita` | `sitemap.xml` eksiksiz mi; `gizli.html` haritaya sızmış mı |
| `gizleme` | `[hidden]` kuralı duruyor mu; JS'te `opacity = 0` ile gizleme var mı |
| `odak` | `outline: none` yazılmış mı (`:focus-visible` hariç) |
| `defer` | Dış betikler `defer` ile mi yükleniyor, `async` sırayı bozuyor mu |
| `sahte` | Biçimi bozuk video kimliği, "yakında" başlığı, YouTube olmayan bağlantı |
| `video` | `VIDEOLAR`'a HEAD'de olmayan kimlik girdi mi → **insan kapısı** |
| `kontrast` | Renk çiftlerini WCAG AA (4.5:1) sınırına karşı **ölçer** |
| `lore` | `data.js`'teki adlar `LORE.md`'de geçiyor mu |
| `belge` | Bu belgedeki sayılar betiklerin gerçeğiyle uyuşuyor mu |

```
python3 .claude/dogrula.py            # hepsi
python3 .claude/dogrula.py kontrast   # tek başlık
python3 .claude/dogrula.py --kisa     # sadece hatalar
```

Çıkış kodu üç değer alır: `0` temiz, `1` kural ihlali, `3` insan kapısı.
Üçüncüsü ayrı olmak zorunda — çünkü "yanlış" değil, "doğruluğunu
bilemiyorum" demek. Ona düzeltme uygulanmaz, soru sorulur.

**Denetleyicinin kendi sınavı var:** `python3 .claude/sinav.py` deponun
geçici bir kopyasına tek tek fay enjekte eder (yanlış menü bağlantısı,
silinmiş `[hidden]` kuralı, düşürülmüş kontrast, uydurma karakter…) ve her
birinin yakalandığını doğrular. Yanına masum vakalar koyar — yorum içindeki
`outline: none`, SVG dizesindeki `opacity="0"` gibi — bunların **yanlış
alarm üretmediğini** ölçer. Denetleyiciye kural eklersen sınava da vaka ekle;
yakalamayan denetim, yakaladığını sanmaktan kötüdür.

`.claude/kanca.py` bunu otomatikleştiriyor: bir `.html`, `.css`, `.js`,
`.xml` ya da `LORE.md` her düzenlendiğinde denetim kendiliğinden koşuyor
ve hata varsa sonuç Claude'a geri besleniyor. Yani iyileştirme turu
sen fark etmeden aynı turda başlıyor. `.claude/` içindeki düzenlemeler
kancayı tetiklemez.

Betiğin **göremediği** şey: canon'un anlamca tutarlı olup olmadığı.
Adların iki dosyada da geçtiğini görür, aynı şeyi söylediklerini göremez.
O kısım hâlâ okumakla oluyor.

## Geri getirme (RAG) — gözlemin kanıtlanması

`LORE.md` 437 satır ve büyüyor. Asıl mesele hız değil **dayanak**:
hafızadan cevap veren bir model uydurur, dosyadan alıntı yapan uyduramaz.

`ara.py` canon'u parçalara ayırıp soruya en yakınlarını **satır numarasıyla**
döndürür. Böylece her canon iddiası `LORE.md:201` gibi kontrol edilebilir
bir adrese bağlanır.

```
python3 .claude/ara.py "Teşup'un zaafı ne"
python3 .claude/ara.py --sayi 5 --tam "Konya derebeyi"
```

Gömme, vektör veritabanı, dış servis **yok** — 437 satırlık Türkçe bir metin
için BM25 fazlasıyla yeterli ve her koşuda aynı sonucu verir. Test edilebilir
olmasının şartı bu: rastgele bir sistem ölçülemez.

Türkçe için üç şey özel olarak yapıldı, üçü de ölçümle bulundu:

- **Sondan eklemeli dil.** "iradesi / iradeye / irade" aynı köke inmeli;
  ön ek eşleştirmesiyle çözüldü.
- **Sayı adları.** "dördüncü irade kademesi" ile `| 4 | Güçlü İrade |`
  arasında tek ortak harf yok; sayı adları rakama indirgeniyor.
- **Tablo hücreleri sütun adıyla eşleşiyor.** "Zaafı" kelimesi veri
  satırında geçmez, başlıktadır. Eşleştirilmezse hiçbir zaaf sorusu
  cevaplanamaz.

## Değerlendirme (eval) — ölçmediğin şey çalışmıyordur

Üç ayrı ölçüm var, üçü ayrı şeyi ölçüyor:

```
python3 .claude/sinav.py          # denetleyici gerçekten yakalıyor mu
python3 .claude/degerlendir.py    # geri getirme doğru yeri buluyor mu
python3 .claude/arac-sinavi.py    # kesici, yargıç, geri bildirim, kanca çalışıyor mu
```

Üçüncüsü sonradan eklendi ve eklenme sebebi öğreticiydi: devre kesici,
yargıç ve geri bildirim elle denenmişti ve çalışıyordu. Ama elle yapılan
deneme buharlaşır — bir sonraki değişiklikte kimse tekrar denemez.
Ölçülmeyen bir güvenlik mekanizması, çalıştığı *sanılan* bir güvenlik
mekanizmasıdır. Nitekim ölçmeye başlayınca üç gerçek açık çıktı
(aşağıda, Sınırlar bölümünde).

`degerlendir.py` cevaplanamayan soruları **iki sınıfta** ölçer, çünkü doğru
davranışları farklı:

- **Konu dışı** ("kuantum dolanıklık") → hiçbir şey döndürmemeli.
- **Cevapsız** ("Barış'ın kız kardeşi kim") → dayanak dönebilir! Aile
  bölümünü getirmesi *doğrudur*, bakılacak yer orasıdır. Orada kız kardeş
  olmadığını görmek okuma işi, arama işi değil. Ölçülen şey "bir şey
  döndürme" değil: **sorulan uydurma şeyi içeren metin döndürmemek.**

Güvenlik özelliği "her zaman bul" değil, **"asla sahte delil üretme"**.

"Bilmiyorum" diyebilmek puanla değil **söz dağarıyla** ölçülüyor: sorgudaki
kelimelerin yarısından azı canon'da geçmiyorsa arama boş döner. Puan eşiği
denendi ve bırakıldı — gerçek sorularla konu dışı sorular arasında iki
parmaklık bir aralık kalıyordu ve puanlamada yapılan her değişiklikte
sessizce bozuluyordu. Nitekim bozuldu da: puanlama yapısal olarak
düzeltilince "Ahriman kimi kilitliyor" gibi canon'da açıkça cevabı olan bir
soru reddedilir hâle geldi. Söz dağarı ölçütü aynı sette iki kat boşluk
veriyor ve puanlamadan bağımsız.

Eşikler ölçülerek konuldu, hedef olarak değil. Düşen bir sayıyı eşiği
indirerek yeşile döndürmek, testin ölçtüğü şeyi azaltmaktır.

## Geri bildirim — hatanın kalıcı teste dönüşmesi

Model ağırlıklarını eğitemeyiz; gerek de yok. Bir ajan sisteminde geri
bildirim döngüsünün gerçek karşılığı şudur: **her gerçek hata kalıcı bir
teste dönüşür.** Aynı hatayı iki kez yapmak imkânsız hâle gelir.

```
çıktı → yargı (yanlıştı) → kayıt → altın sete vaka → ölçüm → düzeltme
  ↑                                                            │
  └────────────────────────────────────────────────────────────┘
```

```
python3 .claude/geri-bildirim.py ekle --tur geri-getirme \
    --soru "..." --yanlis "..." --dogru "..." --kaynak LORE.md:201
python3 .claude/geri-bildirim.py isle        # altın sete vaka olur
python3 .claude/degerlendir.py               # yeni vaka kırmızı çıkar — doğrusu bu
```

Kayıtlar `.claude/geri-bildirim.jsonl` içinde, git'te duruyor. Öğrenen taraf
model değil sistem; sistemin hafızası depoda olduğu için **yeni bir sohbet
açtığında da orada.** Unutmayan taraf burasıdır.

`canon`, `kural` ve `davranis` kayıtları otomatiğe çevrilmez — `LORE.md`'ye
ne yazılacağı Barış'ın kararı, yeni denetim kuralı ise yazılması gereken kod.

## Devre kesici — sınırın yazı olmaktan çıkması

Komut dosyalarında "en fazla 3 tur" yazıyordu. Bu bir sınır değil, bir
ricaydı: sınırı uygulayacak olan, sınırı aşmak isteyen tarafın kendisi.
Model üçüncü turda "bu sefer gerçekten çözeceğim" deyip devam edebilir ve
bunu fark eden kimse olmaz.

`devre.py` sayacı dosyada tutar. Model kendi sayacını unutabilir, bağlamı
sıfırlanabilir, kendini ikna edebilir — dosya bunların hiçbirinden
etkilenmez. Kesici bu yüzden sürecin dışında yaşıyor.

```
python3 .claude/devre.py dene --halka duzeltme --sinir 3 --not "ne denenecek"
python3 .claude/devre.py basari --halka duzeltme     # iş bitti
python3 .claude/devre.py durum                       # nerede kalmıştım
```

Kancaya da bağlı: bir düzenleme turunda denetim üst üste üç kez düşerse
kanca "DEVRE KESİLDİ" mesajı basar. Yani sınır komut dosyasını okumayan
bir akışta bile geçerli.

İki tasarım ayrıntısı önemli:

- **Bayat sayaç kendini sıfırlar** (6 saat). Kesici bir ceza değil fren;
  dünkü bir başarısızlık bugünkü işi kilitlememeli.
- **Defter bağlam şişmesine karşı.** Her tur tek satır yazılır. Amaç arşiv
  değil *unutabilmek*: model geçmişi bağlamında taşımak yerine `durum`
  komutuyla okur.

## Sınırlı otonom döngü (Ralph Wiggum)

`/surekli` uzun soluklu, kendi kendine dönen döngü. Diğerlerinden iki farkı
var: durma koşulu bir insanın kanaati değil **deterministik kapı**
(`dogrula` + `sinav` + `degerlendir` aynı anda yeşil), ve her turda hafıza
kasten boşaltılır.

Üç kısıtı da isteğe bağlı değil: kapı gevşetilemez (eşik indirerek yeşile
ulaşmak döngüyü tamamlamak değil ölçüyü yok etmektir), devre kesici bağlıdır,
ve her turda tek iş yapılıp ayrıntısı unutulur.

Meşru durma sebebi üç tane: bütün kapılar yeşil, devre kesildi, insan
kapısı. Dördüncüsü — "çözemedim ama devam ediyorum" — yok.

## Cevap yargısı (LLM-as-judge)

`degerlendir.py` aramayı ölçer, `yargi.py` **cevabı** ölçer. Doğru bölümü
getirip yine de yanlış okumak, fazla iddia etmek ya da canon'un sustuğu
yerde konuşmak mümkün — ve bunu daha önce hiçbir şey yakalamıyordu.

Yargı ikiye bölündü, çünkü bir modelin kendi cevabını beğenmesi bu
sistemin en baştan kaçtığı tuzak:

- **Mekanik yarı** (`yargi.py`) oynanamaz. Atıf gerçekten cevabın geçtiği
  satırı gösteriyor mu, altın gerçek cevapta geçiyor mu, canon'un sustuğu
  soruda reddedildi mi, ve en önemlisi: **uydurma var mı.** Uydurma sayısı
  sıfır olmak zorunda — pazarlık yok.
- **Nitel yarı** (LLM, `/yargila` komutu) mekaniğin göremediğine bakar:
  cevap soruyu karşılıyor mu, fazla iddia var mı, spoiler kaçmış mı.

Üç ayırma kuralı zorunlu: cevaplayan altın gerçekleri görmez, cevaplayan
ayrı bir bağlamda (alt ajan) çalışır, ve mekanik yargı nitel yargıdan önce
gelir. Aynı oturumda cevaplayıp kendini puanlamak ölçüm değildir.

Koşular `.claude/yargi-gecmisi.jsonl` içinde birikir; `gecmis` komutu iki
koşu arasındaki gerilemeyi söyler.

## Bağlantı haritası — hangi döngü neye bağlı

Hiçbir döngü tek başına durmuyor. Her birinin bir **girdisi**, bir
**dayanağı** ve bir **çıkışı** var:

| Döngü | Nerede | Neye dayanıyor | Bittiğinde nereye bağlanıyor |
|---|---|---|---|
| Planla-Uygula | `/planla`, `/dongu` KAT 2 | Görev listesi | Her adımı ReAct'e verir |
| ReAct | `/dongu` KAT 3 | **Geri getirme** (`ara.py`) | Çıktıyı Yansıtma'ya verir |
| Geri getirme | `ara.py` | `LORE.md` + `data.js` | ReAct'in gözlemini adresler; `/sor`'u besler |
| Yansıt-İyileştir | `dogrula.py` + `kanca.py` | Harici kural seti | Kırmızıysa ReAct'e geri döner |
| Devre kesici | `devre.py` | Dosyadaki sayaç | Sınır dolunca **İnsan onayına** çıkar |
| İnsan onayı | Eşikler + çıkış kodu `3` | Barış'ın kararı | Kararı Planla-Uygula'ya geri verir |
| Orkestratör | `/orkestra` | Uzman ajanlar | Boşluk varsa yeni görev; kesiciyle bağlı |
| Sınırlı döngü | `/surekli` | Deterministik kapı (3 betik) | Kesici veya insan kapısı durdurur |
| Değerlendirme | `sinav.py`, `degerlendir.py`, `arac-sinavi.py` | Altın set + fay enjeksiyonu | Düşen ölçü → düzeltme işi doğurur |
| Cevap yargısı | `yargi.py` + `/yargila` | Altın set + atıf doğrulama | Kusur → geri bildirime yazılır |
| Geri bildirim | `geri-bildirim.py` | Barış'ın düzeltmeleri | Altın seti büyütür → değerlendirmeye döner |

Halkanın kapandığı yer sonuncusu: geri bildirim altın seti büyütür, altın
set değerlendirmeyi besler, değerlendirme gerilemeyi yakalar, gerileme
düzeltme işi doğurur, düzeltme yine bu döngülerden geçer.

## Komutlar

| Komut | Ne yapar | Ne zaman |
|---|---|---|
| `/dongu <hedef>` | Beş katın hepsi | Normal iş — varsayılan giriş |
| `/planla <hedef>` | Sadece plan, dosyaya dokunmaz | Önce ne olacağını görmek istediğinde |
| `/sor <soru>` | Dayanaklı canon cevabı | "Bu evrende şu nasıldı?" |
| `/denetle [düzelt]` | Sadece KAT 4 | "Bir şey bozuldu mu?" |
| `/degerlendir` | Dış halka ölçümü | Değişiklikten sonra, ayda bir |
| `/geri-bildirim <ne yanlıştı>` | Hatayı teste çevirir | Bir cevap yanlış çıktığında |
| `/yargila` | Cevap kalitesi yargısı | Canon cevaplarına güven ölçmek |
| `/surekli <hedef>` | Sınırlı otonom döngü | Kapı yeşerene kadar dönmesi gereken uzun iş |
| `/orkestra <hedef>` | KAT 1 + altı | 3+ bağımsız parça, farklı uzmanlıklar |

## İki cihazdan kullanım (tablet + telefon)

Bilgisayar gerekmiyor. Oturumlar senin makinende değil, bulutta çalışıyor
ve hesaba bağlı — tablet ile telefon aynı Gmail'de olduğu için **ikisi de
aynı oturum listesini görüyor.** Tablette başlattığın işi telefondan
açıp devam ettirebilirsin; iş sen bakmasan da sürer.

Bunun pratikteki karşılığı:

- **Uzun işi tablette başlat.** Ekranı kapatabilirsin, oturum devam eder.
- **Onayları telefondan ver.** KAT 0 durduğunda soru dokunmatik şıklarla
  gelir. Komutlar bu yüzden "en fazla 4 seçenek, kısa etiket, tek soru"
  kuralına bağlı — telefonda uzun metin okunmuyor.
- **`/planla` küçük ekranın arkadaşı.** Önce planı gör, onayla, sonra
  `/dongu` ile uygulat. Yanlış giden işi telefondan geri almak zor.
- **Konteyner geçici.** Oturum bir süre sessiz kalırsa kapanır ve
  commit edilmemiş her şey gider. İş biter bitmez commit + push iste.

### Zamanlanmış çalıştırma

Sen hiç bakmadan çalışması gereken bir iş varsa (örneğin haftada bir
denetim turu) Routine kurulabilir — belirli aralıkla kendi başına açılıp
verdiğin komutu çalıştırır, sonucu bildirir. Kurulmadı; istersen kurarız.

## Sınırlar

Bunlar tahmin değil, fay enjeksiyon sınavıyla ölçüldü: **28 vaka
(22 yakalanmalı, 6 masum)** ve **20 altın soru**. Bu sayılar `dogrula.py`
tarafından denetleniyor — betikler değişip belge yerinde kalırsa hata verir.
Ölçülen iki gerçek açık vardı, ikisi de kapatıldı — biri tam olarak
kapanamadı, aşağıda:

- **Denetleyici doğruyu uydurmadan ayıramaz.** `"aB3dEf7hK9m"` kurallara
  tamamen uygun bir YouTube kimliğidir ve tamamen uydurma olabilir.
  Çevrimdışı bir betik bunu asla çözemez. Çözüm doğrulama değil, kapı:
  `VIDEOLAR`'a yeni giren her kimlik insan onayına takılır (çıkış kodu `3`).
  Yani sahte içerik **engellenmiyor, görünür kılınıyor.**
- Denetleyici kural ihlalini yakalar, **iyi fikri kötü fikirden ayıramaz.**
- `lore` denetimi adların iki dosyada da geçtiğini görür, aynı şeyi
  söylediklerini göremez. Canon tutarlılığı hâlâ okumakla oluyor.
- **Geri getirme en yakın parçayı verir, doğru parçayı değil.** isabet@3
  %95 — yani yaklaşık yirmi sorudan biri ilk üçte doğru yeri getirmiyor.
  Gelen metni okumak hâlâ şart; `/sor` bu yüzden "getirdiğini kabul etme"
  adımı içeriyor.
- **Eşikler 20 soruluk bir sete göre ölçüldü.** Küçük bir set. Parametreleri
  bu sete uydurarak "iyileştirmek" mümkün ve yanıltıcı — nitekim bir tarama
  tek hücrelik bir tepe gösterdi ve o tepe reddedildi, sorun yapısal
  düzeltmeyle çözüldü. Set büyüdükçe ölçüm gerçeğe yaklaşır; büyütmenin
  yolu da geri bildirim defteri.
- **Açık bir vaka var:** "komutanlar kaç tır kaldırıyor" sorusu tır değerleri
  tablosunu getiriyor, komutanların 3 tır satırını değil. Geri bildirim
  defterinden geldi, altın sette duruyor, henüz çözülmedi. Yapısal bir
  düzeltme denendi (düzyazıyı tablolardan ayrı öbeklemek) ve **geri
  alındı**: hedefi düzeltmedi, isabet@3'ü 95'ten 90'a düşürdü, yeni bir
  kaçak yarattı.

### Ölçmeye başlayınca çıkan üç açık

`arac-sinavi.py` yazılmadan önce kesici, yargıç ve geri bildirim "elle
denendi ve çalışıyordu". Ölçmeye başlayınca üçü de açık verdi:

- **Yargıç ihmalle kandırılabiliyordu.** Puanlama gönderilen cevaplar
  üzerinden yapılıyordu: 26 sorudan 3'ünü gönderen 3/3 alıyordu. Zor
  soruları — özellikle uydurmanın ölçüldüğü "cevapsız" olanları — hiç
  göndermemek tam puan getiriyordu. Artık payda altın setin tamamı;
  cevaplamamak, yanlış cevaplamaktan iyi değil.
- **İnsan kapısı ceza gibi sayılıyordu.** Kanca, çıkış kodu `3`'te devre
  sayacını artırıyordu. Kapı bir başarısızlık değil, "doğruluğunu
  bilemiyorum" demek; üst üste birkaç kapı olayı devreyi kesip modeli
  susturabilirdi. Artık kapı sayacı sıfırlıyor.
- **Bozuk bir araç denetimin tamamını çökertiyordu.** `sinav.py`'de bir
  sözdizimi hatası `dogrula.py`'yi izleme yığınıyla düşürüyordu — yani
  bir aracın bozulması bütün kuralları görünmez kılıyordu. Denetleyici,
  ölçtüğü araçtan sağlam olmak zorunda; artık hata olarak bildirip
  geri kalan 82 denetimi koşuyor.
- Bu katman siteyi değiştirmez, sadece üzerinde çalışma biçimini değiştirir.
- Uzman ajanlar sıfırdan başlar; `LORE.md` okumalarını söylemezsen okumazlar.
- Ajan raporu delil değildir. Sayı/isim/tarih iddiasını dosyadan doğrula.
