"""
MP3 to MIDI conversion using Basic Pitch (Spotify).
Converts audio files to MIDI format via pitch detection.
"""

import io
import tempfile
import zipfile
from pathlib import Path as PathLib

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/convert", tags=["conversion"])

# Load basic-pitch model once at startup for faster conversion
_basic_pitch_model = None


def get_basic_pitch_model():
    global _basic_pitch_model
    if _basic_pitch_model is None:
        from basic_pitch.inference import Model
        from basic_pitch import ICASSP_2022_MODEL_PATH
        _basic_pitch_model = Model(ICASSP_2022_MODEL_PATH)
    return _basic_pitch_model


@router.post("/mp3-to-midi")
async def convert_mp3s_to_midi(
    files: list[UploadFile] = File(..., description="One or more MP3 files (single instrument tracks work best)")
):
    """
    Convert multiple MP3 files to MIDI using Basic Pitch.
    Accepts MP3, WAV, FLAC, OGG, M4A. Returns a ZIP of MIDI files.
    """
    ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file
    MAX_FILES = 10

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES} files allowed per request",
        )

    try:
        from basic_pitch.inference import predict
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Basic Pitch is not installed. Install with: pip install basic-pitch[coreml]",
        )

    zip_buffer = io.BytesIO()
    conversion_results = []

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = PathLib(tmpdir)

        for upload in files:
            # Validate extension
            filename = upload.filename or "audio"
            ext = PathLib(filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                conversion_results.append({"file": filename, "status": "skipped", "error": f"Unsupported format: {ext}"})
                continue

            # Save uploaded file
            content = await upload.read()
            if len(content) > MAX_FILE_SIZE:
                conversion_results.append({"file": filename, "status": "skipped", "error": "File too large (max 50MB)"})
                continue

            audio_path = tmpdir_path / filename
            with open(audio_path, "wb") as f:
                f.write(content)

            try:
                model = get_basic_pitch_model()
                _, midi_data, _ = predict(str(audio_path), model)
                midi_filename = PathLib(filename).stem + "_basic_pitch.mid"
                midi_path = tmpdir_path / midi_filename
                midi_data.write(str(midi_path))
                conversion_results.append({"file": filename, "status": "ok", "midi": midi_filename})
            except Exception as e:
                conversion_results.append({"file": filename, "status": "error", "error": str(e)})

        # Build ZIP from successfully converted MIDI files
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for result in conversion_results:
                if result.get("status") == "ok":
                    midi_name = result["midi"]
                    zf.write(tmpdir_path / midi_name, midi_name)

    successful = sum(1 for r in conversion_results if r.get("status") == "ok")
    if successful == 0:
        raise HTTPException(
            status_code=422,
            detail={"message": "No files could be converted", "results": conversion_results},
        )

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=midi_conversions.zip",
            "X-Conversion-Results": str(conversion_results),
        },
    )
