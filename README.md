# Tower of Babel Video

A full-stack web application for processing, analyzing, and translating video content. Users submit an MP4 URL, and the system performs a series of operations including metadata extraction, audio clipping, AI-powered transcription, translation, text-to-speech (TTS) generation, and thumbnail OCR.

## Tech Stack

*   **Backend:**
    *   **API:** FastAPI
    *   **Database:** SQLite
    *   **Media Processing:** MoviePy (Video/Audio) & Pillow (Images)
    *   **AI Services:** Gemini API (for OCR, TTS, Translation, Speech-to-Text)
    *   **File Serving:** FastAPI `StaticFiles` for media (`/data`) and assets (`/static`).

*   **Frontend:**
    *   **Core:** Vanilla HTML5, CSS, JavaScript (ES6+)
    *   **UI:** Material Components Web (MDC)

## Core Features

The application operates on a simple client-server model. The frontend UI sends requests to the FastAPI backend, which performs the heavy lifting and saves results to the SQLite database and `/data` directory.

*   **Video Processing:** Ingests videos from a URL, saving them locally and extracting metadata like duration and dimensions using **MoviePy**.
*   **Persistence:** All processed videos are stored in an SQLite database and listed in the UI for easy access and reloading.
*   **Audio Manipulation:** Extracts, plays, and downloads specific audio segments from the source video.
*   **AI Translation Workflow:**
    1.  Transcribes an audio segment using the **Gemini API**.
    2.  Translates the resulting text into Spanish.
    3.  Generates speech from the Spanish translation via Text-to-Speech.
*   **Thumbnail OCR:** Extracts the first frame of the video as a thumbnail and uses the **Gemini API** to run OCR and detect any embedded text.