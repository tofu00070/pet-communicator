import os
import json
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

app = FastAPI(title="Pet Communicator", version="2.0.0")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_AUDIO_BYTES = 12 * 1024 * 1024
ALLOWED_GROUPS = {"mammal", "bird", "reptile", "amphibian", "fish", "invertebrate", "other"}

@app.get("/", response_class=HTMLResponse)
def home():
    return (ROOT / "static" / "index.html").read_text(encoding="utf-8")

@app.get("/api/status")
def status():
    return {
        "app": "Pet Communicator",
        "ai_configured": bool(os.getenv("GEMINI_API_KEY")),
        "model": os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
        "media_storage": "temporary in memory; not saved to disk"
    }

@app.post("/api/analyze")
async def analyze(
    pet: str = Form("other"),
    species: str = Form("Unknown species"),
    animal_group: str = Form("other"),
    language: str = Form("both"),
    notes: str = Form(""),
    image: UploadFile = File(...),
    audio: UploadFile = File(...)
):
    if animal_group not in ALLOWED_GROUPS:
        raise HTTPException(400, "Choose a valid animal group.")
    species = species.strip()[:100] or "Unknown species"
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "AI is not configured yet. Add your Gemini API key to the .env file on your laptop, then restart the app.")

    image_bytes = await image.read()
    audio_bytes = await audio.read()
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is empty or larger than 8 MB.")
    if not audio_bytes or len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio is empty or larger than 12 MB.")

    audio_mime = audio.content_type or "audio/webm"
    if audio_mime not in {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"}:
        audio_mime = "audio/webm"

    lang_instruction = {
        "both": "Answer in simple English and Tamil (Tamil script).",
        "ta": "Answer in simple Tamil (Tamil script).",
        "en": "Answer in simple English."
    }.get(language, "Answer in simple English and Tamil (Tamil script).")

    prompt = f"""
You are a cautious, general animal-behaviour observation assistant, not a veterinarian.
The owner identifies the animal as: {species}.
Animal group selected by the owner: {animal_group}.
Examine the attached still image and short audio sample together. If the identification is uncertain from the media, say so rather than guessing.
{lang_instruction}
Additional context from the owner: {notes.strip()[:1000] if notes else "None provided"}.

Important rules:
- Never claim to know the animal's thoughts or translate sounds with certainty.
- Separate directly visible/audible observations from possible interpretations.
- Give up to three plausible explanations, each with low/medium/high confidence and the evidence supporting it.
- Mention what cannot be determined from this short sample.
- Suggest only safe, low-risk checks the owner can do. Do not recommend force-feeding, medication, or risky handling.
- Clearly flag urgent signs that warrant an avian/exotic-animal veterinarian. Do not diagnose.
- Do not assume breed, species details, age, sex, health status, diet, habitat, or normal behaviour beyond what the owner supplied.
- The app is intended for many animal types. If you do not have enough species-specific context, clearly say so and ask the owner to confirm the species or consult an appropriate qualified veterinarian.
- Do not apply dog/cat advice to other animals. Never recommend a generic diet, medication, handling method, temperature, enclosure, or habitat change without reliable species-specific context.
Return clear sections:
1. What I observed
2. What your pet might need (possibilities, not facts)
3. What you can safely check now
4. When to contact a vet
5. What to observe next time
"""
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime),
            ],
        )
        answer = (response.text or "").strip()
        if not answer:
            raise RuntimeError("The AI returned an empty response.")
        return {"status": "analyzed", "pet": pet, "species": species, "animal_group": animal_group, "language": language, "analysis": answer}
    except Exception as exc:
        # Do not expose secrets or raw provider internals to the browser.
        raise HTTPException(502, f"AI analysis failed. Check your API key, internet connection, and model access. Details: {type(exc).__name__}") from exc
