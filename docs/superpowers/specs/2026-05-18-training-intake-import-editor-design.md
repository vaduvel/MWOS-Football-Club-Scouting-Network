# Training Intake And Mobile Editor Design

## Goal

Add a production-ready `Training Intake` flow that lets MWOS coaches:

- create training plans manually inside the app
- import a training plan from `PDF`
- scan or upload a photo of a handwritten plan
- convert the imported source into an editable draft
- review and correct the draft on a phone-first editor
- publish the final structured plan for the rest of the club
- generate short operational WhatsApp-ready messages from the published plan

The key product goal is adoption. Coaches must be able to start from the way they already work today, while the club still ends up with a clean structured plan inside the application.

## Scope

This slice covers:

- manual training plan creation
- PDF import for training plans
- image import for training plans
- OCR-assisted extraction from images or scanned PDFs
- transformation of extracted content into a structured draft
- mobile-first editing and correction of the imported draft
- attachment and retention of the original source file
- published plan viewing for all relevant roles
- WhatsApp share generation from the structured plan

This slice does **not** cover:

- direct automated WhatsApp delivery through an external API
- advanced AI session suggestion logic
- transport OCR/import
- native mobile apps

## Product model

### Core principle

The uploaded document is an input, not the source of truth.

The source of truth is always the structured training plan stored in the application after review and editing.

### Intake modes

Each training plan begins from one of three modes:

- `manual`
- `pdf_import`
- `image_import`

Every mode ends in the same place:

- a `draft training plan`
- opened in the same training editor

### Original source retention

When the user imports a PDF or image, the original file remains attached to the plan as a source artifact.

The user must be able to:

- view the original source
- replace the source
- re-run extraction
- keep editing the structured draft independently of the source

### Extraction confidence model

Imported content should not pretend to be perfectly understood.

Each imported day receives one of three states:

- `ready`
- `needs_review`
- `missing_info`

Meaning:

- `ready`: key fields were extracted with acceptable confidence
- `needs_review`: enough information exists to prefill the editor, but at least one important field is uncertain
- `missing_info`: the app could not safely infer the day details and expects manual completion

### Training day model

The existing training plan model stays in place and remains the final shape:

- day type
- session title
- session type
- start time
- end time
- location
- focus tags
- intensity
- volume
- objectives
- exercises / content
- coach notes

Imported content is mapped into these same fields rather than creating a parallel imported-only structure.

## Roles and visibility

### Coach

Coach can:

- create manually
- import PDF
- scan or upload image
- edit imported draft
- save draft
- publish
- share a generated WhatsApp message

### Technical Director

Technical Director can:

- view the original source
- view the structured draft or published plan
- comment on the whole plan
- comment on an individual day

Technical Director does **not** become an approval gate in this slice.

### Admin

Admin can:

- see all imported and manual plans
- see draft vs published status
- see which teams still have no plan for the current week
- see the original source file

### Board Observer

Board Observer gets:

- read-only access to published plans
- no draft editing
- no raw import workflow

### Driver

Driver does not need the full training editor.

Driver should see only the logistics-relevant view when transport depends on a training session:

- team
- date
- venue
- departure details when present
- start time
- key logistics notes

## Intake and extraction flow

### Step 1: choose source

The training module starts with three clear actions:

- `Create manually`
- `Import PDF`
- `Scan photo`

These actions must be large, tap-friendly, and visible immediately on mobile.

### Step 2: upload and ingest

#### PDF import

If the PDF contains selectable text:

- extract text directly

If the PDF is scan-based:

- render pages or use page images
- pass them through OCR

#### Photo import

For photos:

- preprocess enough for OCR
- extract text
- preserve the image as the original source

### Step 3: parse into training structure

The parser should extract only stable operational information:

- team name when present
- week or date range when present
- weekday labels
- dates
- start time
- end time when present
- location or venue
- objective-like text
- exercise blocks
- notes

The parser must prefer partial usable drafts over fragile full guesses.

### Step 4: generate imported draft

The system creates:

- one plan shell
- day cards for the relevant week
- extraction status per day
- a visible reference to the original source

The system must never auto-publish an imported plan.

