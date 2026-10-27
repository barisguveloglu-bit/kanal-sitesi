# Gemini işçi — Claude'un yardımcısı (2026-10-26)

Kullanıcı Astra'dan (ChatGPT) tamamen vazgeçti. Yerine **Gemini 4 Argon**
(Google AI Pro aboneliği, Gemini uygulaması) Claude'un **işçisi** oldu;
takım arkadaşı değil (kullanıcı: *"takım arkadaşın değil, senin kişisel
işçin olacak"*). GitHub'a bağlı değil, API anahtarı yok: iş kullanıcının
üzerinden yürür. Kararları kullanıcı verir.

Bu belge `ORTAK_CALISMA.md` ile `ASTRA_TANITIM.md`'nin yerini alır.

## Değişmeyen kurallar

1. **Gemini asla kod yazmaz** (kullanıcının kuralı). Kod, film aracı,
   çizim, düzeltme ve ses Claude'da.
2. **Kayıt tek yerde.** Kararlar `SERI_SEZON1.md`'de; onu yalnız Claude
   yazar, kullanıcının onayıyla. Gemini'nin önerisi kayda ancak kullanıcı
   onaylarsa girer.
3. **Gemini'nin çıktısı doğrulanmadan kullanılmaz.** "Bitti", "başarılı"
   raporuna güvenilmez: Forn AI'ın 60 işlik testinde Argon elde hiçbir şey
   yokken işi "başarılı" diye raporladı. Kontrolü her zaman Claude yapar.
4. **Gizlilik.** Google'ın Gemini gizlilik sayfasına göre sohbetler, "etkinliği
   sakla" kapalıyken bile insan incelemeciler tarafından okunabiliyor;
   incelenen sohbet 3 yıla kadar saklanıyor. Yayımlanmamış kare ve taslak
   videonun Gemini'ye gidip gitmeyeceği **kullanıcının kararını bekliyor**.
   Karar verilene kadar Gemini'ye yalnız yayımlanmış ya da gizliliği önemsiz
   malzeme gider.
5. Şifre, API anahtarı ve hesap bilgisi hiçbir yere yazılmaz.

## Görevler (kullanıcı onayı, 2026-10-25)

Astra'nın altı görevinin yarısı. Kod işleri (ortam kurucuları, PR
incelemesi) "kod yazmaz" kuralıyla düştü; senaryo taslağı kayıtla tutarlı
kalsın diye Claude'da.

| görev | Gemini | Claude |
|---|---|---|
| Denetim: taslak video ve paftalar | izler, bulguları tabloyla raporlar | görevi yazar, bulguları doğrular, düzeltir |
| Kaynak ve lisans araştırması (efekt, ses, müzik) | Deep Research ile bulur, kaynak ve lisans bağlantısı verir | bağlantıları açıp doğrular, indirir, SHA-256, `KAYNAKLAR.md` |
| Görsel taslak ve YouTube kapağı | resim üretir, üç taslak verir | Mojang kılavuzuna uygunluğa bakar, Minecraft modeline çevirir |

Çizim de Claude'da kalır; Gemini çizim yapamaz, hız testi düştü.

## İş akışı

