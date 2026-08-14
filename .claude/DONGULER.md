# Echo v1.1.2

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
   KAT 4'ün puanlı hâli:               DEĞERLENDİRİCİ-OPTİMİZE (eniyile.py)
   Bütün katları tetikleyen dış uyarı: OLAY DÖNGÜSÜ (olay.py)
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

Uzun koşuların sessiz düşmanı **bağlam çürümesi**: alakasız araç
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

`PreToolUse` kancası sözleşmesiz görevi **göndermez**: uydurma yasağı,
canon kaynağı ve atıf zorunluluğu geçmiyorsa hangisinin eksik olduğunu
söyleyip geri çevirir. Devre kesicideki mantığın aynısı — kural süreç
dışına taşındığı an rica olmaktan çıkar.

**Yetki beyanı zorunlu.** Her brief `YETKİ: okuma` ya da `YETKİ: yazma`
içermek zorunda; kanca beyansız görevi de göndermez. Salt okunur mod
`git commit`/`git push`/dosya düzenlemeyi açıkça yasaklar.

Dürüst sınır: bu harness alt ajanın **araç kümesini kısıtlamaya izin
vermiyor**, yani gerçek ayrıcalık ayrımı yapılamıyor. Yapılabilen,
beyanı sonradan sınamak — `dogrula --mod okuma` çalışma ağacına bakıp
salt okunur ajanın dosya değiştirip değiştirmediğini yakalıyor.

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
| Bütünlük | `butunluk.py` | Canon ↔ veri ↔ site | Tutarsızlık → canon kararı ya da düzeltme işi |
| **Değerlendirici-optimize** | `eniyile.py` | `dogrula.py` + `butunluk.py` puanı | Puan artmazsa **İnsan onayına** çıkar |
| **Olay döngüsü** | `olay.py` + `settings.json` | Claude Code kancaları | Dış uyarıyı Yansıtma'ya ve sözleşme kapısına dağıtır |
| **Tepe tırmanma** | `tirmanma.py` | `degerlendir.py` altın seti | Aday ayar → **insan onayı** (asla kendiliğinden uygulanmaz) |
| **Eleştirmen-üretici** | `elestirmen.py` | Ajan + mekanik denetleyiciler | Bulgular üreticiye; lastik damga reddedilir |
| **TDD** | `tdd.py` | `arac-sinavi.py` + `butunluk.py` | Kırmızı → yeşil → düzenle; koruma azalamaz |

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
verdiğin komutu çalıştırır, sonucu bildirir. Kurulmadı; istersen kurarız.

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

Klasik mutasyon testi: ölçülen şeyi kasten boz, testin yakalayıp
yakalamadığına bak. Burada **başarısızlık iyi haberdir** — mutasyon
yakalandı demektir. Yeşil kalan bir mutasyon, "o davranışı hiçbir şey
korumuyor" demektir.

**42 mutasyon** var: kesici hiç kesmesin, yargıç uydurmayı görmesin,
sözleşme kapısı açılsın, arama "bilmiyorum" diyemesin, ham iz özete girsin,
sürüm yamayı dokuzdan öteye taşısın, logo sürümü gövdeye çakılsın…

Bu sayı da belgeye elle yazılıyor, yani o da çürüyebilir — nitekim çürüdü:
belge 15 derken gerçek 23'tü. `belge` denetimi artık bu sayıyı da tutuyor.

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
| `arac-sinavi.py` | araçları — devre, yargıç, görev, logo, olay, tırmanma, eleştirmen, TDD, dış ajan | 102 |
| `butunluk.py` | **içeriği** — canon ↔ veri ↔ site | **74 bütünlük vakası** |

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
