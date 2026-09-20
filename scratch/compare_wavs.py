import soundfile as sf
import numpy as np
import hashlib
from pathlib import Path

f1 = Path('voice-server/generated/gen_1789842743326.wav')
f2 = Path('voice-server/generated/sentence_2_mic.wav')
f3 = Path('voice-server/generated/sentence_3_mic.wav')

d1, sr1 = sf.read(str(f1))
d2, sr2 = sf.read(str(f2))
d3, sr3 = sf.read(str(f3))

h1 = hashlib.sha256(f1.read_bytes()).hexdigest()
h2 = hashlib.sha256(f2.read_bytes()).hexdigest()
h3 = hashlib.sha256(f3.read_bytes()).hexdigest()

print('=== FILE 1 (Sentence 1: "It is time to take your medicine.") ===')
print('  File:', f1.name)
print('  Byte size:', f1.stat().st_size)
print('  Duration:', len(d1)/sr1)
print('  SHA256:', h1)

print('=== FILE 2 (Sentence 2: "Good morning, let us play a memory game.") ===')
print('  File:', f2.name)
print('  Byte size:', f2.stat().st_size)
print('  Duration:', len(d2)/sr2)
print('  SHA256:', h2)

print('=== FILE 3 (Sentence 3: "Your daughter will visit you this evening.") ===')
print('  File:', f3.name)
print('  Byte size:', f3.stat().st_size)
print('  Duration:', len(d3)/sr3)
print('  SHA256:', h3)

print('\n=== COMPARISON: File 1 vs File 3 ===')
print('  Byte sizes equal?:', f1.stat().st_size == f3.stat().st_size)
print('  SHA256 equal?:', h1 == h3)
print('  np.array_equal(d1, d3)?:', np.array_equal(d1, d3))
min_len_1_3 = min(len(d1), len(d3))
mae_1_3 = np.abs(d1[:min_len_1_3] - d3[:min_len_1_3]).mean()
print('  Mean Absolute Waveform Difference (MAE):', float(mae_1_3))
max_diff_1_3 = np.abs(d1[:min_len_1_3] - d3[:min_len_1_3]).max()
print('  Max Waveform Difference:', float(max_diff_1_3))

print('\n=== COMPARISON: File 2 vs File 3 ===')
print('  Byte sizes equal?:', f2.stat().st_size == f3.stat().st_size)
print('  SHA256 equal?:', h2 == h3)
print('  np.array_equal(d2, d3)?:', np.array_equal(d2, d3))
min_len_2_3 = min(len(d2), len(d3))
mae_2_3 = np.abs(d2[:min_len_2_3] - d3[:min_len_2_3]).mean()
print('  Mean Absolute Waveform Difference (MAE):', float(mae_2_3))
max_diff_2_3 = np.abs(d2[:min_len_2_3] - d3[:min_len_2_3]).max()
print('  Max Waveform Difference:', float(max_diff_2_3))
