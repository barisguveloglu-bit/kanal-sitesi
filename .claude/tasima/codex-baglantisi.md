# Codex bağlantısı (Claude → Codex)

Bu dosya siteye ait değil, `.claude/` altındaki iş akışı katmanının parçası.

Bağlanan yön **tek**: Claude Code, Codex'i bir araç gibi çağırır. Codex'in
içinden Claude'u çağırmak ayrı bir iş ve burada kurulu değil.

## Codex bu sistemde ne sayılır

Bir alt ajan. Başka bir şey değil.

Bu ayrım süsleme değil, bu depodaki en pahalı kararlardan biri: `/orkestra`
alt ajanlara sözleşmesiz görev göndermeyi bıraktığında sebep, alt ajanın
sıfırdan başlaması ve **yanlış cevabı düzgün Türkçeyle** vermesiydi. Codex
tam olarak öyle bir alt ajan — üstelik kendi sanal alanında, kendi
modeliyle, senin göremediğin bir süreçte çalışıyor.

Bu yüzden Codex, alt ajanlara uygulanan iki mekanik kapıya bağlandı:

| Kapı | Nasıl bağlandı |
|---|---|
| Sözleşme (`kanca-gorev.py`) | `PreToolUse` matcher'ına `mcp__codex__.*` eklendi |
| Denetim (`kanca.py`) | `PostToolUse` matcher'ına `mcp__codex__.*` eklendi |

Birincisi bedavaya geldi: `kanca-gorev.py` zaten `tool_input.prompt`
okuyor, Codex MCP aracının girdisi de tam olarak `prompt`. Yani sözleşmesiz
bir istem Codex'e **gönderilmiyor** — uydurma yasağı, canon kaynağı ve atıf
zorunluluğu geçmeden görev çıkmıyor.

İkincisi kod değişikliği istedi, sebebi aşağıda.

## Kör araç sorunu

`kanca.py` hangi dosyaya dokunulduğuna `tool_input.file_path` üzerinden
bakıyordu. Codex'in girdisinde dosya yolu **yok** — sadece istem metni var.
Dokunulan dosya, Codex'in kendi sürecinin içinde belli oluyor.

Bilinmeyeni "dokunulmadı" saymak, denetimi delegasyonla atlatılabilir hâle
getirirdi: Claude'un kendi `Edit`'i kancaya takılırken, aynı düzenlemeyi
Codex'e yaptırmak serbest kalırdı. Kaçak yolu kuralın kendisinden ucuzsa
ortada kural yoktur.

Çözüm `kanca.py` içindeki `KOR_ARACLAR`: kör bir araçtan sonra denetim
**koşulsuz** çalışır. Bunun bedeli var — Codex'e sorulan salt okunur bir
soru bile denetim koşturur. Bedel bilinçli: yanlış tarafa hata yapmak,
denetimi es geçmekten ucuz.

İki yönü de `arac-sinavi.py` ölçüyor (`kanca: kör aracı denetliyor`,
`kanca: ilgisiz aracı geçiştiriyor`). Tek yön ölçülseydi kancayı "her
zaman çalış" diye bozmak sınavdan geçerdi.

## Dürüst tablo

`claude-projesi.md`'deki tablonun Codex hâli. Buradaki fark önemli:
**claude.ai'nin kabuğu yok, Codex'in var.** Yani zorlamanın büyük kısmı
gerçekten taşınıyor.

| Parça | Codex'te | Sebep |
|---|---|---|
| `dogrula.py`, `ara.py`, `devre.py` | **Çalışır** | Codex kabuk çalıştırabiliyor |
| Sözleşme kapısı | **Çalışır** | Claude tarafındaki kanca gönderimi kesiyor |
| Denetim kapısı | **Çalışır** | Claude tarafındaki kanca çağrı sonrası koşuyor |
| Codex'in *kendi* turu içindeki ara adımlar | **Görünmez** | Kanca çağrının sonunda çalışır, ortasında değil |
| Codex'in `~/.codex` ayarları | **Senin sorumluluğun** | Depo değil, makine yapılandırması |

Son satırdan öncesi asıl sınır: Codex on dosya değiştirip beşini bozsa
bile denetim ancak **iş bittiğinde** konuşur. Kanca bir dedektördür,
kelepçe değil. Codex'e verilecek iş bu yüzden küçük tutulmalı — büyük
iş, geç gelen denetimle birlikte büyük geri alma demek.

## Kurulum

Codex bu depoda kurulu gelmiyor; senin makinende olması gerekiyor.

1. Codex CLI kurulu ve giriş yapılmış olsun.
2. Alt sunucu modunun adını **doğrula** — sürümler arasında değişti:

   ```
   codex mcp-server --help
   ```

   Çalışıyorsa depodaki `.mcp.json` olduğu gibi doğru.
   Komut tanınmıyorsa `codex --help` çıktısına bak; mod `codex mcp serve`
   ya da benzeri bir adla duruyor olabilir. `.mcp.json` içindeki `args`
   alanını ona göre düzelt.

3. Claude Code'u depo kökünde aç. Proje kapsamlı MCP sunucusu için onay
   isteyecek — onayla.
4. `/mcp` komutuyla `codex` sunucusunun bağlandığını gör.

`.mcp.json` depo kökünde duruyor çünkü Claude Code proje kapsamlı MCP
yapılandırmasını orada arıyor. GitHub Pages onu da yayınlar; içinde sır
yok, iki satır komut adı — ama bilerek dursun.

## Doğrulama

Bağlantı kurulduktan sonra üç şeyi ayrı ayrı sına:

```
/mcp                                  # sunucu bağlandı mı
python3 .claude/arac-sinavi.py        # kancalar hâlâ sağlam mı
python3 .claude/dogrula.py            # site temiz mi
```

Sonra sözleşme kapısının gerçekten kapalı olduğunu gör: Codex'e sözleşmesiz
bir istem göndermeyi dene. `SÖZLEŞMESİZ ALT AJAN GÖREVİ — gönderilmedi`
görmüyorsan matcher tutmamıştır; araç adı beklenenden farklı olabilir.
Gerçek adı `/mcp` çıktısından oku ve `settings.json`'daki iki matcher'ı
düzelt.

## Bilerek yapılmayanlar

- **Codex → Claude yönü kurulmadı.** İstenmedi. İstenirse `claude mcp serve`
  ve `~/.codex/config.toml` içinde bir `[mcp_servers.claude]` girdisi gerekir.
- **Codex'in sanal alanı ayarlanmadı.** `mcp-server` senin `~/.codex/config.toml`
  dosyanı miras alır. Yazma iznini oradan yönetiyorsun; depo bu kararı
  senin adına vermiyor.
- **Codex'in raporuna otomatik atıf denetimi bağlanmadı.** `gorev.py dogrula`
  elle çalıştırılır:

  ```
  python3 .claude/gorev.py dogrula --rapor <dosya> --deftere-yaz
  ```
