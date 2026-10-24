# Ortak çalışma — Claude ve Astra (2026-10-24)

Kullanıcı ikinci bir takım arkadaşı ekledi: **Astra** (OpenAI, ChatGPT /
Codex). Claude ile meslektaş olarak çalışıyor. Kullanıcı iletişim yolunu,
gizli depoda ayrı bir klasör ve dal açılmasını ve bu belgeleri onayladı
(*"hepsini kabul ediyorum"*).

Bu belge ikisinin ortak sözleşmesi. Astra'ya verilen tanıtım metni:
`ASTRA_TANITIM.md`.

## Kim

| | kim | nerede yazar |
|---|---|---|
| **Barış** | karar veren | — |
| **Claude** | Anthropic, Claude Code (bulut oturumu) | `claude/...` dalları |
| **Astra** | OpenAI, ChatGPT / Codex | `astra/...` dalları |

İkisi de kullanıcının GitHub hesabı üzerinden yazıyor. Kimin yazdığı daldan
ve imzadan anlaşılır: her commit mesajının ve yorumun sonunda `— Claude` ya
da `— Astra`.

## Değişmeyen kurallar

1. **Kararlar kullanıcının.** İkisi de yalnız önerir; kullanıcı onaylamadan
   hiçbir öneri kayda girmez.
2. **Kayıt tek yerde.** Kararlar yalnız `SERI_SEZON1.md`'de; onu yalnız
   Claude yazar, kullanıcının onayıyla. Astra önerisini rapora ya da PR'a
   yazar. İki ayrı kayıt er geç birbirine ters düşer: v7.96.2'de
   `KAYNAKLAR.md` ile `CLAUDE.md` böyle ters düştü.
3. **Kare ve video herkese açık depoya girmez.** `kanal-sitesi` herkese
   açık; kareler, videolar ve karelere bakan denetim raporları gizli
   `already-exists` deposunda kalır.
4. **Çıktı depoya itilir, indirme bağlantısına bırakılmaz.** Çizen, biten
   her kareyi hemen gizli depoya iter. Astra'nın Ekim başındaki çizimi
   indirme hatası yüzünden kayboldu (kullanıcı hatayı çözene kadar limiti
   doldu). Bulut işçileri ise her kareyi hemen itiyor; limit dolduğunda
   kaybolan en fazla o an çizilen kare oluyor.
5. **Limit kuralı.** Her taslağa tek bir toplu rapor yazılır, kare başına
   ayrı yorum yazılmaz. Düzelt-denetle en fazla iki tur sürer. Tam kalite
   çizim yalnız kullanıcının onayıyla başlar. İki yapay zekâ GitHub'da kendi
   kendine yazışırsa iki hesabın da limiti erir; 10 Ekim'de Claude'un limiti
   dolunca bütün bulut işçileri öldü.
6. **Proje kuralları ikisi için de geçerli.** `../CLAUDE.md`'deki kurallar:
   sahte içerik yasak, lisans kademeleri, Mojang dosyaları depoya girmez.
   Yayın kuralları `REFERANS_MOJANG_KILAVUZ.md`'de; her videodan önce
   okunur.

## İş dağılımı

| alan | sahibi | öbürünün işi |
|---|---|---|
| Senaryo taslağı: sahne sırası, altyazılar, çekim listesi | **Astra** | Claude film aracının yapıp yapamadığını ve çizim maliyetini söyler |
| Görsel taslak: konsept, ortam fikri, YouTube kapağı | **Astra** | Claude Minecraft modeline çevirir |
| Kaynak ve lisans araştırması (CC0 efekt, ses, müzik) | **Astra** araştırır | Claude indirir, SHA-256 ile doğrular, `KAYNAKLAR.md`'ye yazar |
| Film aracı ve kod: `arac/blender_film.py`, üreteçler, testler | **Claude** | Astra PR'ları inceler |
| Yeni ortam kurucuları: hanedan, kulübe, lav çukuru | **Astra** kendi dalında yazabilir | Claude inceler, test eder, birleştirir |
| Çizim ve bulut işçileri | **Claude** (hız testi sonuçlanana kadar) | Astra'nın hızı doğrulanırsa çizim Astra'ya geçer |
| Denetim: kareler, süreklilik, hikâye tutarlılığı, Mojang kuralları | **Astra** | Claude düzeltir |
| Ses ve kurgu: `arac/film_birlestir.py` | **Claude** | Astra dinleyip denetler |
| Yayın metni: başlık, açıklama, bölüm işaretleri | **Astra** | Claude kılavuza uygunluğunu kontrol eder |
| Karar kaydı: `SERI_SEZON1.md` | **Claude**, tek yazar | Astra önerir |

## Bir part baştan sona

1. Kullanıcı fikri anlatır, ikisinden birine.
2. Astra senaryo taslağını şablonla yazar (aşağıda).
3. Kullanıcı onaylar; Claude kayda geçirir ve eksik araç işlerini çıkarır.
4. Claude eksikleri yazar; Astra PR'ı inceler.
5. Claude düşük kaliteli taslağı ve denetim paftalarını (kare numaralı) gizli
   depoya iter.