### Step 5: review and correct

The coach reviews the generated draft inside the editor, fixes uncertain fields, and chooses:

- `Save draft`
- `Publish plan`

## Mobile-first editor design

### Layout rule

This module is designed `mobile-first`.

Desktop may expand the experience, but the primary experience must be optimized for phone use by club staff.

### Page structure

The editor should use a one-column layout on mobile:

1. compact plan header
2. import/source status card
3. week summary card
4. stacked day cards
5. comments
6. sticky bottom action bar

### Header

The top of the editor should show:

- team
- week
- intake mode (`Manual`, `Imported PDF`, `Scanned photo`)
- overall plan status (`Draft`, `Published`, `Updated`)

### Source status card

The source card shows:

- original file name
- import mode
- extraction summary
- how many days are `ready`
- how many days `need review`
- how many days are still incomplete

Actions:

- `View source`
- `Replace source`
- `Re-import`

### Day cards

Each day is shown as a stacked card.

Collapsed day card shows:

- weekday
- date
- session type or day type
- start time
- location
- status chip

Status chips:

- `Ready`
- `Needs review`
- `Missing info`

### Day editing

Tapping a day opens a focused editor for that day.

On mobile this should behave like a full-screen sheet or equivalent single-task view, not a cramped mini form.

The day editor must keep large touch targets and avoid wide multi-column layouts on small screens.

### Sticky action bar

The bottom action area should stay accessible on mobile and include:

- `Save draft`
- `Publish`
- `Share`

## Visual language

The current module hierarchy is too visually flat. This slice introduces functional color variation while staying within the existing brand family.

Recommended usage:

- `indigo / blue` for normal training sessions
- `teal / green` for complete or verified items
- `amber` for imported items needing review
- `coral / red` for missing critical information
- `slate` for rest days or low-action items

The goal is faster scanning on phones, not decorative color.

## WhatsApp share model

### Principle

WhatsApp output is a distribution layer, not the source of truth.

It must be generated from the structured plan, not from the original uploaded document.

### Share outputs

The system should support:

- `Share full weekly summary`
- `Share single day`

### Share format

The generated message should be short and operational, close to the club's existing WhatsApp style:

- team
- day/date
- venue
- departure if relevant
- arrival or start time
- short notes

The system should avoid heavy branding, long prose, or card-like formatting in the message body.

### Editing before share

The generated message should be editable before the user sends it to WhatsApp.

This preserves the operational simplicity coaches are used to while still using the app as the structured system of record.

## Technical architecture

### Storage

The source file should be stored in Supabase Storage in a dedicated training intake bucket or equivalent namespaced path.

Each training plan needs metadata linking:

- plan id
- source file path
- source type
- source original filename
- extraction status
- import timestamp
- importing user

### OCR and parsing

The OCR/import pipeline should be handled server-side.

Responsibilities:

- file receipt
- text extraction
- OCR fallback for images/scanned PDFs
- transformation into normalized draft structure

Frontend responsibilities:

- upload
- progress state
- showing extraction result
- editor review

### Failure behavior

If OCR or parsing is imperfect:

- keep the raw extracted text available when useful
- still create a draft shell when enough information exists
- never discard the uploaded source
- let the coach recover manually in the editor

## Error handling

The UI must clearly distinguish:

- upload failed
- text extraction failed
- draft partially generated
- draft ready but needs review

The user should always have a recovery path:

- retry upload
- replace file
- continue editing manually

## Verification requirements

This slice is done only when all of the following work:

- coach can create a plan manually on mobile
- coach can upload a PDF and receive a structured draft
- coach can upload or scan an image and receive a structured draft
- original file remains attached to the plan
- imported draft opens in the same editor used for manual plans
- day cards clearly show `ready`, `needs_review`, and `missing_info`
- coach can correct imported fields and publish the plan
- Technical Director can review the source and comment on the plan
- admin can see import status and plan status across teams
- board observer can read published plans only
- driver can see logistics-relevant published information only
- WhatsApp share can generate a short weekly summary
- WhatsApp share can generate a short single-day message
- the whole edit/publish/share flow is comfortable on a phone