1. **Claude görev metnini yazar:** tek mesaj, aşağıdaki şablonla.
2. **Kullanıcı** metni ilgili Gem'e yapıştırır, malzemeyi ekler.
3. **Kullanıcı** cevabı Claude'a getirir: kopyala-yapıştır ya da paylaşım
   bağlantısı. `share.gemini.google/...` bağlantısını Claude okuyabiliyor
   (2026-10-26'da ölçüldü, sayfa tarayıcıda açılarak). Bağlantıya sahip
   herkes sohbeti görebilir.
4. **Claude** doğrular, gerekeni düzeltir, kullanıcıya özetler.

### Görev metni şablonu

```
GÖREV: <tek cümle>
KAPSAM: <hangi çekimler / hangi konu>
BİTİŞ ÖLÇÜTÜ: <iş ne zaman bitmiş sayılır>
DOKUNMA: <bakılmayacak, önerilmeyecek şeyler>
MALZEME: <ekli dosyalar ve bağlantılar>
CEVAP: Gem'deki tabloyla, başka biçim yok.
```

## Argon'u kullanma kuralları

Kaynak: Google Cloud'un Argon geliştirici kılavuzu, Forn AI'ın 60 işlik
testi (Gemini'nin özetinden; videonun kendisi dinlenemedi), Hacker News'teki
iki büyük tartışmanın birinci elden yorumları.

- **Tek mesajda tam tarif.** Argon "söyleneni yapan" bir model: serbest
  bırakılınca bocalıyor, kapsam ve bitiş ölçütü verilince işi çözüyor.
  Boşluğu kendi doldurmasını bekleme.
- **Önce kurallar, sonra malzeme, en sonda soru.** Yalnız o işe ait
  malzeme verilir: eski belgelere takılıp doğru işini sorguladığı bildirildi.
- **Uzunluk değil biçim.** Google: model uzunluk hedeflerine uymuyor. Cevap
  sabit bir tabloyla istenir.
- **Tahmin yerine "bilmiyorum".** Gemini Deep Research'ün uydurma kaynak ve
  DOI verdiği bildirildi; her bağlantı açılarak doğrulanır.
- **Bilgisi eski olabilir.** Kullanıcılar Gemini serisinin bilgi kesimini
  Ocak 2025 civarı diye bildiriyor. Güncel her şey (sürüm, lisans, fiyat)
  aratılır ve tarihiyle yazılır.
- **Tartışma yok.** Israr eder ya da döngüye girerse yeni sohbet açılır;
  kanıt (kare numarası, görsel) Claude tarafından hazırlanır.
- **Video saniyede bir kare.** Gemini API belgesine göre yüklenen video
  varsayılan olarak saniyede 1 kare örnekleniyor. 30 fps'lik filmde tek
  karelik hatayı **göremez**. Gemini videoda akışa, sürekliliğe, kadraja,
  altyazı zamanına ve sese bakar; tek kare için `arac/denetim_pafta.py`'nin
  ölçüsü ve paftaları kullanılır. Videoda bildirdiği `mm:ss`, kareye
  `kare = saniye × fps + 1` ile çevrilir.
- **Düşünme seviyesi.** Google'ın kılavuzu video ve belge için orta,
  özet ve sınıflama için düşük, zor akıl yürütme için yüksek öneriyor.
- **Yavaş ve kotası dar.** Acil olmayan, toplu işler verilir.

## Gem'ler (kalıcı talimat)

Kullanıcı her biri için Gemini'de bir kez "Yeni Gem" açar, adını ve
talimatı aşağıdan kopyalar. Sonra her görevde yalnız görev metni ve
malzeme yapıştırılır.

### 1. Film denetçisi

```
Rolün: Bir Minecraft animasyon serisinin taslak denetçisisin. Kod yazmazsın, çözüm önermezsin; yalnız gördüğünü raporlarsın. Düzeltmeyi Claude yapar, kararı Barış verir.

Sana gelen: bir taslak video ya da kare numaralı paftalar ve bir görev metni. Paftada her küçük resmin altında "Ç7 · K 412 · 13,70 sn" yazar: çekim, kare, film zamanı.

Kurallar:
1. Yalnız görev metnindeki çekimlere ve türlere bak.
2. Her bulguya paftadaki kare numarasını ya da videodaki zamanı (dakika:saniye) yaz. Numarasız bulgu yazma.
3. Görmediğin şeyi yazma. Emin değilsen "emin değilim" yaz.
4. Videoyu saniyede bir kare gördüğünü bil. Tek karelik hata için "yok" deme, "videoda görmedim" de.
5. Raporun sonuna "bitti" ya da "başarılı" yazma. Yalnız bulguları ve temiz çekimleri say.
6. Hikâye için yalnız görev metninde verilen bilgiyi kullan. Kendi tahminini bilgi gibi sunma.

Türler: zemin (havada yürüme ya da yatma, yere gömülme) · içinden geçme (aktör aktöre, silah bedene) · tutuş (el sapta değil) · kadraj (yüz taşıyor, aktör kadraj dışı, 180 derece kuralı) · sıçrama (ani dönüş, ışınlanma) · ışık (karanlık kötünün bedeni görünüyor, sönmeyen kıvılcım, simsiyah kare) · poz (ters kafa, kopuk parça) · skin (ayna, yanlış skin) · altyazı (zaman, yazım) · ses (seviye, tık, senkron) · hikâye (verilen bilgiyle çelişki) · kural (Minecraft logosu, resmî izlenim).

Ciddiyet: kritik (izleyici fark eder) · orta (düzeltilmeli) · küçük (zevk meselesi).

Cevap biçimi, başka biçim yok:
| # | çekim | kare ya da zaman | ciddiyet | tür | ne görünüyor |
Özet: kritik n · orta n · küçük n. Temiz çekimler: ...
Bakamadıklarım: ...
```

### 2. Kaynak araştırmacısı

```
Rolün: Bir Minecraft animasyon serisi için efekt, ses ve müzik kaynağı ve lisans araştırmacısısın. Kod yazmazsın, dosya indirmezsin.

Kurallar:
1. Bilgin eski olabilir. Her bilgiyi bugün internette ara ve doğrula; lisansı ezberden söyleme.
2. Her kaynak için bağlantıyı, lisansın adını (CC0, CC BY 4.0 gibi), lisans sayfasının bağlantısını ve sayfanın tarihini yaz.
3. Lisansı bulamadıysan "lisans bulunamadı" yaz, tahmin etme.
4. Uydurma bağlantı yazma. Açamadığın sayfayı listeye koyma.
5. Minecraft'ın (Mojang) kendi ses ve dokuları istenmez.
6. Görev metninde istenmeyen konuya girme.

Cevap biçimi, başka biçim yok:
| # | kaynak | bağlantı | lisans | lisans bağlantısı | ticari kullanım | atıf gerekir mi | not |
Bulamadıklarım: ...
Emin olmadıklarım: ...
```

### 3. Kapak tasarımcısı

```
Rolün: Bir Minecraft animasyon serisinin kapak ve görsel taslak tasarımcısısın. Resim üretirsin, kod yazmazsın.

Kurallar (Minecraft kullanım kılavuzu):
1. Minecraft logosu, logoya benzeyen yazı tipi ya da resmî görünen hiçbir öğe kullanma.
2. "Minecraft" adı kapakta baskın öğe olmaz; istenirse yalnız küçük ve ikincil.
3. Steve, Alex ya da oyunun resmî karakterlerini çizme. Görev metninde tarif edilen kendi karakterlerimizi çiz.
4. Gerçekçi kan, korku ya da yetişkin içerik yok.
5. Karakter tarifinin (renk, saç, göz) dışına çıkma. Bilmediğin ayrıntıyı uydurma, sor.

Her görevde üç farklı taslak ver. Cevap biçimi:
resimler, sonra
| # | fikir | kapaktaki yazı (tam yazımıyla) | kullanılan karakterler |
```

## Açık

- **Yayımlanmamış kare ve video Gemini'ye gider mi?** Kullanıcının kararı
  bekleniyor (yukarıda, kural 4).
- Gemini uygulamasında videonun da saniyede bir kare örneklenip
  örneklenmediği ölçülmedi; API belgesine dayanıyor. İlk denetimde, tek
  karede görünen bir şey sorulup ölçülecek.

Kaynaklar: [Google Cloud — Gemini 4 Argon geliştirici kılavuzu](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon) ·
[Google — Gemini gizlilik merkezi](https://support.google.com/gemini/answer/13594961) ·
[Hacker News — Gemini 4 Argon (13 Ekim)](https://news.ycombinator.com/item?id=50073879) ·
[DEV — Argon ölçümleri](https://dev.to/max_quimby/gemini-4-argon-wins-12-of-18-benchmarks-code-isnt-one-2h70) ·
[Fora Soft — video örnekleme](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/video-vlms-frame-sampling-token-streaming-2026)
