import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pathlib import Path
from huggingface_hub import hf_hub_download

BASE_DIR = Path(__file__).parent
ONNX_DIR = BASE_DIR / "onnx"
ENGLISH_DIR = ONNX_DIR / "english_2026-04"
ENGLISH_DIR.mkdir(parents=True, exist_ok=True)

REPO_ID = "KevinAHM/pocket-tts-onnx"

files_to_download = [
    ("pocket_tts_onnx.py", BASE_DIR / "pocket_tts_onnx.py"),
    ("reference_sample.wav", BASE_DIR / "reference_sample.wav"),
    ("onnx/english_2026-04/bundle.json", ENGLISH_DIR / "bundle.json"),
    ("onnx/english_2026-04/bos_before_voice.npy", ENGLISH_DIR / "bos_before_voice.npy"),
    ("onnx/english_2026-04/tokenizer.model", ENGLISH_DIR / "tokenizer.model"),
    ("onnx/english_2026-04/flow_lm_flow_int8.onnx", ENGLISH_DIR / "flow_lm_flow_int8.onnx"),
    ("onnx/english_2026-04/flow_lm_main_int8.onnx", ENGLISH_DIR / "flow_lm_main_int8.onnx"),
    ("onnx/english_2026-04/mimi_decoder_int8.onnx", ENGLISH_DIR / "mimi_decoder_int8.onnx"),
    ("onnx/english_2026-04/mimi_encoder_int8.onnx", ENGLISH_DIR / "mimi_encoder_int8.onnx"),
    ("onnx/english_2026-04/text_conditioner_int8.onnx", ENGLISH_DIR / "text_conditioner_int8.onnx"),
]

print("Starting download of PocketTTS ONNX zero-shot voice cloning model bundle...")
for hf_filename, local_dest in files_to_download:
    if local_dest.exists() and local_dest.stat().st_size > 0:
        print(f"  [Cached] {local_dest.name} ({local_dest.stat().st_size // 1024} KB)")
        continue
    print(f"  [Downloading] {hf_filename} -> {local_dest.name}...")
    downloaded_path = hf_hub_download(repo_id=REPO_ID, filename=hf_filename)
    # Copy to destination
    import shutil
    shutil.copyfile(downloaded_path, local_dest)
    print(f"  [Done] {local_dest.name} ({local_dest.stat().st_size // 1024} KB)")

print("All PocketTTS ONNX files downloaded successfully!")
