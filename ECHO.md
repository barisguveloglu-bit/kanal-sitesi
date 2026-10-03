# Echo — Codex ile çalışma

Echo'yu bu depoda **Codex yönetir**. Python araçları, dersler, iş defteri,
canon araması ve ölçüm kapıları korunur. Claude hesabı, Claude Code kurulumu,
Anthropic bağlantısı veya OpenAI API anahtarı gerekmez. Codex'in kendi hesap
ve model erişimi kullanılır; bu depo ayrıca model çağrısı yapmaz.

## Başlangıç

Depoyu Codex'te aç ve şunu söyle:

> Echo ile çalış. Önce başlangıç denetimini yap, sonra [yapılacak iş].

Codex kökteki `AGENTS.md` kurallarını okur. Beceri destekleyen ortamlarda
`$echo` da kullanılabilir: `.agents/skills/echo/SKILL.md`.
Terminalden başlangıç:

```sh
python3 echo.py baslat
```

Bu komut dersleri, yarım işleri ve üç hızlı denetimin gerçek sonucunu gösterir.
Eski iş defterindeki PR/merge önerileri geçmiş kayıttır; yeni kullanıcı
talimatı sayılmaz. Çok parçalı işte yeni bütçeyi ayrıca aç:

```sh
python3 echo.py arac butce ac --kosu "işin adı" --ajan-sinir 6 --dakika 30
```

Aynı oturumda tekrar `baslat` çalıştırmak bütçeyi sıfırlamaz.
`baslat --kosu "işin adı"` temiz zeminden sonra bütçeyi de açabilir;
açık bütçe varsa üzerine yazmaz.

## Oturum tasarrufu ve turlar

