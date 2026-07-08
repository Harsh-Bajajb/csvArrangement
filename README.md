# GrowEasy CSV Importer

## Project Overview
GrowEasy CSV Importer is a robust, AI-powered tool designed to streamline the ingestion of messy lead data into a standardized CRM format. The application allows users to upload raw CSV files, instantly preview the data, and seamlessly map arbitrary columns to a strict CRM schema using Google's Gemini AI.

## Tech Stack
- **Frontend**: Next.js (App Router), React, TailwindCSS, PapaParse (client-side CSV parsing)
- **Backend**: Next.js API Routes (Node.js)
- **AI Provider & Model**: Google Gemini (`gemini-2.5-flash`) via the `@google/generative-ai` SDK
- **Validation & Testing**: Zod (strict schema enforcement), Jest, React Testing Library

## Setup Instructions

### Cloning & Dependencies
Because this project utilizes the Next.js App Router, both the frontend and backend are housed within a single repository.
1. Clone the repository: `git clone <repo-url>`
2. Navigate into the directory: `cd Groweasy`
3. Install all dependencies: `npm install`

### Environment Variables
Create a `.env` file at the root of the project and add the following variable:
```env
GEMINI_API_KEY=your_api_key_here
```
**Getting a Key**: You can obtain a free Gemini API key by visiting [Google AI Studio](https://aistudio.google.com/), signing in with your Google account, and clicking "Get API key".

### Running Locally
To start the development server (which spins up both the React frontend and the backend API routes):
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the application.

## API Documentation

### `POST /api/import`
Processes a batch of raw CSV rows, maps them to the required CRM schema using AI, validates the output, and returns the successful imports alongside any rows that were skipped.

**Request Shape:**
Expects a JSON array of raw row objects.
```json
[
  {
    "First Name": "John",
    "Last Name": "Doe",
    "Contact Email": "john@example.com",
    "Lead Status": "connected"
  }
]
```

**Response Shape:**
Returns an object containing arrays of `imported` (successfully mapped to the exact schema) and `skipped` rows (failed validation or lacked required contact info), along with total counts.
```json
{
  "imported": [
    {
      "created_at": "2026-07-08T00:00:00.000Z",
      "name": "John Doe",
      "email": "john@example.com",
      "country_code": null,
      "mobile_without_country_code": null,
      "company": null,
      "city": null,
      "state": null,
      "country": null,
      "lead_owner": null,
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": null,
      "data_source": "",
      "possession_time": null,
      "description": null
    }
  ],
  "skipped": [],
  "totalImported": 1,
  "totalSkipped": 0
}
```

## Architecture Decisions
- **Stateless (No Database):** The application serves strictly as an ingestion and mapping layer. Remaining stateless minimizes operational overhead, avoids handling PII in transit longer than necessary, and keeps the architecture hyper-focused on the data transformation logic.
- **Batching:** Sending massive data arrays to LLMs simultaneously risks context window exhaustion, unpredictable hallucinations, and strict rate limits. Processing data in controlled batches (e.g., 20 rows) ensures stable, reliable JSON output while keeping latency manageable.
- **Gemini Flash:** `gemini-2.5-flash` is heavily optimized for structured data extraction, high speeds, and cost-efficiency. It operates fast enough to use synchronously without requiring background queue workers (like Celery/Redis) for standard file sizes.
- **Client-Side Parsing & UX:** Parsing the CSV directly in the browser via PapaParse offloads intensive work from the server, allows for instant client-side previews of the data, and ensures the user can visually verify the file before executing expensive AI operations.

## Known Limitations & Future Improvements
- **Rate Limiting Resilience:** While the application uses exponential backoff for individual batches, extremely large files could still bottleneck against standard Gemini API limits over extended durations. Implementing a queue system (e.g., BullMQ) would be ideal for production-level scale.
- **Schema Extensibility:** Currently, the CRM schema is hardcoded into the system prompt and Zod validator. With more time, this could be refactored to allow dynamic, user-defined target schemas.
- **Data Persistence:** The results are currently kept in React state. A real-world application would pipe the `imported` results directly into a CRM (e.g., Salesforce, HubSpot) via webhooks or an API integration.

## Deployment
[DEPLOYED_URL_HERE]

## Screenshots
![Upload State Placeholder]()

![Preview State Placeholder]()

![Results State Placeholder]()
