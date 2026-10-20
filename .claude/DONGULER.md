# Echo Orkestra v2.1.9

> **Codex girişi:** Echo artık Claude kurulmadan `python3 echo.py baslat`
> ile çalıştırılabilir. Güncel Codex yönetimi ve kanca sınırları
> [`ECHO.md`](../ECHO.md) / [`AGENTS.md`](../AGENTS.md) içindedir.
> Aşağıdaki Claude model/kanca anlatımları eski girişin uyumluluk kaydıdır;
> Codex'in çağrı veya onay zincirini tanımlamaz.

Bu katmanın adı **Echo**. Adın sebebi işleyişinde: her çıktı bir
denetimden geri döner, her hata bir teste geri döner, her ölçüm sistemin
kendisine geri döner. Yankı gibi — söylediğin şey sana geri gelir ve
doğru olup olmadığını orada anlarsın.

Sürüm kuralı `surum.py` içinde kodla tutuluyor: yama 1'den 9'a gider,
dokuzdan sonraki güncelleme minör sürümü artırıp yamayı sıfırlar
(`v1.1.9` → `v1.2`), minör de dokuzu doldurunca majör artar
(`v1.9.9` → `v2.0`).

```
python3 .claude/surum.py goster
python3 .claude/surum.py yukselt --ne "<bu sürümde ne değişti>"
```

Bu klasör siteye ait değil. Site hâlâ derleme adımı olmayan, backend'siz,
veri toplamayan statik bir arşiv. Bu katman sadece *site üzerinde
çalışırken* kullanılan iş akışı — **ama yayından ayrı değil:** GitHub Pages
deponun tamamını yayınlıyor, bu dosya da adresiyle açılabiliyor (ölçüldü,
aşağıda "Yayın sınırı").

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
   KAT 4'ün puanlı hâli:               DEĞERLENDİRİCİ-OPTİMİZE (eniyile.py)
   Bütün katları tetikleyen dış uyarı: OLAY DÖNGÜSÜ (olay.py)
   Turun ve gönderimin eşiği:          KAPI KANCASI (kanca-kapi.py)
   Oturumun girişi:                    AÇILIŞ KANCASI (kanca-acilis.py)
   Ölçünün kendisinin korunması:       MANDAL (mandal.py)
   Dış halkanın tek komutu + eğilimi:  SAĞLIK (saglik.py, /saglik)
```

Son dördü bu katmanın **kenarlarını** kapatıyor. İç döngüler bir işin
ortasında çalışıyordu; ama işin başı (oturum açılırken hafıza kimse
istemeden okunuyor mu), sonu (tur kırmızı biterken ya da commit edilirken
bir şey duruyor mu) ve ölçünün kendisi (eşik sessizce gevşetilebiliyor mu)
hiçbir döngünün sorumluluğunda değildi.

Okuma yönü şöyle: orkestratör bir parçayı bir uzmana verir; uzman o parça
için **kendi** planını çıkarır; plandaki her adımı ReAct turuyla yürütür;
her adımın sonunda çıktı denetleyiciden geçer; denetleyicinin çözemediği
ya da canon'a dokunan bir şey çıkarsa KAT 0'a, yani sana çıkar.

Dış halka bu akışın **içinde** değil, **etrafında** durur. İç döngüler
"bu iş doğru mu?" diye sorar; dış halka "bu döngüler hâlâ çalışıyor mu?"
diye sorar. İkisi karıştırılırsa ölçüm, ölçtüğü şeyin parçası olur.

Kritik ayrım — orkestratör tek seferde dağıtıp toplarsa bu bir **iş akışı**
olur. Gelen sonuçtaki eksiğe göre yeniden görev veriyorsa **döngü** olur.
`/orkestra` 4. adımda bunu zorunlu tutuyor. Ayrım Anthropic'in tanımıyla
aynı: iş akışında yol önceden yazılıdır, ajanda model kendi sürecini
yönetir — ve ajan her adımda ortamdan "gerçek" geri bildirim almalı, bir
durma koşulu (en fazla tur) taşımalıdır [K1].

## Döngünün durduğu yer

Her döngünün bir çıkış koşulu var, yoksa sonsuza kadar döner:

| Döngü | Durma koşulu | Sınır nasıl uygulanıyor |
|---|---|---|
| Yansıt-İyileştir | Denetim temiz ya da 3 tur doldu | **Mekanik** — `devre.py` + kanca |
| Orkestratör | Boşluk kalmadı ya da 2 kez yeniden gönderildi | **Mekanik** — `devre.py` |
| Sınırlı döngü | Kapı yeşil ya da 8 tur doldu | **Mekanik** — `devre.py` |
| Tur sonu kapısı | Denetim temiz ya da ikinci durma denemesi | **Mekanik** — `stop_hook_active` |
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
| `gizleme` | `[hidden]` kuralı duruyor mu; **bütün** JS dosyalarında `opacity = 0` ile gizleme var mı |
| `odak` | **Bütün** stil dosyalarında `outline: none` yazılmış mı (`:focus-visible` hariç) |
| `defer` | Dış betikler `defer` ile mi yükleniyor, `async` sırayı bozuyor mu |
| `sahte` | Biçimi bozuk video kimliği, "yakında" başlığı, YouTube olmayan bağlantı |
| `video` | `VIDEOLAR`'a HEAD'de olmayan kimlik girdi mi → **insan kapısı** |
| `kontrast` | Renk çiftlerini WCAG AA (4.5:1) sınırına karşı **ölçer** |
| `lore` | `data.js`'teki adlar (karakter, kademe, komutan, mafya, icraat) `LORE.md`'de geçiyor mu; 81 derebeyi **satır satır** (plaka + il + ad) eşleşiyor mu |
| `veri` | `data.js` kendi içinde tutarlı mı: tekil kimlik, geçerli taraf, 81 il tam, `ad: null` yok, komutan bağı gerçek |
| `gizlilik` | Form, parola alanı, çerez, `fetch`/XHR/`sendBeacon`/WebSocket, dış sunucudan betik/stil/görsel yükleme, paket yöneticisi izi var mı |
| `erisim` | Sayfa dili, boş olmayan başlık, her görselde `alt` (JS şablonları dahil), metinsiz bağlantı ya da düğme, yakınlaştırmayı kapatan viewport, başlık düzeyi atlama — WCAG 2.2 tabanı [K14][K15] |
| `baglanti` | Her iç `href`/`src`, canonical/paylaşım adresi, site haritası girdisi ve `data.js` `yol` alanı var olan bir dosyaya — `#parça` varsa var olan bir kimliğe — gidiyor mu |
| `capa` | Altın setin her satır numarası hâlâ kendi gerçeğini içeren satırı mı gösteriyor; kaydıysa yeni satırı söyler, gerçek silindiyse **insan kapısı** |
| `kanca` | `settings.json` okunuyor mu, bağlı her kanca betiği var ve derleniyor mu |
| `mandal` | Vaka/mutasyon/altın soru sayısı düştü mü, eşik gevşedi mi, sınır büyüdü mü → **insan kapısı** |
| `belge` | Bu belgedeki sayılar betiklerin gerçeğiyle uyuşuyor mu; her denetim, komut ve araç burada anılıyor mu |

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

Bu kanca bir **araca** bağlı: Edit / Write. Bash ile (`sed -i`, heredoc)
yapılan düzenleme onu hiç tetiklemiyordu. O delik artık tur sonunda
kapanıyor — aşağıda "Kapı kancası".

Betiğin **göremediği** şey: canon'un anlamca tutarlı olup olmadığı.
Adların iki dosyada da geçtiğini görür, aynı şeyi söylediklerini göremez.
O kısım hâlâ okumakla oluyor.

## Geri getirme (RAG) — gözlemin kanıtlanması

`LORE.md` birkaç yüz satır ve büyüyor. Asıl mesele hız değil **dayanak**:
hafızadan cevap veren bir model uydurur, dosyadan alıntı yapan uyduramaz.

`ara.py` canon'u parçalara ayırıp soruya en yakınlarını **satır numarasıyla**
döndürür. Böylece her canon iddiası `LORE.md:201` gibi kontrol edilebilir
bir adrese bağlanır.

```
python3 .claude/ara.py "Teşup'un zaafı ne"
python3 .claude/ara.py --sayi 5 --tam "Konya derebeyi"
```

Gömme, vektör veritabanı, dış servis **yok** — birkaç yüz satırlık Türkçe bir metin
için BM25 [K17] fazlasıyla yeterli ve her koşuda aynı sonucu verir. Test edilebilir
olmasının şartı bu: rastgele bir sistem ölçülemez.

Türkçe için dört şey özel olarak yapıldı, dördü de ölçümle bulundu:

- **Sondan eklemeli dil.** "iradesi / iradeye / irade" aynı köke inmeli;
  ön ek eşleştirmesiyle çözüldü. Beş harflik ön ek, Türkçe bilgi erişiminde
  büyük ölçekli deneylerle etkili bulunmuş bir yöntem [K16].
- **Aksansız yazım.** "Tesup'un zaafi nedir" ile "Teşup'un zaafı nedir"
  aynı soru. Soru-cevap YouTube yorumlarında yapılıyor; orada Türkçe
  karakter kullanmamak çok yaygın. Ölçüldü: aksansız yazılan altın
  sorularda isabet@3 %95'ten **%60'a** düşüyordu; Türkçe olmayan klavyede
  büyük harfle yazılan "AHRIMAN KIMI KILITLIYOR" hiç sonuç döndürmüyordu
  ("I" harfi "ı" okunuyordu). Terimler artık aksanı katlanmış biçimde
  eşleniyor — bilgi erişiminde yerleşik yöntem: kullanıcılar sorguyu çoğu
  zaman aksansız yazar [K11]. Normal sorulardaki ölçüler değişmedi.
- **Sayı adları.** "dördüncü irade kademesi" ile `| 4 | Güçlü İrade |`
  arasında tek ortak harf yok; sayı adları rakama indirgeniyor.
- **Tablo hücreleri sütun adıyla eşleşiyor.** "Zaafı" kelimesi veri
  satırında geçmez, başlıktadır. Eşleştirilmezse hiçbir zaaf sorusu
  cevaplanamaz.

### Bağlam enjeksiyonu — alt ajanı ilk turdan dayanaklı başlatmak

`gorev.py brief` artık konuyla ilgili canon parçalarını **brief'in içine
koyuyor.** Sebebi basit: alt ajana "ara.py çalıştır" demek yetmiyor —
ajan hangi soruyu soracağını bilmeden arayamaz.

Enjekte edilen şey **cevap değil dayanak**: satır numarasıyla geliyor ve
ajanın onu okuyup doğrulaması bekleniyor. Blok açıkça "yeterli olduğunu
varsayma, eksik kalırsa kendin ara" diyor. Konu canon'da karşılık
bulmuyorsa dayanak uydurulmuyor — "karşılık bulmadı" deniyor.

### Embedding neden yok — ölçüldü ve reddedildi

Karakter n-gram vektörleri (bağımlılıksız yapılabilecek tek "gömme"
biçimi) altın sete karşı ölçüldü:

| Yöntem | isabet@1 | isabet@3 | Konu dışı reddi |
|---|---|---|---|
| BM25 (mevcut) | %70 | %95 | 4/4 |
| Saf n-gram | %60 | %85 | **0/4** |
| Melez (BM25 + n-gram) | %75 | %95 | 4/4 |

Saf n-gram belirgin biçimde daha kötü ve konu dışı soruyu hiç
reddedemiyor — eşiği yok, her soruya bir şey buluyor.

Melez'in +5 puanı ise 20 soruda **tek soru** demek, üstelik takas:
bir soru 2→1 yükselirken başka biri 2→3 düşüyor. **Bilinen açığı
("komutanlar kaç tır") çözmüyor.** Bu sinyal değil gürültü; ikinci bir
puanlama mekanizmasının karmaşıklığına değmez.

Gerçek anlamsal gömme (eğitilmiş model) n-gram'ın yakalayamadığını
yakalar — ama dış bağımlılık ister ve birkaç yüz satırlık tek kaynakta
BM25'ten iyi olması beklenmez. **Yeniden bakma koşulu:** `LORE.md`
2000 satırı geçerse ya da altın sette başka türlü sorulmuş sorularda
tekrarlayan kaçaklar çıkarsa.

## Değerlendirme (eval) — ölçmediğin şey çalışmıyordur

Üç ayrı ölçüm var, üçü ayrı şeyi ölçüyor:

