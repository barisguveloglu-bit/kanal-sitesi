# Döngü Sistemleri

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

`LORE.md` 470 satırı geçti ve büyüyor. Asıl mesele hız değil **dayanak**:
hafızadan cevap veren bir model uydurur, dosyadan alıntı yapan uyduramaz.

`ara.py` canon'u parçalara ayırıp soruya en yakınlarını **satır numarasıyla**
döndürür. Böylece her canon iddiası `LORE.md:201` gibi kontrol edilebilir
bir adrese bağlanır.

```
python3 .claude/ara.py "Teşup'un zaafı ne"
python3 .claude/ara.py --sayi 5 --tam "Konya derebeyi"
```

Gömme, vektör veritabanı, dış servis **yok** — 470 satırlık Türkçe bir metin
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
yakalar — ama dış bağımlılık ister ve 470 satırlık tek kaynakta
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
reddedilmeli; cevapsız soru dönüşünce de sahte delil üretmemeli. 150 yazım
çifti, eşik %100.

İlk koşusunda gerçek bir açık buldu: aksansız yazılan sorularda isabet@3
%60'a düşüyordu (yukarıda, "Aksansız yazım").

**Oranlar artık aralıkla yazılıyor.** 20 soruda tek soru beş puan;
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
| Kapı kancası | `kanca-kapi.py` | Çalışma ağacının sonucu (araç değil) | Kırmızı tur → Yansıtma'ya; kırmızı commit → İnsan onayına |
| Açılış kancası | `kanca-acilis.py` | Seyir, hedef, devre, geri bildirim defterleri | Yeni oturumu dayanaklı başlatır → Planla-Uygula |
| Mandal | `mandal.py` + `dogrula mandal` | HEAD'deki ve yereldeki tabanın sıkısı | Gevşeme → İnsan onayına |
| Sağlık | `saglik.py` + `/saglik` | Bütün ölçümler + geçmiş | Eşik üstü gerileme → İnsan onayına; kayıt → Açılış kancasına |

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

**55 mutasyon** var: kesici hiç kesmesin, yargıç uydurmayı görmesin,
sözleşme kapısı açılsın, arama "bilmiyorum" diyemesin, ham iz özete girsin,
denetleyici yeni dosyaya kör kalsın, mandal gevşemeyi görmesin, tur sonu
kapısı bloklamasın, açılış bekleyen kararı göstermesin…

Bu sayı da bir zamanlar çürümüştü: belge "15" yazarken betikte 19 vardı.
Artık `belge` denetimi onu da sayıyor.

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
testinin bilinen temel sorunu maliyettir [K6].

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

## Sınırlar

Bunlar tahmin değil, fay enjeksiyon sınavıyla ölçüldü: **90 vaka
(77 yakalanmalı, 13 masum)** ve **20 altın soru**. Bu sayılar `dogrula.py`
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
- **Eşikler 20 soruluk bir sete göre ölçüldü.** Küçük bir set — ve artık ne
  kadar küçük olduğu sayıyla görünüyor: isabet@3 %95 ama %95 Wilson aralığı
  **[%76–%99]** [K12][K13]. Aralığın alt ucu %90 eşiğinin altında; yani 20
  soruyla "eşiğin üstündeyiz" demek istatistiksel olarak kanıtlanamıyor.
  Oran %95'te kalırsa bunun için yaklaşık **140 soru** gerekir: 133/140'ın
  Wilson alt ucu %90.04. Parametreleri
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
| Aksansız soru ("Tesup'un zaafi nedir") | isabet@3 %60 | %95, normal soruyla aynı | [K11] |
| Türkçe olmayan klavyede büyük harf ("AHRIMAN KIMI KILITLIYOR") | sonuç yok | ilk sonuçta doğru yer | [K11] |
| Yazım değişmezliği ölçülmüyordu | — | 150 çift, %100 eşik | [K9][K10] |
| Oranlar tek sayıydı | isabet@3 %95 | %95 [%76–%99] | [K12][K13] |
| Açılış kancası defter metnini talimatla aynı kanaldan veriyordu | işaretsiz | veri bloğu, satır sınırı, şüpheli kalıp işareti | [K7][K8] |
| Erişilebilirlikte sadece kontrast ve odak halkası ölçülüyordu | 2 ölçü | + dil, başlık, `alt`, erişilebilir ad, yakınlaştırma, başlık düzeyi | [K14][K15] |
| Mekanizmaların dayanağı yazılı değildi | — | 20 kaynak; `belge` atıfları sayıyor | — |
| Elle yazılan mutasyon kendi kör noktasını göremiyordu | 55 elle | + operatörle üretilen; 27 boşluk kapandı | [K5][K6] |

Ölçülemeyen kısım da yazılı kalsın: değişmezlik eşiği %100 ama 150 çift
yine aynı 20 altın sorudan türüyor — setin küçüklüğü (Sınırlar) burada da
geçerli. Erişilebilirlik denetimi WCAG'nin makineyle ölçülebilen tabanıdır;
klavyeyle gezinme ve ekran okuyucu deneyimi hâlâ elle denenir.

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
- **[K6]** Jia, Y., Harman, M. (2011). An Analysis and Survey of the Development of Mutation Testing. *IEEE Transactions on Software Engineering* 37(5):649–678. https://doi.org/10.1109/TSE.2010.62 — alanın kapsamlı taraması; hesaplama maliyeti ve eşdeğer mutant sorunları.
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
