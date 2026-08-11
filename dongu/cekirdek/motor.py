"""
Motor katmanı — döngü mimarisini LLM'den ayıran ince arayüz.

İki uygulama var:

  - `SahteMotor`  : API anahtarı olmadan çalışır. Deterministik; kararlarını
                    adımın gerçek durumundan (kanıtlar, bulgular) türetir.
                    Döngü mantığını tek başına test edilebilir kılar.
  - `ClaudeMotor` : ANTHROPIC_API_KEY (ya da `ant auth login` profili) varsa
                    gerçek Claude'a bağlanır.

İkisi de aynı üç işi yapar: planla / düşün / yargıla. Döngü hangisinin
takılı olduğunu bilmez — entegrasyonun test edilebilir kalmasının sebebi bu.
"""

from __future__ import annotations

import json
import os
import textwrap
from dataclasses import dataclass, field
from typing import Protocol

from .araclar import AracKaydi
from .durum import Adim, Plan

MODEL = "claude-opus-5"


@dataclass
class Karar:
    """ReAct'in bir turunda modelin verdiği karar."""

    dusunce: str
    tip: str  # "eylem" | "cevap" | "yeniden_planla"
    arac: str = ""
    girdi: dict = field(default_factory=dict)
    icerik: str = ""


class Motor(Protocol):
    def planla(
        self,
        hedef: str,
        arac_tarifi: str,
        uzman_tarifi: str = "",
        mevcut_plan: Plan | None = None,
        gerekce: str | None = None,
    ) -> list[dict]: ...

    def dusun(
        self, hedef: str, adim: Adim, kayit: AracKaydi, uzman: object | None = None
    ) -> Karar: ...

    def yargila(self, adim: Adim, olcut: str) -> tuple[bool, list[str]]: ...


# ---------------------------------------------------------------------------
# Sahte motor
# ---------------------------------------------------------------------------