```
python3 .claude/sinav.py          # denetleyici gerçekten yakalıyor mu
python3 .claude/degerlendir.py    # geri getirme doğru yeri buluyor mu
python3 .claude/arac-sinavi.py    # kesici, yargıç, geri bildirim, kanca çalışıyor mu
python3 .claude/mutasyon.py       # bu testler gerçekten canlı mı
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

### Değişmezlik — aynı soru, farklı klavye

Davranış testinin bir türü: girdiyi anlamını değiştirmeyecek biçimde boz,
çıktının değişmediğini doğrula [K9]. Metamorfik testin temel fikri de bu:
doğru cevabı bilmeden, iki koşu arasındaki ilişkiyi sına [K10].

`degerlendir.py` her altın soruyu beş biçimde daha soruyor: aksansız,
Türkçe klavyede büyük harf, Türkçe olmayan klavyede büyük harf, noktalamalı,
fazla boşluklu. İlk üç sonuç değişmemeli; konu dışı soru dönüşünce de
reddedilmeli; cevapsız soru dönüşünce de sahte delil üretmemeli. Her altın,
konu dışı ve cevapsız soru için beş çift; eşik %100.

İlk koşusunda gerçek bir açık buldu: aksansız yazılan sorularda isabet@3
%60'a düşüyordu (yukarıda, "Aksansız yazım").

**Oranlar artık aralıkla yazılıyor.** 20-25 soruda tek soru dört-beş puan;
aralıksız yazılan bir oran olduğundan kesin görünür. `degerlendir.py`
%95 Wilson aralığını basıyor [K12]: küçük n için önerilen yöntem bu —
yaygın Wald aralığı küçük n'de güvenilmez [K13] ve 19/20 için 1'i aşan
[0.85, 1.05] gibi anlamsız bir aralık verir. Wilson: [0.76, 0.99].

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

## Değişmez hedef ve görev ağacı

Uzun ufuklu (long-horizon) koşunun asıl tehlikesi adımların yanlış
olması değil. Adımlar tek tek doğru olur; yirminci adımda başka bir işi
yapıyor olursunuz. Kimse yanlış bir şey yapmamıştır — **hedef, adım
adım, kimsenin fark etmediği bir yere kaymıştır.**

`hedef.py` iki şeyi ayırır:

- **Hedef değişmez.** Açılışta parmak izi alınır; metni sonradan
  değişirse `kontrol` bunu yakalar. Hedef değişikliği bir plan
  güncellemesi değil, insana çıkılacak bir olaydır.
- **Plan değişebilir ama izlenir.** Her değişiklik `sapma` olarak
  kaydedilir: ne değişti, neden, insan onayı gerekiyor mu.

Görevler düz liste değil **ağaç** — büyük aşama → alt görev. Elli
adımlık bir işi düz listede takip etmek, yirminci adımda nerede
olduğunu bilmemek demektir. Üst görev, alt görevleri açıkken
kapatılamaz: bu bir iş bitirme değil, görmezden gelmedir.

```
python3 .claude/hedef.py ac --hedef "..." --basari "..." --degismez "..."
python3 .claude/hedef.py dal --ne "büyük aşama"
python3 .claude/hedef.py dal --ust 1 --ne "alt görev"
python3 .claude/hedef.py kontrol     # hâlâ hedefe mi hizmet ediyorum
```

`kontrol` dört şeye bakar: hedef kaymış mı, takılı görev var mı, onay
bekleyen sapma var mı, aynı anda birden çok görev "çalışıyor" mu.
Sonuncusu da uzun ufuklu işin klasik hatası — tek odak tutulmazsa
ikisi de yarım kalır.

## Bağlam yönetimi ve epizodik bellek

Uzun koşuların sessiz düşmanı **bağlam çürümesi** [K19]: alakasız araç
çıktıları, tekrar okumalar ve çözülmüş turların ayrıntısı birikir. Model
hata vermez, sadece sinyale daha az dikkat eder — yirminci turda hâlâ
çalışıyor görünür ama ne yaptığını bilmez.

`seyir.py` dört işlemi karşılıyor:

| İşlem | Karşılığı |
|---|---|
| **Write** | `yaz` — bağlamı pencere dışına, dosyaya alır |
| **Select** | `ozet` — yeni tura sadece gerekli olanı geri verir |
| **Compress** | şema — ham iz özete girmez, karar ve boşluk girer |
| **Isolate** | alt ajanlar ayrı pencerelerde (`gorev.py`) |

Kritik nokta: burada **serbest özetleme yok**. Serbest özetleme uzun
görevlerde kilit kararları güvenilir biçimde korumaz — özetleyici neyin
önemli olduğunu bilmez ve tam da sonradan lazım olacak şeyi atar.
Onun yerine **saklama şeması** var, ne saklanacağı önceden yazılı:

```
karar        hangi karar verildi ve NEDEN   (gerekçesiz kayıt reddedilir)
cozulmemis   neyin çözülemediği             (sonraki koşu buradan başlar)
denendi      denenip işe yaramayan yol      (tekrar denenmesin)
olculdu      ne test edildi, sonucu ne
adim         ham tur izi — GÖZLEM için, özete GİRMEZ
```

İlk dördü kalıcı bellek; `adim` sadece "neden takıldı" sorusunu
cevaplamak için. `ozet` onu kasten dışarıda bırakır: **sıkıştırma budur —
silmek değil, ayırmak.**

Bu aynı zamanda epizodik bellek: defter git'te durduğu için her yeni
koşu, önceki koşuların neyi denediğini ve neyi çözemediğini görür.

## Devre kesici — sınırın yazı olmaktan çıkması

Ad ve fikir dağıtık sistemlerden geliyor: hata sayısı bir eşiği geçince
devre "açılır" ve korunan çağrı bir süre hiç denenmez [K2]. Burada korunan
şey bir uzak servis değil, modelin kendi döngüsü.

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

**Üç ayrı sınır var**, çünkü üç ayrı risk var:

| Sınır | Neyi karşılar |
|---|---|
| Tur sayısı (`--sinir`) | Sonsuz döngü — "kaç kez denedin" |
| Duvar saati (`--sure`) | Tek uzun turda patlama — "ne kadar harcadın" |
| İlerleme | Yerinde sayma — "ilerliyor musun" |

Üçüncüsü en sinsi durumu yakalar: **sayaç ilerliyor ama iş ilerlemiyor.**
Dört tur boyunca aynı iki durum arasında gidip gelen bir döngü sayaca
göre gayet sağlıklı görünür; sınır dolana kadar döner, sonra "sınırı
aştı" der. Oysa asıl sorun ikinci turda başlamıştır.

İki kalıp aranıyor: **tekrar** (aynı iş üç kez denendi) ve **salınım**
(A → B → A → B, yapılan iş geri alınıp tekrar yapılıyor).

Bu, kancayı da düzeltti: eskiden her turda aynı genel notu ("denetim
düştü") yazıyordu, o yüzden "aynı hatada saplandım" ile "her turda başka
bir hata düzeltiyorum" ayırt edilemiyordu. Artık gerçek hata imzası
deftere geçiyor.

İki tasarım ayrıntısı önemli:

- **Bayat sayaç kendini sıfırlar** (6 saat). Kesici bir ceza değil fren;
  dünkü bir başarısızlık bugünkü işi kilitlememeli.
- **Defter bağlam şişmesine karşı.** Her tur tek satır yazılır. Amaç arşiv
  değil *unutabilmek*: model geçmişi bağlamında taşımak yerine `durum`
  komutuyla okur.
- **Çakışma kilidi.** Zamanlanmış bir döngünün turu aralıktan uzun
  sürerse, önceki bitmeden yenisi başlar ve ikisi aynı alana girer; sayaç
  bunu göremez, iki koşu aynı sayacı paylaşır. Halka bir **sahip** taşır
  (oturum kimliği ya da `--sahip`); başka sahip, halka kendi süre
  bütçesi içindeyken `dene` derse **çıkış 4** alır ve dosyaya dokunulmaz.
  Bütçesi dolmuş ya da `basari` ile kapanmış halkanın kilidi ölüdür —
  çökmüş bir koşu halkayı sonsuza kadar kilitlememeli.

## Sınırlı otonom döngü (Ralph Wiggum)

Adı Geoffrey Huntley'in tekniğinden: en saf hâliyle aynı istemi bir
ajana döngü içinde tekrar tekrar veren bir kabuk döngüsü [K3]. Buradaki
fark, döngünün iki ucunun da bağlı olması: durma koşulu deterministik bir
kapı, üst sınırı devre kesici.

`/surekli` uzun soluklu, kendi kendine dönen döngü. Diğerlerinden iki farkı
var: durma koşulu bir insanın kanaati değil **deterministik kapı**
(`dogrula` + `sinav` + `degerlendir` aynı anda yeşil), ve her turda hafıza
kasten boşaltılır.

Üç kısıtı da isteğe bağlı değil: kapı gevşetilemez (eşik indirerek yeşile
ulaşmak döngüyü tamamlamak değil ölçüyü yok etmektir), devre kesici bağlıdır,
ve her turda tek iş yapılıp ayrıntısı unutulur.

Meşru durma sebebi üç tane: bütün kapılar yeşil, devre kesildi, insan
kapısı. Dördüncüsü — "çözemedim ama devam ediyorum" — yok.

## Alt ajan sözleşmesi — döngünün en zayıf halkası

Alt ajan bu sistemin en kırılgan yeri, üç sebepten: sıfırdan başlar
(senin bildiğin hiçbir şeyi bilmez), kendi bağlamında çalışır (onun
gördüğü kancayı sen görmezsin) ve **raporu düzgün Türkçeyle gelir,
doğru GÖRÜNÜR.**

`/orkestra` eskiden "ajana şunları söyle" diyordu. Yazı, uygulanmayan
kuraldır — hele uygulaması gereken taraf acelesi olan taraf ise.
Şimdi iki yönü de mekanik:

**Giden — brief üretilir, elle yazılmaz.**

```
python3 .claude/gorev.py brief --konu "..." --cikti "..."
```

`PreToolUse` kancası (`kanca-gorev.py`) sözleşmesiz görevi **göndermez**: uydurma yasağı,
canon kaynağı ve atıf zorunluluğu geçmiyorsa hangisinin eksik olduğunu
söyleyip geri çevirir. Devre kesicideki mantığın aynısı — kural süreç
dışına taşındığı an rica olmaktan çıkar.

**Kapı tek değil.** Bir görev alt ajana iki yoldan gidebilir: aynı konteynerde
çalışan alt ajan (`Agent`/`Task`) ya da kendi bulut bilgisayarında açılan ayrı
bir oturum (`create_session`). Kanca eskiden sadece ilkini dinliyordu — ajana
kendi makinesini vermek, sözleşmeyi atlamanın yolu olurdu. Artık ikisi de
aynı kapıdan geçiyor.

**Yetki beyanı zorunlu.** Her brief `YETKİ: okuma` ya da `YETKİ: yazma`
içermek zorunda; kanca beyansız görevi de göndermez. Salt okunur mod
`git commit`/`git push`/dosya düzenlemeyi açıkça yasaklar.

Dürüst sınır: bu harness alt ajanın **araç kümesini kısıtlamaya izin
vermiyor**, yani gerçek ayrıcalık ayrımı yapılamıyor. Yapılabilen,
beyanı sonradan sınamak — `dogrula --mod okuma` çalışma ağacına bakıp
salt okunur ajanın dosya değiştirip değiştirmediğini yakalıyor.

### Ajana kendi makinesini vermek

Ayrıcalık ayrımının yapılamadığı yerde **yalıtım** yapılabilir. Bulut
oturumunun kendisi zaten ayrı bir Linux konteyneri (kabuk, git, Python,
başsız Chromium). Alt ajana ondan da ayrı bir alan vermenin yolları, ucuzdan
pahalıya:

| Yol | Ne verir | Bedeli |
|---|---|---|
| `Agent` + `isolation: "worktree"` | Aynı konteynerde **ayrı bir çalışma ağacı** — yazma yetkili ajanın değişikliği ana ağaca birleştirilene kadar dokunmaz | Ucuz; disk ve işlemci ortak |
| `create_session` (ayrı bulut oturumu) | **Ayrı bir bulut bilgisayarı**: kendi konteyneri, kendi dalı; telefondan ayrıca izlenebilir | Her oturum ayrı kullanım; sonuç mesajla ya da olay listesiyle gelir |
| `Agent` + `isolation: "remote"` | Alt ajanı uzak bir bulut ortamında koşturur | Erişimi kademeli açılıyor; her hesapta yok |

Üçünde de sözleşme kancası geçerli. Grafik masaüstü (fare, klavye, ekran
görüntüsü) bunların hiçbirinde yok; bu site için gerekmiyor da — sayfaya
bakmak gerekirse konteynerdeki başsız Chromium yeter.

**Kural ve zorlaması.** Ajanın ortamı yetkisine göre seçilir: salt okunur
ajan aynı konteynerde koşar; **yazma yetkili ajan ayrı çalışma ağacında**
(ya da ayrı bulut oturumunda) koşar. Bu bir rica değil — `kanca-gorev.py`
`YETKİ: yazma` beyanlı bir `Agent` görevini `isolation: "worktree"`
olmadan **göndermez.** Üç ayrıntı daha mekanik:

- **Ağaç dalın HEAD'inden açılır** (`settings.json` → `worktree.baseRef:
  "head"`). Varsayılan `origin/main`'den açmaktı: ajan dalın son hâlini
  değil, eski kodu düzenlerdi.
- **Kirli ağaçta yazma ajanı gönderilmez.** Ayrı ağaç commit edilmemiş
  değişikliği görmez; önce commit, sonra görev.
- **Yazma brief'i ana deponun yolunu vermez.** "Depo: /home/…" yazan bir
  brief, ajanı yalıtımı atlayıp doğrudan ana ağaca yazmaya çağırırdı.

Değişiklik ana ağaca kendiliğinden geçmez: orkestratör ajanın ağacında
denetimi koşturur, farkı okur, sonra birleştirir (`/orkestra` 3. adım).

**Gelen — rapor makineye doğrulatılır.**

```
python3 .claude/gorev.py dogrula --rapor <dosya> --deftere-yaz
```

Her atıf için üç şeye bakar: satır dosyada var mı, aralık geçerli mi, ve
o satırlar cümleyi **gerçekten destekliyor mu**. Sonuncusu asıl mesele:
araştırmadaki en yaygın üretim hatası, cevabın %94'ünün "dayanaklı"
görünmesine karşılık atıfların ancak %61'inin o cümleyi desteklemesiydi.
Kullanıcı yedinci atıfa tıklar, ilgisi yoktur, güven biter.

`--deftere-yaz` bulunan kusuru geri bildirim defterine düşürür. Halka
böyle kapanır: ajanın hatası kaybolmaz, kalıcı kayda dönüşür.

## Cevap yargısı (LLM-as-judge)

`degerlendir.py` aramayı ölçer, `yargi.py` **cevabı** ölçer. Doğru bölümü
getirip yine de yanlış okumak, fazla iddia etmek ya da canon'un sustuğu
yerde konuşmak mümkün — ve bunu daha önce hiçbir şey yakalamıyordu.

Yargı ikiye bölündü, çünkü bir modelin kendi cevabını beğenmesi bu
sistemin en baştan kaçtığı tuzak. Ölçülmüş bir tuzak da: LLM yargıçlarının
cevabın sırasına, uzunluğuna ve kendi ürettiği metne kayan önyargıları
var [K18].

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

## Kapı kancası — tur sonu ve gönderim eşiği

`kanca-kapi.py` iki olaya bağlı, ikisi de aynı fikir: **aracı değil
sonucu denetle.** Kanca olaylarının anlamı (Stop'un turu sürdürmesi,
`stop_hook_active`, PreToolUse'un `ask` kararı) Claude Code'un kanca
başvurusunda tanımlı [K20].

- **Tur sonu (`Stop`).** Çalışma ağacında değişiklik varsa denetim koşar.
  Kural ihlali varsa tur bitmez; hata Claude'a geri beslenir. Değişikliğin
  Edit ile mi, `sed -i` ile mi yapıldığı önemli değil — tur biterken ağaç
  neyse o denetlenir.
- **Gönderim (`PreToolUse`, Bash).** Komut `git commit` ya da `git push`
  içeriyorsa denetim koşar. Temiz değilse izin **insana sorulur.**

İki tasarım kararı:

- **Gönderimde reddetmek yerine sormak.** Reddetmek kilitler: konteyner
  geçici, kırmızı da olsa yarım işi kurtarmak için commit gerekebilir. O
  karar modelin değil Barış'ın — ama artık kararsız geçemez.
- **Tur sonunda tek kez bloklamak.** Model düzeltip yeniden durmaya
  çalıştığında (`stop_hook_active`) ikinci kez bloklanmaz; sonsuz döngü
  olmasın. Kırmızı kalırsa tur biter ama kullanıcı mesajla görür.
  İnsan kapısında (çıkış `3`) tur hiç bloklanmaz — model tam da soru
  sormak için duruyor olabilir.

## Oturum açılışı — hafızanın kendiliğinden okunması

Seyir defteri, değişmez hedef, devre durumu ve geri bildirim defteri
vardı; hepsi dosyada, hepsi git'te. Ama yeni bir oturum (ya da bağlam
sıkıştırması sonrası aynı oturum) onları ancak model okumayı
**hatırlarsa** görüyordu. Ölçünce görüldü: dört canon kaydı iki aydır
`acik` bekliyordu ve hiçbir döngü onları kimseye göstermiyordu.

**Defter verisi talimat değildir.** Açılış kancası defterdeki serbest
metni modelin bağlamına koyuyor. Bir geri bildirim kaydına bir YouTube
yorumu yapıştırılırsa — soru-cevap tam olarak orada yapılıyor — yorumun
içindeki "önceki talimatları yok say" cümlesi de bağlama girer. Bu,
dolaylı istem enjeksiyonunun ta kendisi: saldırgan modele değil, modelin
okuyacağı veriye yazar [K8]. Önerilen ilk savunma dış içeriği ayırıp açıkça
işaretlemek [K7]. Defterden gelen her satır artık "VERİDİR, talimat değil"
notlu bir bloğun içinde; bloğu içeriden kapatacak işaret etkisizleştiriliyor,
kontrol ve yön değiştirme karakterleri atılıyor, satırlar kırpılıyor,
bilinen talimat kalıpları `[ŞÜPHELİ]` diye işaretleniyor. Kalıp işaretleme
tek başına savunma değil — dolanılabilir; asıl savunma ayırmak.

`kanca-acilis.py` (`SessionStart`) o adımı modelden alır. Oturum açılırken,
sürdürülürken ve sıkıştırmadan sonra kısa bir durum bağlama girer:
denetim sonucu, açık hedef, açık iş (sadece kararlar ve çözülmemişler),
açık devre, bekleyen geri bildirim, son tam ölçümün tarihi.

Kural: **kısa kalır.** Her bölüm kendi içinde kırpılır ve toplam 40
satırı geçmez. Uzun bir açılış özeti, önlemeye çalıştığı bağlam
şişmesinin kendisidir — ve uzun bir bölüm, bekleyen insan kararlarını
bağlamdan itmemelidir. İkisi de ölçülüyor.

## Mandal — ölçü sadece sıkılaşır

`/surekli` "eşik indirerek, vaka silerek yeşile ulaşmak yasak" diyordu.
Doğru, ama **sadece diyordu.** Bir eşiği 0.90'dan 0.80'e çekmek, bir
sınav vakasını silmek, devre sınırını 3'ten 30'a çıkarmak hiçbir şeye
takılmıyordu. Daha sinsisi: vaka silinip belgedeki sayı da aynı anda
düzeltilirse `belge` denetimi bunu "tutarlı" diye geçiriyordu. Tutarlı
bir gerileme yine de gerilemedir.

Bu davranışın yapay zekâdaki adı **şartname oyunu** (specification gaming):
amacın değil, ölçünün harfi yerine getirilir [K4]. Eşiği indirerek yeşile
ulaşan bir döngü tam olarak bunu yapar — o yüzden ölçünün kendisi korunuyor.

```
python3 .claude/mandal.py olc                       # şu anki ölçüler
python3 .claude/mandal.py kontrol                   # tabana göre durum
python3 .claude/mandal.py kaydet                    # sıkılaşınca tabanı ilerlet
python3 .claude/mandal.py kaydet --gerekce "..."    # onaylı gevşemeyi kayda geçir
```

İzlenen ölçüler: vaka, tuzak, masum, araç vakası, mutasyon ve altın
soru sayıları; denetim başlığı sayısı; kontrast, geri getirme ve atıf
eşikleri; devre kesicinin tur, süre ve tekrar sınırları; aramanın
"bilmiyorum" eşiği. Her birinin **yönü kodda yazılı**, taban dosyasında
değil — yoksa yönü çevirmek de bir gevşetme yolu olurdu.

Üç ayrıntı:

- **Araçları çalıştırmadan ölçer** (kaynak kodu ayrıştırarak). Ölçtüğü
  şeyi çalıştırsaydı, bozuk bir araç mandalı da bozardı.
- **İki tabanın sıkı olanına karşı kıyaslar:** HEAD'deki ve çalışma
  ağacındaki. Ölçüyü ve tabanı aynı anda gevşetmek işe yaramaz; HEAD'deki
  taban ancak commit ile değişir, commit de kapı kancasından geçer.
- **Gevşeme hata değil, insan kapısıdır.** Bir vakayı silmenin meşru
  sebebi olabilir; ama o karar Barış'ın. `kaydet` gerekçesiz gevşemeyi
  yazmaz, gerekçeli olanı `gecmis` listesine geçirir.

## Sağlık — dış halkanın tek komutu ve eğilim hafızası

Dış halka vardı ama kendiliğinden dönmüyordu: komut tablosu `/degerlendir`
için "ayda bir" diyordu ve bunu hatırlayacak bir şey yoktu. Dört ölçüm dört
ayrı komuttu.

```
python3 .claude/saglik.py --kaydet          # hepsi + geçmişe yaz
python3 .claude/saglik.py --hizli           # mutasyonu atla
python3 .claude/saglik.py --sadece arama    # tek adım
python3 .claude/saglik.py gecmis            # eğilim
```

İkinci kazanç daha önemli: **eşiğin üstündeki gerileme.** Eşikler tabandır;
isabet@3 %95'ten %91'e düşerse eşik (%90) hâlâ geçer ve her şey yeşil
görünür. `saglik.py` her kayıtlı koşuyu bir öncekiyle kıyaslar, düşen
kalite ölçüsünü söyler ve insan kapısına çıkar. Sayıların düşmesine mandal
bakar; burası ölçümün **kalitesine** bakar.

Kayıt `tam` alanı taşır: tek adımlık bir koşu "son tam ölçüm" yerine
geçmez. Açılış kancası son tam ölçümün tarihini buradan okur.

**Oran ancak aynı sete karşı kıyaslanır.** Sağlık kaydı arama ölçülerinin
yanına altın setin parmak izini de yazar; set değiştiyse kıyas yapılmaz ve
bu açıkça söylenir. Sebep ölçüldü: iki dal birleşince set 20'den 24 soruya
çıktı ve isabet@3 0.95 → 0.92 "gerileme" göründü — oysa aynı 24 soruda iki
dalın arama sonucu birebir aynıydı. Zor soru eklemek oranı düşürür, kolay
soru eklemek yükseltir; ikisi de arama hakkında bir şey söylemez.

## Yayın sınırı — `.claude/` herkese açık

Bu belge baştan beri "buradaki hiçbir şey yayına çıkmıyor" diyordu.
Ölçüldü ve yanlış çıktı: depoda `.nojekyll` var, GitHub Pages deponun
tamamını olduğu gibi yayınlıyor.

| Adres | Durum |
|---|---|
| `/kanal-sitesi/.claude/DONGULER.md` | 200 — herkes açabilir |
| `/kanal-sitesi/.claude/settings.json` | 200 |
| `/kanal-sitesi/CLAUDE.md` | 200 |
| `/kanal-sitesi/LORE.md` | 200 — canon'un tamamı |

İçeride gizli anahtar ya da kişisel veri **yok**. Ama somut bir çelişki
var: site sıralı güç tablosunu **bilerek** göstermiyor ("en üstteki
yenilmez" sözü vermesin diye), oysa o tablo `LORE.md`'nin "Tır Değerleri
(iç referans)" bölümünde duruyor ve adresiyle herkese açık. `robots.txt`
bunu çözmez — kendi yorumunun dediği gibi, adres yazmak gizlemez, duyurur.

Kalıcı çözüm yayın kaynağını değiştirmek — örneğin sadece site
dosyalarını yayınlayan bir Pages iş akışı ya da siteyi bir alt klasöre
taşımak. İkisi de yayın düzenini değiştirir; **karar Barış'ın**, bu
yüzden uygulanmadı.

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
| Bütünlük | `butunluk.py` | Canon ↔ veri ↔ site | Tutarsızlık → canon kararı ya da düzeltme işi |
| **Değerlendirici-optimize** | `eniyile.py` | `dogrula.py` + `butunluk.py` puanı | Puan artmazsa **İnsan onayına** çıkar |
| **Olay döngüsü** | `olay.py` + `settings.json` | Claude Code kancaları | Dış uyarıyı Yansıtma'ya ve sözleşme kapısına dağıtır |
| **Tepe tırmanma** | `tirmanma.py` | `degerlendir.py` altın seti | Aday ayar → **insan onayı** (asla kendiliğinden uygulanmaz) |
| **Eleştirmen-üretici** | `elestirmen.py` | Ajan + mekanik denetleyiciler | Bulgular üreticiye; lastik damga reddedilir |
| **TDD** | `tdd.py` | `arac-sinavi.py` + `butunluk.py` | Kırmızı → yeşil → düzenle; koruma azalamaz |
| Kapı kancası | `kanca-kapi.py` | Çalışma ağacının sonucu (araç değil) | Kırmızı tur → Yansıtma'ya; kırmızı commit → İnsan onayına |
| Açılış kancası | `kanca-acilis.py` | Seyir, hedef, devre, geri bildirim defterleri | Yeni oturumu dayanaklı başlatır → Planla-Uygula |
| Mandal | `mandal.py` + `dogrula mandal` | HEAD'deki ve yereldeki tabanın sıkısı | Gevşeme → İnsan onayına |
| Sağlık | `saglik.py` + `/saglik` | Bütün ölçümler + geçmiş | Eşik üstü gerileme → İnsan onayına; kayıt → Açılış kancasına |

İki yeni halkanın yeri şu: **olay döngüsü en dışta**, çünkü diğerlerini
başlatan şey o — bir dosya düzenlenmeden yansıtma turu hiç başlamaz.
**Değerlendirici-optimize KAT 4'ün içinde**, onun ikili çıktısını puana
çevirip geri bildirimi üreticiye taşıyan parça.

```
   olay gelir ──▶ olay.py dağıtır ──▶ kanca ──▶ dogrula.py
                                                    │
                                          eniyile.py puanlar
                                                    │
                                   puan artıyor ────┴──── artmıyor
                                        │                    │
                                   İYİLEŞTİR              İNSAN ONAYI
                                   (üreticiye              (KAT 0)
                                    geri bildirim)
