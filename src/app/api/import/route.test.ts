import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the Gemini API globally before running tests
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => {
          return {
            generateContent: mockGenerateContent
          };
        })
      };
    })
  };
});

import { GoogleGenerativeAI } from '@google/generative-ai';

describe('POST /api/import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockImplementation(() => {
      return Promise.resolve({
        response: {
          text: () => JSON.stringify({ imported: [], skipped: [] })
        }
      });
    });
  });

  const createRequest = (body: any) => {
    return new Request('http://localhost:3000/api/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('rejects empty array with 400', async () => {
    const req = createRequest([]);
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/non-empty array/i);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects malformed body with 400', async () => {
    const req = new Request('http://localhost:3000/api/import', {
      method: 'POST',
      body: 'not-json'
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it('batching function correctly splits N rows into expected batch sizes', async () => {
    // Generate 125 rows to test 50-sized batches (50, 50, 25)
    const rows = Array.from({ length: 125 }).map((_, i) => ({ id: i }));
    const req = createRequest(rows);

    // Mock AI to just return empty arrays so it passes
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ imported: [], skipped: [] })
      }
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    
    // Verify batch sizes passed to Gemini (50, 50, 25)
    const call1Content = JSON.parse(mockGenerateContent.mock.calls[0][0].contents[0].parts[0].text.replace('Batch to process:\n', ''));
    expect(call1Content.length).toBe(50);
    
    const call2Content = JSON.parse(mockGenerateContent.mock.calls[1][0].contents[0].parts[0].text.replace('Batch to process:\n', ''));
    expect(call2Content.length).toBe(50);

    const call3Content = JSON.parse(mockGenerateContent.mock.calls[2][0].contents[0].parts[0].text.replace('Batch to process:\n', ''));
    expect(call3Content.length).toBe(25);
  });

  it('skip logic: a row with no email and no mobile is excluded from imported and added to skipped', async () => {
    const rows = [{ name: 'Test User' }]; // No email, no mobile
    const req = createRequest(rows);

    // AI mocks that it processed it and put it in 'skipped' (since our prompt rules tell it to)
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          imported: [],
          skipped: [{ name: 'Test User', reason: 'Missing both email and mobile number' }]
        })
      }
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.imported.length).toBe(0);
    expect(data.skipped.length).toBe(1);
    expect(data.skipped[0].reason).toBe('Missing both email and mobile number');
  });

  it('response merging: multiple batch results are correctly combined', async () => {
    const rows = Array.from({ length: 75 }).map((_, i) => ({ id: i }));
    const req = createRequest(rows);

    // First batch (20 rows) returns 10 imported, 5 skipped
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          imported: Array.from({ length: 10 }).map(() => ({ created_at: '2026-07-08', crm_status: 'GOOD_LEAD_FOLLOW_UP' })),
          skipped: Array.from({ length: 5 }).map(() => ({ reason: 'skip' }))
        })
      }
    });

    // Second batch (5 rows) returns 15 imported, 2 skipped (not physically possible for 5 rows, but proves merging works blindly)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          imported: Array.from({ length: 15 }).map(() => ({ created_at: '2026-07-08', crm_status: 'GOOD_LEAD_FOLLOW_UP' })),
          skipped: Array.from({ length: 2 }).map(() => ({ reason: 'skip' }))
        })
      }
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.imported.length).toBe(25);
    expect(data.skipped.length).toBe(7);
    expect(data.totalImported).toBe(25);
    expect(data.totalSkipped).toBe(7);
  });

  it('Zod validation: rejects invalid crm_status and passes valid records', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const req = createRequest(rows);

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          imported: [
            { created_at: '2026-07-08', crm_status: 'GOOD_LEAD_FOLLOW_UP' }, // valid
            { created_at: '2026-07-08', crm_status: 'TOTALLY_MADE_UP_STATUS' } // invalid
          ],
          skipped: []
        })
      }
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    // Should catch the invalid one and move it to skipped
    expect(data.imported.length).toBe(1);
    expect(data.imported[0].crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
    
    expect(data.skipped.length).toBe(1);
    expect(data.skipped[0].reason).toBe('invalid AI output');
    expect(data.skipped[0].crm_status).toBe('TOTALLY_MADE_UP_STATUS');
  });
});
