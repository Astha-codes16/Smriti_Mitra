import os
import sys

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import time
import hashlib
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import scipy.io.wavfile as wavfile
import numpy as np

from pocket_tts_onnx import PocketTTSOnnx

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm model in background
    try:
        get_model()
    except Exception as e:
        print(f"[PocketTTS ONNX] Startup warning: {e}")
    yield

app = FastAPI(
    title="MindMate Neural Voice Cloning Server (PocketTTS ONNX)",
    lifespan=lifespan,
)

# Allow requests from React frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
GENERATED_DIR = BASE_DIR / "generated"
ONNX_DIR = BASE_DIR / "onnx"
GENERATED_DIR.mkdir(exist_ok=True)

tts_model = None
cached_voice_embeddings = None
cached_reference_hash = None
model_load_time_seconds = 0.0

def get_model():
    global tts_model, model_load_time_seconds
    if tts_model is None:
        start_time = time.time()
        print("[PocketTTS ONNX] Loading PocketTTS INT8 quantized model bundle...")
        tts_model = PocketTTSOnnx(
            models_dir=str(ONNX_DIR),
            language="english_2026-04",
            precision="int8",
            device="cpu"
        )
        model_load_time_seconds = time.time() - start_time
        print(f"[PocketTTS ONNX] Model loaded once in {model_load_time_seconds:.2f}s (Sample Rate: {tts_model.sample_rate} Hz)")
    return tts_model

@app.get("/health")
def health():
    return {
        "status": "ready" if tts_model is not None else "standby",
        "model": "PocketTTS ONNX INT8 (Kyutai-derived Zero-Shot Neural Cloning)",
        "offline": True,
        "sample_rate": tts_model.sample_rate if tts_model else 24000,
        "model_load_time_seconds": round(model_load_time_seconds, 2),
        "has_cached_voice": cached_voice_embeddings is not None,
    }

@app.post("/register-reference")
async def register_reference(reference_audio: UploadFile = File(...)):
    global cached_voice_embeddings, cached_reference_hash
    content = await reference_audio.read()
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="Reference audio file is too short or empty.")
        
    model = get_model()
    audio_hash = hashlib.sha256(content).hexdigest()
    
    filename = reference_audio.filename or "caregiver_sample.wav"
    suffix = Path(filename).suffix.lower() or ".wav"
    
    temp_ref = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        temp_ref.write(content)
        temp_ref.close()
        t0 = time.time()
        try:
            voice_emb = model.encode_voice(temp_ref.name)
        except Exception as encode_err:
            print(f"[PocketTTS ONNX] Error decoding reference audio from {filename}: {encode_err}")
            raise HTTPException(
                status_code=400,
                detail=f"Could not decode reference audio. Please provide a valid 16-bit PCM WAV file: {encode_err}"
            )
        cached_voice_embeddings = voice_emb
        cached_reference_hash = audio_hash
        extract_time = time.time() - t0
        print(f"[PocketTTS ONNX] Caregiver voice embeddings encoded in {extract_time:.2f}s from uploaded file: {filename}")
        return {
            "status": "success",
            "message": "Caregiver voice reference profile registered successfully.",
            "filename": filename,
            "extraction_time_seconds": round(extract_time, 3),
            "file_size_bytes": len(content),
        }
    finally:
        if os.path.exists(temp_ref.name):
            os.unlink(temp_ref.name)

@app.post("/generate-voice")
async def generate_voice(
    text: str = Form(...),
    reference_audio: UploadFile = File(None)
):
    global cached_voice_embeddings, cached_reference_hash
    
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    model = get_model()
    voice_input = None

    # 1. Process reference audio if uploaded with the request
    if reference_audio is not None and reference_audio.filename:
        content = await reference_audio.read()
        if len(content) > 100:
            audio_hash = hashlib.sha256(content).hexdigest()
            if audio_hash == cached_reference_hash and cached_voice_embeddings is not None:
                voice_input = cached_voice_embeddings
            else:
                filename = reference_audio.filename or "caregiver_sample.wav"
                suffix = Path(filename).suffix.lower() or ".wav"
                temp_ref = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                try:
                    temp_ref.write(content)
                    temp_ref.close()
                    try:
                        voice_input = model.encode_voice(temp_ref.name)
                    except Exception as encode_err:
                        print(f"[PocketTTS ONNX] Error decoding reference audio from {filename}: {encode_err}")
                        raise HTTPException(
                            status_code=400,
                            detail=f"Could not decode reference audio. Please provide a valid 16-bit PCM WAV file: {encode_err}"
                        )
                    cached_voice_embeddings = voice_input
                    cached_reference_hash = audio_hash
                finally:
                    if os.path.exists(temp_ref.name):
                        os.unlink(temp_ref.name)

    # 2. Or fallback to previously registered cached voice
    if voice_input is None:
        if cached_voice_embeddings is not None:
            voice_input = cached_voice_embeddings
        else:
            # Fallback to default reference audio file in voice-server folder
            default_ref = BASE_DIR / "reference_sample.wav"
            if not default_ref.exists():
                default_ref = BASE_DIR / "caregiver_reference.wav"
                
            if default_ref.exists():
                voice_input = model.encode_voice(default_ref)
                cached_voice_embeddings = voice_input
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No reference audio provided and no default reference audio file found."
                )

    print(f"[PocketTTS ONNX] Generating NEW speech for: \"{clean_text}\"")
    t0 = time.time()
    
    # Generate new speech audio using PocketTTS neural model
    audio_np = model.generate(clean_text, voice=voice_input)
    gen_time = time.time() - t0
    
    # Normalize to prevent clipping
    audio_max = np.max(np.abs(audio_np))
    if audio_max > 0:
        audio_norm = audio_np / max(audio_max, 1.0)
    else:
        audio_norm = audio_np
    audio_int16 = (audio_norm * 32767).clip(-32768, 32767).astype(np.int16)
        
    out_filename = f"gen_{int(time.time() * 1000)}.wav"
    out_path = GENERATED_DIR / out_filename
    wavfile.write(str(out_path), model.sample_rate, audio_int16)
    
    duration = len(audio_int16) / model.sample_rate
    print(f"[PocketTTS ONNX] Generated {duration:.2f}s speech in {gen_time:.2f}s -> {out_filename}")
    
    return FileResponse(
        str(out_path),
        media_type="audio/wav",
        filename=out_filename,
        headers={
            "X-Generation-Time": f"{gen_time:.3f}",
            "X-Audio-Duration": f"{duration:.3f}",
            "X-Model-Name": "PocketTTS-ONNX-INT8",
            "Access-Control-Expose-Headers": "X-Generation-Time, X-Audio-Duration, X-Model-Name",
        }
    )

if __name__ == "__main__":
    import uvicorn
    print("=" * 65)
    print("  Starting MindMate Neural Voice Server on http://127.0.0.1:8000")
    print("=" * 65)
    uvicorn.run(app, host="127.0.0.1", port=8000)
