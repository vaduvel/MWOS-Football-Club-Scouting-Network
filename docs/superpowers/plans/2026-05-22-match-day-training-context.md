## Match Day -> Training Context

### Goal
Add lightweight derived context between the weekly training workspace and match-day fixtures without adding new database tables or foreign keys.

### Product shape
- Training week shows match-relative labels such as `MD-2`, `MD-1`, `MD`, `MD+1`.
- Training hero surfaces the relevant fixture for the selected team/week.
- Match Day shows a compact training-context card with a direct link into that team/week.

### Data strategy
- Derive context by matching `team_id` and the selected training week range against `match_days.match_date`.
- Choose the earliest non-cancelled fixture in the selected week for the first version.
- Keep training and match day as separate sources of truth.

### Implementation steps
1. Add a pure domain helper module for:
   - match-day offset labels
   - relevant weekly fixture selection
   - weekly training summary around the fixture
2. Extend `TrainingWorkspace` with derived match context and annotate days.
3. Export match-day link builder and add helper(s) for training context in match-day data.
4. Surface context in:
   - training day status cards
   - training page hero/summary
   - match-day transport/fixture column as a new training card
5. Verify with tests, lint, and production build.

### Non-goals
- No additional schema changes
- No support for multiple fixtures in the same week beyond picking one relevant fixture
- No automatic training-plan rewrites based on match day
