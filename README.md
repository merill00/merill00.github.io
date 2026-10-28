# Reusable Children's Storybook Template

A reusable, responsive MAVO.js storybook starter based on the *sample story* sample. The application engine is separate from story data so you can reuse the reader for new books.

## Included

- Responsive reader for phone, tablet/iPad, and desktop
- PNG artwork (sample cover + 12 sample pages) and a placeholder PNG for new stories
- Previous/next controls, touch swipes, and keyboard navigation
- Browser `SpeechSynthesis` narration with best-effort word-boundary highlighting
- Spoken quiz feedback, unlimited retries after incorrect answers, and locking after a correct answer
- Questions on the cover and story pages
- Author dashboard to edit page text, illustration paths, alt text, page order, questions, book metadata, and cover settings
- Local browser persistence and JSON import/export
- New blank story action
- PDF-to-Story importer for illustrated PDFs, with selectable-text extraction, optional OCR for scanned pages, PNG page renders, and editable page records
- Suggested multiple-choice questions generated locally for author review (no AI API required)
- IndexedDB persistence for larger PDF imports, with JSON export for backups
- Print / Save PDF with the cover and each story page on its own PDF page
- PWA manifest and service worker cache
- Standardized story JSON and JSON Schema
- Node-based story validator (no dependencies)

## Quick start

Run the project from localhost or HTTPS (not `file://`):

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. First load needs an internet connection for MAVO.js and the Google Fonts referenced by the stylesheet. The PDF importer also loads PDF.js from cdnjs when used; if OCR is needed, it loads Tesseract.js and its English OCR data from jsDelivr. The importer therefore needs an internet connection the first time it runs (and may need one again for OCR). The core reader and story images are local.

## Create another story

### Option A — use the author dashboard

1. Open **Author mode**.
2. Export the current JSON first if you want to keep it.
3. Choose **New blank story** and confirm.
4. Edit the title, subtitle, author, description, cover PNG path, cover introduction, and cover quiz.
5. Select a page and edit its heading, story text, PNG path, alt text, and quiz JSON.
6. Add, delete, or reorder pages as needed.
7. Click **Save page** for page changes and **Save settings** for book metadata.
8. Click **Validate story** to check required page text, questions, and answer indexes. Click **Export JSON** to download the story data. Keep the PNGs beside the story JSON using the relative paths you entered.

The browser stores edits locally on that device. Export JSON regularly; local storage does not synchronize across devices. Uploaded image data URLs are convenient for previewing but are less portable than PNG files in an `images/` folder.

### Option B — duplicate a project folder (recommended for publishing)

1. Copy the whole `storybook-template` folder and rename the copy, for example `my-new-story`.
2. Replace `story.json` with a copy of `blank-story.json` or your exported JSON.
3. Put your artwork in the copied project's `images/` folder and update the `cover`, page `image`, and alt-text fields.
4. Update `manifest.json` name/short_name for the book.
5. If you add/remove image filenames, update the asset list in `service-worker.js` so those images are available offline. Change `CACHE_NAME` for each published release.
6. Validate the JSON and test reader, narration, quiz retries, and PDF output.

Each duplicated book remains self-contained and can be hosted independently. For a multi-book library, the `stories/` folder contains the sample and blank starter content packages; the current reader loads the root `story.json`, so copy the chosen story JSON and its images into the project root layout before running that book.

## Standard story format

See `story.schema.json` for the JSON Schema and `blank-story.json` for a complete starter. `story.json` remains compatible with the current reader while adding metadata fields:

- `schemaVersion`: currently `1.0.0`
- `id`: lowercase slug
- `title`, `subtitle`, `author`, `description`
- `theme`: background/accent/text color tokens (metadata for future theme support)
- `settings`: narration, quiz, retry, and print preferences
- `cover`, `coverAlt`, `coverText`, `coverQuiz`
- `pages[]`: `id`, `heading`, `text`, `image`, `alt`, and `quiz[]`
- quiz object: `q`, `options[]`, `answer` (zero-based option index)

Example quiz:

```json
{
  "q": "What did Mia discover?",
  "options": ["A mysterious box", "A flying boat", "A giant cake"],
  "answer": 0
}
```

Use `answer: 0` for the first choice, `answer: 1` for the second, and so on. A page may have multiple questions. The reader checks that the answer index points to an existing option when you save quiz JSON or import a story.

## Validate story JSON

Requires Node.js; no packages need installing:

```bash
node tools/validate-story.js story.json
node tools/validate-story.js blank-story.json
```

