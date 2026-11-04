# Pipos'un dövüş sanatı: Kaplan sanatı — TASLAK

**Kullanıcının kararları (2026-11-01, kayıt SERI_SEZON1.md "Karakterler"):**
- Akıl hocasının adı **Pipos**, dövüş sanatının adı **Kaplan sanatı**.
- Silah yok, yalnız yumruk.
- *"Yumruk seti disiplinli olsun; dövüş stili akıllıca, bilgelik içeren
  dövüş stili olsun; savunması daha baskın, saldırısı geri planda olan."*
- Düzeltme: *"Savunma önde olsun dedik de o kadar da abartılı önde
  olmasın. Son saldırı hiç olmazsa ne olacak? O zaman dövüş bitmez,
  sürekli savunma yapar."* Yani savunma önde ama ölçülü; **her dövüş bir
  bitiriş saldırısıyla biter.**

Bu belgedeki geri kalan her şey (evreler, oranlar, hareketlerin adları ve
biçimleri) **Claude'un önerisi**; kullanıcı onayladıkça SERI_SEZON1.md'ye
taşınır. Önizleme pozları bölüm 8'de, film aracına henüz bağlanmadı.

## 1. Fikir: kaplan gibi

Kaplan avını önce izler, sabırla bekler, açık bulunca atılır ve işi
bitirir. Kaplan sanatı da üç evreli: **gözle, sık, atıl.** Savunma
dövüşün başını yönetir, saldırı dövüş ilerledikçe büyür, sonu her zaman
bir atılıştır.

## 2. Altı kural

1. **Dövüşü o başlatmaz.** İlk vuruş rakipten gelir. Rakip elini
   gösterdikten sonra Pipos da saldırabilir.
2. **Az hareket.** Gereksiz adım ve gösteriş yok; her hareketten sonra
   hazır duruşa döner.
3. **Rakibin gücünü kullanır.** Vuruşu durdurmaz, yönünü değiştirir;
   rakip kendi hızıyla dengesini kaybeder.
4. **Mesafe onun elindedir.** Rakibi kol boyunda tutar.
5. **Sabırla açar, kararlılıkla bitirir.** Açıklık oluşunca tereddüt
   etmez; bitiriş her dövüşte var.
6. **Sakinliği görünür.** Başı hep rakipte, nefesi yavaş; atılışta bile
   telaşsız.

## 3. Üç evre ve oranlar

| evre | ne olur | savunma : saldırı | sonraki evreye geçiş |
|---|---|---|---|
| **1. Gözlem** | Rakibi okur. Savuşturur, kaçınır, yalnız başarılı bir savunmanın ardından kısa karşılık verir. | ~3 : 1 | Rakibin **3 vuruşu boşa çıkınca** (ya da senaryo öyle isteyince) |
| **2. Sıkıştırma** | Öne adım atar, karşı vuruşlar sıklaşır, kendi kısa saldırılarını başlatır, rakibi açığa iter. | ~1 : 1 | Rakip **dengesini kaybedince** (yönlendirme, süpürme, sert itme) ya da yorulunca |
| **3. Atılış** | Bitiriş zinciri: tek kararlı atılış, rakip yere. | saldırı | Dövüş biter. Pipos hazır duruşa döner, rakibi kovalamaz. |

Bütün dövüşe yayılınca **savunma yaklaşık %60, saldırı %40**: savunma
önde ama abartısız.

Ölçüler:
- Gözlemde karşı vuruş, başarılı savunmadan sonra 0,3–0,5 sn içinde gelir.
- Her hareketten sonra en geç 0,6 sn içinde hazır duruşa dönülür.
- Yürür, koşmaz; atılış dışında.
- Yan adım 0,6–0,8 blok (şimdiki `kacin` 2,4).

## 4. Duruşlar