```

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
| `/saglik [hızlı]` | Bütün ölçümler tek komutta + eğilim | Zamanlanmış işin komutu; büyük değişiklikten önce ve sonra |
| `/geri-bildirim <ne yanlıştı>` | Hatayı teste çevirir | Bir cevap yanlış çıktığında |
| `/yargila` | Cevap kalitesi yargısı | Canon cevaplarına güven ölçmek |
| `/surekli <hedef>` | Sınırlı otonom döngü | Kapı yeşerene kadar dönmesi gereken uzun iş |
| `/orkestra <hedef>` | KAT 1 + altı | 3+ bağımsız parça, farklı uzmanlıklar |

Betik olarak çalışan iki halka daha var (komutu yok, döngünün içinden
çağrılır): `eniyile.py` puanlı yansıtma, `olay.py` olay dağıtımı.

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
verdiğin komutu çalıştırır, sonucu bildirir. Çalıştıracağı komut artık
hazır: `/saglik`. Routine'in kendisi kurulmadı; istersen kurarız.

## Claude Code dışında

Sistemin **hepsi** taşınmaz ve bunu bilmek önemli — taşınmayan kısmın
çalıştığını sanmak bu sistemin en çok uğraştığı hata türü.

Kısa hâli: **kurallar taşınır, zorlama taşınmaz.** Betikler bir kabuk
ister, kancalar Claude Code'a özgü, alt ajan aracı yok. claude.ai
tarafında kural Claude'un uymayı seçmesine bağlı kalır; burada uymamak
mümkün değildir çünkü kanca durdurur.

Ayrıntı ve yapıştırmaya hazır proje talimatı:
[`.claude/tasima/claude-projesi.md`](tasima/claude-projesi.md).

Oradaki en önemli uyarlama: satır atfı (`LORE.md:201`) yerine **birebir
alıntı**. Amaç aynı — her iddia kontrol edilebilir olmalı — ama
claude.ai'de satır numarası görünmediği için Ctrl+F ile bulunabilecek
alıntı kullanılıyor.

Kural: claude.ai tarafını soru-cevap ve yazı için kullan, **dosya
değiştirmek için değil.** Dosya değişikliği denetleyicinin olduğu yerde
yapılır.

## Testlerin sınavı — mutasyon

Bütün ölçüm katmanının dayandığı son soru: **testler gerçekten canlı mı?**

Bir test sessizce öldürülebilir; gövdesinin başına `return None` koymak
yeter. Vaka sayısı değişmez, `belge` denetimi bir şey görmez, sınav yeşil
kalır. Denendi ve oldu: uydurma testi devre dışı bırakıldığında **üç
ölçüm de yeşil** kaldı.

```
python3 .claude/mutasyon.py
```

Klasik mutasyon testi [K5]: ölçülen şeyi kasten boz, testin yakalayıp
yakalamadığına bak. Burada **başarısızlık iyi haberdir** — mutasyon
yakalandı demektir. Yeşil kalan bir mutasyon, "o davranışı hiçbir şey
korumuyor" demektir.

**84 mutasyon** var: kesici hiç kesmesin, yargıç uydurmayı görmesin,
sözleşme kapısı açılsın, arama "bilmiyorum" diyemesin, ham iz özete girsin,
denetleyici yeni dosyaya kör kalsın, mandal gevşemeyi görmesin, tur sonu
kapısı bloklamasın, açılış bekleyen kararı göstermesin, sürüm yamayı
dokuzdan öteye taşısın, logo sürümü gövdeye çakılsın…

Bu sayı da belgeye elle yazılıyor, yani o da çürüyebilir — nitekim çürüdü:
belge 15 derken gerçek 23'tü. `belge` denetimi artık bu sayıyı da tutuyor.

**v2.1.5'te mutasyon sınavı hiç bitmiyordu.** Araç sınavı büyüdükçe
(184 vaka, içinde iç içe bir ablasyon koşusu) tek koşu ~3 dakikaya çıktı;
42 mutasyonla toplam ~2 saat. Haftalık iş 60 dakikalık sınıra çarpıp
çıkış 124 ile ölüyordu — ve bitmeyen mutasyon sınavı hiçbir şey
söylemez. Öldürülen her koşu `finally` çalışmadan kapandığı için geçici
kopyalar da diskte kalıyordu (iki koşu ~700 MB). Üç düzeltme:
`--ilk-hatada-dur` (mutasyonun sorusu "en az bir vaka düştü mü"; ilk
düşüşten sonrası cevabı değiştirmez), tek koşu sınırı 300 → 900 sn, ve
SIGTERM'in çıkışa çevrilmesi (temizlik koşsun). Bayrak ortam değişkeni
değil argüman: ablasyonun iç içe tam koşusuna sızmamalı.

v1.1.2 koşusunda iki şey birden çıktı ve ikisi de farklı bir körlük türü:

- **Yanlış sebeple geçen test.** `tdd: düzenleme test silmeyi reddediyor`
  vakası `"vaka sayısı"` ifadesini arıyordu — ama o ifade başlık satırında
  her koşuda basılıyor. Denetim kapatıldığında bile test yeşil kalıyordu.
  İddia artık reddin kendisine bakıyor.
- **Bayat mutasyon.** Altın set şeması tek satırdan listeye geçince
  `yargı: atıf isabetini görmüyor` mutasyonunun hedef satırı değişti ve
  mutasyon "uygulanamadı" dedi. Bayat mutasyon ölü test kadar yanıltıcı
  değil ama aynı yönde bir körlük: o davranış o koşuda hiç sınanmamış olur.

İlk koşusunda bir kaçak buldu ve o kaçak öğreticiydi: ilerleme denetçisi
yeni eklenmişti ama **testi yazılmamıştı.** Özellik vardı, koruması yoktu.
Mutasyon sınavı tam olarak bunun için var.

### Otomatik mutantlar — aklına gelmeyeni bulmak

Elle yazılan mutasyon, yazanın aklına gelen davranışı korur. Aklına
gelmeyeni bulmanın yolu mutantı bir operatör kümesiyle makineye
ürettirmektir [K5][K6]:

```
python3 .claude/mutasyon.py --otomatik 0     # hepsi
python3 .claude/mutasyon.py --otomatik 40    # rastgele 40'lık örneklem (--tohum ile tekrarlanır)
```

Operatörler `dogrula.py`'deki her `d_*` denetimine uygulanır:
karşılaştırmayı ters çevir (`==`↔`!=`, `<`↔`>=`, `in`↔`not in`), "ve"yi
"veya" yap, `not`'u kaldır, `r.hata(...)` / `r.kapi(...)` çağrısını sil.
Önce hiç bozulmamış kaynak aynı yoldan geçirilir (kontrol koşusu): o bile
düşerse ölçüm geçersizdir, sonuç basılmaz. Her mutant kendi geçici
kopyasında koştuğu için mutantlar birbirinden bağımsızdır; `--is` ile aynı
anda koşarlar (varsayılan: çekirdek sayısı, en fazla 4) — mutasyon
testinin bilinen temel sorunu maliyettir [K6]. `--otomatik N` rastgele
örneklem alır; mutant örneklemesi de bilinen maliyet azaltma
yollarından biridir [K6].

**İlk koşu: 131 mutanttan 95'i öldü (%73), 36'sı yaşadı.** Yaşayanların
9'u eşdeğer mutanttı [K6], yani davranışı değiştirmiyordu: sadece "geçen
denetim" sayacını oynatan `r.tamam()` dalları, sadece hata mesajının
içeriğini değiştiren bir karşılaştırma, her zaman ikisi birden doğru olan
koşullar (iki dosya da hep var; her altın sorunun hem satırı hem gerçeği
var). Kalan 27'si gerçek boşluktu ve hepsi aynı türdendi: **dal yazılmış,
hiç denenmemiş.**

- `--bg` tanımı silinince kontrast denetimi hiçbir şey ölçmeden temiz
  diyordu; o hata satırını silen mutant yaşadı.
- Kontrast döngüsünde `in` → `not in` yaşadı: dokuz rengin hiçbiri
  ölçülmese sınav yine yeşildi. Tek kontrast tuzağı `--text-3`'ü
  bozuyordu, o renk kart zemininde ayrıca ölçüldüğü için yakalanıyordu.
  Gerçek bir gerileme — kötü taraf metnine kan renginin (#c0271f, 3.35:1)
  geri dönmesi — fark edilmeden geçerdi.
- Kart zeminindeki ölçüm 4.51:1, sınırın hemen üstünde; o ölçümü kapatan
  mutant da yaşıyordu.
- CSS içinden `@import` ile dış yazı tipi, formsuz parola alanı, bozuk
  `settings.json`, mandal ile tabanının birlikte silinmesi, eşiğin sabit
  yerine `float("0.90")` diye yazılması (değer aynı, mandal okuyamıyor),
  belgedeki sayı cümlelerinin biçimini kaybetmesi, belgelenmemiş komut.

Her biri için bir sınav vakası yazıldı: 22 vaka, 20'si tuzak, 2'si masum.
Masum vakalar da mutant öldürüyor: `<link rel="license">` dışarıya
işaret eder ama bir şey yüklemez — "veya"yı "ve" yapan mutant onu dış
kaynak sanıyordu; CSS'te sitenin kendi mutlak adresi de dış sunucu
değildir — "ve"yi "veya" yapan mutant onu da yasaklıyordu.

**İkinci koşu** (`erisim` ve kaynakça denetimi eklenmişti, 155 nokta):
143'ü öldü (%92). Yaşayan 12'nin 10'u eşdeğerdi; ikisi yeni yazılan
`erisim` kodundaydı — boş `<title>` hiç denenmiyordu. Vakası eklendi.

Aynı koşu iki ölçülmüş sorun daha gösterdi:

- **18 dakika sürdü** (4 paralel kopya). Her mutant 90 vakalık sınavın
  tamamını koşuyordu; oysa mutantı öldürmeye tek başarısız vaka yeter.
  Mutasyon sınavı artık `sinav.py --ilk-hatada-dur` koşuyor: yaşayan
  mutantın süresi değişmez (bütün vakaları geçmek zorunda), ölenin süresi
  kısalır. Hesaplama maliyeti mutasyon testini pratikten uzak tutan
  bilinen sorundur [K6].
- **Çıkış kodu hep 3'tü.** Eşdeğer mutantlar her koşuda yeniden "hayatta"
  görünüyordu; kapı her seferinde aynı on mutant için açılıyordu ve yeni
  bir boşluk bu gürültünün içinde kayboluyordu. Eşdeğerliği makine
  genelde çözemez, ayırmak insan emeği ister [K6] — o emek bir kez
  harcanmalı:
  - Sadece `r.tamam()` çağıran koşullar artık mutasyona girmiyor.
    `tamam()` geçen denetim sayacıdır, çıkış koduna girmez; böyle bir
    koşulun her mutantı tanım gereği eşdeğerdir. 6 nokta eksildi.
  - Kalan dört eşdeğer, gerekçesiyle `mutasyon.py` içindeki `ESDEGER`
    kaydına yazıldı. Anahtar satır numarası değil ifadenin kendisi: kod
    kayınca kayıt bozulmaz, ifade değişince kayıt düşer ve mutant yeniden
    incelenir. Koddan çıkmış ya da artık öldürülen kayıt da kapı açar —
    kayıt bir gün başka bir mutantı haksız affetmesin. `arac-sinavi.py`
    her koşuda kaydın bayat olmadığını denetliyor.

Mutasyon skoru eşdeğer mutantları paydadan çıkarır [K6]. Çıkış kodu artık
anlam taşıyor: `0` yaşayan her mutant kayıtlı eşdeğer, `3` yeni bir
yaşayan (ya da bozuk kayıt) var.

**Son koşu (149 nokta): 145/145 öldü (%100)**, 4 kayıtlı eşdeğer paydadan
çıkarıldı, çıkış `0`. Süre 18 dakikadan **9 dakikaya** indi (aynı makine,
4 paralel kopya). Eşdeğerler paydadan çıkarılınca üç koşunun skoru:
%78 → %99 → %100.

**Aracın kendi açığı.** Ardından koşan tam sağlık ölçümü kırmızı çıktı:
yeni yazılan iki elle mutasyon "kaçtı". Kusur testlerde değil araçtaydı.
İkisi de `mutasyon.py`'nin kendisini bozuyordu ve aradıkları metin kendi
tanımlarında dize olarak da geçiyordu; `duzenle` ilk eşleşmeyi
değiştirdiği için kodu değil kendi dizesini bozdu — mutasyon hiç
uygulanmadı. Bütün mutasyonların hedefleri sayılınca üçüncü bir belirsiz
hedef çıktı: `erisim` eklenince "yeni dosyaya kör" mutasyonunun hedefi iki
yerde geçer olmuştu ve doğru yere sadece sıra şansıyla düşüyordu.
`duzenle` artık hedefin **tam bir kez** geçmesini şart koşuyor; belirsiz
hedef sessizce yanlış yere düşmek yerine "uygulanamadı" diye sayılır.
`arac-sinavi.py` bu kuralı da sınıyor.

## Değerlendirici-Optimize Edici — puanlı yansıtma

Desen: bir taraf üretir, başka bir taraf eleştirir, geri bildirim üreticiye
döner, kalite eşiğe ulaşana kadar tekrarlanır.

```
python3 .claude/eniyile.py tur --halka icerik
python3 .claude/eniyile.py gecmis --halka icerik
```

KAT 4 zaten bir yansıtma halkasıydı. İki eksiği vardı ve ikisi de bu deseni
sakat bırakıyordu:

**Değerlendirme ikiliydi.** `dogrula.py` ya "temiz" ya "hata" der. İkili
çıktı ilerlemeyi göstermez: 74 vakanın 60'ı temizken 70'i temiz olmak açık
bir iyileşmedir, ama ikili ölçüm ikisine de "hata" der. Model kendi
ilerlemesini göremediği için ya erken pes eder ya da kötüleştiğini fark
etmeden döner. Artık puan var ve kısmi:

```
tur 1   0.973   2 eksik
tur 2   0.987   1 eksik   (+0.014)   ← geri bildirim işe yaradı
```

**Durma koşulu sadece tur sayısıydı.** Asıl durma koşulu "puan artmıyor"
olmalı. İki tur boyunca yerinde sayan bir döngünün üçüncü turda çözmesi
için hiçbir sebep yok — orada eksik olan kod değil karardır. Kısır tur
sayacı dolunca döngü kendini durduruyor ve insana çıkıyor.

Ölçütler ve ağırlıkları: `kural` 0.5 (dogrula.py — ikili kalır, çünkü
"odak halkası yarı silinmiş" diye bir şey yok), `butunluk` 0.3 (74 vakanın
kaçı tutarlı — kısmi puanın anlamlı olduğu yer), `dayanak` 0.2 (aday metnin
atıfları canon'la destekleniyor mu).

**Değerlendirici bir model değil.** Bu deseni anlatan çoğu kaynak "ikinci
bir model eleştirsin" der. Burada değerlendirici dış kural setinin kendisi.
Sebebi bu deponun baştan beri tek cümlesi: yapay zekanın kendi işini
beğenmesi denetim değildir. Üreten ile değerlendireni aynı yerden
çıkarırsan ikisi de aynı kör noktayı taşır — puan yükselir, iş düzelmez.

İnsan kapısı (çıkış `3`) optimize edilmez. "Yanlış" değil, "doğruluğunu
bilemiyorum" demek; puanla çözmeye çalışmak uydurmayı ödüllendirirdi.

## Olay döngüsü — dış uyarının girdiği kapı

Sistem boşta bekler; bir olay gelince (dosya düzenlendi, alt ajan
gönderiliyor) onu ilgili işleyiciye yönlendirir ve tekrar dinlemeye döner.

```
python3 .claude/olay.py tablo
python3 .claude/olay.py defter --son 20
python3 .claude/olay.py defter --karar "geri besledi"
```

Döngünün kendisi zaten vardı — Claude Code kancaları tam olarak budur.
Eksik olan iki şeydi:

- **Dağıtıcı yoktu.** Her olay `settings.json` içinde ayrı bir betiğe
  sabitlenmişti; hangi olayın nereye gittiği tek parça hâlde hiçbir yerde
  durmuyordu. Artık tablo `olay.py` içinde, ayar dosyası sadece buraya
  yönlendiriyor.
- **Defter yoktu.** Bir kanca sessizce çalışmadığında bunu gösteren hiçbir
  iz kalmıyordu. Çalışmayan bir zorlama katmanı, çalışan bir zorlama
  katmanı gibi görünür — bu deponun tekrar tekrar yakaladığı hata sınıfı
  tam olarak bu.

| Olay | Eşleşen araç | İşleyici | Ne yapar |
|---|---|---|---|
| `PostToolUse` | `Edit\|Write\|MultiEdit\|NotebookEdit` | `kanca.py` | site dosyası düzenlendi → denetleyiciyi koştur |
| `PreToolUse` | `Agent\|Task` | `kanca-gorev.py` | alt ajan gönderiliyor → sözleşmesiz görevi engelle |

Dağıtıcı sözleşmeyi **değiştirmez, taşır**: işleyici `2` döndürürse dağıtıcı
da `2` döndürür. Kendi içinde bir hata olursa `0` döner — dağıtıcının
bozulması oturumu kilitlememeli.

Dinleyicisi olmayan olay sessizce kaybolmaz, deftere `dinleyicisi yok`
olarak yazılır. Kaybolsaydı "kanca çalışmıyor mu, yoksa bu olay zaten
dinlenmiyor mu" sorusu cevaplanamaz hâle gelirdi.

Bu dağıtıcının kendi riski diğerlerinden farklı: bozulursa hiçbir şey
bağırmaz, çünkü sınavlar betikleri doğrudan çağırıyor, kancadan geçmiyor.
Bu yüzden yedi vaka dağıtımın kendisini ölçüyor — çıkış kodunun taşındığını,
bilinmeyen olayın deftere düştüğünü ve `settings.json`'ın gerçekten
dağıtıcıya yönlendirdiğini.

## Tepe tırmanma — ve sahte tepenin reddi

```
python3 .claude/tirmanma.py komsular
python3 .claude/tirmanma.py tirman --sicrama 6
```

Komşuları dener, sadece daha iyisini kabul eder, gelişme durana kadar döner.

Bu depoda bir kez **elle** yapılmıştı ve sonucu reddedilmişti: `ara.py`
taraması tek hücrelik bir tepe göstermiş, kabul edilmemişti. Karar doğruydu
ama elleydi — bir dahaki sefere aynı kararın verileceğinin garantisi yoktu.
Artık mekanik.

| Tuzak | Burada ne yapılıyor |
|---|---|
| Yerel zirve | Rastgele sıçrama: farklı başlangıçlardan tırmanılır, tepeler karşılaştırılır |
| Plato | Tespit edilir ve **raporlanır** — körleşmeyi gizlemek yerine söyler |
| Sırt | Eksen adımları tıkanınca çapraz (iki parametre birden) adım denenir |
| **Ezber tepe** | Komşu düşüşü ölçülür; tepe yalıtıksa **reddedilir** |

Sonuncusu klasik anlatımlarda yoktur ve burada en önemlisidir. Diğer üçü
"daha iyi tepeyi bulamama" sorunudur; bu, "bulduğun tepenin sahte olması"
sorunudur — ve ölçüm setine bakarak kendini haklı çıkarır.

### İlk gerçek koşuda ne çıktı

Manzara ders kitabı gibi bir **sırt** gösterdi:

```
  KOK_UZUNLUK  5 → 4   tek başına   →  GEÇERSİZ (konu dışı reddi çöküyor)
  KOK_UZUNLUK  5 → 4   +  SOZ_DAGARI_ESIK 0.5 → 0.55
                       +  TABAN_UZUNLUK  12 → 14   →  isabet@1 80% → 85%
