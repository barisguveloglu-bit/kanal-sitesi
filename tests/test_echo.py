"""Codex girişini gerçek çekirdek ve bozulmuş geçici depolarla sına."""

import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

KOK = Path(__file__).resolve().parents[1]


class EchoSinavi(unittest.TestCase):
    def setUp(self):
        self.gecici = tempfile.TemporaryDirectory()
        self.addCleanup(self.gecici.cleanup)
        self.kok = Path(self.gecici.name) / "depo"
        shutil.copytree(KOK, self.kok, ignore=shutil.ignore_patterns(
            ".git", "__pycache__", "*-durumu.json", "pano.jsonl", "olay-defteri.jsonl"))
        self.ortam = os.environ.copy()
        for ad in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_CODE_SESSION_ID",
                   "ECHO_SESSION_ID", "CODEX_THREAD_ID", "CI", "ECHO_KAPALI"):
            self.ortam.pop(ad, None)
        self.ortam["CLAUDE_PROJECT_DIR"] = "/olmayan-claude-projesi"
        for arg in (("init", "-q"), ("add", "."),
                    ("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                     "commit", "-qm", "test tabanı")):
            subprocess.run(["git", *arg], cwd=self.kok, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    def kos(self, *arg, ortam=None):
        # Başka çalışma dizininden de doğru depoyu seçmeli.
        return subprocess.run([sys.executable, str(self.kok / "echo.py"), *arg],
                              cwd=self.gecici.name, env=ortam or self.ortam,
                              capture_output=True, text=True, timeout=90)

    def test_baslangic_claude_ortamina_bagli_degil(self):
        s = self.kos("baslat")
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
        for metin in ("DERS DEFTERİ", "İŞ DEFTERİ", "[dogrula: 0]", "[butunluk: 0]"):
            self.assertIn(metin, s.stdout)

    def test_sessiz_olen_kapi_basari_sayilmaz(self):
        (self.kok / ".claude/butunluk.py").write_text("raise SystemExit(0)\n")
        s = self.kos("kontrol")
        self.assertEqual(s.returncode, 2, s.stdout)
        self.assertIn("[butunluk: 2]", s.stdout)

    def test_eksik_ve_bozuk_kapi_basari_sayilmaz(self):
        yol = self.kok / ".claude/kapi.py"
        yol.unlink()
        s = self.kos("kontrol")
        self.assertEqual(s.returncode, 2)
        self.assertIn("KOŞMADI", s.stdout)
        yol.write_text("raise RuntimeError('yükleme hatası')\n")
        s = self.kos("kontrol")
        self.assertEqual(s.returncode, 2)
        self.assertIn("KOŞMADI", s.stdout)

    def test_sessiz_hafiza_okuyucusu_basari_sayilmaz(self):
        (self.kok / ".claude/defter.py").write_text("raise SystemExit(0)\n")
        s = self.kos("baslat")
        self.assertEqual(s.returncode, 2)
        self.assertIn("defter beklenen özeti üretmedi", s.stdout)

    def test_ihlal_ve_insan_kapisi_ayri_kalir(self):
        yol = self.kok / ".claude/dogrula.py"
        for kod, mesaj in ((1, "1 hata, 0 geçen denetim"), (3, "İNSAN KAPISI")):
            with self.subTest(kod=kod):
                yol.write_text(f"print({mesaj!r})\nraise SystemExit({kod})\n")
                s = self.kos("kontrol")
                self.assertEqual(s.returncode, kod, s.stdout)
                self.assertIn(mesaj, s.stdout)

    def test_bozuk_arac_basari_sayilmaz(self):
        (self.kok / ".claude/ara.py").write_text("raise RuntimeError('bozuk')\n")
        s = self.kos("arac", "ara", "irade")
        self.assertEqual(s.returncode, 2)
        self.assertIn("KOŞMADI", s.stdout)

    def test_butce_bittiginde_gorev_verilmez(self):
        s = self.kos("gorev", "--rol", "canon-denetci", "--konu", "irade", "--gonder")
        self.assertEqual(s.returncode, 1, s.stdout)
        self.assertNotIn("# Codex uzman görevi", s.stdout)
        s = self.kos("arac", "butce", "ac", "--kosu", "test", "--ajan-sinir", "1")
        self.assertEqual(s.returncode, 0, s.stdout)
        arg = ("gorev", "--rol", "canon-denetci", "--konu", "irade")
        self.assertEqual(self.kos(*arg).returncode, 0)  # önizleme tüketmez
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
        self.assertIn("# Codex uzman görevi", s.stdout)
        self.assertNotIn("CLAUDE.md", s.stdout)
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 1)
        self.assertNotIn("# Codex uzman görevi", s.stdout)

    def test_tum_roller_model_secimini_tasimaz(self):
        tanim = importlib.util.spec_from_file_location("echo_test", self.kok / "echo.py")
        echo = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(echo)
        roller = list((self.kok / ".claude/agents").glob("*.md"))
        self.assertTrue(roller)
        for yol in roller:
            with self.subTest(rol=yol.stem):
                metin = echo.rol_metni(yol.stem)
                self.assertTrue(metin)
                for yasak in ("CLAUDE.md", "model:", "tools:", "Opus 5", "Sonnet"):
                    self.assertNotIn(yasak, metin)

    def test_gpt_rolleri_ve_cagri_jsonu(self):
        roller = self.kos("roller")
        self.assertEqual(roller.returncode, 0, roller.stdout)
        tablo = dict(satir.split("\t") for satir in roller.stdout.splitlines())
        self.assertEqual(set(tablo), {p.stem for p in (self.kok / ".claude/agents").glob("*.md")})
        self.assertEqual(tablo["tarama-denetci"], "gpt-6-luna")
        self.assertEqual(tablo["canon-denetci"], "gpt-6.1-sol")
        konu = 'Türkçe "alıntı"\nve $(komut) metni'
        for rol in ("tarama-denetci", "canon-denetci"):
            s = self.kos("gorev", "--rol", rol, "--konu", konu, "--json")
            self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
            cagri = json.loads(s.stdout)
            self.assertEqual(set(cagri), {"task_name", "fork_turns", "model", "message"})
            self.assertEqual(cagri["fork_turns"], "none")
            self.assertEqual(cagri["model"], tablo[rol])
            self.assertIn(konu, cagri["message"])
            self.assertRegex(cagri["task_name"], r"^[a-z0-9_]+$")

    def test_gorev_modeli_acikca_degistirilebilir(self):
        for model in ("gpt-6-luna", "gpt-6.1-sol"):
            s = self.kos("gorev", "--rol", "tarama-denetci", "--konu", "tarama",
                         "--model", model, "--json", "--ad", "ozel_ajan")
            self.assertEqual(s.returncode, 0, s.stdout)
            cagri = json.loads(s.stdout)
            self.assertEqual(cagri["model"], model)
            self.assertEqual(cagri["task_name"], "ozel_ajan")
            self.assertIn(model, cagri["message"])

    def test_bozuk_model_atamasi_butce_tuketmez(self):
        self.assertEqual(self.kos("arac", "butce", "ac", "--kosu", "model-test").returncode, 0)
        butce = self.kok / ".claude/butce-durumu.json"
        once = butce.read_bytes()
        yol = self.kok / "echo-modeller.json"
        asil = json.loads(yol.read_text())
        eksik = json.loads(json.dumps(asil))
        del eksik["roller"]["canon-denetci"]
        yabanci = json.loads(json.dumps(asil))
        yabanci["roller"]["canon-denetci"] = "opus"
        gecersizler = (None, "{", "[]", json.dumps(eksik), json.dumps(yabanci))
        arg = ("gorev", "--rol", "canon-denetci", "--konu", "test", "--json", "--gonder")
        for veri in gecersizler:
            with self.subTest(veri=veri):
                if veri is None:
                    yol.unlink(missing_ok=True)
                else:
                    yol.write_text(veri)
                s = self.kos(*arg)
                self.assertEqual(s.returncode, 2, s.stdout)
                self.assertNotIn('"message":', s.stdout)
                self.assertEqual(butce.read_bytes(), once)
                self.assertEqual(self.kos("kontrol").returncode, 2)
        yol.write_text(json.dumps(asil))
        for secim in (("--model", "opus"), ("--ad", "gecersiz/ad")):
            s = self.kos(*arg, *secim)
            self.assertEqual(s.returncode, 2)
            self.assertEqual(butce.read_bytes(), once)

    def test_json_gonderim_butceyi_bir_kez_tuketir(self):
        self.assertEqual(self.kos("arac", "butce", "ac", "--kosu", "test", "--ajan-sinir", "1").returncode, 0)
        arg = ("gorev", "--rol", "tarama-denetci", "--konu", "tarama", "--json")
        butce = self.kok / ".claude/butce-durumu.json"
        once = butce.read_bytes()
        self.assertEqual(self.kos(*arg).returncode, 0)
        self.assertEqual(butce.read_bytes(), once)
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 0, s.stdout + s.stderr)
        self.assertEqual(json.loads(s.stdout)["model"], "gpt-6-luna")
        self.assertEqual(len(json.loads(butce.read_text())["ajanlar"]), 1)
        s = self.kos(*arg, "--gonder")
        self.assertEqual(s.returncode, 1)
        self.assertNotIn('"message":', s.stdout)

    def test_kimliksiz_devre_reddedilir_ve_codex_kilidi_korunur(self):
        arg = ("arac", "devre", "dene", "--halka", "test", "--not", "ilk tur")
        self.assertEqual(self.kos(*arg).returncode, 2)
        self.assertEqual(self.kos(*arg, ortam=dict(self.ortam, CODEX_THREAD_ID="oturum-a")).returncode, 0)
        s = self.kos(*arg, ortam=dict(self.ortam, CODEX_THREAD_ID="oturum-b"))
        self.assertEqual(s.returncode, 4, s.stdout)

    def test_kapatma_anahtari_acik_kontrolu_atlatmaz(self):
        (self.kok / ".claude/butunluk.py").write_text("raise SystemExit(0)\n")
        s = self.kos("baslat", ortam=dict(self.ortam, ECHO_KAPALI="1"))
        self.assertEqual(s.returncode, 2, s.stdout)
        self.assertIn("ECHO_KAPALI", s.stdout)

    def test_rol_yolu_depodan_cikamaz(self):
        s = self.kos("gorev", "--rol", "../../AGENTS", "--konu", "test")
        self.assertEqual(s.returncode, 2)
        self.assertIn("Geçersiz rol", s.stdout)


if __name__ == "__main__":
    unittest.main()
