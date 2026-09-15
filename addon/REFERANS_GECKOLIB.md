# Referans — GeckoLib 5.5.5

## Bu dosya ne, neden burada

Kullanıcı bir JAR gönderdi: `geckolib-neoforge-26.2-5.5.5.jar`.
İçeriği incelendi ve **işimize yarayan bir yanı olduğu doğrulandı** —
ama beklenenden farklı bir yerinden.

**GeckoLib doğrudan kullanılamaz.** Java Edition için yazılmış bir
NeoForge kütüphanesi; bu depodaki eklenti ise **Bedrock**. GeckoLib'in
kendisi bu projeye kurulamaz, çalıştırılamaz, bir satırı bile
eklentiye giremez.

**Değerli olan şey kütüphanenin *bilgisi*.** GeckoLib'in tek işi,
Blockbench'in ürettiği **Bedrock biçimli** `.animation.json` ve
`.geo.json` dosyalarını okuyup oynatmak. Yani bu depodaki 15 animasyon
ve 379 geometri dosyasının biçimini **bağımsız ve çalışan bir
uygulama olarak** biliyor.

Bu neden önemli: o biçimin yazılı bir şartnamesi yok.
`REFERANS_BLOCKBENCH.md`'de Blockbench wiki'sinden alıntılanan cümle
aynen duruyor — *"tam bir şartname yok, örnek dosyalara ve kaynak koda
bakın."* GeckoLib tam olarak o "kaynak kod".

| soru | bu JAR'dan önce cevabı | şimdi |
|---|---|---|
| Hangi `easing` adları gerçek? | bilinmiyordu | 34 ad, listelendi |
| MoLang'de hangi fonksiyonlar var, kaç argüman alır? | bilinmiyordu | 30 fonksiyon, argüman sayılarıyla |
| `loop` alanına ne yazılabilir? | üçü biliniyordu | altı ad + boolean |
| `.geo.json` hangi `format_version`'ları kabul eder? | bilinmiyordu | beş sürüm |
| 379 geometri dosyası geçerli mi? | **hiç sorulmamıştı** | her koşuda ölçülüyor |

## Neye dönüştürüldü

Üç parça, hepsi `arac/` altında:

| dosya | ne yapar |
|---|---|
| `arac/gecko_coz.py` | JAR'ı açar, `javap` ile bytecode'u okur, kural tablosunu **üretir** |
| `arac/gecko_kurallari.json` | üretilen tablo — easing adları, MoLang fonksiyonları, şema, desenler |
| `arac/bicim_dogrula.py` | depodaki `.animation.json` / `.geo.json` dosyalarını o tabloya göre doğrular |
| `arac/bicim_mutasyon.py` | doğrulayıcının gerçekten ısırdığını gösterir (15 bilerek bozma) |

Test tarafı: `test/bicim.mjs` ikisini birden koşuyor, yani `kos.sh`'in
parçası. Bir daha bozulursa takım düşer.

### Kurallar elle yazılmadı

`jar_model_coz.py`'nin başındaki kullanıcı kuralı burada da geçerli:

> *"hafizandan yaparsan belki yanlis cikabilir, bunu daha onceden yasadik."*

Bu yüzden `gecko_kurallari.json` **üretiliyor**, yazılmıyor. GeckoLib
sürüm atlarsa tek komutla yenilenir:

```sh
python3 addon/arac/gecko_coz.py                    # depodaki JAR
python3 addon/arac/gecko_coz.py baska-surum.jar    # başka sürüm
```

JAR da depoda (`arac/geckolib/`) — tablo her zaman yeniden
üretilebilsin diye. MIT lisanslı, lisans metni yanında.

## Tablodan çıkan, bilmediğimiz şeyler

Doğrulayıcıya kural olarak girenler:

- **Tanınmayan `easing` adı hata vermiyor, sessizce `linear` oluyor.**
  Yani `easeInOutBackk` yazarsan animasyon çalışır, sadece yanlış
  çalışır. Bu sınıf hatayı gözle yakalamak neredeyse imkânsız.