```

Tek eksende bir adım uçurum, iki eksende birlikte adım tepe. Sadece eksen
bakan bir tırmanıcı burada takılır; çapraz adım tam bunun için var.

Aday **uygulanmadı**: kazanç 20 soruda bir soru. Bu depo aynı büyüklükteki
bir kazancı gömme denemesinde de reddetmişti. Ölçüm seti büyümeden bu
sayılar kabul edilmemeli.

### Tırmanışın kendi kazası

İlk koşu "her komşu eşit — plato" dedi. Sınav yakaladı: **plato sahteydi.**
`ara.py`'ye yazılan yeni değer dosyada duruyordu ama Python eski `.pyc`'yi
yüklüyordu, yani hiçbir aday gerçekten koşmamıştı. Ölçmediğini ölçtüğünü
sanmak — bu sistemdeki en pahalı hata sınıfı, ve tam da bu döngünün
üreteceği türden.

Düzeltme iki satır (`__pycache__` silinir, `PYTHONDONTWRITEBYTECODE` verilir)
ama asıl kazanım vaka: *"tırmanma: yazma gerçekten etkiliyor"* — parametre
değişimi ölçüyü hiç etkilemiyorsa sınav düşer.

## Eleştirmen-Üretici — lastik damganın yakalanması

```
python3 .claude/elestirmen.py brief --hedef assets/js/data.js
python3 .claude/elestirmen.py denetle --rapor elestiri.md
```

Bir ajan üretir, **ikinci bir ajan** kurallara göre eleştirir, hata bulunursa
üreticiye döner.

`eniyile.py` ile farkı: orada değerlendiren bir betik, burada bir **ajan** —
prozayı, tonu, canon'a sadakati okuyabilen bir taraf. Betik "menü eksik" der,
ajan "bu cümle canon'da olmayan bir sıralama kuruyor" der.

Ajan okuyabildiği için kandırabilir de. Bu desenin tek gerçek tehlikesi şu:
**"iyi görünüyor" diyen bir eleştirmen, eleştirmen olmayan bir eleştirmendir**
— ve hiç eleştirmen olmamasından kötüdür, çünkü artık ortada "denetlendi"
damgası vardır.

Dört mekanik kural:

- **Lastik damga yakalanır.** Eleştirmen "KUSUR YOK" derken `dogrula.py` ve
  `butunluk.py` kusur buluyorsa rapor reddedilir. Bu karşılaştırma tamamen
  mekanik ve pazarlığa kapalı.
- **Her bulgu adreslenebilir** olmalı (`dosya:satır`). "Genel olarak zayıf"
  bir bulgu değil izlenimdir.
- **Canon iddiası dayanaklanmalı**; verilen `LORE.md:<satır>` gerçekten var
  olmalı.
- **Sessiz onay yoktur.** "KUSUR YOK" açıkça yazılmalı; sessizlik "okudum,
  temiz" ile "okumadım" arasında ayrım bırakmaz.

## Test odaklı geliştirme — kırmızı adımın kapıya dönüşmesi

```
python3 .claude/tdd.py kirmizi --vaka "<vaka adı>"
python3 .claude/tdd.py yesil   --vaka "<vaka adı>"
python3 .claude/tdd.py duzenle
```

Bu deponun en pahalı dersi şuydu: **bir test yazılmış olması canlı olduğunu
göstermez.** `mutasyon.py` bunun için var ve iki ayrı koşuda ölü koruma
buldu.

TDD'nin kırmızı adımı o sorunun ön cephesi. Hiç kırmızı yanmamış bir test ne
koruduğunu göstermez: belki gerçekten koruyor, belki zaten doğru olanı
tekrarlıyor, belki gövdesi boş — **üçü de yeşil görünür.**

Bu yüzden `kirmizi` bir hatırlatma değil **kapı**: adı verilen vaka şu anda
geçiyorsa komut reddeder. Üç kapı var:

| Adım | Neyi reddeder |
|---|---|
| `kirmizi` | Şu an GEÇEN bir vakayla döngü başlatmayı |
| `yesil` | Kayıtlı kırmızı adım olmadan yeşile geçmeyi; ve bu vaka geçse bile başka vaka düştüyse "yeşil" demeyi |
| `duzenle` | Vaka sayısının düşmesini — yeşil kalmanın en kolay yolu korumayı silmektir, o yol kapalı |

### Ölçülen bir yavaşlama

Bu döngü eklendikten sonra mutasyon sınavı 15 dakikada bitmedi. Sebep
tahmin edilmedi, ölçüldü: araç sınavının 37 saniyesinin **29'u tek bir
vakada** geçiyordu — `duzenle` adımı, vaka sayısının düştüğünü doğrulamak
için önce bütün vakaları koşuyordu.

Sıra yanlıştı, üstelik sadece hız açısından değil: test silinmişse
kalanların yeşil olması zaten bir şey kanıtlamaz. Ucuz ve mantıksal olarak
öncelikli denetim öne alındı; sınav 32 saniyeye indi.

Buradaki genel ders şu: bir denetimin pahalı olması çoğu zaman yanlış
sırada durduğunun işaretidir.

`sinav.py` bilerek kapsam dışı: onun vakaları kendi kendini yargılamıyor,
kararı dışarıdaki koşucu veriyor. Taklit etmek **yanlış bir yeşil**
üretirdi; yarım destek, desteksizlikten kötüdür.

## Bütünlük sınavı — canon ile verinin çelişmesi

Üçüncü sınav, diğer ikisiyle kasten örtüşmüyor:

| Sınav | Neyi ölçer | Vaka |
|---|---|---|
| `sinav.py` | denetleyiciyi — fay enjeksiyonu | 28 |
| `arac-sinavi.py` | araçları — devre, yargıç, görev, logo, olay, tırmanma, eleştirmen, TDD, dış ajan, havuz, kadro | 121 |
| `butunluk.py` | **içeriği** — canon ↔ veri ↔ site | **78 bütünlük vakası** |

```
python3 .claude/butunluk.py
python3 .claude/butunluk.py --bolum canon
```

Fark şurada: `dogrula.py` **kuralları** denetler (odak halkası duruyor mu,
betikler `defer` mi). Bu sınav **gerçekleri** denetler — 81 ilin plakası
resmî kodla eşleşiyor mu, aynı derebeyi iki ile atanmış mı, `data.js`'teki
her isim canon'da geçiyor mu. İkisi ayrı hata sınıfı: biri "kural bozuldu",
diğeri "veri kendi kendisiyle çelişiyor". İkincisi gözle bulunmaz — 81
satırı kimse tek tek karşılaştırmaz.

`CLAUDE.md` bu boşluğu zaten yazıyordu: *"`lore` denetimi adların iki
dosyada da geçtiğini görür, aynı şeyi söylediklerini göremez."* Bu sınav
tam olarak oraya bakıyor.

`data.js` bir JS dosyası; `okuyucu.py` onu **dış bağımlılık olmadan**
okuyor. Node ile JSON dökmek daha kolaydı, yapılmadı: bir sınavın ölçtüğü
şeyden kırılgan olması saçma. Node'un olmadığı bir ortamda sınav "geçti"
demez, hiç çalışmaz — ve çalışmayan sınav, geçen sınav gibi görünür.

### İlk koşusunda ne buldu

89 vakayla başladı, 74'e indi. Silinenler dolgu değildi, **kötü testti:**
keyfi eşikler ("açıklama 8 karakterden kısaysa hata" — Kilis'in derebeyi
"Ak Dev", 6 karakter ve doğru), boş kapsam (sitede hiç `<img>` yok, alt
metni denetimi hiçbir şeyi ölçmüyordu) ve `dogrula.py`'nin `kontrast`
başlığıyla çakışan bir renk denetimi.

Üç test de yanlış kurulmuştu ve düzeltildi. En öğreticisi sıralama
denetimi: bütün "en güçlü / en tehlikeli" kalıplarını hata sayıyordu ve
**canon'un kendi cümlesini yakaladı** — `orta.not` içindeki "üçü arasında
iradesi en zayıf olan da o" `LORE.md:210`'da birebir yazıyor. Yasak olan
sıralama sözcüğü değil, canon'da karşılığı olmayan sıralama. Ölçüt dayanağa
bağlandı: iddia canon'da geçmiyorsa hata. Yanına masum vaka kondu, yoksa
aynı aşırı duyarlılık geri gelir.

Geriye dört gerçek tutarsızlık kaldı ve **dördü de kapatıldı:**

| Bulgu | Ne yapıldı |
|---|---|
| `data.js` Sarı Gülücük için "en tehlikeli ikinci beyin" diyordu | Sıralama kaldırıldı; `LORE.md:134-138`'e dayanan hâliyle yeniden yazıldı |
| Tır iç referans tablosunda üç komutan yoktu | `LORE.md`'ye üç satır eklendi — `LORE.md:192` üçünü de zaten **3 tır** ilan ediyordu, tablo sadece onu taşımıyordu |
| `irade.html` beş kademeyi kesin sunuyordu | Sayfa ölçüm hassasiyeti için çekince koyuyordu ama sınıflandırmanın **kendisinin** taslak olduğunu söylemiyordu; `LORE.md:93`'e uygun cümle eklendi |
| `SITE_ADRESI` tanımlıydı ama hiçbir görünüm kullanmıyordu | Silindi. Yorumu "paylaşım önizlemeleri ve site haritası için" diyordu, ikisi de kullanmıyordu — sabiti ölçen test de gerçek değişmeze yöneltildi: harita temeli ile `canonical` adresleri aynı mı |

### Düzeltmenin açtığı asıl açık

`LORE.md`'ye üç satır eklemek **altın setteki beş sorunun satır numarasını
kaydırdı** — ve hiçbir denetim bunu görmedi. Kaymayı ancak `arac-sinavi.py`
içinde satır numarası gömülü duran bir vaka fark etti, o da yanlış sebeple
kırılarak.

Bu, sistemin ölçüm zemininin altından kayması demekti: `degerlendir.py`
isabet@k'yı yanlış satıra karşı ölçer, `yargi.py` doğru cevaba haksız kusur
yazar, ikisi de sessizce. Bulunması en zor hata türü — çünkü hiçbir şey
kırmızı yanmıyor.

İki şey değişti:

- `belge` denetimi artık her altın sorunun satırının **o sorunun gerçeğini
  taşıdığını** doğruluyor. Kanca `LORE.md` düzenlemesinde koştuğu için
  kayma, olduğu turda yakalanıyor.
- Satır numarası gömen test düzeltildi: numarayı gömmüyor, arıyor. Mutlak
  satır numarası gömen test, ölçtüğü şeyden hızlı çürür.

### Mutasyon sınavına bağlandı

Sınav kırmızıyken mutasyon eklemek yanlış olurdu: mutasyon "yakalanmış"
görünürdü, oysa kırmızılığın sebebi zaten duran bulgular olurdu. Dört bulgu
kapanıp sınav yeşile dönünce koşul doğdu ve dört mutasyon eklendi — plaka
denetimi körleşsin, sıralama denetimi körleşsin, `okuyucu.py`'nin dizgi
zinciri kırılsın, altın set kayma denetimi körleşsin.

Bütünlüğü koruyan şey artık `arac-sinavi.py`'deki sekiz fay enjeksiyon
vakası: depoyu kasten bozup sınavın yakaladığını doğruluyorlar. Bu vakalar
bir kez elle çalıştırılmıştı; elle yapılan deneme buharlaşır.

## Kadro — kaç ajan, hangi görev kimde, hangi model

```
[ Barış ] ──▶ [ Görev Havuzu ]
                    │  zorluk + paylaşılan kaynak
          ┌─────────┴─────────┐
          ▼                   ▼
    [ 1-9 ajan ]   ya da  [ 10 ajan ]
          └─────────┬─────────┘
                    ▼  çıktılar birleşir, atıflar denetlenir
             [ Codex — sunum ]
                    ▼
            [ Opus 5 kontrolü ]
             │hata│      │temiz│
             ▼    │      ▼
         revizyon─┘  [ Barış ]
