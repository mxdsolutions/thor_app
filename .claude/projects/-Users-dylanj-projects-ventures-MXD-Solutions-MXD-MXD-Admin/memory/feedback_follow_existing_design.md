---
name: Follow existing design patterns exactly
description: Never introduce new visual styles — always match existing pages in the codebase
type: feedback
---

Do not introduce new colors, styles, or layout patterns. Always match the existing pages in the codebase exactly.

**Why:** User flagged platform admin pages using indigo/purple colors and custom table markup that looked completely out of place compared to the rest of the app. The deviation was unnecessary and unasked for.

**How to apply:** Before building any new page, read an existing equivalent page (e.g., companies page for a table view, CRM overview for a dashboard) and replicate its exact structure — same components (`ScrollableTableLayout`, `DashboardPage`), same class patterns (string concat not `cn()` for table cells), same color tokens, same responsive padding. Never invent new visual differentiation unless explicitly asked.