class SahteMotor:
    """Senaryolu, deterministik motor.

    Kararlarını adımın kanıtlarından ve yansıtma bulgularından üretir; bu
    yüzden dört döngünün de gerçek yollarını (yeniden planlama, iyileştirme
    turu, geri alınamaz eylem) tetikler.
    """

    ad = "sahte"

    def planla(
        self,
        hedef: str,
        arac_tarifi: str,
        uzman_tarifi: str = "",
        mevcut_plan: Plan | None = None,
        gerekce: str | None = None,
    ) -> list[dict]:
        if mevcut_plan is None or gerekce is None:
            return [
                {
                    "kimlik": "veri-topla",
                    "baslik": "Ölçüm verisini oku",
                    "aciklama": "olcumler.json dosyasını oku ve içeriğini özetle.",
                    "uzman": "arastirmaci",
                },
                {
                    "kimlik": "rapor-yaz",
                    "baslik": "Özet raporu yaz",
                    "aciklama": "rapor.md dosyasını Bulgular ve Yöntem bölümleriyle yaz.",
                    "uzman": "yazar",
                },
                {
                    "kimlik": "temizlik",
                    "baslik": "Geçici dosyayı sil",
                    "aciklama": "İşi biten ham veri dosyasını sil.",
                    "uzman": "bakimci",
                },
            ]

        # Yeniden planlama: ReAct'in gözlemi plana geri dönüyor.
        # Eksik ön koşulu kapatan bir adımı, kalan adımların önüne ekle.
        yeni_adim = {
            "kimlik": "veri-uret",
            "baslik": "Eksik veri dosyasını üret",
            "aciklama": f"Gözlem sonucu eklendi: {gerekce}",
            "uzman": "arastirmaci",
        }
        kalanlar = [
            {
                "kimlik": a.kimlik,
                "baslik": a.baslik,
                "aciklama": a.aciklama,
                "uzman": a.uzman,
            }
            for a in mevcut_plan.adimlar
            if not a.bitti_mi()
        ]
        return [yeni_adim] + kalanlar

    def dusun(
        self, hedef: str, adim: Adim, kayit: AracKaydi, uzman: object | None = None
    ) -> Karar:
        kanitlar = adim.kanitlar
        son = kanitlar[-1] if kanitlar else None

        if adim.kimlik == "veri-uret":
            if not kanitlar:
                icerik = json.dumps(
                    {"olcumler": [12, 19, 7, 24, 15], "birim": "adet"},
                    ensure_ascii=False,
                )
                return Karar(
                    dusunce="Veri dosyası yok; örnek ölçümlerle oluşturuyorum.",
                    tip="eylem",
                    arac="dosya_yaz",
                    girdi={"yol": "olcumler.json", "icerik": icerik},
                )
            return Karar(dusunce="Dosya oluştu.", tip="cevap", icerik="olcumler.json üretildi.")

        if adim.kimlik == "veri-topla":
            if not kanitlar:
                return Karar(
                    dusunce="Önce ham veriyi okumam gerekiyor.",
                    tip="eylem",
                    arac="dosya_oku",
                    girdi={"yol": "olcumler.json"},
                )
            if son is not None and son.hata:
                # ★ ReAct → Plan geri kenarı. Gözlem planı geçersiz kıldı.
                return Karar(
                    dusunce="Okuma başarısız; plan eksik bir ön koşul içeriyor.",
                    tip="yeniden_planla",
                    icerik="olcumler.json yok, önce veri dosyası üretilmeli.",
                )
            return Karar(
                dusunce="Veri okundu, özetliyorum.",
                tip="cevap",
                icerik=f"Ham veri okundu: {son.gozlem.strip()[:120]}",
            )

        if adim.kimlik == "rapor-yaz":
            yazim_sayisi = sum(1 for k in kanitlar if k.kaynak == "dosya_yaz" and not k.hata)
            if yazim_sayisi == 0:
                return Karar(
                    dusunce="Raporun ilk taslağını yazıyorum.",
                    tip="eylem",
                    arac="dosya_yaz",
                    girdi={
                        "yol": "rapor.md",
                        "icerik": "# Ölçüm Raporu\n\n## Bulgular\nToplam 5 ölçüm alındı.\n",
                    },
                )
            if adim.bulgular and yazim_sayisi == 1:
                # ★ Yansıtma turu. Orağın şikayetlerini gidererek yeniden üret.
                return Karar(
                    dusunce=f"Yansıtma şunları eksik buldu: {'; '.join(adim.bulgular)}",
                    tip="eylem",
                    arac="dosya_yaz",
                    girdi={
                        "yol": "rapor.md",
                        "icerik": (
                            "# Ölçüm Raporu\n\n"
                            "## Bulgular\n"
                            "Toplam 5 ölçüm alındı; ortalama 15.4 adet.\n\n"
                            "## Yöntem\n"
                            "olcumler.json dosyasındaki ham değerler okundu ve "
                            "aritmetik ortalama hesaplandı.\n"
                        ),
                    },
                )
            return Karar(dusunce="Rapor hazır.", tip="cevap", icerik="rapor.md yazıldı.")

        if adim.kimlik == "temizlik":
            if not kanitlar:
                # ★ Geri alınamaz araç — insan kapısı burada devreye girer.
                return Karar(
                    dusunce="Ham veri artık gerekmiyor, siliyorum.",
                    tip="eylem",
                    arac="dosya_sil",
                    girdi={"yol": "olcumler.json"},
                )
            return Karar(dusunce="Temizlik bitti.", tip="cevap", icerik=son.gozlem if son else "")

        if adim.kimlik.startswith("kapanis-"):
            # Yöneticinin birleştirme denetiminden doğan görev.
            if not kanitlar:
                return Karar(
                    dusunce="Birleştirme eksiği: kapanış özeti yok, yazıyorum.",
                    tip="eylem",
                    arac="dosya_yaz",
                    girdi={
                        "yol": "ozet.txt",
                        "icerik": (
                            "Kapanış özeti\n"
                            "-------------\n"
                            "arastirmaci: olcumler.json üretildi ve okundu.\n"
                            "yazar: rapor.md yazıldı (Bulgular + Yöntem).\n"
                            "bakimci: geçici ham veri temizlendi.\n"
                        ),
                    },
                )
            return Karar(dusunce="Eksik kapandı.", tip="cevap", icerik="ozet.txt yazıldı.")

        # Tanımadığı adım: bir kere ortama bak, sonra bitir.
        if not kanitlar:
            return Karar(
                dusunce="Ortamı görmek için dizini listeliyorum.",
                tip="eylem",
                arac="dosya_listele",
                girdi={},
            )
        return Karar(dusunce="Yapacak iş kalmadı.", tip="cevap", icerik=f"{adim.baslik}: tamam.")

    def yargila(self, adim: Adim, olcut: str) -> tuple[bool, list[str]]:
        """Sahte motorda LLM yargıcı yok; işi deterministik oraklar yapıyor."""
        return True, []


# ---------------------------------------------------------------------------
# Claude motoru
# ---------------------------------------------------------------------------

