# Beş Halkalı Ajan Döngüsü — Referans İskeleti

Plan-Execute, ReAct, Reflect & Refine, Human-in-the-Loop ve
Orchestrator–Workers döngülerinin **tek bir sistem olarak** birleştirildiği
çalışan bir Python iskeleti.

Bağımlılığı yok, derleme adımı yok. API anahtarı olmadan da baştan sona
çalışır; anahtar varsa gerçek Claude'a bağlanır.

```bash
cd dongu
python3 calistir.py --otomatik --temizle    # hemen çalışır, hiçbir kurulum yok
python3 -m unittest discover -s testler -t . # 17 test
```

Bu depo bir hikaye lore sitesi; bu klasör ondan **bağımsız** bir projedir.
Siteye hiçbir şey eklemez, siteden hiçbir şey okumaz.

---

## Neden bunlar birleşiyor

Beş döngü birbirine alternatif değil, farklı katmanlarda çalışan halkalar:

| Katman | Döngü | Ne sıklıkta | Sorduğu soru | Dosya |
|---|---|---|---|---|
| 0 | **Plan** | görev başına 1 | Hedef ne, hangi adımlara bölünür? | `motor.planla` |
| 1 | **Execute** | adım başına | Sıradaki adım hangisi? | `yurutucu.py` |
| 1.5 | **Orchestrator–Workers** | adım başına + sonda 1 | Bu adım kimin işi? Sonuçlar birbirini tutuyor mu? | `uzmanlar.py` |
| 2 | **ReAct** | adım içinde N kez | Ne biliyorum → ne yapayım → ne gördüm? | `react.py` |
| 3 | **Reflect & Refine** | çıktı başına | Bu çıktı harici kural setini geçiyor mu? | `yansitma.py` |
| 4 | **Human-in-the-Loop** | eşik aşılınca | Bunu yapmaya yetkim var mı? | `insan.py` |

Katmanları sıralamak kolay. İş, onları birbirine bağlayan **kenarlarda** —
kodda `★` ile işaretli dört yer:

**★1. ReAct → Plan.** Saf ReAct uzun görevlerde savrulur, hedefi unutur. Saf
Plan-Execute kırılgandır, çünkü plan hiçbir şey bilinmeden önce yapılır.
Birleşimin tek anlamlı olma sebebi şu: ReAct'in *gözlemi* planı yeniden
yazdırabilmeli. `ReactSonucu.tip == "yeniden_planla"` bu kenar.

**★2. Yansıtma → Yönetici.** Doğrulayıcı reddedince yönetici *yeniden görev
verir*: önce aynı uzmana bulgularla, sonra başka bir uzmana. Aynı kafanın aynı
hatayı tekrarlaması, iyileştirme döngüsünün en yaygın kilitlenme biçimi.

**★3. Yansıtma tavanı → İnsan.** İnsan kapısı ayrı, paralel bir mekanizma
değil; iyileştirme döngüsünün **çıkış vanası**. Tavan yoksa ya sonsuz
iyileştirme ya da iki kötü çıktı arasında salınım alırsın.

**★4. Birleştirme → Plan.** Yöneticiyi bir *iş akışından* ayıran şey bu:
bütün adımlar bittikten sonra sonuçlar tek yerde denetlenir; eksik veya
çelişki varsa **yeni adım üretilip plana eklenir**. Tek seferlik dağıtım bir
iş akışıdır; eksiklere göre yeniden görev veriliyorsa döngü olur.

## Paylaşılan durum

Entegrasyonun somut kısmı bir sınıf: `durum.Plan`. Beş katman da **aynı**
nesneyi okuyup yazar — planlayıcı adımları, ReAct `kanitlar`ı, yansıtma
`bulgular`ı, yönetici `uzman`ı, insan `durum`u. Bu nesne olmadan entegrasyon
sahtedir: yansıtma neye göre yargıladığını, insan neyi onayladığını bilemez.

Plan JSON olarak diske yazılıp geri okunabilir (`kaydet` / `yukle`), yani
koşu yarıda kesilip devam ettirilebilir.

## Örnek koşunun ürettiği iz

`--otomatik` ile koşarsan senaryo dört kenarın hepsini tetikler:

