# SignSpeak AI — ISL to English Translator Prototype

A responsive, browser-based starter project for an Indian Sign Language (ISL) to English translation app.

## What works in this starter
- Responsive website for phones, tablets, laptops, and desktops.
- Camera permission and live webcam preview.
- MediaPipe hand-landmark tracking (internet required to load the model).
- Image/video file selection and preview.
- English text-to-speech in supported browsers.
- Demo phrase buttons and session-only history.

## What is not implemented yet
**This is not yet an automatic ISL translator.** MediaPipe detects hand landmarks but does not determine the meaning of ISL signs. Image/video uploads are previewed only. Demo phrases are examples and are not predictions from the camera.

To add genuine translation, collect or use appropriately licensed, representative ISL data and train/evaluate an ISL-specific model. Dynamic signs may require sequences of frames; sentence translation also requires linguistic/context modelling. Do not describe the project as translating all ISL until it has been rigorously tested with signers.

## Run locally

Camera APIs generally require HTTPS or `localhost`; do not open `index.html` as a `file://` URL.

### Option 1: Python's local static server
1. Install Python 3 if needed.
2. Open a terminal in this folder.
3. Run:
   ```bash
   python -m http.server 8000
   ```
4. On the same computer, open `http://localhost:8000`.
5. Allow camera access and click **Start camera**.

The MediaPipe library and hand-landmarker model load from Google's jsDelivr and Google Cloud URLs, so an internet connection is required. If GPU initialisation fails on a device, change `delegate: "GPU"` to `delegate: "CPU"` in `app.js`.

## Publish online
Upload this folder to a static host that supports HTTPS, such as GitHub Pages, Netlify, or Cloudflare Pages. Set the published site to the folder containing `index.html`. HTTPS is needed for camera access on devices other than localhost.

This static prototype can be hosted separately from a future Python inference API. If you later add a backend, use a secure HTTPS endpoint, validate uploads, set size/time limits, and avoid retaining camera frames or sign videos unless users explicitly consent.

## Suggested next development stage
1. Decide the supported ISL vocabulary and sentence patterns with ISL users/educators.
2. Obtain permissioned and representative ISL video data.
3. Split data by signer for evaluation to reduce leakage.
4. Train and evaluate a model; measure per-class precision/recall and test across lighting, backgrounds, and signing styles.
5. Connect the model to this interface and only display predictions above a validated confidence threshold.
6. Clearly indicate unsupported signs and allow users to correct predictions.

## Browser compatibility
Use a recent version of Chrome, Edge, Firefox, or Safari. Camera access and speech voices vary by browser and device. Mobile browsers may require the user to select the front camera and grant camera permission.