The validator checks the schema version, story ID, title, page list, and quiz answer indexes. It does not validate that image files exist, so also inspect all image paths in the browser.


## Import an illustrated PDF

1. Start the app from `localhost` or HTTPS and open **Author mode**.
2. Choose a PDF under 80 MB (up to 100 pages per import).
3. Leave **Automatically run OCR** checked to detect pages with little or no selectable text and attempt English OCR. Uncheck it if you only want native PDF text extraction.
4. Leave **Generate suggested questions** checked to add one suggested multiple-choice question per page.
5. Click **Import PDF as editable pages** and wait for extraction/rendering to finish.
6. Review and edit each page's heading, extracted text, image path/data URL, and quiz JSON. Export JSON as a backup.

### PDF importer dependencies and limitations

- **PDF.js 3.11.174** (loaded from cdnjs at runtime) reads PDF text and renders pages to canvas. Its worker is loaded from the same CDN.
- **Tesseract.js 5** (loaded from jsDelivr only when scanned pages need OCR) performs English OCR. The OCR engine/language data may be downloaded on first use. OCR can misread names, punctuation, and text in illustrations; always proofread.
- **AI dependency: none.** Suggested questions are created locally with a simple sentence-based heuristic. They are not AI-generated or guaranteed pedagogically correct; answer choices are suggestions and must be reviewed.
- **Illustrations:** The current importer renders each complete PDF page to a PNG. It does not reliably isolate each embedded illustration from surrounding text. Consequently the PNG may include the original printed text while the extracted editable text appears beside it in the reader. Replace/crop the PNG or choose a layout that suits the source PDF before publishing. This preserves the original visual page as a reference but is not a full layout-aware image-segmentation system.
- **Storage:** imported PNGs are embedded as data URLs in story JSON. Larger stories are stored in IndexedDB where supported; export JSON after importing and keep a backup. A JSON export can be large because the PNG data is embedded.
- **Privacy:** processing happens in the browser. PDF bytes and extracted content are not sent to an AI service by this code; when OCR is needed, Tesseract.js and English OCR assets are downloaded from the CDN.
- **Offline/PWA:** the reader can use a previously saved story offline after the app assets are cached. PDF import requires CDN access for PDF.js, and OCR may require CDN access for Tesseract.js/language data. These libraries are not bundled locally.

## Print / Save PDF

Click **Print / Save PDF**, choose **Save as PDF**, use portrait orientation, and disable browser headers/footers if desired. The default sample contains one cover and 12 story pages, expected to produce 13 PDF pages. The print view includes illustrations, story text, question choices, and a blank answer line, but not the correct answers.

## Important notes

- `SpeechSynthesis` voices and word-boundary events vary by browser/device; highlighting is best-effort.
- The current authoring workflow edits story data and paths. For a portable published package, put actual PNG files into `images/` rather than relying on browser-local data URLs.
- MAVO.js is included as the authoring/content-model foundation; custom JavaScript manages reader navigation, speech, quiz interactions, import/export, and printing.
- The `theme` and `settings` fields are standardized metadata. Not all are live runtime switches yet; the existing core behaviors remain enabled as documented.


## Import an image sequence into a story

1. Serve the app from `localhost` or HTTPS and open **Author mode**.
2. Under **Image-to-Story importer**, select multiple images in the intended page order. Common formats such as PNG, JPEG, WebP, GIF, BMP, and TIFF are accepted when the browser can decode them.
3. Leave **Extract editable text with OCR** enabled to recognize text printed in the images. The importer uses Tesseract.js 5 and its English language data from jsDelivr. Uncheck it if the pages are artwork-only or you prefer to write the text yourself.
4. Leave **Generate suggested multiple-choice questions** enabled to create a draft question for each page, then review the question and answer options in the page editor.
5. Review every page, correct OCR errors, edit headings and narration text, and export JSON for backup.

Each selected image becomes a story page and is converted to PNG so the page artwork is portable in the story JSON. The first selected image is also used as the cover. The importer honors the order in which the browser reports the selected files; for predictable ordering, select files in page order or use names such as `01-cover.jpg`, `02-page.jpg`, and so on.

### Image importer dependencies and limits

- **Image decoding / PNG conversion:** browser `Image`, Canvas, and `URL.createObjectURL` APIs; no extra image-processing library.
- **OCR:** Tesseract.js 5 loaded from `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js` with English OCR data. OCR is optional and requires internet access the first time it runs (and may require internet again on later runs).
- **Suggested questions:** built-in local sentence-based heuristic using OCR text; **no AI model, external AI service, or API key** is used. Questions are suggestions and must be reviewed.
- **Limits:** up to 60 images and 100 MB total per import; individual images are limited to 25 MB and converted to a maximum of 1400 × 1600 pixels. OCR quality depends on image resolution, contrast, language, and text orientation. The current importer uses English OCR.
- The importer does not generate story prose from artwork alone. If an image contains no readable text, it creates a placeholder text prompt that the author should replace.