```
◆ [plan/uretildi] 3 adımlık plan üretildi
  ⏸ [insan/soruldu] Plan yürütülmeye hazır (eşik: plan_onayi)
  ▸ [yurut/adim-basladi] Ölçüm verisini oku → arastirmaci
    · [react/gozlem-hata] dosya_oku → dosya yok: olcumler.json
    · [react/yeniden-planla-istegi] olcumler.json yok, önce veri üretilmeli   ★1
◆ [plan/yeniden-planlandi] sürüm 2: 4 adım
  ...
  ▸ [yurut/adim-basladi] Özet raporu yaz → yazar
    ✓ [yansit/reddedildi] rapor-yaz: 1 bulgu
  ⇄ [yonetici/yeniden-gorev] rapor-yaz aynı uzmana geri verildi (yazar)        ★2
  ▸ [yurut/adim-basladi] Özet raporu yaz → yazar (iyileştirme turu 1)
    ✓ [yansit/gecti] rapor-yaz: 3 orak geçildi
  ⏸ [insan/soruldu] dosya_sil çağrılmak üzere (eşik: geri_alinamaz_arac)       ★3
  ⇄ [yonetici/birlestirme-eksik] 1 eksik: kapanış özeti yazılmadı
  ⇄ [yonetici/yeni-gorev] 1 kapanış adımı plana eklendi                        ★4
  ⇄ [yonetici/birlestirme-tamam] birleşik sonuç tutarlı
```

---

## Katmanların tasarım kararları

### Yansıtma harici orakla bağlanır

Modelin kendi çıktısına "iyi mi?" diye bakması bozuk bir ölçüdür — genelde
"iyi görünüyor" der. Bu yüzden `yansitma.py` iki tür orak tanır:

- **`KuralOragi`** — deterministik. Kod çalıştırır, diske bakar, desen arar.
  Yargısı modelden bağımsız. Öncelikli olan bu.
- **`ModelOragi`** — LLM yargıcı. Deterministik kuralın yakalayamayacağı
  şeyler için (tutarlılık, ton, anlam). Kural oraklarının *yerine* değil,
  üstüne.

Hazır oraklar: `bos_olmasin`, `yasakli_ifadeler` (sahte içerik / doldurma
metni denetimi), `dosya_bolumleri` (diske ne yazıldığına bakar),
`desen_bekle`.

**Maliyet notu:** Oraklar adım kimliğine bağlanabiliyor. Her adıma her orağı
koşmak maliyeti çarpar (adım başına N ReAct × M yansıtma). Eşleşme yoksa
yansıtma hiç çalışmaz — bu kasıtlı.

### Eşikler ilan edilir, sezilmez

`insan.Esikler` bir veri sınıfı. "Model tehlikeli bir şey yapıyor gibi
hissediyorum" bir eşik değildir:

| Eşik | Varsayılan | Ne zaman insana çıkar |
|---|---|---|
| `plan_onayi` | `True` | Yürütmeden önce planı göster |
| `geri_alinamaz_araclar` | `True` | `Arac.geri_alinamaz` işaretli her çağrı |
| `azami_yansitma_turu` | 2 | Adım bu kadar turda doğrulamayı geçemezse |
| `azami_react_adimi` | 8 | Tek adım içinde ReAct tur bütçesi |
| `azami_yeniden_planlama` | 2 | Plan bu kadar kez yeniden yazıldıysa |
| `azami_adim_sayisi` | 12 | Plan bu boyutu aşarsa (kapsam kaçıyor) |
| `azami_birlestirme_turu` | 2 | Eksik kapatma turları bitmiyorsa |

İnsanın dört cevabı var: `ONAY`, `RET`, `ATLA`, `DURDUR`. **`RET` bir
gözleme dönüşür** — model reddedildiğini görüp başka yol dener; sessizce
çökmez.

`KonsolKapisi` terminalden sorar, `OtomatikKapi` testler ve gözetimsiz
koşular için sabit yanıt verir. İkincisini üretimde kullanmak insan
denetimini kapatmak demektir — bilinçli tercih olmalı, varsayılan değil.

### Uzmanların araç alt kümesi bir güvenlik sınırıdır

