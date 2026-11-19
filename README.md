# twin

AI Digital Twin with persistent memory and interactive chat interface.

## Project Structure
- `backend/`: FastAPI backend powered by Groq LLM with multi-turn session memory
- `frontend/`: Next.js & React chat interface
- `memory/`: Local JSON-based persistent conversation storage

## Getting Started

### Backend
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install dependencies:
   ```bash
   uv venv
   source .venv/bin/activate
   uv pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and configure your `GROQ_API_KEY`.
4. Run the server:
   ```bash
   uvicorn server:app --reload --port 8000
   ```

### Deploying Backend to AWS Lambda
1. Build the deployment package:
   ```bash
   cd backend
   python deploy.py
   ```
2. Build and update the deployed AWS Lambda function:
   ```bash
   python deploy.py --deploy
   ```

### Deploying Frontend to AWS S3
Deploy updates to the live frontend:
```bash
cd frontend
npm run deploy
```

## Live Deployments
- **Frontend URL:** [http://twin-frontend-651167506335.s3-website-us-east-1.amazonaws.com](http://twin-frontend-651167506335.s3-website-us-east-1.amazonaws.com)
- **Backend API (Lambda URL):** `https://m22svnukhz3dxakgk2cybjrygq0wajps.lambda-url.us-east-1.on.aws/`
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
