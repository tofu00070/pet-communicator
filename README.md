# Pet Communicator — Full App Starter (v2)

A responsive, installable PWA with a FastAPI backend and optional Gemini multimodal analysis. The owner starts each observation manually; the app captures one still frame and up to 8 seconds of audio.

## What is implemented
- General animal profiles: mammals, birds, reptiles, amphibians, fish, invertebrates, and other/unknown animals.
- Free-text species field so the owner can enter the animal's common name.
- Tamil + English / Tamil / English responses.
- Camera preview and short microphone capture only after pressing Start.
- Image + audio are sent together to Gemini through the server.
- Clear safety prompt: observations vs possibilities, confidence, safe checks, veterinary red flags.
- No media is written to disk by this version.
- PWA manifest and service worker for installable browser app.
- Capacitor configuration scaffold for Android/iOS packaging after HTTPS deployment.

## 1. Run on Windows 11
Open Command Prompt in this folder. Python 3.10+ recommended.

```cmd
py -m venv .venv
.venv\Scripts\activate
py -m pip install -r requirements.txt
copy .env.example .env
notepad .env
```

In `.env`, replace `PASTE_YOUR_KEY_HERE` with your own Gemini API key. Get one at:
https://aistudio.google.com/apikey

Keep the key private. Do not paste it into the app's browser, screenshots, or public source repository.

Then run:

```cmd
py -m uvicorn app:app --host 0.0.0.0 --port 8000
```

Open http://127.0.0.1:8000 on the laptop.

## 2. Install on Android / iPhone for personal testing
Camera and microphone access from another device requires HTTPS. `http://127.0.0.1` only points to the device itself. Deploy this backend to a trusted HTTPS host first; configure a domain and environment variable `GEMINI_API_KEY` on the host. Do not expose the development server directly to the public internet.

Then open the HTTPS URL on the phone:
- Android Chrome: menu → Install app / Add to Home screen.
- iPhone Safari: Share → Add to Home Screen.

This is the fastest personal-install route. The phone and laptop do not need to be on the same Wi-Fi once hosted.

## 3. Native store builds
This repo includes a Capacitor scaffold. Native builds require Node.js, Android Studio (Android), and a Mac with Xcode (iOS). Before native builds:
1. Deploy the FastAPI backend to HTTPS.
2. Replace `https://REPLACE-WITH-YOUR-HTTPS-DOMAIN` in `capacitor.config.ts` with your real HTTPS app/backend origin.
3. Run `npm install`.
4. Run `npx cap add android` and/or `npx cap add ios`.
5. Run `npm run sync`, then open Android Studio or Xcode.
6. Configure signing, app icons, privacy disclosures, permissions, store screenshots, and review requirements.

Do not submit the placeholder domain. A real production deployment, privacy policy, security review, and store testing are required.

## API key and costs
Gemini API usage is subject to Google's current pricing, quotas, and terms. Check the current pricing before use. A free tier, if offered to your account/model/region, may have limits and can change.

## Privacy and safety
- Camera and microphone are requested only after Start.
- A still image and up to 8 seconds of audio are uploaded for the requested analysis.
- This version does not save uploaded media to disk or keep an analysis history on the server.
- The AI cannot know an animal's thoughts or literally translate calls. It provides uncertain possibilities based on a short sample.
- Not a veterinary diagnostic tool. Persistent appetite changes, abnormal breathing, weakness, injury, or other concerning signs require an avian/exotic-animal veterinarian.
- For public release, add authentication, rate limits, abuse protection, a privacy policy, data-retention controls, and secure hosting.

## Troubleshooting
- `AI setup needed`: `.env` is missing or the key is not configured; restart Uvicorn after editing it.
- Camera denied: allow camera and microphone permissions in browser settings.
- Phone cannot open laptop `127.0.0.1`: deploy to HTTPS; localhost is per-device.
- No audio: use a browser/device that supports MediaRecorder and allow microphone permission.
