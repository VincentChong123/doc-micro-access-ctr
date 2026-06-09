import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import * as Diff from 'diff';

// The two MinIO URLs provided
const url1 = "http://localhost:9001/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAwL2FwcHJvdmFsLWFydGlmYWN0cy9yaW5naV9zYW1wbGUwMSUyMC0lMjBSaW5naXNobyUyMCUyODElMjkucGRmP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9WDZBTVZYV0ZGTUNJV1JOODBSNjMlMkYyMDI2MDYwNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA2MDdUMTI0ODUwWiZYLUFtei1FeHBpcmVzPTQzMjAwJlgtQW16LVNlY3VyaXR5LVRva2VuPWV5SmhiR2NpT2lKSVV6VXhNaUlzSW5SNWNDSTZJa3BYVkNKOS5leUpoWTJObGMzTkxaWGtpT2lKWU5rRk5WbGhYUmtaTlEwbFhVazQ0TUZJMk15SXNJbVY0Y0NJNk1UYzRNRGczT0RrMk1Dd2ljR0Z5Wlc1MElqb2lZV1J0YVc0aWZRLjg4R2NBNzk2VGpaLUMyeGZFOTE3WndpY1VyanlGTDdhZHRFcWRzU05QMmpRU0g2YnBjVFk4LUdwb2hEYXdOU0pJdG9HSk1la1hfbTJDNE1BOWtGelhRJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZ2ZXJzaW9uSWQ9bnVsbCZYLUFtei1TaWduYXR1cmU9YzU5YWIwZDZkOTVmMDVlMTYzZjMyYzA1OWYxNWUxZGY3MTI5YTY2NTNhOWJmYzk3ZjlmZjI2OTMwZDhjZjM5Zg";
const url2 = "http://localhost:9001/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAwL2FwcHJvdmFsLWFydGlmYWN0cy9yaW5naV9zYW1wbGUwMSUyMC0lMjBSaW5naXNobyUyMCUyODElMjkucGRmP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9WDZBTVZYV0ZGTUNJV1JOODBSNjMlMkYyMDI2MDYwNyUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA2MDdUMTI1MTQyWiZYLUFtei1FeHBpcmVzPTQzMjAwJlgtQW16LVNlY3VyaXR5LVRva2VuPWV5SmhiR2NpT2lKSVV6VXhNaUlzSW5SNWNDSTZJa3BYVkNKOS5leUpoWTJObGMzTkxaWGtpT2lKWU5rRk5WbGhYUmtaTlEwbFhVazQ0TUZJMk15SXNJbVY0Y0NJNk1UYzRNRGczT0RrMk1Dd2ljR0Z5Wlc1MElqb2lZV1J0YVc0aWZRLjg4R2NBNzk2VGpaLUMyeGZFOTE3WndpY1VyanlGTDdhZHRFcWRzU05QMmpRU0g2YnBjVFk4LUdwb2hEYXdOU0pJdG9HSk1la1hfbTJDNE1BOWtGelhRJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZ2ZXJzaW9uSWQ9bnVsbCZYLUFtei1TaWduYXR1cmU9NzIxZDdjNjZjYTA1YTBlMzFlNGRlNTRjNjFjYTk0N2QxYWE5ZmU2ODNjMjhmNTY0YTM3ZTU1MWEwNWE0Y2RlZQ";

// 1. Download PDF from S3/MinIO
async function downloadPDF(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// 2. Extract Text Page-by-Page
async function getPagesFromPDF(pdfBuffer) {
    const pages = [];
    function render_page(pageData) {
        return pageData.getTextContent().then(function(textContent) {
            let lastY, text = '';
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                    text += item.str;
                } else {
                    text += '\n' + item.str;
                }
                lastY = item.transform[5];
            }
            pages.push(text);
            return text;
        });
    }
    await pdf(pdfBuffer, { pagerender: render_page });
    return pages;
}

// 3. The Text Diffing Engine
async function comparePDFText() {
    console.log("☁️ Downloading v1 and v2 from MinIO...");
    const buffer1 = await downloadPDF(url1);
    const buffer2 = await downloadPDF(url2);

    console.log("📄 Parsing PDFs page-by-page...");
    const pages1 = await getPagesFromPDF(buffer1);
    const pages2 = await getPagesFromPDF(buffer2);

    console.log("\n🔍 SYSTEM DELTA REPORT:");
    console.log("====================================================");

    const maxPages = Math.max(pages1.length, pages2.length);

    for (let i = 0; i < maxPages; i++) {
        const text1 = pages1[i] || "";
        const text2 = pages2[i] || "";
        const pageNum = i + 1;

        const differences = Diff.diffWords(text1, text2);

        // Ignore whitespace-only changes
        const hasRealChanges = differences.some(part =>
            (part.added || part.removed) && part.value.trim().length > 0
        );

        if (hasRealChanges) {
            console.log(`\n⚠️ CHANGES DETECTED ON PAGE ${pageNum}:`);
            differences.forEach((part) => {
                if (part.added && part.value.trim()) {
                    console.log(`   [ADDED]   + ${part.value.trim()}`);
                } else if (part.removed && part.value.trim()) {
                    console.log(`   [REMOVED] - ${part.value.trim()}`);
                }
            });
            console.log("----------------------------------------------------");
        } else {
            console.log(`✅ Page ${pageNum}: No text changes.`);
        }
    }
}

// 4. The Visual (Pixel) Diffing Architecture (Conceptual Implementation)
/*
   To perform Pixel-by-Pixel Image Diffing in Node.js, you need 'pdf2pic', 'pngjs', and 'pixelmatch'.
   Note: 'pdf2pic' requires 'ghostscript' and 'graphicsmagick' to be installed on your Linux/Mac OS.

   async function generateVisualRedline(buffer1, buffer2) {
       import { fromBuffer } from "pdf2pic";
       import pixelmatch from "pixelmatch";
       import { PNG } from "pngjs";

       const options = { density: 100, format: "png", width: 800, height: 1000 };

       // Convert Page 1 of both PDFs to Images
       const img1 = await fromBuffer(buffer1, options)(1);
       const img2 = await fromBuffer(buffer2, options)(1);

       // Load them into PNG.js
       const png1 = PNG.sync.read(fs.readFileSync(img1.path));
       const png2 = PNG.sync.read(fs.readFileSync(img2.path));
       const { width, height } = png1;
       const diff = new PNG({ width, height });

       // Run the cryptographic pixel diff
       const numDiffPixels = pixelmatch(png1.data, png2.data, diff.data, width, height, { threshold: 0.1 });

       if (numDiffPixels > 0) {
           fs.writeFileSync('Delta_Redline_Page1.png', PNG.sync.write(diff));
           console.log(`Generated Delta_Redline_Page1.png showing highlighted changes.`);
       }
   }
*/

comparePDFText().catch(console.error);
