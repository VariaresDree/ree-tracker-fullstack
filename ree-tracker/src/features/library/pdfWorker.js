// src/features/library/pdfWorker.js
import * as pdfjsLib from 'pdfjs-dist';

self.onmessage = async (e) => {
    try {
        const { arrayBuffer } = e.data;
        
        // Execute heavy PDF parsing off the main thread
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableFontFace: true }).promise;
        
        const pagesToExtract = Math.min(pdf.numPages, 10); // Extract up to 10 pages for text
        let fullText = '';

        for (let i = 1; i <= pagesToExtract; i++) {
            self.postMessage({ type: 'progress', message: `Extracting telemetry from page ${i} of ${pagesToExtract}...` });
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        self.postMessage({ type: 'success', text: fullText });
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
};