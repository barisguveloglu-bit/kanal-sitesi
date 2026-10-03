# Echo — ikinci tur, birinci aşama: token ve limit araştırması

Araştırma tarihi: **3 Ekim 2026**. Bu rapor ikinci turun yeni başlangıcıdır.
Amaç, mevcut kalite kapılarını koruyarak gereksiz model kullanımını azaltmak.
Öneriler henüz uygulanmış veya hesap kotasında kazanç sağlamış sayılmaz.
Birinci turun çalışan araçları korunur; sürüm v2.1.9'dur.

## Temel sonuç

Codex'te kullanım yalnız yazılan mesajların uzunluğuna bağlı değildir.
Model, görev karmaşıklığı, bağlam, düşünme düzeyi, hız modu, araç çağrıları,
bilgi getirme ve önbellek birlikte etkiler. API token fiyatından ChatGPT
aboneliğinde kalan görev sayısı hesaplanamaz. [1][2]

Echo için ilk adaylar: uygun işte Luna, hız gerekmiyorsa Standard,
gereken dosya/bölümle sınırlı bağlam, az ve bağımsız ajan görevi,
kısa ama kanıtlı raporlar. Sözleşme, izin ve kalite denetimlerini silerek
elde edilen azalma başarı değildir.

## Token, bağlam ve kota arasındaki fark

| Kavram | Anlamı | Echo açısından sonuç |
|---|---|---|
| Girdi tokenı | Talimatlar, konuşma, dosyalar ve araç sonuçlarının modele verilen temsili | Gereksiz içerik okuma ve tekrarları azalt |
| Çıktı / düşünme kullanımı | Yanıt üretimi ve modelin akıl yürütme işi | Uygun rapor uzunluğu ve göreve uygun düşünme düzeyi seç |
| Bağlam penceresi | Bir model çağrısında taşınabilecek çalışma alanı | Daraltma veya özetleme çalışma alanını rahatlatır |
| Abonelik kullanım limiti | Planın sunduğu, görev ve modele göre tüketilen hak | Hesabın kullanım ekranından izlenir |
| Kredi | Uygun planlarda kullanımın ayrıca ücretlendirildiği birim | Token tarifesiyle ilişkili; abonelik yüzdesiyle aynı şey değil |
| API hız limiti | Örneğin dakika başına token/istek sınırı | Bu depodaki hesap tabanlı ajanların haftalık kotasıyla karıştırılmaz |

Token sayısı karakter veya bayt sayısı değildir. Özellikle Türkçe için sabit
bir karakter/token oranıyla kesin hesap yapılmaz. Bu çalışmadaki yerel ölçümler
**UTF-8 baytı ve karakter** ölçümüdür; hesap tüketimi ölçümü değildir. [1][6]

## Kullanım limitleri ve yenilenme zamanı

3 Ekim'de erişilen fiyatlandırma belgesi, Plus ve Standard Business için
beş saatlik dönemlerde yerel mesaj tahminleri verir; Pro için şu anda beş
saatlik sınır olmadığını söyler. Haftalık limitler de uygulanabilir.
Yerel mesajlar ve bulut sohbetleri planın kullanım hakkını paylaşır. Plan,
hesap ve dağıtım koşulları değişebildiğinden kullanım ekranı esas alınır. [1]

| Model | Plus / Standard Business: beş saatte tahmini yerel mesaj |
|---|---:|
| GPT-6 Luna | 350–3.000 |
| GPT-6.1 Sol | 15–160 |
| GPT-6 Astra | 5–45 |

Bu aralıklar garanti veya sabit mesaj kotası değildir. Uzun bir bulut görevi,
bir kısa yerel mesajdan daha fazla tüketebilir. Rakamları birbirine bölerek
haftalık görev kapasitesi hesaplanmaz. [1]

Gerçek kalan hak ve yenilenme saati için:

