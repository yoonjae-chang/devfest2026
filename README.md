# devfest2026

## Backend setup

**Requires Python 3.11** (for basic-pitch and TensorFlow compatibility on macOS)

### 1. Create and activate the virtual environment

From the project root:

```bash
cd backend
python3.11 -m venv venv
```

Activate the virtual environment:

- **macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows (cmd):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  venv\Scripts\Activate.ps1
  ```

### 2. Install dependencies

With the virtual environment activated (from the `backend/` directory):

```bash
pip install -r requirements.txt
```

Includes [basic-pitch](https://github.com/spotify/basic-pitch) (Spotify's audio-to-MIDI converter) with CoreML support for macOS.

### 3. Run the API

Set `SUPABASE_URL` and `SUPABASE_KEY` in a `.env` file in the project root or in `backend/`. With the venv activated and from the `backend/` directory:

```bash
uvicorn backendapi:app --reload
```