- **`easingArgs` camelCase** — animasyon JSON'undaki tek camelCase
  anahtar. Refleksle `easing_args` yazmak çok kolay ve o hâli
  **sessizce yok sayılır**.
- **`loop` metni büyük/küçük harfe duyarlı.** `EasingType.fromString`
  küçük harfe çevirir, `LoopType.fromString` **çevirmez** — `"Loop"`
  tanınmaz ve sessizce `play_once` olur.
- **`easing: "step"` argümansız geçerlidir**, varsayılanı 2. İstisna
  yalnız açıkça 2'nin altında bir değer yazılırsa atılır. *(Bu madde
  bir düzeltmenin kaydı: doğrulayıcı ilk yazıldığında argümansız
  `step`'i hata saydı ve depodaki dört kareyi haksız yere suçladı.
  Bytecode okununca yanlış olduğu görüldü — `EasingType.step`
  `ifnonnull` ile varsayılanı koyuyor.)*
- **MoLang bilimsel gösterimi tanımıyor.** Sayı deseni
  `^-?(\d+(\.\d+)?|\.\d+)$`; `1e-5` sayı sayılmaz, değişken adı
  sanılır ve **sessizce 0** olur.
- **İfadede izinli karakter kümesi dar:** `^[\w\s_+-/*%^&|<>=!?:;.,(){}]+$`.
  Tırnak ve köşeli parantez **yok** — dışarıdan kopyalanan ifadelerde
  en sık görülen hata budur; tek bir karakter bütün ifadeyi geçersiz kılar.
- **`lerp_mode` varsa `easing` hiç okunmuyor.** İkisi birlikte
  yazılmışsa `easing` ölüdür.

Doğrulayıcıya girmeyen ama bilinmesi gerekenler:

- **Birim asimetrisi:** `math.sin` / `math.cos` girdiyi **derece**
  kabul ediyor; `math.asin` / `math.acos` / `math.atan` **radyan**
  döndürüyor, `math.atan2` **derece**.
- **Argüman sırası:** `math.lerp(min, max, delta)` — delta üçüncü.
  `math.clamp(değer, min, maks)`.
- `==` ve `!=` tam eşitlik değil, epsilon (`1e-5`) karşılaştırması.
- Sıfıra bölme istisna atmıyor, sol tarafı aynen döndürüyor.
- MoLang tümüyle büyük/küçük harf duyarsız; boşluklar silinip
  küçük harfe indiriliyor.
- **`variable.foo` ile `v.foo` GeckoLib'de aynı değişken DEĞİL**
  (Bedrock'ta eşdeğerdir). Gerçek takma ad yalnız `q.` → `query.`.
  Dışarıdan alınan animasyonlarda sessiz davranış farkı üretebilir.

## Ayrıntı dosyaları

İkisi de bytecode'dan okunarak çıkarıldı; emin olunamayan her nokta
içlerinde **ŞÜPHELİ** diye işaretli.

- `REFERANS_GECKOLIB_SEMA.md` — `.geo.json` ve `.animation.json`
  şeması, 27 sınıf, alan alan; hata/uyarı mesajlarının tam listesi.
- `REFERANS_GECKOLIB_MOLANG.md` — 30 fonksiyon, 15 operatör,
  82 `query.*` adı, ayrıştırma akışı.

Aralarındaki iş bölümü: **`gecko_kurallari.json` makinenin okuduğu
ve araçların kullandığı kısım**, bu iki dosya ise insanın okuduğu
kısım. Çelişirlerse JSON doğrudur — o üretiliyor, bunlar yazıldı.

## Sınırı

Bu bir *referans*, kaynak değil. GeckoLib Java Edition'ı hedefliyor
ve Bedrock'un kendi oynatıcısı birebir aynı davranmak zorunda değil.
Doğrulayıcının yakaladığı her şey **gerçek bir biçim hatası**, ama
"GeckoLib kabul etti" demek "Bedrock'ta kesin çalışır" demek değil.