1. Doğru hesap ve çalışma alanında [kullanım ekranını](https://chatgpt.com/codex/settings/usage) aç.
2. Limitin adını, kalan yüzdesini, tarih/saatini ve gösterilen saat dilimini ayır.
3. Codex CLI kullanılıyorsa `/status` ile oturum ve kalan limitleri incele.
4. Fatura yenileme günü, model limiti, haftalık Codex limiti ve normal ChatGPT
   dosya/Chat görsel/ses limitlerini aynı sayaç kabul etme. [1][2][7]

Resmi belgeler herkes için ortak bir cuma günü belirtmiyor. “Haftaya cuma”
3 Ekim 2026 referansıyla 9 Ekim 2026 olur; bu takvim hesabı kullanıcının
hesap yenilenmesini doğrulamaz. Kesin bilgi ekrandaki tarih ve saattir.
Echo'nun bu hesabın planına, kalan yüzdesine veya sıfırlama sayacına erişimi yok.

Yeni sohbet, `/new`, `/clear`, `/compact`, bir dalı değiştirmek veya `butce.py`
ile yeni koşu açmak abonelik kotasını sıfırlamaz. Bunlar sohbet bağlamını
veya Echo'nun yerel iş sayacını yönetir. Hesapta uygun bir promosyonla
edinilmiş sıfırlama hakkı varsa bu ayrı ürün özelliğidir; tam sıfırlama
haftalık yenilenme tarihini de değiştirebilir. Ekrandaki güncel tarih tekrar
kontrol edilir. Destek normal kullanım limitini sıfırlayamaz; hatalı sayaç
veya geri gelmeyen erişimi inceleyebilir. [2][3][7]

ChatGPT Work ve Codex kullanımının paylaşılması önemlidir: aynı dönemde
başka Work/Codex işlerinde harcanan hak da bakiyeyi etkileyebilir. Bu, normal
Chat'in bütün limitlerinin Codex ile aynı olduğu anlamına gelmez. [1][2]

Pro kullanılıyorsa alt plan da önemlidir. Güncel yardım belgesi Pro 100,
200 ve 500'ü ayırıyor; bazı eski Pro 200 abonelerine 29 Ekim 2026'ya kadar
geçici önceki hak uygulanabiliyor. “Pro sınırsızdır” veya eski bir videodaki
tek Pro kotası varsayımıyla plan yapılmaz. Hesaba özel uygunluk bu araştırmada
doğrulanmadı. [3]

## En etkili seçimler: model, hız, düşünme ve ajan sayısı

**Hız modu:** aynı modelin Standard hızına göre Fast, dahil abonelik hakkını
**2,5 kat** hızla tüketir; satın alınmış kredilerde çarpan **2**'dir.
GPT-6 Astra Ultrafast için karşılıklar **8** ve **6**'dır. Bunlar toplam işi
kaç kat hızlı bitireceğinin garantisi değildir. Uygun istemcide Standard
seçmek, hızın gerekli olmadığı işlerde ilk değerlendirilecek adaydır.
Bu araştırma mevcut sohbetin hız ayarını değiştirmedi. [1][4]

**Model:** resmi öneri, karmaşık çok adımlı işler için erişim varsa GPT-6.1
Sol; dar, tekrarlanabilir işler için Luna'dır. En güçlü modeli her küçük işte
kullanmak gerekmez; düşük modelin kaçırdığı hata da yeniden çalışma doğurur.
Echo'nun 6 Luna / 21 Sol rol haritası bir varsayılan atamadır; gerçek tüketim
payı bu rol sayılarından hesaplanmaz. Şefin yaptığı çalışma da toplamın
parçasıdır. Şef modeli uygulamanın model seçicisinden gelir; rol tablosu şefi
değiştirmez. [5][8]

Standard hızda resmi **1 milyon token başına kredi** tarifesi: [1]

| Model | Girdi | Önbellekten girdi | Çıktı |
|---|---:|---:|---:|
| GPT-6 Luna | 2,5 | 0,25 | 12,5 |
| GPT-6.1 Sol | 50 | 2,5 | 250 |
| GPT-6 Astra | 250 | 25 | 1.250 |

Bu kredi tablosu API fiyatı veya abonelik kotasının yüzde tablosu değildir.
Gerçek token sayıları, cache kullanımı, düşünme ve başarısız tekrarlar
bilinmeden belirli bir işin maliyeti veya tasarruf yüzdesi çıkarılamaz.

**Düşünme düzeyi:** yüksek düzey süreyi ve token kullanımını artırabilir;
karmaşık doğrulamada kaliteyi de iyileştirebilir. Resmi model rehberi varsayılan
düzeyden başlayıp ihtiyaç olduğunda artırmayı öneriyor. Echo için basit
çıkarma/tarama ile mimari karar aynı ayarı zorunlu kullanmamalı. Model ve
istemcinin desteklediği düzeyler kontrol edilmeli. [5][8]

**Ajan sayısı:** resmi belge, alt ajanlı akışların benzer tek ajanlı akıştan
daha fazla token tükettiğini açıkça söylüyor. Fayda, bağımsız işlerde süre
kazanmak ve ana konuşmayı ara çıktılardan korumaktır. Çok sayıda Luna açmak,
tek bir hedefli Luna çalıştırmaktan otomatik olarak ucuz değildir. [5]

Echo adayı: tek hedefte önce tek ajan; bağımsız inceleme gerektiğinde az sayıda
dar görev; karmaşık/çelişkili bulguda Sol. Her göreve bütün depo ve konuşma
yerine ilgili kaynaklar, kabul ölçütü ve çıktı biçimi verilir. Bu oturumun
aracı model değiştirmek için `fork_turns: "none"` kullanıyor; bunun bütün
Codex istemcileri için ortak bir yapılandırma alanı olduğu varsayılmaz.

## Önbellek ve uzun konuşmalar

“Her eski metin her mesajda aynı maliyetle yeniden işlenir” fazla kesin bir
genellemedir. Resmi API rehberi, ortak ve değişmeyen başlangıç bölümünün
işlenmiş durumunun önbellekten kullanılabildiğini anlatıyor. Aynı konuşmada
kalmak önbellek isabetini garanti etmez. API'deki teknik ayarlar, bu depodaki
yerel alt ajan aracına kendiliğinden uygulanmış sayılmaz. [6]

- Sabit talimat ve kaynakları gereksiz yere yeniden yazma; yeni bilgiyi dar eklerle taşı.
- Gereksiz uzun logu ilk kez bağlama sokmamak, sonradan tekrar tekrar özetletmekten daha basittir.
- `/compact` desteklenen CLI'da görünen konuşmayı özetleyerek bağlamda yer açar.
  Özetleme bir kota iadesi değildir; kritik karar ve dosya adreslerini devirde koru. [7]
- Bağımsız yeni işe geçerken yeni sohbet yararlıdır. Aynı işin ortasında sık
  sıfırlamak yeniden okuma ihtiyacı doğurabilir. Bu son nokta Echo için çalışma
  önerisidir, ölçülmüş bir hesap tasarrufu değildir.
- Compaction önbellek isabetini azaltabilir; API rehberi toplam girdi maliyetinin
  yine de düşebileceğini, önce/sonra ölçmek gerektiğini söylüyor. [6]
- API rehberinde önbellekten gelen tokenlar dakika başına token sınırına sayılır.
  Buradan ChatGPT haftalık kotası için aynı hesaplama formülü çıkarılamaz. [6]

## Echo'daki mevcut ölçümler

Aynı konu ile `echo.py gorev --rol <rol> --konu "Salt okunur, belirlenmiş
dosyalarda kısa denetim" --json` önizlemesinin `message` alanı ölçüldü.
Ajan başlatılmadı; konu ve rol değiştikçe boyutlar da değişir.

| Üretilen görev metni | UTF-8 bayt | Karakter |
|---|---:|---:|
| tarama-denetci | 5.725 | 5.271 |
| belge-denetci | 5.961 | 5.477 |
| test-denetci | 6.301 | 5.775 |

Araştırma başındaki AGENTS.md 7.609, ECHO.md 10.619 ve Echo SKILL.md 2.721
bayttı. Bunların her çağrıda aynen yüklendiği ölçülmedi; dosya boyutu yalnızca
olası bağlam kaynaklarını gösterir. ECHO.md görev sözleşmesiyle birlikte
yeniden okunuyorsa toplam gerçek tüketim ayrıca incelenmelidir.

Birinci turun gerçek örneği: DONGULER.md 108.339 bayt; `oku` ile seçilmiş
40 satırın çıktısı 3.373 bayt. 28 vakalık önceki Luna denemesi sınıflandırma
başarısını gösterir; token veya hız/maliyet kıyaslaması değildir.

Yerel `butce.py` ajan sayısı ve süreyi izler. Bu mekanizma haftalık hesap
bakiyesini okuyamaz, tüketilmiş tokenı ölçemez veya kota yenileyemez.

## İkinci aşama için ölçülecek adaylar

| Öncelik | Aday | Deney | Kalite koruması |
|---|---|---|---|
| 1 | Uygun istemcide Standard ve göreve uygun model | Benzer küçük işlerde aynı kapsamı koruyarak hız/model seçeneklerini kıyasla | Tamamlama, hata ve yeniden deneme sayısı |
| 2 | Tek ajan / az sayıda uzman | Bir denetim işini tek ajan ve bölünmüş görevlerle ayrı değerlendir | Aynı kusurlar, temiz örnekler ve atıf denetimi |
| 3 | Görev sözleşmesindeki tekrarları kısalt | Aynı üç rol/konunun üretilen metnini önce/sonra ölç | Yetki sınırı, insan kapısı, kapsam ve rapor koşulları korunmalı |
| 4 | Talimatları ihtiyaç anında yükle | AGENTS kısa çekirdek; ECHO ve bu rapordan yalnız ilgili bölüm | Yalnız çekirdeği okuyan ajan zorunlu kapıyı atlamamalı |
| 5 | Log ve araç sonuçlarını daralt | Önce arama/içindekiler, sonra bölüm; temiz sonuçta özet | Hata ayrıntısı ve devam satırı görünür kalmalı |
| 6 | Kullanılmayan MCP bağlamını azalt | İstemci destekliyorsa yalnız görev için gereken sunucuları seç | Gerekli araç erişimini koru; burada hesap bağlantısı kaldırılmadı |

İlk turdan zaten gelen `oku`, `bul` ve temiz kapı özeti tekrar geliştirilmez.
Model seçimi değişikliğiyle sözleşme kısaltması aynı deneyde birleştirilmez;
hangi etkenin işe yaradığının ayrıştırılması gerekir. [1][5]

Ölçüm kaydı: görev, model, düşünme/hız ayarı, ajan sayısı, başlangıç/bitiş
zamanı, metin baytı, varsa ürünün gösterdiği token/kredi/kota değişimi,
başarı, kaçan kusur, yanlış alarm ve yeniden deneme sayısı. Hesap göstergesi
yoksa alan **ölçülemedi** kalır. Aynı dönemde başka sohbetler çalışıyorsa
hesap yüzdesindeki değişim yalnız Echo'ya bağlanmaz. Kaba yuvarlanmış bir
yüzdede tek kısa denemeden kesin sonuç çıkarılmaz; küçük bir görev sepeti
üzerinde karşılaştırılır. Kritik kalite düşerse aday kabul edilmez.

Başlangıç denetimi, canon dayanakları, zorunlu testler ve hata ayrıntıları
tasarruf amacıyla atlanmaz. Araştırma tamamlandı; çalışma zamanı değişiklikleri
bu adayların ölçüm aşamasında seçilecektir.

## Kaynaklar

Sayfalar 3 Ekim 2026'da doğrudan resmi OpenAI adreslerinden okundu. Bazı
developers.openai.com/codex adresleri learn.chatgpt.com'a yönlendirildi.
Hesap ekranı okunmadı; bu rapor plan veya kullanım bakiyesi doğrulaması değildir.

1. [Codex / ChatGPT Work pricing](https://learn.chatgpt.com/docs/pricing) — kullanım etkenleri, plan limitleri, hız çarpanları, kredi tarifesi ve tasarruf önerileri.
2. [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) — sayaçların ayrımı, kullanım ekranı, ortak kullanım, hak edilmiş sıfırlama ve yenilenme zamanı.
3. [About ChatGPT Pro tiers](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers) — Pro alt planları, geçiş koşulları, limit bildirimi ve destek sınırı.
4. [Speed](https://learn.chatgpt.com/docs/agent-configuration/speed) — Standard/Fast/Ultrafast tüketim farkları ve istemci erişimi.
5. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) — ajanların toplam token tüketimi, bağlamın ayrılması, model/düşünme seçimi.
6. [Prompt caching — API](https://developers.openai.com/api/docs/guides/prompt-caching) — ortak başlangıç bölümünün yeniden kullanımı, compaction etkisi ve API hız limiti ayrımı.
7. [Developer commands — CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli) — `/status`, `/compact` ve `/new` komutları.
8. [Models](https://learn.chatgpt.com/docs/models) — Sol/Luna iş ayrımı ve düşünme düzeyi önerisi.
