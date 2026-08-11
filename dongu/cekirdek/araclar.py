"""
Araç kayıt defteri — ReAct döngüsünün "eylem" tarafı.

Her aracın `geri_alinamaz` bayrağı var. İnsan kapısının en net eşiği bu:
geri alınamaz bir eylem çalışmadan önce durur ve sorar. Bayrağı aracın
tanımına koymak, "model tehlikeli bir şey yapmak üzere mi?" sorusunu
sezgiden çıkarıp veriye bağlar.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass
class Arac:
    ad: str
    aciklama: str
    sema: dict  # JSON Schema — modele araç tarifi olarak verilir
    calistir: Callable[[dict], str]
    geri_alinamaz: bool = False


class AracHatasi(Exception):
    """Aracın kendi hatası — döngüyü çökertmez, gözleme dönüşür."""


class AracKaydi:
    def __init__(self) -> None:
        self._araclar: dict[str, Arac] = {}

    def ekle(self, arac: Arac) -> None:
        self._araclar[arac.ad] = arac

    def bul(self, ad: str) -> Arac | None:
        return self._araclar.get(ad)

    def hepsi(self) -> list[Arac]:
        return list(self._araclar.values())

    def tarif(self) -> str:
        """Modele verilecek araç listesi."""
        satirlar = []
        for arac in self._araclar.values():
            alanlar = ", ".join(arac.sema.get("properties", {}).keys())
            uyari = "  (GERİ ALINAMAZ)" if arac.geri_alinamaz else ""
            satirlar.append(f"- {arac.ad}({alanlar}): {arac.aciklama}{uyari}")
        return "\n".join(satirlar)

    def anthropic_semasi(self) -> list[dict]:
        """Native tool-use'a geçmek istersen hazır dursun."""
        return [
            {"name": a.ad, "description": a.aciklama, "input_schema": a.sema}
            for a in self._araclar.values()
        ]


# ---------------------------------------------------------------------------
# Örnek araç kümesi: bir çalışma dizini içinde dosya işlemleri + hesap.
# Gerçek projede burayı kendi araçlarınla değiştirirsin.
# ---------------------------------------------------------------------------


def dosya_araclari(kok: str | Path) -> AracKaydi:
    kok_yolu = Path(kok).resolve()
    kok_yolu.mkdir(parents=True, exist_ok=True)

    def _coz(ad: str) -> Path:
        """Yol denetimi: çalışma dizininin dışına çıkılamaz."""
        hedef = (kok_yolu / ad).resolve()
        if hedef != kok_yolu and kok_yolu not in hedef.parents:
            raise AracHatasi(f"çalışma dizini dışına çıkılamaz: {ad}")
        return hedef

    def _oku(girdi: dict) -> str:
        yol = _coz(girdi["yol"])
        if not yol.exists():
            raise AracHatasi(f"dosya yok: {girdi['yol']}")
        return yol.read_text(encoding="utf-8")

    def _yaz(girdi: dict) -> str:
        yol = _coz(girdi["yol"])
        yol.parent.mkdir(parents=True, exist_ok=True)
        yol.write_text(girdi["icerik"], encoding="utf-8")
        return f"{girdi['yol']} yazıldı ({len(girdi['icerik'])} karakter)"

    def _listele(girdi: dict) -> str:
        adlar = sorted(p.name for p in kok_yolu.iterdir())
        return ", ".join(adlar) if adlar else "(dizin boş)"

    def _sil(girdi: dict) -> str:
        yol = _coz(girdi["yol"])
        if not yol.exists():
            raise AracHatasi(f"dosya yok: {girdi['yol']}")
        yol.unlink()
        return f"{girdi['yol']} silindi"

    def _hesapla(girdi: dict) -> str:
        # Küçük ve kapalı bir ifade değerlendirici — eval yok.
        try:
            sonuc = _guvenli_hesap(girdi["ifade"])
        except Exception as hata:  # noqa: BLE001 - araç hatasına çeviriyoruz
            raise AracHatasi(f"ifade çözülemedi: {hata}") from hata
        return str(sonuc)

    kayit = AracKaydi()
    kayit.ekle(
        Arac(
            ad="dosya_oku",
            aciklama="Çalışma dizinindeki bir dosyanın içeriğini döndürür.",
            sema={
                "type": "object",
                "properties": {"yol": {"type": "string"}},
                "required": ["yol"],
                "additionalProperties": False,
            },
            calistir=_oku,
        )
    )
    kayit.ekle(
        Arac(
            ad="dosya_yaz",
            aciklama="Çalışma dizinine dosya yazar (varsa üzerine yazar).",
            sema={
                "type": "object",
                "properties": {"yol": {"type": "string"}, "icerik": {"type": "string"}},
                "required": ["yol", "icerik"],
                "additionalProperties": False,
            },
            calistir=_yaz,
        )
    )
    kayit.ekle(
        Arac(
            ad="dosya_listele",
            aciklama="Çalışma dizinindeki dosyaları listeler.",
            sema={"type": "object", "properties": {}, "additionalProperties": False},
            calistir=_listele,
        )
    )
    kayit.ekle(
        Arac(
            ad="dosya_sil",
            aciklama="Bir dosyayı kalıcı olarak siler.",
            sema={
                "type": "object",
                "properties": {"yol": {"type": "string"}},
                "required": ["yol"],
                "additionalProperties": False,
            },
            calistir=_sil,
            geri_alinamaz=True,  # ← insan kapısını tetikleyen bayrak
        )
    )
    kayit.ekle(
        Arac(
            ad="hesapla",
            aciklama="Sayısal bir ifadeyi hesaplar. Örn: '(3+5)/2'.",
            sema={
                "type": "object",
                "properties": {"ifade": {"type": "string"}},
                "required": ["ifade"],
                "additionalProperties": False,
            },
            calistir=_hesapla,
        )
    )
    return kayit


def _guvenli_hesap(ifade: str) -> float:
    """`eval` kullanmadan dört işlem + parantez."""
    import ast
    import operator

    islemler = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
    }

    def cozumle(dugum):
        if isinstance(dugum, ast.Constant) and isinstance(dugum.value, (int, float)):
            return dugum.value
        if isinstance(dugum, ast.BinOp) and type(dugum.op) in islemler:
            return islemler[type(dugum.op)](cozumle(dugum.left), cozumle(dugum.right))
        if isinstance(dugum, ast.UnaryOp) and type(dugum.op) in islemler:
            return islemler[type(dugum.op)](cozumle(dugum.operand))
        raise ValueError("izin verilmeyen ifade")

    sonuc = cozumle(ast.parse(ifade, mode="eval").body)
    return round(sonuc, 10) if isinstance(sonuc, float) and not math.isnan(sonuc) else sonuc


def girdiyi_coz(ham: str | dict) -> dict:
    """Model araç girdisini JSON metni olarak da verebilir."""
    if isinstance(ham, dict):
        return ham
    if not ham:
        return {}
    try:
        cozulmus = json.loads(ham)
    except json.JSONDecodeError as hata:
        raise AracHatasi(f"araç girdisi JSON değil: {ham!r}") from hata
    if not isinstance(cozulmus, dict):
        raise AracHatasi("araç girdisi bir nesne olmalı")
    return cozulmus
