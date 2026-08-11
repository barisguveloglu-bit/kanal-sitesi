# Döngü Sistemleri

Bu klasör siteye ait değil. Site hâlâ derleme adımı olmayan, backend'siz,
veri toplamayan statik bir arşiv — **buradaki hiçbir şey yayına çıkmıyor.**
Bu katman sadece *site üzerinde çalışırken* kullanılan iş akışı.

## Neden iç içe, yan yana değil

Beş döngü birbirinin alternatifi değil. Farklı yüksekliklerde duruyorlar,
bu yüzden birleşebiliyorlar:

```
KAT 0   İnsan onayı          eşikte durur, karar Barış'ta
   │
KAT 1   Orkestratör          işi uzmanlara böler, sonuçları birleştirir
   │                         eksik kalırsa yeniden görev verir
KAT 2   Planla-Uygula        alt görevler + plana sadakat kontrolü
   │
KAT 3   ReAct                oku → uygula → gözlemle → yeniden karar ver
   │
KAT 4   Yansıt-İyileştir     dogrula.py'ye test ettir, kırmızıysa geri dön
```

Okuma yönü şöyle: orkestratör bir parçayı bir uzmana verir; uzman o parça
için **kendi** planını çıkarır; plandaki her adımı ReAct turuyla yürütür;
her adımın sonunda çıktı denetleyiciden geçer; denetleyicinin çözemediği
ya da canon'a dokunan bir şey çıkarsa KAT 0'a, yani sana çıkar.

Kritik ayrım — orkestratör tek seferde dağıtıp toplarsa bu bir **iş akışı**
olur. Gelen sonuçtaki eksiğe göre yeniden görev veriyorsa **döngü** olur.
`/orkestra` 4. adımda bunu zorunlu tutuyor.

## Döngünün durduğu yer

Her döngünün bir çıkış koşulu var, yoksa sonsuza kadar döner:

| Döngü | Durma koşulu |
|---|---|
| Yansıt-İyileştir | Denetim temiz, **ya da 3 tur doldu** → insana çık |
| Orkestratör | Boşluk kalmadı, **ya da 2 kez yeniden gönderildi** → elindekiyle devam, eksiği söyle |
| Planla-Uygula | Plandaki alt görevler bitti |
| ReAct | Gözlem planı doğruladı |
| İnsan onayı | Cevap geldi |

Tur sınırları keyfi değil: üçüncü turda hâlâ çözülemeyen şey genelde
kodda değil, kararda eksiktir — orada insana çıkmak doğrusu.

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
| `sahte` | Uydurma video kimliği, "yakında" başlığı, YouTube olmayan bağlantı |
| `kontrast` | Renk çiftlerini WCAG AA (4.5:1) sınırına karşı **ölçer** |
| `lore` | `data.js`'teki adlar `LORE.md`'de geçiyor mu |

```
python3 .claude/dogrula.py            # hepsi
python3 .claude/dogrula.py kontrast   # tek başlık
python3 .claude/dogrula.py --kisa     # sadece hatalar
```

`.claude/kanca.py` bunu otomatikleştiriyor: bir `.html`, `.css`, `.js`,
`.xml` ya da `LORE.md` her düzenlendiğinde denetim kendiliğinden koşuyor
ve hata varsa sonuç Claude'a geri besleniyor. Yani iyileştirme turu
sen fark etmeden aynı turda başlıyor. `.claude/` içindeki düzenlemeler
kancayı tetiklemez.

Betiğin **göremediği** şey: canon'un anlamca tutarlı olup olmadığı.
Adların iki dosyada da geçtiğini görür, aynı şeyi söylediklerini göremez.
O kısım hâlâ okumakla oluyor.

## Komutlar

| Komut | Ne yapar | Ne zaman |
|---|---|---|
| `/dongu <hedef>` | Beş katın hepsi | Normal iş — varsayılan giriş |
| `/planla <hedef>` | Sadece plan, dosyaya dokunmaz | Önce ne olacağını görmek istediğinde |
| `/denetle [düzelt]` | Sadece KAT 4 | "Bir şey bozuldu mu?" |
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

- Bu katman siteyi değiştirmez, sadece üzerinde çalışma biçimini değiştirir.
- Denetleyici kural ihlalini yakalar, **iyi fikri kötü fikirden ayıramaz.**
- Uzman ajanlar sıfırdan başlar; `LORE.md` okumalarını söylemezsen okumazlar.
- Ajan raporu delil değildir. Sayı/isim/tarih iddiasını dosyadan doğrula.