_PLAN_SEMASI = {
    "type": "object",
    "properties": {
        "adimlar": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kimlik": {"type": "string"},
                    "baslik": {"type": "string"},
                    "aciklama": {"type": "string"},
                    "uzman": {"type": "string"},
                },
                "required": ["kimlik", "baslik", "aciklama", "uzman"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["adimlar"],
    "additionalProperties": False,
}

_KARAR_SEMASI = {
    "type": "object",
    "properties": {
        "dusunce": {"type": "string"},
        "tip": {"type": "string", "enum": ["eylem", "cevap", "yeniden_planla"]},
        "arac": {"type": "string"},
        "girdi": {"type": "string"},  # JSON metni
        "icerik": {"type": "string"},
    },
    "required": ["dusunce", "tip", "arac", "girdi", "icerik"],
    "additionalProperties": False,
}

_YARGI_SEMASI = {
    "type": "object",
    "properties": {
        "gecti": {"type": "boolean"},
        "bulgular": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["gecti", "bulgular"],
    "additionalProperties": False,
}


class MotorHatasi(RuntimeError):
    pass


class ClaudeMotor:
    """Gerçek Claude bağlantısı.

    Not: ReAct turu burada modelden JSON karar isteyerek yürütülüyor; araçları
    biz çalıştırıyoruz. Bunun sebebi sahte motorla birebir aynı arayüzü
    paylaşmak. Üretimde native tool-use daha uygun: SDK'nın
    `client.beta.messages.tool_runner` yardımcısı halkayı kendisi sürer ve
    `AracKaydi.anthropic_semasi()` bunun için hazır duruyor.
    """

    ad = "claude"

    def __init__(self, model: str = MODEL, caba: str = "high") -> None:
        try:
            import anthropic  # noqa: PLC0415 - isteğe bağlı bağımlılık
        except ImportError as hata:  # pragma: no cover
            raise MotorHatasi(
                "anthropic paketi kurulu değil. `pip install anthropic` "
                "ya da sahte motorla çalış."
            ) from hata
        self._anthropic = anthropic
        self._istemci = anthropic.Anthropic()
        self.model = model
        self.caba = caba

    # -- alt seviye ---------------------------------------------------------

    def _json_iste(self, sistem: str, istem: str, sema: dict) -> dict:
        yanit = self._istemci.messages.create(
            model=self.model,
            max_tokens=16000,
            system=sistem,
            thinking={"type": "adaptive"},
            output_config={
                "effort": self.caba,
                "format": {"type": "json_schema", "schema": sema},
            },
            messages=[{"role": "user", "content": istem}],
        )
        if yanit.stop_reason == "refusal":
            ayrinti = getattr(yanit, "stop_details", None)
            kategori = getattr(ayrinti, "category", None)
            raise MotorHatasi(f"model isteği reddetti (kategori: {kategori})")
        metin = next((b.text for b in yanit.content if b.type == "text"), "")
        if not metin:
            raise MotorHatasi("model boş yanıt döndürdü")
        return json.loads(metin)

    # -- Motor arayüzü ------------------------------------------------------

    def planla(
        self,
        hedef: str,
        arac_tarifi: str,
        uzman_tarifi: str = "",
        mevcut_plan: Plan | None = None,
        gerekce: str | None = None,
    ) -> list[dict]:
        sistem = textwrap.dedent(
            """
            Sen bir yönetici ajansın. Bir hedefi tek tek yürütülebilir adımlara
            bölersin ve her adımı işe en uygun uzman ajana atarsın.

            Her adım kendi başına doğrulanabilir olmalı. Adım sayısını
            gereğinden fazla artırma; 3-7 adım tipiktir. Her adımın "uzman"
            alanına, sana verilen listedeki uzman adlarından birini yaz.
            Yanıtını verilen şemaya uygun JSON olarak ver.
            """
        ).strip()
        uzman_bolumu = f"\nUzman ajanlar:\n{uzman_tarifi}\n" if uzman_tarifi else ""
        if mevcut_plan is None:
            istem = (
                f"Hedef:\n{hedef}\n{uzman_bolumu}\n"
                f"Kullanılabilir araçlar:\n{arac_tarifi}\n\n"
                "Bu hedefi adımlara böl ve her adımı bir uzmana ata."
            )
        else:
            istem = (
                f"Hedef:\n{hedef}\n\n"
                f"Mevcut plan:\n{mevcut_plan.ozet()}\n\n"
                f"Yürütme sırasında ortaya çıkan gözlem:\n{gerekce}\n{uzman_bolumu}\n"
                f"Kullanılabilir araçlar:\n{arac_tarifi}\n\n"
                "Tamamlanmış adımları tekrar etme. Kalan işi bu gözleme göre "
                "yeniden planla."
            )
        ham = self._json_iste(sistem, istem, _PLAN_SEMASI)
        return ham.get("adimlar", [])

    def dusun(
        self, hedef: str, adim: Adim, kayit: AracKaydi, uzman: object | None = None
    ) -> Karar:
        sistem = textwrap.dedent(
            """
            Sen tek bir plan adımını yürüten bir ajansın. Her turda üç
            seçeneğin var:

              tip="eylem"          → bir araç çağır (arac + girdi doldur)
              tip="cevap"          → adım bitti, sonucu icerik alanına yaz
              tip="yeniden_planla" → gözlem planı geçersiz kıldı; icerik
                                     alanına sebebini yaz

            Ön koşulu eksik olan, yani plan yanlış varsayım yapmışsa
            "yeniden_planla" de; aynı aracı umutsuzca tekrar deneme.
            "girdi" alanı bir JSON nesnesi metni olmalı (örn: {"yol":"a.md"}).
            Kullanmadığın alanları boş string bırak.
            """
        ).strip()

        gecmis = "\n".join(
            f"- {k.kaynak}({json.dumps(k.girdi, ensure_ascii=False)}) → "
            f"{'HATA: ' if k.hata else ''}{k.gozlem.strip()[:300]}"
            for k in adim.kanitlar
        ) or "(henüz eylem yok)"

        bulgular = (
            "\nÖnceki denemede doğrulayıcı şunları reddetti:\n"
            + "\n".join(f"- {b}" for b in adim.bulgular)
            if adim.bulgular
            else ""
        )

        rol = ""
        if uzman is not None:
            rol = (
                f"\nRolün: {getattr(uzman, 'ad', '')} — "
                f"{getattr(uzman, 'tanim', '')}\n"
                f"Çalışma yönergen: {getattr(uzman, 'yonerge', '')}\n"
            )

        istem = (
            f"Genel hedef: {hedef}\n{rol}\n"
            f"Şu anki adım: {adim.baslik}\n{adim.aciklama}\n\n"
            f"Araçlar:\n{kayit.tarif()}\n\n"
            f"Bu adımda şimdiye kadar yapılanlar:\n{gecmis}{bulgular}\n\n"
            "Sıradaki kararını ver."
        )
        ham = self._json_iste(sistem, istem, _KARAR_SEMASI)

        girdi: dict = {}
        if ham.get("girdi"):
            try:
                cozulmus = json.loads(ham["girdi"])
                if isinstance(cozulmus, dict):
                    girdi = cozulmus
            except json.JSONDecodeError:
                girdi = {}
        return Karar(
            dusunce=ham.get("dusunce", ""),
            tip=ham.get("tip", "cevap"),
            arac=ham.get("arac", ""),
            girdi=girdi,
            icerik=ham.get("icerik", ""),
        )

    def yargila(self, adim: Adim, olcut: str) -> tuple[bool, list[str]]:
        sistem = textwrap.dedent(
            """
            Sen bir doğrulayıcısın. Sana verilen ölçütü uygula ve çıktının
            geçip geçmediğini söyle. Kendi tercihini değil, yalnızca ölçütü
            uygula. Geçmediyse her eksiği ayrı bir madde olarak yaz.
            """
        ).strip()
        istem = (
            f"Ölçüt:\n{olcut}\n\n"
            f"Adım: {adim.baslik}\n{adim.aciklama}\n\n"
            f"Üretilen çıktı:\n{adim.cikti}\n\n"
            "Bu çıktı ölçütü geçiyor mu?"
        )
        ham = self._json_iste(sistem, istem, _YARGI_SEMASI)
        return bool(ham.get("gecti")), list(ham.get("bulgular", []))


# ---------------------------------------------------------------------------


def motor_sec(zorla: str | None = None) -> Motor:
    """Anahtar varsa Claude, yoksa sahte motor.

    `ANTHROPIC_API_KEY` boşsa bile `ant auth login` profili olabilir; bu yüzden
    Claude'u kurmayı deneyip başarısız olursa sahteye düşüyoruz.
    """
    if zorla == "sahte":
        return SahteMotor()
    if zorla == "claude":
        return ClaudeMotor()
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        try:
            return ClaudeMotor()
        except MotorHatasi:
            return SahteMotor()
    return SahteMotor()