```

```
python3 .claude/havuz.py ekle --is "<görev>" --zorluk 3 \
    --kaynak assets/js/data.js --tip canon-denetci
python3 .claude/havuz.py kadro
python3 .claude/havuz.py dagit
python3 .claude/havuz.py birlestir --rapor r1.md r2.md
```

### Üç karar, üçü de mekanik

**Kaç ajan.** Sabit değil, zorluktan çıkıyor (1-10). Tek ajan çıkarsa havuz
orkestrayı **reddediyor** ve `/dongu` öneriyor — orkestranın kendi
belgesindeki kurala uyuyor.

**Hangi görevler aynı ajana.** Aynı kaynağa dokunanlar birleşiyor. Sebebi
somut: ayrılırlarsa ikisi de aynı satırı değiştirir, biri diğerini ezer ve
bu ancak birleştirmede görünür. Zincirleme de sayılıyor — A ve B
`data.js`'i, B ve C `app.js`'i paylaşıyorsa üçü de aynı ajanda.
**Kaynak çakışması uzmanlıktan önce gelir**; farklı tipte görevler aynı
ajana düşerse bu bir uyarıyla söyleniyor.

Çakışma **yazmadan** doğar. Aynı dosyayı okuyan iki görev birbirini bozmaz
— aynı kitabı okuyan iki kişi birbirinin sayfasını yırtmaz. İlk hâlim bu
ayrımı yapmıyordu ve ilk gerçek kullanımda altı bağımsız araştırma görevini
tek ajana yığdı; hepsi `LORE.md` okuduğu için.

Bölünemeyen küme kapasiteyi aşabilir — ama sessizce değil. Sessiz aşım
birleştirmede sürpriz üretir.

**Hangi model.** Kadro **Sonnet 5**, dört istisna dışında: `canon-denetci`,
`kurgu-denetci`, `hikaye-yazari` ve `karakter-yazari` **Opus**. Dördüncü
hak v2.1.9'da Barış'ın kararıyla `karakter-yazari`'ya verildi: güç
dengesi kararı üretiyor ve yanlış bir güç taslağı kademe tablosunu bozar. Tanım `.claude/agents/`
altında, çağrıda değil: çağrıda seçilen model unutulur, tanımdaki
unutulamaz. Ama tanım da sessizce değişebilir, o yüzden `belge` denetimi
her ajan dosyasını okuyor — listede olmayan biri Opus'a çıkarsa da,
listedeki biri Sonnet'e düşerse de kırmızı yanıyor. Hak **dörtle sınırlı**
ve liste `dogrula.py`'de yazılı; beşincisi reddedilir.

Ders defteri (`dersler.jsonl`) şu an **28 ders** taşıyor; kalıcı ve
depoda. Sayı burada yazılı çünkü sessiz silmeyi ancak bu yakalıyor.

**Koruma doğrulanır.** Bir ders "korunuyor" diyebiliyorsa bunun
karşılığı gerçekten var olmalı. Serbest metin kabul edilmiyor; koruma ya
`vaka:<sınav vakası adı>` ya `dosya:<yol>#<çapa metni>`. Ölçüm: defterde
o an 11 koruma vardı, **5'i var olmayan bir vakayı ya da silinmiş bir
satırı gösteriyordu** ve defter hepsini korumalı sayıyordu — korumasızlık
sayılıyordu ama yanlış sayılıyordu.

**Kaynağın özeti saklanır.** Bir korumanın adını korumak, iddiasını
korumak değil: kızıl takım testinde bir vakanın gövdesi boşaltıldı, adı
yerinde kaldı, hiçbir kapı görmedi. Artık koruma bağlanırken hedefin
(vaka gövdesi ya da çapa paragrafı) özeti saklanıyor; `bayat` adı duran
ama içeriği kaymış korumaları bildiriyor, `tazele` bilerek değişeni
onaylıyor.

**Makbuz tekilliği.** Bir ders başka bir korumaya sessizce bağlanamaz:
aynı kayıt farklı içerikle iki kez yazılırsa hangisinin doğru olduğu
bilinemez. Değiştirmek bir karardır, `--degistir` ile söylenir.

Defter bir **ekleme günlüğü değil**: `koru` ve `tazele` satırı yerinde
değiştirir. İlk hâlinde ekliyordu ve iki şey bozuldu — ham okuyan yerler
aynı dersi iki kez saydı (`durum` 16 derken `oku` 22 bastı), ve ders
silme denetimi kör kaldı, çünkü son satırı silmek yalnızca bir
yinelemeyi siliyordu. Değişikliğin izi zaten git'te duruyor.

### Kadro — **22 denetçi ajan**

| # | Ajan | Ne arar |
|---|---|---|
| 1 | `canon-denetci` | Site canon'la çelişiyor mu, dayanaksız iddia var mı |
| 2 | `mitoloji-denetci` | 81 il adı gerçek mitolojiyle ve cepheyle uyumlu mu |
| 3 | `kurgu-denetci` | Zaman çizelgesi, ilişki ve güç mantığı çelişkileri |
| 4 | `anlati-denetci` | Spoiler dengesi, yeni gelenin yolu, ton tutarlılığı |
| 5 | `dil-denetci` | Terim birliği, üslup, yazım, İngilizce sızıntı |
| 6 | `veri-denetci` | `data.js` ↔ `app.js` sözleşmesi, ölü veri, sessiz çökme |
| 7 | `erisim-denetci` | Klavye, odak, ekran okuyucu, hareket azaltma |
| 8 | `mobil-denetci` | Dar ekran taşması, dokunma hedefi, kesme noktaları |
| 9 | `deneyim-denetci` | Bilgi mimarisi, giriş yolu, boş durum, ölü son |
| 10 | `performans-denetci` | Render engelleme, yükleme sırası, gereksiz iş |
| 11 | `gizlilik-denetci` | Veri toplama, dış kaynak, izleme, enjeksiyon yüzeyi |
| 12 | `kesif-denetci` | Başlık, açıklama, kanonik adres, paylaşım önizlemesi |
| 13 | `test-denetci` | Ölü test, yanlış sebeple geçen test, kırılgan fikstür |
| 14 | `belge-denetci` | Belgedeki iddia ile koddaki gerçek uyuşuyor mu |
| 15 | `surum-denetci` | Sürüm dağınıklığı, üretilmiş dosyanın tazeliği |
| 16 | `akis-denetci` | İş akışı, kancalar, olay dağıtıcısı, çıkış kodu sözleşmesi — kapının kendisi çalışıyor mu |
| 17 | `celiski-denetci` | Ajan raporları birbiriyle çelişiyor mu, biri diğerinin bulgusunu geçersiz kılıyor mu |
| 18 | `gorsel-denetci` | Sayfayı gerçek tarayıcıda ölçer — JS sonrası DOM, dar ekranda taşma |
| 19 | `kaynak-denetci` | Gerçek dünya iddiasının kaynağı gerçekten onu söylüyor mu, kurgu gerçek diye sunulmuş mu |
| 20 | `olukod-denetci` | Kullanılmayan CSS sınıfı, basılmayan veri alanı, çağrılmayan betik |
| 21 | `zaman-denetci` | Tarih aritmetiği, çağ tutarlılığı, olay sırası |
| 22 | `tarama-denetci` | Toplu ve mekanik tarama, yargısız — ucuz katman (Haiku) |

**Ucuz katman — `tarama-denetci` (Haiku).** Bir videodan alınan fikir:
işe göre model seçimi. Toplu log taraması, sayma, listeleme gibi yargı
gerektirmeyen işler pahalı modelin zamanını yiyordu. Model yine **çağrıda
değil tanımda**: ayrı bir ajan, ayrı bir model, ve `dogrula.py`'deki
`HAIKU_HAKKI` listesi — Opus hakkının tersi. Listede olmayan bir ajan
Haiku'ya düşerse kırmızı; listedeki ajan Haiku'dan çıkarsa da kırmızı.
Ucuz ajan **yargı vermez**, bulduğunu adresle döndürür; anlamını üst
katman çıkarır.

### Üreticiler — **5 üretici ajan**

| Ajan | Ne yapar |
|---|---|
| `tarih-arastirmaci` | Gerçek tarihsel zemini kaynaklarıyla çıkarır; her maddeyi KESİN / YAYGIN KABUL / BELİRSİZ diye ayırır |
| `hikaye-yazari` | Canon kısıtları içinde taslak yazar; taslağın canon'a **ne eklediğini kendisi listeler** |
| `karakter-yazari` | Canon kısıtları içinde karakter, derebeyi ya da güç taslağı; güç dengesini bozmaz, `data.js` şemasına uygun önerir |
| `duzenleyici` | Denetim bulgusuna göre taslağı onarır; yeni içerik icat etmez, her değişikliği bulgusuyla eşler |
| `ozetleyici` | Çok sayıda raporu tek sunuma çevirir; tekrarı birleştirir, hiçbir bulguyu sessizce düşürmez |

Denetçilerden ayrı sayılıyorlar çünkü **sözleşmeleri farklı**: denetçi
bulur ve düzeltmez, üretici üretir ama canon'a kural koyamaz. Birini
diğerinin yerine koymak sessiz bir yetki genişlemesidir.

`tarih-arastirmaci` web'e bakabilen tek ajan. Kurgu cümlesi kurması yasak —
zemin hazırlar, üstüne bina kurmaz. `hikaye-yazari` ise web'e bakamaz:
kurgu, araştırmanın kendi kendini doğrulamasıyla değil, ayrı bir taraftan
gelen zeminle kurulmalı.

Sayılar da denetleniyor. Sebebi somut: **10 ajan istendi, 7 tane yapıldı ve
bunu betik değil Barış fark etti.** Belgede yazan sayı ile klasördeki
dosya sayısı ayrışırsa `belge` denetimi kırmızı yanıyor.

**Hepsi salt okunur.** Denetçiye yazma aracı verilmesi denetimde
reddediliyor: bulmak ile düzeltmek ayrı işlerdir ve düzeltme kararı
insanındır. Her tanım ayrıca "neyi kusur SAYMA" listesi taşıyor —
`CLAUDE.md`'deki bilinçli kararları kusur diye raporlamasınlar diye.

## Dış ajan köprüsü — Codex'i orkestraya bağlamak

Orkestra şefi Claude, uzman Codex. Aralarındaki şey `disajan.py`: bir
**sözleşme** ve bir **kapı**.

```
python3 .claude/disajan.py brief --konu "<iş>" --dal codex/<ad>
python3 .claude/disajan.py kapi  --dal codex/<ad> --taban main
```

### Akış

```
  Claude (şef)          Barış (telefon)          Codex (uzman)
      │                       │                        │
      │ brief üretir ────────▶│ yapıştırır ───────────▶│
      │                       │                        │ çalışır
      │                       │◀─── PR açar ───────────┤
      │◀── PR haberi ─────────┤                        │
      │                                                 │
      │ kapi --dal codex/… ──▶ dört ölçüm               │
      │                                                 │
      ├─ GEÇTİ  → merge kararı Barış'ın                 │
      └─ DÜŞTÜ  → bulgular PR yorumu olarak geri ───────▶
```

### Neden `gorev.py` yetmedi

Alt ajan Claude Code'un içinde, aynı bağlamda çalışıyor. Codex başka bir
yerde: bağlamı görmüyor ve işini **PR olarak** teslim ediyor. İki kural
tersine dönüyor — `gorev.py` "commit ve push YASAK" der, Codex için yasak
olan **merge**; ve alt ajanın raporu metin, Codex'in raporu **diff'in
kendisi**.

### Kapı neyi zorluyor

- **Dört ölçüm**: `dogrula.py`, `butunluk.py`, `sinav.py`, `arac-sinavi.py`.
  Codex'in çıktısına "başka bir yapay zeka yazdı" diye güvenilmiyor; aynı
  duvardan Claude'un işi de geçiyor.
- **`.claude/` dokunulmaz.** Tek satır değişmişse dal doğrudan reddedilir.
  Sınavı gevşeterek geçmek geçmek değildir.
- **Koşmayan kapı geçmiş sayılmaz.** Çıkış kodu 0/1/3 dışındaysa (betik yok,
  çöktü) dal reddedilir.

Kapı dalı ayrı bir `git worktree`'ye alıyor; buradaki iş bozulmuyor.

### Sohbet kipi — deposu olmayan ajan için

Codex'in masaüstü sürümü yoksa elde ChatGPT sohbeti kalıyor: deposu yok,
komut çalıştıramıyor, `git diff` üretemiyor. Ona "dosyayı oku" demek
anlamsız.