Uzmanlar birbirinden iki şeyle ayrılır: kendi yönergesi (nasıl çalışacağı) ve
kendi `izinli_araclar` listesi (neye eli değebileceği). "yazar" uzmanının
silme aracı yoktur, dolayısıyla silemez — bu bir istem ricası değil, kayıt
defterinde eksik olan bir araç. Yetkisi olmayan bir aracı çağırırsa bunu bir
gözlem olarak geri alır ve başka yol dener.

### Motor arayüzü döngüyü test edilebilir bırakır

`motor.py` iki uygulama sunar, ikisi de aynı üç işi yapar (planla / düşün /
yargıla):

- **`SahteMotor`** — deterministik. Kararlarını adımın *gerçek durumundan*
  (kanıtlar, bulgular) türetir, sabit bir betikten değil. Dört kenarın
  hepsini API anahtarı olmadan tetikler.
- **`ClaudeMotor`** — `claude-opus-5`, adaptive thinking, `output_config` ile
  yapılandırılmış JSON çıktı, `stop_reason == "refusal"` denetimi.

Döngü hangisinin takılı olduğunu bilmez. 17 testin ağ olmadan koşabilmesinin
sebebi bu.

`motor_sec()` anahtar varsa Claude'u dener, kurulamazsa sahteye düşer:

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...      # ya da: ant auth login
python3 calistir.py --motor claude
```

**Bilinçli bir ödünleşim:** `ClaudeMotor` ReAct turunu, modelden JSON karar
isteyip araçları kendimiz çalıştırarak yürütüyor — native tool-use ile değil.
Sebebi sahte motorla birebir aynı arayüzü paylaşmak. Üretimde native tool-use
daha uygun: SDK'nın `client.beta.messages.tool_runner` yardımcısı halkayı
kendisi sürer ve `AracKaydi.anthropic_semasi()` bunun için hazır duruyor.

---

## Dosya düzeni

```
dongu/
├── calistir.py            CLI — beş katmanı kablolar (dongu_kur)
├── cekirdek/
│   ├── durum.py           ★ paylaşılan durum: Plan, Adim, Kanit
│   ├── olaylar.py         ortak iz — hangi halka ne zaman döndü
│   ├── araclar.py         araç kaydı + geri_alinamaz bayrağı
│   ├── motor.py           SahteMotor / ClaudeMotor + planlama (Katman 0)
│   ├── uzmanlar.py        Katman 1.5 — Yönetici, Uzman, birleştirme orağı
│   ├── react.py           Katman 2
│   ├── yansitma.py        Katman 3 — oraklar
│   ├── insan.py           Katman 4 — eşikler + kapı
│   └── yurutucu.py        Katman 0+1 — hepsini süren orkestratör
└── testler/test_dongu.py  17 test, ağ yok
```

## Kendi işine uyarlamak

1. **Araçlarını tanımla** (`araclar.py` örneğini değiştir). Geri alınamaz
   olanları işaretle.
2. **Uzman kadronu yaz** (`ornek_kadro` yerine). Her uzmana dar bir araç
   listesi ver.
3. **Oraklarını yaz** — en önemli adım. Yansıtma ancak orağın kadar iyidir.
   Projendeki gerçek doğrulayıcıları (linter, test koşusu, şema denetimi,
   kontrast ölçümü) `KuralOragi` olarak sar.
4. **Eşiklerini ilan et** (`Esikler`). Hangi işlem geri alınamaz, hangi karar
   senindir.
5. `calistir.dongu_kur` fonksiyonunu örnek alarak kabloyu kur.

## Bilinen sınırlar

- **Uzmanlar sırayla koşuyor, paralel değil.** Bağımsız adımları paralel
  yürütmek mümkün ama insan kapısı ve paylaşılan çalışma dizini sıralama
  gerektiriyor; iskeletin okunabilirliğini korumak için sıralı bırakıldı.
  Paralelleştirilecek yer `Yurutucu._adimlari_sur`.
- **Adımlar arası bağımlılık grafiği yok** — plan düz bir liste. Gerçek
  fan-out için `Adim`'a `bagimliliklar` alanı eklemek gerekir.
- **Bağlam yönetimi yok.** Uzun koşularda `Adim.kanitlar` büyür; üretimde
  ya budama ya da API'nin compaction'ı gerekir.
- `ClaudeMotor` maliyet ölçmüyor; `usage` alanlarını `istatistik`e eklemek
  ilk yapılacak şey olmalı — maliyet görünürlüğü olmadan diğer her şey kör.
