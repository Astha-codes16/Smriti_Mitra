import requests
import soundfile as sf
import hashlib
import numpy as np
from pathlib import Path

url = 'http://127.0.0.1:8000/generate-voice'

test_cases = [
    ("Sentence 1", "It is time to take your medicine."),
    ("Sentence 2", "Good morning, let us play a memory game."),
    ("Sentence 3", "Your daughter will visit you this evening.")
]

results = []
print("=== VERIFYING EXACT TEXT TRANSMISSION & GENERATION ===")
for label, text in test_cases:
    print(f"\nSending {label}:")
    print(f"  Exact Text: \"{text}\"")
    resp = requests.post(url, data={'text': text})
    print(f"  HTTP Status: {resp.status_code}")
    
    sha256 = hashlib.sha256(resp.content).hexdigest()
    out_file = Path(f"voice-server/generated/verify_{label.lower().replace(' ', '_')}.wav")
    out_file.write_bytes(resp.content)
    
    audio_data, sr = sf.read(str(out_file))
    duration = len(audio_data) / sr
    
    res = {
        "label": label,
        "text": text,
        "file": out_file.name,
        "byte_size": len(resp.content),
        "duration": duration,
        "sample_rate": sr,
        "sha256": sha256,
        "audio_data": audio_data,
        "headers": {k: v for k, v in resp.headers.items() if k.lower().startswith('x-')}
    }
    results.append(res)
    print(f"  Headers: {res['headers']}")
    print(f"  Byte size: {res['byte_size']} bytes")
    print(f"  Duration: {res['duration']:.3f} s")
    print(f"  SHA-256: {res['sha256']}")

print("\n" + "="*70)
print("  PAIRWISE COMPARISON MATRIX")
print("="*70)

for i in range(len(results)):
    for j in range(i + 1, len(results)):
        r1, r2 = results[i], results[j]
        d1, d2 = r1["audio_data"], r2["audio_data"]
        min_len = min(len(d1), len(d2))
        mae = float(np.abs(d1[:min_len] - d2[:min_len]).mean())
        max_diff = float(np.abs(d1[:min_len] - d2[:min_len]).max())
        is_array_equal = bool(np.array_equal(d1, d2))
        is_sha_equal = (r1["sha256"] == r2["sha256"])
        
        print(f"Comparison: {r1['label']} vs {r2['label']}")
        print(f"  Texts: \"{r1['text']}\" vs \"{r2['text']}\"")
        print(f"  SHA-256 Equal?: {is_sha_equal} ({r1['sha256'][:16]}... vs {r2['sha256'][:16]}...)")
        print(f"  np.array_equal?: {is_array_equal}")
        print(f"  Waveform MAE Difference: {mae:.6f}")
        print(f"  Waveform Max Difference: {max_diff:.6f}")
        print("-" * 70)
