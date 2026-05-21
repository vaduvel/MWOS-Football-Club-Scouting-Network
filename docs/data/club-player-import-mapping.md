# Club Player Import Mapping

Source workbook:

- `/Users/vaduvageorge/Downloads/MWOS%20FC%20Anthropometrics%20A-Z-1.xlsx`

Sheet:

- `Sheet1`

## Column Mapping

| Workbook column | Target field | Notes |
| --- | --- | --- |
| `NO` | `source_row_number` | Stored as import traceability. |
| `SURNAME` | `last_name` | Trimmed and normalized. |
| `NAME` | `first_name` | Trimmed and normalized. |
| `SURNAME + NAME` | `display_name` | Built as `first_name + " " + last_name`. |
| `WEIGHT [KG]` | `weight_kg` | Nullable numeric. |
| `HEIGHT [CM]` | `height_cm` | Nullable numeric. |
| `BODY MASS INDEX` | `bmi` | Nullable numeric. |
| `FOOT` | `dominant_foot` | `R -> right`, `L -> left`, `R / L -> both`, blank -> `unknown`. |
| `NATIONALITY` | `nationality` | Nullable text. |
| `POSITION` | `primary_position` | Nullable text. |
| `ALTERNATIVE POSITION` | `secondary_position` | Nullable text. |

## Import Defaults

- `team_id` is provided by CLI argument, first use: `first-team`
- `source_label` defaults to `anthropometrics_seed`
- `is_active` defaults to `true`
- `notes` defaults to empty
- `squad_number` stays `null` unless later workbooks explicitly include real shirt numbers

## Data Rules

- Empty strings become `null` for numeric fields.
- Position strings are collapsed to single spaces.
- Display names are unique per team for upsert purposes.
- Missing anthropometric values are allowed and should remain visible in the UI as incomplete records.
