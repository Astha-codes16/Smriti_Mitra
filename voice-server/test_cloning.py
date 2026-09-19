import os
import sys
import time
from pathlib import Path
import numpy as np
import scipy.io.wavfile as wavfile

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).parent
GENERATED_DIR = BASE_DIR / "generated"
ONNX_DIR = BASE_DIR / "onnx"
GENERATED_DIR.mkdir(exist_ok=True)

from pocket_tts_onnx import PocketTTSOnnx

def main():
    print("=" * 65)
    print("  MindMate: Neural Voice Cloning Engine (PocketTTS INT8 ONNX)")
    print("=" * 65)
    
    ref_audio_path = BASE_DIR / "reference_sample.wav"
    if not ref_audio_path.exists():
        ref_audio_path = BASE_DIR / "caregiver_reference.wav"
    print(f"[Input Reference Audio]: {ref_audio_path.name} ({ref_audio_path.stat().st_size} bytes)")
    
    # 1. Measure model loading time
    print("\n[Step 1] Loading PocketTTS ONNX INT8 models (Offline CPU Execution)...")
    t0 = time.time()
    tts = PocketTTSOnnx(
        models_dir=str(ONNX_DIR),
        language="english_2026-04",
        precision="int8",
        device="cpu"
    )
    load_time = time.time() - t0
    print(f"[Step 1 Success] Loaded all ONNX modules in {load_time:.2f}s (Sample rate: {tts.sample_rate} Hz)")
    
    # 2. Extract voice conditioning embeddings
    print(f"\n[Step 2] Conditioning voice from caregiver reference: {ref_audio_path.name}...")
    t1 = time.time()
    voice_state = tts.prepare_voice_state(ref_audio_path)
    encode_time = time.time() - t1
    print(f"[Step 2 Success] Voice conditioned in {encode_time:.2f}s")
    
    # 3. Dynamic Arbitrary Text Synthesis
    test_sentences = [
        ("medicine", "It is time to take your medicine."),
        ("memory_game", "Would you like to play a memory game?"),
        ("find_glasses", "I will help you find your glasses."),
    ]
    
    print("\n[Step 3] Generating NEW dynamic speech sentences in caregiver voice:")
    results = []
    
    for key, text in test_sentences:
        print(f"\n--- Generating Speech: \"{text}\" ---")
        t_gen = time.time()
        
        # PocketTTS generation returns float32 numpy audio array
        audio = tts.generate(text, voice=ref_audio_path)
        gen_duration = time.time() - t_gen
        
        # Normalize and convert to 16-bit PCM WAV
        audio_max = np.max(np.abs(audio))
        if audio_max > 0:
            audio_norm = audio / max(audio_max, 1.0)
        else:
            audio_norm = audio
        audio_int16 = (audio_norm * 32767).clip(-32768, 32767).astype(np.int16)
        
        out_path = GENERATED_DIR / f"generated_{key}.wav"
        wavfile.write(str(out_path), tts.sample_rate, audio_int16)
        
        audio_duration = len(audio_int16) / tts.sample_rate
        rtf = gen_duration / audio_duration if audio_duration > 0 else 0
        
        print(f"  [Output]: {out_path.name}")
        print(f"  [Audio Duration]: {audio_duration:.2f} s")
        print(f"  [Latency]: {gen_duration:.2f} s (RTF: {rtf:.2f}x)")
        
        results.append({
            "key": key,
            "text": text,
            "file": out_path.name,
            "size": out_path.stat().st_size,
            "duration": round(audio_duration, 2),
            "latency": round(gen_duration, 2),
            "rtf": round(rtf, 2),
        })
        
    print("\n" + "=" * 65)
    print("  SUMMARY OF NEURAL VOICE CLONING RESULTS")
    print("=" * 65)
    print(f"{'Sentence':<40} | {'Duration':<9} | {'Latency':<9} | {'RTF':<6}")
    print("-" * 65)
    for r in results:
        print(f"{r['text']:<40} | {r['duration']:>6}s   | {r['latency']:>6}s   | {r['rtf']:>5}x")
    print("=" * 65)
    print("[ALL 3 SENTENCES SYNTHESIZED SUCCESSFULLY AS DISTINCT NEW WAV FILES]")

if __name__ == "__main__":
    main()
