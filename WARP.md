# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## High-Level Architecture

This is a Next.js web application designed to extract text from an uploaded image and generate a structured payment receipt.

-   **Frontend**: Built with Next.js and React. The main user interface is located in `src/app/page.tsx`. It manages the application's state, from image upload to displaying the final report. It uses `Tesseract.js` directly in the browser to perform OCR on the selected image.
-   **Styling**: The UI is styled using `Tailwind CSS` and includes various components from `shadcn/ui` located in `src/components/ui/`.
-   **Text Processing**: A custom text processor in `src/lib/text-processor.ts` extracts structured data from OCR text using pattern matching and rule-based logic instead of AI.
-   **PDF Generation**: The final report can be exported as a PDF using `jsPDF` and `jspdf-autotable`. The PDF generation logic is in `src/app/page.tsx`.

The overall workflow is as follows:
1.  The user uploads an image.
2.  Tesseract.js runs in the browser to extract text from the image.
3.  The user can review and edit the extracted text.
4.  The edited text is processed by the custom text processor to extract structured data.
5.  The processor returns a structured JSON receipt based on pattern matching.
6.  The frontend displays the data in an editable form and allows the user to download it as a PDF.

## Common Development Tasks

To get started with development, you only need to run the frontend application.

**Prerequisites:**

No external API keys or services are required. The application works entirely in the browser.

**Running the development server:**

-   To run the Next.js application:
    ```bash
    npm run dev
    ```

**Other useful commands:**

-   **Build for production**: `npm run build`
-   **Run in production mode**: `npm run start`
-   **Lint the code**: `npm run lint`
-   **Type-check the code**: `npm run typecheck`

