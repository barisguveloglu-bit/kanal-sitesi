# Luna uzmanlık denemesi — 3 Ekim 2026

Beş ayrı `collaboration.spawn_agent` çağrısında `model: "gpt-6-luna"`
ve `fork_turns: "none"` kullanıldı. Her ajan yalnız kendi rol sözleşmesi
ve vaka dosyasıyla görevlendirildi. Cevap anahtarı görevlerden önce
hazırlandı ve ajanlarla paylaşılmadı; yanıtlar tamamlandıktan sonra
anahtar ve özgün raporlar buraya kaydedildi.

| Rol | Araçtaki görev adı | Doğru sınıflandırma |
|---|---|---|
| Belge | `luna_belge_deneyi` | 6/6 |
| Veri | `luna_veri_deneyi` | 5/5 |
| Türkçe dil | `luna_dil_deneyi` | 5/5 |
| Erişilebilirlik | `luna_erisim_deneyi` | 6/6 |
| Gizlilik | `luna_gizlilik_deneyi` | 6/6 |

Toplam **28/28**: kasıtlı 15 kusurun tamamı bulundu, 13 doğru örneğe
yanlış alarm verilmedi. Her alıntı kendi vaka metninde birebir bulundu.
Açıklamalar ayrıca şef tarafından okundu. Site dosyaları değiştirilmedi;
örneklerdeki kod ve dış adresler çalıştırılmadı.

Kaydedilmiş yanıtların sınıflandırma, kapsam ve alıntı denetimini yeniden çalıştır:

```sh
python3 tests/luna_deneme/degerlendir.py
```

Bu komut **yeni ajan çağırmaz**; arşivdeki yanıtları değerlendirir.
Yeni bir canlı denemede yalnız rol/vaka dosyalarını ajana ver; buradaki
cevap anahtarını ve raporları paylaşma. Depoyu okuyan bir ajan anahtara
erişebileceğinden yeni kör ölçüm için anahtarı ayrı ortamda tut.

Bu küçük ve açık kurallı örnek seti, Luna'ya bu beş rolün ilk incelemesini
vermek için başlangıç kanıtıdır. Büyük depo incelemelerinde aynı başarıyı,
Sol'a göre üstünlüğü veya hız/maliyet kazancını kanıtlamaz. Süre ve maliyet
ölçülmedi; model seçimi araç çağrısıyla doğrulandı, sunucunun iç model
kayıtlarına erişim yoktu. Şef raporları doğrular; belirsiz veya kapsamlı
bulguları gerekirse `--model gpt-6.1-sol` ile yeniden inceletir.
