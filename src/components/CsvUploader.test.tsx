/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvUploader from './CsvUploader';
import '@testing-library/jest-dom';

// Mock PapaParse since file parsing in JSDOM can be tricky
jest.mock('papaparse', () => ({
  parse: jest.fn((file, config) => {
    // If it's a valid test CSV
    if (file.name === 'valid.csv') {
      config.complete({
        data: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Doe', email: 'jane@example.com' }
        ],
        errors: [],
        meta: { fields: ['name', 'email'] }
      });
    } else if (file.name === 'empty.csv') {
      config.complete({
        data: [],
        errors: [],
        meta: { fields: [] }
      });
    }
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('CsvUploader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const uploadFile = async (file: File) => {
    const input = screen.getByTestId('csv-input') as HTMLInputElement | null;
    // The component has a hidden file input. Let's find it.
    // It doesn't have a test ID, so we'll select by type.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
  };

  it('1 & 2. Uploading a valid CSV triggers parsing, renders preview table, and enables Confirm button', async () => {
    render(<CsvUploader />);
    
    // Initially no preview table, confirm button is not there
    expect(screen.queryByText(/Previewing first/)).not.toBeInTheDocument();
    
    // Upload a valid CSV
    const file = new File(['name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com'], 'valid.csv', { type: 'text/csv' });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Table should appear with 2 rows
    expect(await screen.findByText(/Previewing first 2 rows/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    // Confirm button should be visible and enabled
    const confirmButton = screen.getByRole('button', { name: /Confirm Import/i });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).not.toBeDisabled();
  });

  it('3. Loading state appears while API is in flight and disappears after', async () => {
    // Mock a delayed fetch response
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ imported: [], skipped: [], totalImported: 0, totalSkipped: 0 })
      }), 100))
    );

    render(<CsvUploader />);
    
    const file = new File(['name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com'], 'valid.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const confirmButton = await screen.findByRole('button', { name: /Confirm Import/i });
    
    // Click confirm
    fireEvent.click(confirmButton);
    
    // Check loading state
    expect(screen.getByRole('button', { name: /Processing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Processing/i })).toBeDisabled();

    // Wait for the result screen to show (which replaces the uploader)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Processing/i })).not.toBeInTheDocument();
    });
  });

  it('4. Result table renders correct Total Imported / Total Skipped counts given mocked API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        imported: [{ name: 'John Doe' }], 
        skipped: [{ name: 'Jane Doe', reason: 'skip' }], 
        totalImported: 1, 
        totalSkipped: 1 
      })
    });

    render(<CsvUploader />);
    
    const file = new File(['name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com'], 'valid.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const confirmButton = await screen.findByRole('button', { name: /Confirm Import/i });
    fireEvent.click(confirmButton);

    // Should transition to ImportResult component
    expect(await screen.findByText(/Import Complete/i)).toBeInTheDocument();
    
    // Check that '1' is displayed for Imported and Skipped
    const numberOnes = screen.getAllByText('1');
    expect(numberOnes.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Error state displays correctly when the mocked API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error 500'));

    render(<CsvUploader />);
    
    const file = new File(['name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com'], 'valid.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const confirmButton = await screen.findByRole('button', { name: /Confirm Import/i });
    fireEvent.click(confirmButton);

    // Expect the error message to appear
    expect(await screen.findByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText('Network error 500')).toBeInTheDocument();
  });
});
