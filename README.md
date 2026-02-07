# devfest2026

## Backend setup

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

### 3. Run the API

Set `SUPABASE_URL` and `SUPABASE_KEY` in a `.env` file in the project root or in `backend/`. With the venv activated and from the `backend/` directory:

```bash
uvicorn backendapi:app --reload
```