```
python3 .claude/disajan.py sohbet --konu "<iş>" --dosya <yol> --imza "<satır>"
python3 .claude/disajan.py uygula --yanit <cevap.txt> --dosya <yol>
```

Bu kipte değişecek parça ve canon alıntısı **brief'in içine** konur, cevap
`ESKI`/`YENI` blokları olarak istenir. Taşıma insan üzerinden olur; kapı
mekanik kalır.

Asıl risk: modelin "temizlenmiş" bir metin döndürüp istenmeyen değişikliği
sessizce içeri sokması. Koruma iki şart — ESKI bloğu dosyada **bulunmalı**
ve **tek** olmalı.

İlk gerçek kullanımda katılığın yanlış yerde olduğu görüldü: cevabın
kapanış işareti taşımada kaybolmuş, girinti silinmişti ve kapı doğru bir
işi reddetti. **Her gerçek kullanımda düşen bir kapı, kapı değil duvardır.**
Ayrıştırma esnekleşti (işaretler, girinti), eşleşme katı kaldı (içerik
kimliği, teklik). Girinti dosyadan alınıyor, cevaptan değil.

### Gevşekliğin bedeli — dosyayı bozdum

Sohbet kipinin ikinci gerçek koşusunda ChatGPT iki kaynak satırını tek
satıra birleştirmişti. Eşleştirmeyi boşluğa duyarsız hâle getirdim ve
konumu şöyle buldum: *ilk kelimeyi bul, son kelimeyi bul, arasını al.*

Bu bir **tahmindi** ve `data.js`'i bozdu — seçilen aralık beklenen metin
değildi, araya alakasız satırlar girdi. Tam da bu köprünün önlemesi
gereken şeyi kendi elimle yaptım: sessizce giren istenmeyen değişiklik.

Doğrusu şu: aday aralığı seç, sonra **eşit olduğunu doğrula.**
Doğrulanmayan konum, konum değildir. Ayrıca girinti değiştirilen bölgenin
kendi ilk satırından alınıyor ve satır sonu korunuyor — ilk düzeltmede
içerik doğruydu ama biçim bozuktu, sonraki satır yapışmıştı.

Üç ders, üçü de aynı yöne bakıyor:

- Esneklik **taşıma hasarına** karşı olmalı (işaret, girinti, satır sarma).
- Katılık **içerik kimliğinde** kalmalı (eşitlik + teklik).
- İkisi karışırsa kapı ya her şeyi reddeder ya da her şeyi kabul eder.

### Kapının kendi üç hatası

İkisi de kurarken çıktı ve ikisi de bu deponun klasik hata sınıfı:

- **Ölçüm katmanını dalın üstüne kopyalıyordum** — "Codex sınavı
  gevşetmesin" diye. Dal eski bir tabandan türediğinde yeni betikler eski
  belgelerle karşılaşıyor ve dört kapı da düşüyordu: dalın işiyle hiç
  ilgisi olmayan bir kırmızı. Gevşetme riski zaten `.claude/` denetimiyle
  kapalıydı; kopyalama gereksiz ve zararlıydı.
- **Koşmayan kapıyı geçmiş sayıyordum.** Dalda `butunluk.py` bulunmayınca
  çıkış 2 geldi ve kapı "dördü de geçti" dedi. Koşmayan denetim, geçen
  denetim değildir.
- **Kapı kendi kendini çağırıyordu.** `arac-sinavi.py`'yi de koşuyordum ama
  o sınavın içinde kapıyı sınayan vakalar var — sonsuz özyineleme. İlk
  gerçek kullanımda kapı 10 dakikada dönmedi ve arkasında **140 yetim
  `git worktree`** bıraktı; git her işlemde hepsini tarayınca depo
  ağırlaştı. Doğrusu o sınavı hiç koşmamak: dış ajan `.claude/`'a
  dokunamadığına göre araçlar tabanla birebir aynı.

## Geri bildirimin kapanmayan ucu

Halka şöyle anlatılıyordu: hata bulunur, deftere yazılır, kalıcı teste
dönüşür. Ama `isle` sadece **geri-getirme** kayıtlarını otomatik vakaya
çeviriyordu; `canon`, `kural` ve `davranis` türleri "(insan)" diyordu ve
sonra **hiçbir şey insanın gerçekten test yazdığını doğrulamıyordu.**

Kayıt kapanıyor, hata düzeliyor, koruma yazılmıyor — ve hata bir sonraki
değişiklikte sessizce geri geliyor. Nitekim geldi: altın set kayma denetimi
eklendi, elle negatif test edildi, vakası yazılmadı; bunu ancak mutasyon
sınavı buldu.

```
python3 .claude/geri-bildirim.py kapat --no 4 --vaka "canon: dış sıralama iddiası yok"
python3 .claude/geri-bildirim.py korumasiz
```

Artık bir kayıt **koruyan testi adıyla söylenmeden kapatılamıyor**, ve o
test gerçekten var olmalı. `korumasiz` komutu testsiz kapatılmış kayıtları
listeliyor.

İlk çalıştırmasında üç kayıt yakalandı — ve üçünü de bu oturumda **elle
JSONL düzenleyerek** kapatan bendim. Araç vardı, kullanmadım; tam olarak
bu deponun reddettiği şeyi yaptım. Üçü de koruyan vakalarıyla yeniden
kapatıldı, bu oturumun kendi dört hatası da deftere geçirildi.

Testsiz kapatılan hata, düzeltilmiş değil **ertelenmiş** hatadır.

### Ve kapatmanın kendi testini doğurması

İlk gerçek kullanımda bir adım daha eksik çıktı. Sarı Gülücük'ün parası
düzeltildi, birleştirildi — ama kayıt **kapatılamadı**, çünkü o düzeltmeyi
koruyan bir vaka yoktu. Kapı doğru davrandı; eksik olan, her canon
düzeltmesi için elle test yazmanın sürdürülebilir olmaması.

Çözüm tek bir bütünlük vakası: `canon: kapatılmış çelişki geri gelmemiş`.
Defterdeki kapalı `canon` kayıtlarının tırnak içindeki yanlış ifadelerini
depoda arıyor. Kayıt kapandıysa o ifade bir daha görünmemeli.

Böylece **her kapatma kendi regresyon testini doğuruyor** — ayrıca yazmayı
hatırlamaya gerek kalmadan. Negatif test edildi: `"Parası sınırlı"` geri
`"Para sıkıntısı yok"` yapıldığında vaka anında düşüyor.

## Marka — üretilen, yazılmayan

Echo'nun bir işareti var ve o işaret bir dosya değil, bir **çıktı:**

```
python3 .claude/logo.py yaz        üç SVG'yi üretir
python3 .claude/logo.py denetle    diskteki dosya üreteçle aynı mı
python3 .claude/logo.py goster --ne simge
```

| Dosya | Nerede kullanılır |
|---|---|
| `marka/echo-logo.svg` | Tam kilit — işaret + yazı + sürüm |
| `marka/echo-isaret.svg` | Kare işaret, 48 piksel ve üstü |
| `marka/echo-simge.svg` | Sade simge, 32 piksel ve altı, favicon |

Çizim şunu anlatıyor: dış kesik halka **ölçüm halkası**, üç yay merkeze
doğru güçlenen **KAT 2-3-4**, çekirdek **yapılan iş**, içeri dönen ok
**çıktının denetimden geri gelmesi** — adın sebebi.

İki karar burada ölçümle alındı, gözle değil:

- **Sürüm numarası SVG'ye elle yazılmıyor,** `surum.json`'dan üretiliyor.
  İki yerde duran numara ayrışır: `v1.2`'ye geçtiğimiz gün logo `v1.1`
  kalırdı ve kimse fark etmezdi. `belge` denetimi dosyayı üreteçle
  karşılaştırıyor — elle düzenlenirse ya da bayatlarsa kırmızı yanıyor.
- **Üç dosya var çünkü aynı çizim her boyda okunmuyor.** Küçülme sınavını
  çalıştırdım: işaret 32 pikselde dağıldı — kesik halka gri bulanıklığa,
  soluk yay hiçliğe, ok lekeye döndü. Sade simge o yüzden var. Sadeliğin
  kendisi de test edilmiş durumda: simgeye kesik halka ya da ok geri
  eklenirse sınav düşer, yoksa biri onu "tutarlılık olsun" diye işaretle
  aynı hâle getirir ve küçük boy sessizce bozulur.

## Deneme sınavı — sistem hatayı fark ediyor mu, düzeltebiliyor mu

Barış'ın isteği: 5 test, her birinde 6 soru, soruları ben yazayım. Kendi
kör noktamı ölçmemek için beklenen satırlar arama koşturulmadan ÖNCE
`LORE.md` okunarak sabitlendi; arama körlemesine koştu, sonra puanlandı.

| Test | Önce | Sonra |
|---|---|---|
| T1 Doğrudan olgu | 6/6 | 6/6 |
| T2 Tablo satırı | 6/6 | 6/6 |
| T3 Canon'un sustuğu yer | 5,5/6 | 6/6 |
| T4 Ağız dili, ek, eş anlamlı | 3,5/6 | 6/6 |
| T5 İki kaynak gerekir | 5/6 | 6/6 |

"Sonra" sütunu döngü katmanıyla: arama + düzeltilmiş `/sor`. Aramanın
tek başına, tek adımda ilk 3'e getirdiği oran %82'den %91'e çıktı.

### Fark ediyor mu

**Önce: hayır.** `degerlendir.py` %100 diyordu; yargıç dört yanlış soruyu
tanımıyordu. Altın sette "Barış nerede tutuluyor" vardı ve geçiyordu —
aynı sorunun gündelik hâli "barışı nerde saklıyolar" reddediliyordu.
Altın set yalnız düzgün yazılmış soruyu sınıyordu.

**Geri bildirimden sonra: evet.** Dört hata `geri-bildirim.py` ile altın
sete girince `degerlendir.py` kırmızıya döndü (isabet@3 %83) ve yargıç
dördünü de doğru gerekçeyle yakaladı: üçünde "cevabı canon'da olan
soruyu reddetti", birinde "atıf yok" (site verisini dayanak göstermişti).

Sistem kendi hatasını geri bildirim yazılırken de yakaladı: dayanak
satırını yanlış vermiştim (`LORE.md:157`, o satırda "abisi" geçmiyor) ve
altın setin kayma denetimi bunu hemen işaretledi.

### Düzeltebiliyor mu

**Evet, iki katmanda:**

- **Arama.** Kesilmiş kök, canon'da tam 4 harflik bir kelimeyle
  başlıyorsa tanınıyor (`ağaçt` → `ağaç`); ağız dilindeki yer zarfları
  yazı diline çevriliyor (`nerde` → `nerede`). İlk denediğim kural fazla
  gevşekti ve konu dışı reddini %100'den %50'ye düşürdü — "react
  BİLEŞeni" canon'daki "bile"yle eşleşti. Kural daraltıldı, "bile"
  durak listesine girdi, ret %100'e döndü. Ölçüm her adımda yakaladı.
- **`/sor` talimatı.** "Arama hiçbir şey döndürmedi → soru bu evrenle
  ilgili değil" diyordu. Yanlıştı. Artık boş sonuçta bir kez yeniden
  ifade ediyor, ilişki sorusunda ilişki fiilini tek başına arıyor, yalnız
  `data.js` gelince canon'da tam adlarla arıyor.

Yargıç düzeltilmiş cevaplara 30/30 verdi, uydurma sıfır.

### Neyi ölçmüyor

- Talimata ilk yazdığım örneklerde **test sorularının cevapları** vardı
  ("Nemesis → Cips Yiyen Adam", "saklıyorlar → tutuluyor"). Ölçmeden önce
  soyutlandı; yoksa döngünün cevabı bulduğunu değil talimatı okuduğunu
  ölçmüş olurdum.
- 3.3'te eş anlamlıyı ("şehir" → "memleket") ben seçtim ve cevabın o
  satırda olduğunu biliyordum. O adımın başarısı tamamen sisteme
  yazılamaz.
- Arama katmanında iki soru hâlâ kaçıyor (tek yönlü ilişki, karşılaştırma).
  Altın sette bilerek duruyorlar; isabet@3 %92 ile eşiğin hemen üstünde.

### Yan bulgu — canon'da bölge tutarsızlığı (kapandı)

`LORE.md:187` Orta cephenin bölgesine "Batı Karadeniz", `LORE.md:188`
Doğu cepheye "Doğu Karadeniz" diyor. Ama tablolarda Trabzon ve Giresun
(Doğu Karadeniz) Orta cephede; Zonguldak, Bartın, Bolu, Düzce (Batı
Karadeniz) Batı cephede. `butunluk.py` 27/27/27 dağılımını denetliyor,
bölge tanımlarını denetlemiyor.