## Author app publishes a separate Reader app

The project now has two distinct applications:

- **Author app:** the root `index.html` with author dashboard, importers, editing, and publishing.
- **Reader app template:** `reader-app-template/`, which contains only the child-facing reader. It has no author button, author dashboard, importer, or author access-lock code.
- **Published Reader app:** downloaded from the Author dashboard as a ZIP containing the story JSON, required image assets, reader runtime, PWA manifest, and service worker.

### Publish a Reader app

1. Open the Author app on localhost or HTTPS.
2. Open the Authoring app and start creating or editing a story.
3. Edit and validate the story.
4. Click **Publish Reader App ZIP**.
5. Extract the downloaded `*-reader-app.zip` and serve its `reader-app` folder from localhost/HTTPS or upload it to your web host.

The first time you publish, the Author app loads JSZip 3.10.1 from jsDelivr. That is the only additional dependency for ZIP generation. Published Reader apps do not need JSZip, PDF.js, Tesseract.js, or MAVO.js. Narration uses the browser's native SpeechSynthesis API.

### Authoring and publishing

The Authoring app opens directly into the author workspace and has no PIN or lock feature. Use it to create and edit stories, then publish a separate Reader App ZIP. The published Reader app contains no authoring or publishing tools.

See `ARCHITECTURE.md` for the function/module map.


## Desktop illustration sizing

The reader and Author preview now use a wider book canvas on desktop (up to 1440px) and allocate more space to the illustration than to the text. Illustrations can use up to 78% of the viewport height, with `object-fit: contain` so the complete image remains visible instead of being cropped. On phones and narrow tablets, the single-column layout remains and images may use up to 55% of viewport height. The same CSS is included in the published Reader app template, so newly published Reader ZIPs inherit the larger desktop artwork.


## Independent covers and paperback full-wrap

The Author dashboard now has separate front-cover and rear-cover fields (title, subtitle/blurb, image path, alt text, and optional quiz JSON). Older story JSON remains supported through a compatibility fallback from `cover`, `coverText`, and `coverQuiz`. The published Reader starts at the front cover, proceeds through story pages, and then shows the rear cover. Print / Save PDF produces one page per front cover, story page, and rear cover.

For a single paperback cover image, open `full-wrap-cover-exporter.html` from the project. It exports a 300-DPI PNG with back panel, spine, and front panel. Enter the exact trim dimensions, bleed, and spine width supplied by your printer or KDP calculator; the exporter does not calculate or certify KDP-specific dimensions. Upload separate front and back images.


### Optional front and rear covers

Front and rear covers do not require text or comprehension questions. In the Author dashboard, leave the title, subtitle/blurb, and question JSON fields blank if desired; blank question fields are treated as an empty array. Story-page text and questions retain their existing validation rules. The blank starter now begins with text-free, question-free covers.

### Mobile illustration size

On screens 760px wide or narrower, reader illustrations are capped at `35vh` (35% of the viewport height) and retain their proportions. Adjust the `max-height: 35vh` rule in both `styles.css` and `reader-app-template/styles.css` to `30vh` for smaller images or `40vh` for larger images.

### Mobile Reader menu

On screens 760px wide or narrower, Print / Save PDF and Install app are grouped in a collapsible Menu in the header. The menu closes after an action, when tapping outside it, on Escape, and when resizing to desktop width. Previous/Next and Listen/Stop stay visible near the page for child-friendly access.

### Reader controls and status line

Both the Author preview and published Reader place the book subtitle/page count directly after the navigation and narration controls, and directly before the progress bar. The controls use a compact, consistent button style and a two-column, thumb-friendly layout on phones.

### Compact phone controls

On mobile screens, Previous and Next share the first row; Listen and Stop share the second row. Buttons are capped at 36px high (34px on very narrow phones), with smaller padding and no multi-line labels.

### Extra-compact mobile controls

On mobile, navigation and narration buttons use a tight two-by-two layout. Buttons are 30px high, dropping to 28px on screens 420px wide or narrower, with reduced padding and font size.

### Compact Reader icon bar

The Previous, Start/Next, Listen, and Stop controls use a compact horizontal icon bar in both Author preview and the published Reader. Buttons keep accessible labels and tooltips; the central action changes between Start, Next, and Finish.