6. Astra taslağı denetler, Claude düzeltir. En fazla iki tur.
7. Kullanıcı onaylarsa tam kalite çizim başlar.
8. Astra son denetimi yapar: kareler, ses, Mojang kuralları. Claude gereken
   kareleri yeniden çizer ve filmi birleştirir.
9. Astra yayın metnini ve kapak fikrini hazırlar; Claude kılavuza karşı
   kontrol eder; kullanıcı yayımlar.

## İletişim

- **Kod: PR, `kanal-sitesi`'nde.** Astra `astra/<konu>` dalında çalışır ve PR
  açar; Claude inceler ve birleştirir. Claude'un PR'larını Astra inceler.
- **Denetim, görev, soru: issue, gizli `already-exists`'te.** Herkese açık
  depoda issue açılmaz; karelere bakan her şey gizli depoda kalır.
- **Taslak kareler ve paftalar:** gizli depoda `ortak` dalı,
  `ortak/taslak/<bölüm>-<part>/<sürüm>/`. 1. bölümün `film/` klasörlerine
  dokunulmaz.
- **Tetikleme:** ikisi de sürekli çalışmıyor. Kullanıcı bir oturumu başlatıp
  "şu rapora bak" der. Claude izlemeye aldığı PR'larda yeni yorum gelince
  kendiliğinden uyanabilir.

## Denetim raporu şablonu

```
Başlık: Denetim — <bölüm>-<part> <taslak|tam> <sürüm>
Kaynak: <commit> · <klasör>

| # | çekim | kare | ciddiyet | tür | ne görünüyor | öneri |
|---|---|---|---|---|---|---|
| 1 | 3b | 412–418 | kritik | zemin | Barış'ın sol ayağı 2 px havada | ... |

Özet: kritik n · orta n · küçük n. Temiz çekimler: ...
— Astra
```

- **Ciddiyet:**
  - **kritik:** yayında kalırsa izleyici fark eder; tam kalite çizim durur.
  - **orta:** düzeltilmeli, bir sonraki turda.
  - **küçük:** zevk meselesi; kararı kullanıcı verir.
- **Tür** (`FILM_YETENEK_HARITASI.md`, "Geçmiş hatalar"dan):
  - zemin: havada yürüme ya da yatma, yere gömülme, yerden kesik ayak
  - içinden geçme: aktör aktöre, silah bedene
  - tutuş: el silahın sapında değil
  - kadraj: yüz taşıyor, aktör kadraj dışı, 180° kuralı
  - sıçrama: tek kare dönüş, ışınlanma
  - ışık: karanlık kötünün bedeni görünüyor, sönmeyen kıvılcım, simsiyah kare
  - poz: ters kafa, kopuk parça
  - skin: ayna, yanlış skin
  - altyazı: zaman, yazım
  - ses: seviye, tık, senkron
  - hikâye: kayıtla çelişki
  - kural: Mojang kılavuzu

## Senaryo taslağı şablonu

```
Part: <bölüm>-<part> · hedef ~57 sn (tavan 73,7 sn)
Kaynak: kullanıcının anlattığı (tarih)

| # | çekim | kim | ne oluyor | kamera | altyazı | efekt | süre |
|---|---|---|---|---|---|---|---|

Araçta olmayanlar: ...
Sorular: (boşluk uydurulmaz, soru olarak yazılır)
— Astra
```

## Çizim hızı testi (açık)

Astra'nın Ekim başında 1. bölümü çok kısa sürede çizdiği söylendi: yaklaşık
7 saat. Süre kesin değil; kullanıcı tam hatırlamıyor (*"çok kısa sürede
çizdi, yani o konu belirsiz"*). Çıktı alınamadı, doğrulanmadı. Kayıttaki
ölçü: Part 2, 2.210 kare, ~500
makine-saati (13,6 dk/kare, işlemcide; bulut makinesinde ekran kartı yok).
7 saat, 1. bölümün ~3.090 karesi için kare başına ~8 sn demek, yani ~100 kat
hız. Bu yalnız ekran kartıyla, daha düşük kaliteyle ya da çok sayıda
makineyle olur.

- **Sorular:** motor ve sürüm (Cycles mi, EEVEE mi), aygıt (işlemci mi, ekran
  kartı mı, hangi model), ayarlar (çözünürlük, örnek, gürültü giderici, kare
  başına süre), hangi dosyalar ve commit, kaç makine, çıktının yeri.
- **Doğrulama:** Astra 1. bölümden 30 karelik bir çekimi aynı commit ve tam
  kalite ayarlarıyla çizer, kareleri ve süre kaydını gizli depoya iter.
  Claude bunları kendi karelerimizle piksel piksel karşılaştırır.
- **Sonuç:** aynı kalite bu hızda çıkarsa çizim Astra'ya geçer.

## Bu belge

Kullanıcının onayıyla Claude günceller. Astra bir değişiklik önerirse PR
açar.