| # | ad | tarif | kaynak |
|---|---|---|---|
| D0 | Sakin duruş | Kollar göğüste kavuşmuş; dövüş başlamadan ve konuşurken. | Kendi pozumuz; Quaternius `Idle_FoldArms_Loop` (UAL2, CC0) referans |
| D1 | Hazır duruş | Sol el önde açık avuç, sağ el göğüste, gövde hafif yan, sol ayak önde. | Kendi pozumuz + nefes |

## 5. Hareketler

**Savunma (gözlem evresinin çoğu):**

| # | ad | ne olur | rakibe etkisi |
|---|---|---|---|
| S1 | Dış savuşturma | Sol ön kol vuruşu dışarı süpürür. | Vuruş boşa gider, rakip 0,3 sn açık kalır. |
| S2 | İç yönlendirme | Avuç rakibin bileğini yanından iter, gövde döner. | Rakip kendi hızıyla yanından geçip sendeler. |
| S3 | Yan adım | Son anda yarım adım yana. | Vuruş ıskalar. |
| S4 | Geri eğilme | Ayak oynamadan gövde geri. | Vuruş yüzünün önünden geçer. |
| S5 | Çift ön kol blok | Ağır vuruşa karşı (film aracında var: `savun`). | İtme %35. |
| S6 | Bilek yakalama | Yumruğu havada yakalar. | Rakip donar; konuşma anı. |

**Saldırı (sıkıştırmada sıklaşır):**

| # | ad | ne olur | rakibe etkisi | kaynak |
|---|---|---|---|---|
| K1 | Avuç darbesi | Göğse kısa düz avuç. | Geri itilir. | Kendi pozumuz |
| K2 | Kısa yumruk | Hızlı, hafif. | Darbe tepkisi. | Quaternius `Punch_Jab` |
| K3 | Süpürme | Yönlendirmeden sonra ayak süpürme. | Yere düşer. | Kendi + `dusur` |
| K4 | Omuz itmesi | Yaklaşanı uzaklaştırır. | 1–1,5 blok geri. | Kendi |
| K5 | İkili vuruş | Kısa yumruk + avuç, art arda (sıkıştırmanın ana saldırısı). | Sendeler. | `Punch_Jab` + kendi |

**Bitiriş (atılış evresi, her dövüşte bir kez):**

| # | ad | ne olur |
|---|---|---|
| B1 | **Kaplan atılışı** | Rakibin açığında öne atılıp iki avuçla göğse vurur; gövde öne eğik, arka bacak gergin. Rakip sırtüstü yere düşer. Pipos yere düşeni vurmaz, hazır duruşa döner. |
| B2 | Kaplan atılışı (ağır) | Gerekirse önce savuşturma, sonra kısa yumruk, sonra B1 (üç vuruşluk bitiriş zinciri). |

## 6. Kalıp zincirler

| zincir | evre | akış |
|---|---|---|
| Boşa çıkar | gözlem | rakip vurur → S1 → K1 → D1 |
| Ders | gözlem | rakip üç kez vurur → S3 → S4 → S6 (yakalar, konuşur) → K4 |
| Sıkıştır | sıkıştırma | S1 → K5 → öne adım → S2 → rakip sendeler |
| Bitir | atılış | rakip sendeliyor ya da yerden kalkıyor → B1 (gerekirse B2) |

## 7. Film aracında gerekenler

1. Kaplan sanatı seti: iki duruş, altı savunma, beş saldırı, iki bitiriş.
2. Yeni olaylar: `savustur` (dış/iç), `yan_adim`, `yakala`, `karsi`,
   `atilis`. Vuruş savuşturma penceresine düşerse hasar ve itme yok;
   rakipte "boşa düşme" tepkisi oynar.
3. Evre sayacı: otomatik dövüşte boşa çıkan vuruş sayısı evreyi ilerletir;
   senaryoda evre elle de verilebilir.
4. Rakip tepkileri: boşa düşme, yakalanmış bekleme, geri itilme,
   atılışla yere düşme. Bunlar her rakipte kullanılabilir.
