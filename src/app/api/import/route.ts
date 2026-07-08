import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Configurable batch size
const BATCH_SIZE = 20;

const crmRecordSchema = z.object({
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  mobile_without_country_code: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  lead_owner: z.string().optional().nullable(),
  crm_status: z.enum(['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE']),
  crm_note: z.string().optional().nullable(),
  data_source: z.enum(['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots', '']).optional().nullable(),
  possession_time: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * Processes a batch of raw CSV rows with Gemini to map them to the CRM schema.
 */
async function processWithAI(batch: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  // Use a Flash model for fast processing
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemInstruction = `You are an intelligent data-mapping assistant. Your task is to process a batch of raw CSV rows (provided as a JSON array of objects) and map them exactly to the target CRM schema. 

Your output MUST be a JSON object with two arrays: "imported" (for successfully mapped rows) and "skipped" (for rows that failed validation). Do not include any extra text, markdown formatting, or markdown code blocks in your response.

TARGET SCHEMA:
- created_at: String (must be parseable by JavaScript \`new Date(...)\`)
- name: String
- email: String
- country_code: String
- mobile_without_country_code: String
- company: String
- city: String
- state: String
- country: String
- lead_owner: String
- crm_status: String
- crm_note: String
- data_source: String
- possession_time: String
- description: String

RULES FOR MAPPING:
1. crm_status: You must map the status to EXACTLY one of these values: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If the raw value is ambiguous, pick the closest match, or default to a reasonable value.
2. data_source: You must map the source to EXACTLY one of these values: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If you cannot confidently match it to one of these, leave the field blank (empty string).
3. created_at: Ensure the date string provided can be parsed natively by JS \`new Date(...)\`. Standardize the format if necessary (e.g., ISO 8601).
4. Multiple Emails: If a row contains multiple emails, assign the FIRST email to the \`email\` field. Append any subsequent emails to the \`crm_note\` field.
5. Multiple Mobile Numbers: If a row contains multiple mobile numbers, assign the FIRST mobile number to the \`mobile_without_country_code\` field. Append any subsequent mobile numbers to the \`crm_note\` field.
6. Validation (Mandatory): Any row that lacks BOTH an email AND a mobile number must NOT be included in the "imported" array. Instead, place the original unmapped row object into the "skipped" array and add a \`reason\` field explaining why it was skipped (e.g., "Missing both email and mobile number").

RETURN FORMAT:
{
  "imported": [
    {
      "created_at": "...",
      "name": "...",
      "email": "...",
      // ... (rest of the target schema fields)
    }
  ],
  "skipped": [
    {
      // ... (original raw row fields),
      "reason": "Missing both email and mobile number"
    }
  ]
}`;

  const prompt = `Batch to process:\n${JSON.stringify(batch, null, 2)}`;

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const responseText = result.response.text();
  
  try {
    const parsed = JSON.parse(responseText);
    const rawImported = Array.isArray(parsed.imported) ? parsed.imported : [];
    const skipped = Array.isArray(parsed.skipped) ? parsed.skipped : [];
    
    const validatedImported: any[] = [];
    
    for (const record of rawImported) {
      const validation = crmRecordSchema.safeParse(record);
      if (validation.success) {
        validatedImported.push(record);
      } else {
        console.error("AI validation failed for record:", record, "Errors:", validation.error.format());
        skipped.push({
          ...record,
          reason: "invalid AI output"
        });
      }
    }

    return {
      imported: validatedImported,
      skipped: skipped
    };
  } catch (error) {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error("Invalid JSON response from AI model.");
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    // 1. Validate the incoming request body
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: expected a non-empty array of row objects.' },
        { status: 400 }
      );
    }

    const rows = body;
    const finalImported: any[] = [];
    const finalSkipped: any[] = [];

    // 2. Split rows into batches
    const batches: any[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    // 3. Process batches sequentially
    // (Sequential is usually safer to avoid hitting AI rate limits compared to Promise.all)
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const result = await processWithAI(batch);
        
        // Ensure the stub function returned arrays, then push them
        if (Array.isArray(result.imported)) finalImported.push(...result.imported);
        if (Array.isArray(result.skipped)) finalSkipped.push(...result.skipped);
        
      } catch (batchError: any) {
        console.error(`Error processing batch ${i}:`, batchError);
        
        // If a whole batch fails, mark all rows in it as skipped with the failure reason
        const skippedBatch = batch.map(row => ({
          ...row,
          reason: `Batch processing failed: ${batchError.message || 'Unknown error'}`
        }));
        finalSkipped.push(...skippedBatch);
      }
    }

    // 4. Merge results and respond
    return NextResponse.json({
      imported: finalImported,
      skipped: finalSkipped,
      totalImported: finalImported.length,
      totalSkipped: finalSkipped.length
    });

  } catch (error: any) {
    console.error('API Import Error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