Sürüm **v2.1.9** olarak korunuyor. V3 hazırlığının ilk turu
[PR #11](https://github.com/barisguveloglu-bit/kanal-sitesi/pull/11) ile
birleşti: temiz kapıda kısa özet, bölüm bulucu, Claude büyük dosya kancası
ve oturum disiplini. Codex geçişi PR #13 ile birleşti. Buradaki tamamlayıcı
uyarlama, ilk turun Codex'te eksik kalan okuma sınırını ve talimatlarını taşır.

İkinci tur bağımsız olarak yeniden başladı. Birinci aşama, token kullanımı
ve Codex limitleri araştırmasıdır: [ECHO-TASARRUF.md](ECHO-TASARRUF.md).
Rapor gerektiğinde okunur; her görevin bağlamına bütünüyle eklenmez.
Sonraki aşama, rapordaki adayları küçük deneylerle ölçüp uygulamaktır.
Sürüm değişikliği, seçilen iyileştirmelerin doğrulanmasından sonra ele alınır.

Dosyaları önce `rg` veya bölüm bulucuyla daralt:

```sh
python3 echo.py arac bul .claude/DONGULER.md
python3 echo.py arac bul .claude/DONGULER.md --ara "Araç dizini"
python3 echo.py oku .claude/DONGULER.md --baslangic 1850 --satir 40
```

`oku`, satır numarasıyla en çok 120 satır gösterir; `--satir` ile sayı
seçilebilir. Dosya 50.000 baytı aşıyorsa `--satir` zorunludur. Seçilen
metin, satır numaraları dahil 50.000 UTF-8 baytını aşarsa içerik basılmaz;
aralığı daralt veya çok uzun satırı betikle süz. Devam varsa sonraki
başlangıç satırı belirtilir; dosyanın tamamı okunmuş gibi davranılmaz.
Yollar depo köküne göredir; depo dışına çıkan yollar reddedilir.
Okuma kodları: 0 seçilen parça okundu, 1 sınır/açık aralık/boş parça,
2 dosya ya da argüman hatası.

Bu komut Claude kancasını kullanmaz. Sınır, `oku` çağrısında mekaniktir;
doğrudan `cat`, başka bir okuma aracı veya `bul` çıktısı üzerinde otomatik
engel değildir. Bölüm bulucu çok uzun bir bölüm verirse satır aralığı seç.
Uzun komut/web çıktılarını önce süz; şefe bulguları, dayanakları ve kalan
belirsizliği ilet. Gereksiz dosya ve rapor tekrarlarını azalt.

Temiz `kontrol` kapıları kısa özet verir; hata, arıza ve insan kapısı
ayrıntıları korunur. `kontrol --tam` bütün kapıları çalıştırır; bu seçenek
çıktı uzunluğu değil denetim kapsamıdır. Tek kapının tam günlüğü için
`echo.py arac kapi <kapı> --tam` kullan. Tasarruf için test atlama.

İş tamamlanınca yeni oturum öner; devam eden işi iş defterine yaz.
Kullanıcı istemedikçe PR beklemek için zamanlanmış hatırlatma kurma.
Azalan çıktı boyutu ölçülebilir; bunun model tokenı, abonelik limiti veya
ücrette aynı oranda azalma olduğu varsayılmaz.

## Çalışma ve teslim

1. Hedefi belirle; büyük işte `echo.py arac hedef` ile hedef/görev ağacı tut.
2. Gerekli dosyaları oku; canon için `echo.py arac ara "soru"` kullan.
3. Her düzenleme grubundan sonra `python3 echo.py kontrol` çalıştır.
4. Düzeltme turundan önce sınırı tüket:
   `python3 echo.py arac devre dene --halka duzeltme --sinir 3 --not "ne denenecek"`.
   Kimlik `ECHO_SESSION_ID`, sonra `CODEX_THREAD_ID` üzerinden gelir;
   ikisi de yoksa aynı koşu boyunca sabit bir `--sahip` ver.
   `devre` çıkış 1 ise dur; 4 ise başka koşu kilidi tutuyor, turu atla.
5. Temiz sonuçta `echo.py arac devre basari --halka duzeltme` çalıştır.
6. Teslim öncesi `python3 echo.py kontrol --tam` ve
   `python3 -m unittest discover -s tests -v` çalıştır.
7. Yarım işi `echo.py arac defter ekle --baslik "..." --durum yarim --devam "..."`
   ile bırak. Bütçe kullanıldıysa kilometre taşlarını ve kapanışı kaydet.

| Kontrol kodu | Anlamı |
|---|---|
| 0 | Seçilen bütün kapılar geçti |
| 1 | Kural/test ihlali; bulguyu oku |
| 2 | Araç yok, çöktü veya beklenen özeti üretmedi; başarı sayılmaz |
| 3 | İnsan kararı gerekiyor; kendiliğinden düzeltme |

Birden fazla sonuç varsa hepsi gösterilir; toplu kodda araç arızası,
sonra ihlal, sonra insan kapısı önceliklidir. İnsan kapısı çıktısı diğer
hataların altında kaybolmuş kabul edilmez.

## Uzmanlar

```sh
python3 echo.py roller
python3 echo.py gorev --rol canon-denetci --konu "irade sayfasının dayanakları"
python3 echo.py gorev --rol canon-denetci --konu "irade sayfasının dayanakları" --gonder --json
```

İlk görev komutu önizlemedir. `--gonder` sözleşmeyi doğrular ve açık
bütçeden bir hak düşer; bütçe yoksa veya bittiyse görev üretmez. **Bu komut
ajan başlatmaz.** Codex, izin verilmiş çok ajanlı işte çıkan metni kendi
alt ajan aracına verir. Alt ajan desteği yoksa aynı rolleri sırayla uygular
ve bağımsız ajan denetimi yapılmış gibi raporlamaz.

Rollerin Claude'a ait YAML `model`/`tools` alanları okunacak görevden
çıkarılır. **Aktif GPT model tablosu `echo-modeller.json` dosyasıdır.**
Dağılım: 6 rol Luna, 21 rol Sol.

| Görev | Model |
|---|---|
| Şef: planlama, dağıtma, birleştirme, son denetim | Bu Codex sohbeti |
| `tarama-denetci`: sınırları belli toplu tarama | `gpt-6-luna` |
| `belge-denetci`, `veri-denetci`, `dil-denetci`: ilk inceleme | `gpt-6-luna` |
| `erisim-denetci`, `gizlilik-denetci`: açık kurallara göre ilk inceleme | `gpt-6-luna` |
| Diğer uzman rolleri: kod, canon, tutarlılık, üretim | `gpt-6.1-sol` |

Luna'nın beş yeni rolü, ayrı ajan çağrılarıyla 28 kontrollü örnekte denendi:
15 kusur bulundu, 13 doğru örneğe yanlış alarm verilmedi. Vaka dosyaları,
özgün yanıtlar, cevap anahtarı ve yeniden puanlama komutu
[`tests/luna_deneme/README.md`](tests/luna_deneme/README.md) içinde.
Bu dar örnek seti genel başarı veya hız/maliyet garantisi değildir.
Şef raporları doğrular; belirsiz veya kapsamlı bulguları gerekirse Sol'a
yeniden inceletir. Modellerin birebir Claude eşdeğeri olduğu iddia edilmez.
Rol bazında tabloyu değiştir; tek görevde
`--model gpt-6-luna` veya `--model gpt-6.1-sol` kullan. Eksik/bozuk tablo,
eksik rol veya bilinmeyen model reddedilir, sessizce ana modele dönülmez.

`--json` çıktısı doğrudan `collaboration.spawn_agent` argümanlarıdır:
`task_name`, `model`, `fork_turns: "none"`, `message`. Şef önce komutun
başarılı olduğunu kontrol eder, sonra bu alanları **aynen** araç çağrısına
aktarır. Böylece model yalnız prompt'ta yazmaz, gerçek çağrıda seçilir.
Tam geçmiş (`all`) ile model değiştirmek desteklenmediğinden sözleşme ayrı
mesajla taşınır. Görev adı kendiliğinden benzersiz üretilir; `--ad` ile
küçük harf/rakam/alt çizgi içeren bir ad da verilebilir.

Bu JSON dosyası evrensel Codex ayarı değildir; Echo'nun çağrı hazırlığıdır.
Şef, mevcut oturumun alt ajan aracında modelin kullanılabildiğini doğrular.
Model erişimi yoksa bunu bildirir; başka bir model çalıştırıp seçileni
çalıştırmış gibi raporlamaz. Model seçimini desteklemeyen bir ortamda
bu iki modelle orkestrasyonun çalıştığı söylenemez.
Rol salt okunur görev sözleşmesidir, işletim sistemi yetki sınırı değildir.
Mevcut ortam salt okunur sandbox destekliyorsa onu da uygula.
Raporları `echo.py arac gorev dogrula --rapor <dosya>` ile denetle;
`--mod okuma` tüm çalışma ağacını kontrol ettiği için eşzamanlı ana ajan
düzenlemeleri varsa yazarı ayıramaz, ayrı temiz çalışma kopyası gerekir.

Akış: **uzmanlar → Codex birleştirme ve denetimi → Barış**.
Eksik için yeniden gönderim `devre` ile en fazla iki turdur.
Claude onayına veya eski `disajan.py` köprüsüne ihtiyaç yoktur.

## Eski komutların karşılığı

Claude slash komutları Codex komutu olarak kaydedilmiş değildir. Codex'e
aynı işin adını söyle; `$echo` becerisindeki akışı kullanır.

| İstek | Codex akışı |
|---|---|
| döngü | Başlat → hedef → uygula → kontrol → teslim |
| planla | Dosyaları oku, hedef ve kabul ölçütünü yaz; değişiklik yapma |
| sor | `echo.py arac ara "soru"`; dayanağı oku, adresli cevap ver |
| denetle | `echo.py kontrol`; bulguları raporla |
| değerlendir | `echo.py kontrol --tam`; ölçümleri raporla |
| yargıla | `echo.py arac yargi --help`; mevcut altın set sözleşmesini uygula |
| geri bildirim | `echo.py arac geri-bildirim --help`; hatayı koruyan teste bağla |
| sürekli | Hedef + devre (en fazla 8 tur) + her tur kontrol; sonsuz çalışma yok |
| orkestra | Bütçe + sözleşmeli uzmanlar + rapor denetimi + en fazla 2 yeniden gönderim |

## Uyumluluk sınırı

`.claude/` tarihsel **depolama yoludur**: Python çekirdeği, rol metinleri,
testler ve bellek oradadır. Klasörü silmek Echo'yu siler; adını değiştirmek
tek başına Claude bağımlılığını gidermez. Bu geçiş çalışan çekirdeği korur.
`CLAUDE.md`, `.claude/settings.json`, eski slash komutları ve model
seçimleri yalnız eski Claude girişinin uyumluluk dosyalarıdır.
Codex'in başlangıç talimatı `AGENTS.md`, çalışma akışı bu belgedir.

**Claude kancaları Codex'te otomatik kurulmuş değildir.** Başlangıç ve
düzenleme sonrası komutları Codex çalıştırır; komut dışındaki her aracı
mekanik olarak durduran bir Codex kancası vaat edilmez. Python kapıları
çağrıldığında mekaniktir; GitHub Actions push/PR üzerinde ayrıca koşar.
`ECHO_KAPALI` eski olay/kanca dağıtıcısını kapatır; açıkça istenen
`echo.py` denetimlerini atlatmaz.

Bu uyarlama tek başına daha hızlı veya daha doğru model garantisi vermez.
Geçişin ölçütü aynı veriler ve testlerle Claude kurulmadan çalışabilmesidir.