5. Quaternius → Minecraft kol çevirici. Aynı araç çocukluk arkadaşının
   tabancalarına da lazım.
6. Testler:
   - savuşturulan vuruş hasar vermiyor;
   - gözlem evresinde karşı vuruş yalnız başarılı savunmadan sonra geliyor;
   - her otomatik dövüş bir atılışla bitiyor;
   - yere değen pozlar zemine oturuyor;
   - kol rakibin bedenine girmiyor.
7. FILM_YETENEK_HARITASI.md aynı commit'te güncellenir.

## 8. Önizleme pozları (taslak, 2026-11-01)

Bedrock dönüşü `[x, y, z]` derece; kural film_poz.py'deki gibi (kol X −90
öne kalkar, bel X + öne eğilir). Sabit anahtar pozlar; film aracına
bağlanırken hazırlık, vuruş ve toparlanma evreleriyle hareketlenecekler.

| poz | sağ kol | sol kol | bel | baş | sol bacak | sağ bacak |
|---|---|---|---|---|---|---|
| D0 sakin | −40, −42, 6 | −36, 44, −6 | — | −3, 0, 0 | — | — |
| D1 hazır | −48, −32, 0 | −72, 18, 0 | 0, −18, 0 | 0, 16, 0 | −12, 0, −3 | 10, 0, 3 |
| S1 savuşturma | −62, −28, 0 | −100, −38, 0 | 0, 14, 0 | 0, −10, 0 | −8, 0, −4 | 12, 0, 4 |
| K1 avuç | −90, −6, 0 | −42, 24, 0 | 0, −22, 0 | 0, 20, 0 | −16, 0, −3 | 18, 0, 3 |
| B1 atılış | −96, −12, 0 | −96, 12, 0 | 20, 0, 0 | −14, 0, 0 | −32, 0, −2 | 26, 0, 2 |

## 9. Araştırmadan gelenler (2026-11-04)

Kullanıcı araştırmanın karakterlere işlenmesini istedi
(`DOVUS_KIMLIKLERI.md` 3. bölüm, kaynaklar `REFERANS_DOVUS_KOREOGRAFI.md`
§6, §35, §43, §47, §57, §61). Taslağın yukarıdaki kısmı değişmedi; aşağıdakiler
kullanıcının *"hepsini karakterlerimize entegre et"* isteğiyle taslağa **işlendi**
(taslağın kendisi hâlâ onay bekliyor). Araçta: `"kimlik": "pipos"` dövüş
hâlinde geniş duruş ve yavaş nefes (`arac/dovus_kimlik.py`).

- **D0 sakin → alçak at duruşu:** filmde diz var; ayaklar omuzdan geniş,
  dizler bükük, ağırlık ortada (Hung Gar *sei ping ma*). En alçak ve en
  geniş bekleme duruşu Pipos'un olsun; nefes salınımı yavaş.
- **S1 savuşturma + tek kısa geri adım:** karşı vurucunun açılışı; `yan_adim`
  olayının yanına `geri_adim` (kısa, 0,2–0,3 blok).
- **K1 avuç → kaplan pençesi:** yukarıdan aşağı iner, gücü bel dönüşünden
  alır; blok kolda açık el okunmadığı için pençeyi kolun açısı ve belin
  dönüşü taşır. Öndeki kol saldırırken arkadaki kol korur.
- **B1 atılış öncesi "ma":** 0,4–0,8 sn iki taraf da durur, ses kesilir;
  sonra iki pençe birden aşağı (tek bitiriş).
- **Ses:** Pipos bağırmaz, yalnız nefes verir. Rakibin bağırışı onun karşı
  vuruş anı olabilir (bağırış vuruşu önceden işaret eder).
- **Ölçülülük:** gerekmedikçe yaralamaz; bitiriş tek ve kararlı.
- **Bilinen zayıflık:** açık bulamayan karşı vurucu, uzaktan saldıran
  rakipte geride kalır. Hikâyede kullanılıp kullanılmayacağı kullanıcının
  kararı.