Barış onayladı; iller değil **bölge tanımları** düzeltildi. İlleri
taşımak derebeyi adlarını da değiştirmeyi gerektirirdi (Zonguldak'ın
Herakles'i Yunan, Trabzon'un Şuwaliyat'ı Hitit) ve 27/27/27 dengesini
bozardı. `LORE.md` ve `data.js` birlikte güncellendi.

## Gölge modu — yeni kapıların deneme süresi

Beyin V3'ten: `jev shadow` → `jev on`. Yeni bir bileşen önce gölgede
çalışır, kararını hesaplar ama uygulamaz; ölçülünce devreye girer.

Bu depoda gerekçesi bir günde üç kez yaşandı. Aynı gün eklenen üç araç
ilk gerçek kullanımda kendi kusurunu gösterdi:

| Araç | İlk gerçek kullanımda |
|---|---|
| `iz.py` | tekrarı kaydetmeyi reddetti — varlık sebebini |
| `ablasyon.py` | çıkış 0 ile ölen sınavı "sıfır vaka düştü" diye okudu, iki halkayı yanlışlıkla KANITSIZ ilan etti |
| `bekci.py` | kendini listeden çıkaran dalı göremedi |

Üçü de o an kapı olsaydı ya yanlış yere kırmızı yakacak ya da yanlış yere
yeşil geçirecekti. İkincisi daha kötü: yanlış kırmızı fark edilir, yanlış
yeşil edilmez.

Kurallar:

- `ekle` **her zaman gölge** ekler. Deneme süresi atlanabilir olsaydı,
  atlanırdı.
- Gölge çıkış kodunu **etkilemez** ama kararını **basar** — hesaplayıp
  susmak, hiç hesaplamamaktan farksızdır.
- **"Koşmadı" ayrı bir hâl.** Her kapının bir özet deseni olabilir; kod 0
  dönüp özeti basmayan kapı temiz değil koşmadı sayılır. Tek bir "koşmadı"
  terfiyi engeller.
- **Terfi en az 5 koşu ister.** Beş ölçülerek seçilmedi, seçilemezdi —
  henüz terfi etmiş bir kapı yok. Gerekçe: üç kusurun üçü de ilk koşuda
  göründü, beş onları elemeye yeter.
- **Terfi insan kararı.** `terfi` kanıtı denetler, ama değişen şey
  `golge.json` — ve o dosya bekçinin listesinde. Gölgeden kapıya çıkmak
  bir kapıyı sertleştirir, kapıdan gölgeye inmek yumuşatır; ikisi de ölçen
  aleti değiştirir.
- **CI sayaç yazmaz.** Yazsaydı her CI koşusu depoyu kirletir ve kendi
  "depo temiz kaldı mı" kapısını kırmızıya çevirirdi.

İlk gölge kapı özellik sınavı: CI'da zaten elle "uyarı, kapı değil"
yapılmıştı. Artık o kararın bir kuralı ve bir terfi yolu var.

Bir vaka yazılırken yapılan mutasyon denemesinde **eşdeğer mutant**
çıktı: "kayıt her zaman yazılsın" diye bozulan kod, sayaç artmadığı için
dosyaya aynı baytları yazıyordu ve vaka onu yakalamadı. Vaka ölü değildi —
mutasyon davranışı değiştirmiyordu. Davranışı gerçekten değiştiren
mutasyonu (sayaç CI'da da yazılsın) yakaladı. Yakalanmayan her mutasyon
ölü test demek değildir; önce mutasyonun bir şey değiştirip değiştirmediğine
bakılır.

## Acil kapatma anahtarı — `ECHO_KAPALI`

Beyin V3'ten: `BEYIN_JEV_DISABLE=1` kayıtlı ayarı değiştirmeden bütün
çağrıları durdurur.

Bir kanca bozulur da her düzenlemede ya da her oturum açılışında sorun
çıkarırsa, telefondan onu kapatmanın hızlı bir yolu yoktu: ya
`settings.json`'ı düzenlemek ya da betiği onarmak gerekiyordu.

`ECHO_KAPALI=1` açıkken `olay.py` hiçbir işleyiciyi koşturmaz. Sözleşme
denetimi dahil — acil durumun anlamı bu. Kaldırılınca her şey eski hâline
döner, çünkü hiçbir ayar değişmedi.

**Sessiz değil.** Sessizce kapalı kalan bir kapı çalışıyor gibi görünür:

- atlanan her olay deftere `atlandı — ECHO_KAPALI açık` diye yazılır
- oturum açılışında tek satır: `ECHO KAPALI — kancaların HİÇBİRİ koşmuyor`
- `olay.py tablo` en üstte uyarır

**Kalıcı açık bırakılması ayrı bir tehlike.** `settings.json`'ın `env`
alanına yazılırsa Echo her oturumda ölür — ve bunu fark edecek kancalar da
ölüdür. Dağıtıcı bunu göremez, çünkü o da kapalıdır. Bu yüzden kilit
**dışarıdan** bakıyor: `dogrula.py` ayar dosyalarında `ECHO_KAPALI` görürse
hata verir, ve `dogrula.py` CI'da kancadan bağımsız koşuyor.

## Ölçüm katmanı bekçisi — ölçen aleti kim değiştirdi

Fay enjeksiyonu denetleyicinin dikkatini ölçüyor, mutasyon testlerin
canlılığını, TDD kapısı kırmızıyı zorunlu kılıyor. Üçü de şunu
engellemiyordu: **ajanın denetleyiciyi kendisi değiştirerek geçmesi.**

Teorik bir risk değil. Bu depoda bir oturum boyunca `arac-sinavi.py`
onlarca kez düzenlendi ve bazıları **kırmızı yanan bir testi düzeltmek**
içindi. Çoğu meşruydu — ama meşru olanı olmayandan ayıran bir şey yoktu.

Emsali vardı: `disajan.py` dış ajanın `.claude/` altına dokunan dalını
reddediyor. Dışarıdakine uygulanan disiplinin içerideki için geçerli
olmaması tuhaftı.

### Neden kilit dosyası değil

Akla ilk gelen çözüm `tests.lock` + SHA-256. Çalışmaz: **kilidi yazabilen
kilidi de güncelleyebilir.** Kapsamı ikinci bir kilitli dosyada tutmak da
sonsuz döngü.

Gerçek çapa başka yerde: **dalı ajan yazar, tabanı insan merge eder.**
Karşılaştırma bir dosyaya değil taban commit'ine bakıyor; ajan dalda ne
yaparsa yapsın taban onun yazamadığı yerde duruyor.

Aynı açık bekçinin kendisinde de vardı ve bir vaka onu yakaladı: dal,
listeden `bekci.py` satırını silince bekçi kendini görmez oldu. Liste de
tabandan okunuyor artık, ve iki liste **birleştiriliyor** — dosya
eklemek hemen etkili, çıkarmak insan kararı. Asimetri kasten: korumayı
genişletmek serbest, daraltmak değil.

Sözleşme: ölçüm dosyalarına dokunmak yasak değil, **beyansız** dokunmak
yasak. `ÖLÇÜM-DEĞİŞTİ: <gerekçe>`. Beyan onay değil — çıkış 3, merge
kararı insanın.

## Oturum başı duman testi — zemin kırmızı mı

CI işin SONUNDA, kanca dosya düzenlendiğinde koşuyor. İkisi de **bu
oturumda yapılanı** denetliyor. İki oturum arasında depoya dışarıdan
giren bir şey — telefondan GitHub web arayüzünde yapılan düzenleme,
başka bir oturumun yarım işi, merge sonrası kalan tutarsızlık — hiçbirini
tetiklemiyor ve ilk işin zeminine denetlenmeden giriyordu. **Kırmızı bir
zemine konan yeşil iş, yeşil değildir.**

Hızlı kapıları koşuyor (~0,4 sn): kural denetimi, bütünlük, iki defterin
çürümemişliği. Araç sınavı burada yok — 40 saniye sürüyor, oturum
açılışında kabul edilemez. Kapsamı CI'den dar olması eksiklik değil hız
tercihi, ama bunu yazmak gerekiyor yoksa sonraki okuyan tam kapsam sanar.

Yeni denetim icat etmiyor, var olan kapıları çağırıyor: kapılar
güçlendikçe duman da güçleniyor, ayrı bakım istemiyor. Bu, fikrin bilinen
riskine karşı: *"test seti incelirse her şey hep yeşil görünür."*

**Oturumu engellemez.** `kanca-ders.py` ile aynı disiplin — açılışı
engelleyen bir uyarı, uyarı değil engeldir. Kanca olması ise şart: talimat
olarak kalsaydı atlanabilirdi, ve bu deponun en çok uğraştığı hata türü
tam olarak odur.

## Özellik sınavı — kural yaz, girdiyi makine üretsin

`arac-sinavi.py` ve `butunluk.py` vakaları **elle yazılmış örnekler.** Her
biri birinin aklına gelmiş bir durumu korur — ve tam olarak o kadarını.
Aklıma gelmeyen durum korunmuyor.

Burada tersi: örnek değil **kural** yazılır, üretilen girdilerde denenir.
Benim seçmediğim girdiler benim kör noktamı taşımaz.

Karşı-örnek **küçültülüyor**: kural hâlâ ihlal ediliyorken atılabilen
parça atılır. Amaç en küçüğü bulmak değil, okunabilir olanı bulmak.
Tohum basılıyor — tekrar üretilemeyen kırmızı, düzeltildiği
doğrulanamayan kırmızıdır.

### İlk koşusunda ne buldu

Gerçek bir kusur, ve tam da sistemin en çok önemsediği yerde. `ara.py`
dosyayı `split("\n")` ile bölüyordu; dosya satırsonuyla bittiği için
sonda boş bir eleman kalıyor ve son parçanın bitişi bir fazla çıkıyordu.
Sonuç: **son parçanın adresi dosyanın son satırından bir sonrasını
gösteriyordu** — var olmayan bir satıra atıf.

Bu depoda her iddia bir satır adresine bağlanıyor ve `yargi.py` atıfların
doğru satırı gösterdiğini denetliyor. Elle yazılmış vakaların hiçbiri
dosya SONUNU sınamamıştı.

### CI'de kapı değil uyarı

Yöntemin ölçülmüş yanlış alarm oranı yüksek. Yanlış alarmla kapı
kapatmak, kapıyı görmezden gelmeyi öğretir. Çıkan karşı-örnek doğrudan
kusur sayılmaz — bakılır, gerçekse geri bildirim halkasıyla kalıcı
vakaya çevrilir.

Ters tuzağı da var: kural ölçtüğü fonksiyonun kopyası olarak yazılırsa
hiçbir şeyi sınamaz. Bir vaka bunu zorluyor — okuyucu kasten bozulunca
özellik sınavı kırmızı yanmalı.

## Halka ablasyonu — hangi halka hak ediyor

Otuzdan fazla halka var ve **hiçbirinin hak ettiğini kanıtlayan bir ölçüm
yoktu.** Her halka başka bir şeyi ölçüyor; hiçbiri kendisinin ölçüldüğünü
göstermiyor. Evrim döngüsü EKSİK yeteneği arıyor, FAZLA olanı değil.

Büyüyen bir sistemde küçültme mekanizması olmaması, tören biriktirmenin
garantisidir: halka eklenir, kimse silmez, kimse ölçmez, ve on halka
sonra sistemin ne kadarının gerçekten çalıştığı bilinmez.

Yöntem mutasyonun kardeşi, ters yönde:

| Sınav | Ne yapar | Ne sorar |
|---|---|---|
| **mutasyon** | aracı **bozar**, sınav yakalamalı | test canlı mı? |
| **ablasyon** | aracı **kaldırır**, sınav düşmeli | araç ölçülüyor mu? |

Kaldırılınca hiçbir vaka düşmüyorsa o aracı hiçbir şey sınamıyor demektir.
Kötü olduğu anlamına gelmez — **ölçülmediği** anlamına gelir, ve
ölçülmeyen şeyin çalıştığı da bilinmez.

Zemin kirliyse ölçüm yapılmıyor: düşen vakayı ablasyon mu yoksa zaten
kırık bir şey mi düşürdü, ayırt edilemez.

### İlk tam taramanın yalanı

İlk tam tarama iki halkayı — `tirmanma.py` ve `yargi.py` — **KANITSIZ**
ilan etti. İkisi de kanıtlıydı: `yargi.py` kaldırılınca 9, `tirmanma.py`
kaldırılınca 3 vaka düşüyor.

Yalanın kaynağı boş kabuktu. Modül düzeyinde `sys.exit(0)` çağırıyordu ve
bir sınav vakası o aracı fikstür kurmak için **içe aktarınca** `SystemExit`
bütün sınavı süpürdü. Süreç **çıkış kodu 0** ile öldü, tek satır bile
basmadı, ve ablasyon bunu "sıfır vaka düştü" diye okudu.

Defterdeki *"0/1/3 dışında bir çıkış kodu geçti sayılmaz"* dersi bir adım
eksikmiş: bir araç kodu 0 verip işini **hiç yapmamış** da olabilir. Kanıt
artık kodun kendisi değil, sınavın **özet satırı** — ve düşen sayısı FAIL
satırı sayarak değil özetten türetiliyor (`M - N`), çünkü hiç satır
basmayan bir sınav sıfır FAIL gösterir.

"Zemin kirli" ile "sınav koşmadı" da artık ayrı iki hâl. Karıştırmak,
tuzağın kendisiydi.

### Kendi özyinelemesi

İlk tam tarama zaman aşımına girdi. Sebep: `arac-sinavi.py` ablasyonun
kendi vakalarını taşıyor ve o vakalar `ablasyon.py` çağırıyor — ablasyon
sınav koşturunca sınav ablasyon koşturuyor, o da yine sınav. Ölçüldü:
sınav **60 saniyeden 1 dakika 44 saniyeye** çıkmıştı.

`ECHO_ABLASYON` bayrağı açıkken o vakalar atlanıyor. Atlama **sessiz
değil**, raporda yazılı — sessizce atlanan vaka, geçen vaka gibi görünür.
Ve atlanan sayı bir vakayla korunuyor: yeni bir ablasyon vakası eklenip
bayrağa bağlanmazsa özyineleme geri döner, bağlanıp sayı güncellenmezse
rapor yalan söyler.

**Hiçbir halkayı silmez** (çıkış 3). İki gerekçe: kanıtsızlık aracın
değil SINAVIN kusuru olabilir (daha olası), ve kendi kendini budayan bir
araç en zayıf halkayı değil **en az sınanmış** halkayı silerdi — tam
tersi bir seçim. Bu da reddedilen kategoriyle aynı ilke: ölçülen şeyin
ölçen kuralı değiştirme yetkisi olmamalı.

## İz analizi — koşular arası hata döngüsü

Tepe tırmanma döngüsünün eksik ayağıydı. Her halka **kendi turuna**
bakıyordu: `elestirmen.py` aynı turun tekrarını, `devre.py` aynı koşunun
salınımını, `eniyile.py` aynı halkanın puanını görüyor. Hiçbiri şunu
göremiyordu:

    "Bu aynı şekildeki hata üç ayrı koşuda dört kez oldu."

Ham malzeme de kalıcı değildi: `seyir.jsonl` ve `olay-defteri.jsonl`
ikisi de `.gitignore`'da. Ertesi gün "nerede hata yapıldı" sorusunu
soracak bir şey kalmıyordu.

`iz-defteri.jsonl` **kalıcı ve depoda.** İçinde ham iz yok — ham iz
bağlamı çürütür ve zaten `seyir.py`'nin kasten dışarıda bıraktığı şey.
Duran şey **hata şekli**: ne oldu, nerede, hangi kapı yakaladı (ya da
yakalayamadı), kanıtı ne.

### Kimlik neye bağlı

Ders defterinden alınan disiplin: kimliği doğrulanabilir olana bağla.

| Küme | Kimlik | Sonuç |
|---|---|---|
| **Yer kümesi** | adres — aynı dosyada tekrarlıyor | ölçüm, çıkış 0/1 |
| **Şekil kümesi** | kelime — farklı yerlerde benzer cümle | **tahmin**, çıkış 3 |

İkincisi insan kapısına çıkıyor. Kelime örtüşmesiyle "bunlar aynı hata"
demek bir ölçüm değil bir tahmindir, ve sistem tahminini ölçüm diye
sunmaz. Aynı hata mı, benzer cümleyle yazılmış iki ayrı hata mı — makine
ayıramaz.

Defterin en değerli kaydı `kapi: yok` olanlar: **hiçbir mekanik kapının
görmediği hata.** `oner` tam olarak onları gösteriyor.

### Neden hiçbir şeyi kendiliğinden değiştirmiyor

Bu aracın en önemli sınırı, ve bir vakayla zorlanıyor
(`iz: kuralı kendiliğinden değiştirmiyor`).

Ölçülen şeyin, ölçen kuralı yazma yetkisi olursa kural kural olmaktan
çıkar. Kızıl takım testinde bunu gördük: bir testin **adı yerinde
bırakılıp gövdesi boşaltıldı** ve hiçbir kapı fark etmedi. Kural yazma
yetkisi olan bir ajan bunu kötü niyetle değil **iyi niyetle** yapar —
"bu test gereksiz katı" der, gevşetir, sistem yeşil kalır, ölçüm ölür.

Otomatik önerilebilecek şey kural değil **test**: yanlış bir test
gürültülü biçimde kırmızı yanar, yanlış bir kural sessizce yanlış şeyi
savunmaya başlar ve aylarca fark edilmez.

Bir iz, onu yakalayan vakanın **adıyla** kapanıyor ve o ad gerçekten var
olmalı — doğrulamayı `ders.py`'nin çözücüsü yapıyor, ikinci bir kopya
yazılmadı: iki çözücü ayrışır, biri düzeltilir öbürü eski kalır ve
hangisinin doğru olduğu bilinmez. `coken` karşılığı sonradan silinen ya
da içi boşaltılanı yakalıyor.

## Rapor okuyucu — özyinelemeli okuma

26 ajan koşturulduğunda 26 rapor çıkıyor ve bunları kabuktan okumak
bağlamı taşırıyordu. Yasak doğruydu ama **yerine bir şey konmamıştı**:
raporlar `ozetleyici` ajanına devrediliyordu, o da aynı pencere sınırına
çarpıyordu, sadece başka bir yerde.

Fikir bu depoda zaten iki yerde uygulanıyor — veriyi modele yükleme, dış
ortamda tut, programlı sorgula:

| Araç | Ne yapıyor |
|---|---|
| `okuyucu.py` | `data.js`'i modele okutmaz, Python'da ayrıştırır |
| `ara.py` | LORE'u yüklemez, BM25 ile sorgular, satır döndürür |
| `rapor.py` | raporu yüklemez, arar/parçalar/adres döndürür |

`rapor.py` bir adım ekliyor: **özyineleme.** `parca` büyük bir raporu
kararlı numaralı parçalara böler; model parçayı ister, işler, bir
sonrakini ister. Tamamını hiç görmez, ve nerede kalındığı kaybolmaz.

`al` içeriği **basmaz**, yalnızca ölçü basar — aracın bütün varlık sebebi
bu ve bir vaka onu zorluyor (`rapor: içeriği pencereye basmıyor`).
Basmamak saklamamak değil: aynı vaka içeriğin depoda **durduğunu** da
doğruluyor, sorulunca bulunuyor.

Serbest özet yok. `seyir.py`'deki ile aynı gerekçe: serbest özetleyici
neyin önemli olduğunu bilmez ve tam da sonradan lazım olacak şeyi atar.
Dönen şey **adresli satır** — okuyan gider bakar.

`ortak` birden fazla raporun gösterdiği adresi önceliklendiriyor ama
çıktısında bunun kanıt olmadığını söylüyor: **aynı modelin N kopyası N
bağımsız göz değildir**, aynı kör noktayı paylaşırlar. Bu da bir vakayla
zorlanıyor — uyarı silinirse sınav kırmızı yanar.

Depo (`rapor-deposu/`) koşuya özel ve `.gitignore`'da; kalıcı bilgi ders
defterine ya da iz defterine yazılır.

## Sınırlar

Bunlar tahmin değil, fay enjeksiyon sınavıyla ölçüldü: **93 vaka
(80 yakalanmalı, 13 masum)** ve **24 altın soru**. Bu sayılar `dogrula.py`
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
- **Eşikler küçük bir sete göre ölçüldü.** Ne kadar küçük olduğu artık
  sayıyla görünüyor: 24 soruda isabet@3 %92, %95 Wilson aralığı
  **[%74–%98]** [K12][K13]. Aralığın alt ucu %90 eşiğinin altında; yani bu
  setle "eşiğin üstündeyiz" demek istatistiksel olarak kanıtlanamıyor. Oran
  %95 olsaydı bunun için yaklaşık **140 soru** gerekirdi (133/140'ın alt ucu
  %90.04); bugünkü %92 eşiğe o kadar yakın ki **~870 soru** ister. Pratik
  sonuç: eşiğin hemen üstündeki bir oran küçük setle kanıtlanamaz, ancak
  izlenir. Parametreleri
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
  geri kalan denetimleri koşuyor. Aynı ilke sonradan genelleşti: herhangi
  bir denetimin çökmesi artık sadece kendi başlığını düşürüyor.
- Bu katman siteyi değiştirmez, sadece üzerinde çalışma biçimini değiştirir.
- Uzman ajanlar sıfırdan başlar; `LORE.md` okumalarını söylemezsen okumazlar.
- Ajan raporu delil değildir. Sayı/isim/tarih iddiasını dosyadan doğrula.

### İkinci tur: döngülerin kenarında çıkan açıklar

Döngülerin içi ölçülüydü; kenarları değildi. Bu tur sistemi dışarıdan okuyup
"hangi alana hiçbir döngü bakmıyor" diye sordu. Bulunanlar:

- **Kör nokta dosyaları.** `gizleme` ve `odak` elle yazılmış dosya listesine
  bakıyordu: `goz.js` ve `animasyon.css` hiçbir denetime girmiyordu. Daha
  kötüsü, sınavdaki "SVG dizesinde opacity=0" masum vakası `goz.js`'i
  değiştiriyordu — dosya hiç taranmadığı için **yanlış sebeple** geçiyordu.
- **En temel kural ölçülmüyordu.** "Veri toplanmıyor, dış servis yok"
  CLAUDE.md'nin ilk kuralıydı; tek bir `fetch()` ya da analitik betiği
  hiçbir denetime takılmazdı.
- **İddia olarak duran sayılar.** "81 ilin 81'i dolu" yazılıydı, ölçülmüyordu.
  İki ilin derebeyi yer değiştirse iki ad da LORE'da "geçtiği" için `lore`
  temiz derdi.
- **Kırık bağlantıya kimse bakmıyordu.** Bir karakterin kimliği değişince
  `efsane.html` ve `mafya.html`'deki derin bağlantı sessizce kopardı.
- **Altın set kayması geç fark ediliyordu.** Kanca LORE düzenlemesinde sadece
  denetleyiciyi çağırıyordu; satır kayması ancak elle koşulan bir sonraki
  değerlendirmede görülüyordu.
- **Bash ile düzenleme ve kırmızı commit** hiçbir kapıya takılmıyordu.
- **Hafıza okunmuyordu:** dört canon kaydı iki aydır açık bekliyordu.
- **Ölçü gevşetilebiliyordu** ve **eşiğin üstündeki gerileme** görünmüyordu.
- **Belge çürümüştü:** mutasyon sayısı (15 yazıyor, 19 vardı) ve "yayına
  çıkmıyor" iddiası.

Her birinin karşılığı yukarıda bir denetim, kanca ya da araç olarak duruyor
ve her biri fay, araç ya da mutasyon sınavında ölçülüyor. Bu sistemin kuralı
burada da geçerli: **eklenen her koruma, kendisini koruyan bir testle geldi.**

### Üçüncü tur: kaynaklı geliştirmeler

Bu tur zayıf yeri tahminle değil ölçüyle aradı ve her düzeltmeyi bir
kaynağa bağladı. Ayrıntılar ilgili bölümlerde; özet:

| Açık | Önce | Sonra | Dayanak |
|---|---|---|---|
| Aksansız soru ("Tesup'un zaafi nedir") | isabet@3 %60 | normal soruyla aynı (değişmezlik %100) | [K11] |
| Türkçe olmayan klavyede büyük harf ("AHRIMAN KIMI KILITLIYOR") | sonuç yok | ilk sonuçta doğru yer | [K11] |
| Yazım değişmezliği ölçülmüyordu | — | 170 çift (24 altın soruyla), %100 eşik | [K9][K10] |
| Oranlar tek sayıydı | isabet@3 %92 | %92 [%74–%98] | [K12][K13] |
| Açılış kancası defter metnini talimatla aynı kanaldan veriyordu | işaretsiz | veri bloğu, satır sınırı, şüpheli kalıp işareti | [K7][K8] |
| Erişilebilirlikte sadece kontrast ve odak halkası ölçülüyordu | 2 ölçü | + dil, başlık, `alt`, erişilebilir ad, yakınlaştırma, başlık düzeyi | [K14][K15] |
| Mekanizmaların dayanağı yazılı değildi | — | 20 kaynak; `belge` atıfları sayıyor | — |
| Elle yazılan mutasyon kendi kör noktasını göremiyordu | 45 elle yazılmış | 58 elle + 149 noktada operatörle üretilen; skor %78 → %100, yaşayan her mutant gerekçeli eşdeğer | [K5][K6] |

Ölçülemeyen kısım da yazılı kalsın: değişmezlik eşiği %100 ama 170 çift
yine aynı 24 altın sorudan türüyor — setin küçüklüğü (Sınırlar) burada da
geçerli. Erişilebilirlik denetimi WCAG'nin makineyle ölçülebilen tabanıdır;
klavyeyle gezinme ve ekran okuyucu deneyimi hâlâ elle denenir.

## İş ve karar defteri — yarım iş ve reddedilen fikir

Yarım iş `butce.py kilometre` ve `hedef.py`'de tutuluyordu; ikisi de
koşuya özel, oturum bitince siliniyordu. Ders defteri hatayı tutuyor,
kararı değil. Dört ayrı dış kaynak aynı boşluğu gösterdi (Backlog.md,
reddedileni gerekçesiyle tutan hafıza, "geçmiş karar geri çağrılmıyor").

`defter.py` → `is-defteri.jsonl`, **kalıcı ve depoda.** Durumlar:
`acik`, `yarim` (devam noktası zorunlu), `askida` (insan kararı),
`reddedildi` (gerekçe zorunlu), `bitti`. Oturum açılışında
`kanca-defter.py` özetini basar. `oner "<fikir>"` reddedilmiş bir
kayda benziyorsa **çıkış 3** verir: ret gerekçelendi, yeniden açmak
insan kararı. Benzerlik kelime köküyle ölçülür, tahmindir — bu yüzden
kapı değil soru.

## Canon etki haritası — değişiklik neye dokunuyor

`butunluk.py` canon ile verinin şu an tutarlı olup olmadığını ölçer;
bir değişikliğin neye dokunduğunu söylemez. `etki.py` değişen LORE.md
bölümünün adlarını (başlık + kalın ifadeler) çıkarır ve LORE.md'nin
geri kalanında, `data.js`'te ve sayfalarda arar; bulunan her yer
adresiyle listelenir (çıkış 3, insan kapısı). Metinsel eşleşmedir —
takma adla anılan yer kaçar; liste kanıt değil kontrol listesidir.
`--kaydet` bulguları iş defterine `acik` kayıt olarak yazar.

## Araç dizini

`CLAUDE.md` her oturumda baştan sona bağlama yükleniyor ve 18 KB'a
çıkmıştı: aracın ne yaptığı ve neden var olduğu, her oturumda gereken
kuralla aynı yerde duruyordu. Dışarıda gözlenen uyarı tam buydu —
talimat dosyası büyüdükçe bağlam şişer, model neyin kural neyin tarih
olduğunu ayıramaz. Araç anlatımları buraya taşındı (v2.1.6); `CLAUDE.md`
yalnız kuralları tutuyor ve boyut bütçesini `dogrula.py` zorluyor.

Aşağıdaki metin taşındığı hâliyle duruyor; her aracın ayrıntılı bölümü
bu belgenin yukarısında.

`.claude/` altında **Echo** adlı bir iş akışı katmanı var — **siteye ait
değil, ama GitHub Pages onu da yayınlıyor** ("Yayın sınırı"). Ayrıntı: [`.claude/DONGULER.md`](.claude/DONGULER.md).
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
  kural koyamaz. Kadro **Sonnet 5**, dört istisna dışında: `canon-denetci`,
  `kurgu-denetci`, `hikaye-yazari` ve `karakter-yazari` **Opus**. Toplu, yargısız tarama için `tarama-denetci` **Haiku** (ucuz katman, `HAIKU_HAKKI` listesinde). Hak dörtle sınırlı ve liste
  `dogrula.py`'de yazılı — beşincisi reddedilir, listedekilerden biri
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
- `python3 .claude/bul.py <dosya> [ad|--ara <söz>]` — büyük dosyanın
  tamamını değil lazım olan parçasını verir (içindekiler, tek fonksiyon ya
  da bölüm, sözün geçtiği satırlar). `kanca-buyuk.py` 50 KB üstü dosyanın
  aralıksız okunmasını durdurup buraya yönlendirir.
- `kanca-kapi.py` — tur sonu ve `git commit`/`push` kapısı (`olay.py`
  üzerinden). Denetimi düzenlemeye değil çalışma ağacına uygular; Bash ile
  yapılan değişiklik de yakalanır. Kırmızı tur bir kez geri çevrilir,
  kırmızı commit insana sorulur. Ayrıntı: "Kapı kancası".
- `kanca-acilis.py` — oturum açılışında açık hedef, açık devre, seyir,
  bekleyen geri bildirim ve son sağlık kaydı; defter metni işaretli veri
  bloğunda gelir (dolaylı istem enjeksiyonu). Ayrıntı: "Oturum açılışı".
- `python3 .claude/mandal.py olc|kontrol|kaydet` — ölçü mandalı: silinen
  vaka, düşen eşik, büyüyen sınır insan kapısıdır. `bekci.py` ölçen
  aletin DEĞİŞTİĞİNİ yakalar, mandal ölçünün GEVŞEDİĞİNİ; ikisi ayrı
  soruyu cevaplar. Ayrıntı: "Mandal".
- `python3 .claude/saglik.py [--hizli] [--kaydet]` ve `/saglik` — bütün
  ölçümler tek komutta, önceki kayda göre eşik üstü gerileme. Haftalık
  zamanlanmış tur bunu koşar. Ayrıntı: "Sağlık".


## Kaynaklar

Bu katmandaki mekanizmaların dayandığı kaynaklar. Kodda ve bu belgede
köşeli parantez içinde K ve numarayla geçer. `belge` denetimi üç şeyi ölçer: her atfın burada tanımlı
olduğunu, her kaynağın en az bir yerde atıf aldığını ve her kaydın bir
adres (bağlantı ya da DOI) taşıdığını. Bu katmanın canon için koyduğu
kural kendisi için de geçerli: her iddia kontrol edilebilir bir adrese
bağlanır.

- **[K1]** Schluntz, E., Zhang, B. (2024, 19 Aralık). *Building effective agents.* Anthropic. https://www.anthropic.com/engineering/building-effective-agents — iş akışı ile ajan ayrımı; ajanın her adımda ortamdan "gerçek" geri bildirim alması; durma koşulu (en fazla tur).
- **[K2]** Fowler, M. (2014, 6 Mart). *CircuitBreaker.* https://martinfowler.com/bliki/CircuitBreaker.html — örüntüyü Nygard, M. T., *Release It!* (Pragmatic Bookshelf, 2007) kitabından aktarır: eşiği aşan hata sayısında devre açılır, çağrı denenmez.
- **[K3]** Huntley, G. (2025, 14 Temmuz). *Ralph Wiggum as a "software engineer".* https://ghuntley.com/ralph/ — "en saf hâliyle Ralph bir Bash döngüsüdür".
- **[K4]** Krakovna, V. vd. (2020, 21 Nisan). *Specification gaming: the flip side of AI ingenuity.* DeepMind. https://deepmind.google/discover/blog/specification-gaming-the-flip-side-of-ai-ingenuity/ — ölçünün harfini yerine getirip amacı kaçırmak.
- **[K5]** DeMillo, R. A., Lipton, R. J., Sayward, F. G. (1978). Hints on Test Data Selection: Help for the Practicing Programmer. *IEEE Computer* 11(4):34–41. https://doi.org/10.1109/C-M.1978.218136 — mutasyon testinin temeli; basit hataları yakalayan testin karmaşıkları da yakalaması (eşleşme etkisi).
- **[K6]** Jia, Y., Harman, M. (2011). An Analysis and Survey of the Development of Mutation Testing. *IEEE Transactions on Software Engineering* 37(5):649–678. https://doi.org/10.1109/TSE.2010.62 — alanın kapsamlı taraması. Mutasyon skoru: öldürülen mutantların eşdeğer olmayan mutantlara oranı. Hesaplama maliyeti ve maliyet azaltma (mutant örneklemesi dahil). Eşdeğerlik karar verilemez olduğundan eşdeğer mutantı ayırmak çoğu zaman insan emeği ister.
- **[K7]** OWASP (2025). *LLM01:2025 Prompt Injection.* OWASP Top 10 for LLM Applications 2025. https://genai.owasp.org/llmrisk/llm01-prompt-injection/ — dolaylı enjeksiyonun tanımı; "güvenilmeyen içeriği ayır ve açıkça işaretle".
- **[K8]** Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., Fritz, M. (2023). Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection. https://arxiv.org/abs/2302.12173 — saldırganın modele değil, modelin okuyacağı veriye yazması.
- **[K9]** Ribeiro, M. T., Wu, T., Guestrin, C., Singh, S. (2020). Beyond Accuracy: Behavioral Testing of NLP Models with CheckList. *ACL 2020*, 4902–4912. https://doi.org/10.18653/v1/2020.acl-main.442 — değişmezlik (INV) testleri: anlamı korunan bozulmada çıktı değişmemeli.
- **[K10]** Chen, T. Y., Cheung, S. C., Yiu, S. M. (1998). Metamorphic testing: a new approach for generating next test cases. Teknik rapor HKUST-CS98-01. https://arxiv.org/abs/2002.12543 — doğru cevabı bilmeden, koşular arası ilişkiyi sınamak.
- **[K11]** Manning, C. D., Raghavan, P., Schütze, H. (2008). *Introduction to Information Retrieval*, §2.2.3 (aksanlar; büyük/küçük harf katlama). Cambridge University Press. https://nlp.stanford.edu/IR-book/html/htmledition/accents-and-diacritics-1.html — kullanıcılar sorguyu çoğu zaman aksansız yazar; terimleri aksansız biçimde eşlemek uygun olabilir.
- **[K12]** Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference. *Journal of the American Statistical Association* 22(158):209–212. https://doi.org/10.1080/01621459.1927.10502953 — Wilson skor aralığı.
- **[K13]** Brown, L. D., Cai, T. T., DasGupta, A. (2001). Interval Estimation for a Binomial Proportion. *Statistical Science* 16(2):101–133. https://doi.org/10.1214/ss/1009213286 — Wald aralığının düzensiz kapsaması; küçük n için Wilson önerisi.
- **[K14]** W3C (2023; güncelleme 12 Aralık 2024). *Web Content Accessibility Guidelines (WCAG) 2.2.* W3C Recommendation. https://www.w3.org/TR/WCAG22/ — 1.1.1 metin dışı içerik, 1.4.4 metni yeniden boyutlandırma, 2.4.2 sayfa başlığı, 3.1.1 sayfa dili, 4.1.2 ad/rol/değer.
- **[K15]** W3C WAI. *Headings* — Page Structure Tutorial. https://www.w3.org/WAI/tutorials/page-structure/headings/ — "başlık düzeyi atlamak kafa karıştırabilir, mümkün olduğunca kaçınılmalı"; alt bölüm kapanırken atlamak serbest.
- **[K16]** Can, F., Kocberber, S., Balcik, E., Kaynak, C., Ocalan, H. C., Vursavas, O. M. (2006). First large-scale information retrieval experiments on Turkish texts. *SIGIR 2006*, 627–628. https://doi.org/10.1145/1148170.1148288 — Türkçede 5 harflik ön ekle kesmenin etkili bir erişim ortamı sağlaması. Ayrıca: Can vd. (2008), Information retrieval on Turkish texts, *JASIST* 59(3):407–421, https://doi.org/10.1002/asi.20750.
- **[K17]** Robertson, S., Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. *Foundations and Trends in Information Retrieval* 3(4):333–389. https://doi.org/10.1561/1500000019 — BM25.
- **[K18]** Zheng, L. vd. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. *NeurIPS 2023 Datasets and Benchmarks.* https://arxiv.org/abs/2306.05685 — LLM yargıçlarında konum, uzunluk ve kendini kayırma önyargıları.
- **[K19]** Hong, K., Troynikov, A., Huber, J. (2025, 14 Temmuz). *Context Rot: How Increasing Input Tokens Impacts LLM Performance.* Chroma. https://research.trychroma.com/context-rot — girdi uzadıkça, basit görevlerde bile performansın güvenilmezleşmesi.
- **[K20]** Anthropic. *Hooks reference* — Claude Code belgeleri. https://code.claude.com/docs/en/hooks — Stop olayının turu sürdürmesi, PreToolUse `permissionDecision` (allow / deny / ask / defer), SessionStart `additionalContext`.
