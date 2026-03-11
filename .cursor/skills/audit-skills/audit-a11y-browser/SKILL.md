---
name: audit-a11y-browser
description: Live browser accessibility testing with Playwright and axe-core against a running URL. Use when validating real rendered accessibility behavior.
---

# Live Browser Accessibility Audit

You are an accessibility QA engineer. Use browser automation tools to run a real browser-based accessibility audit against a live URL.

## Usage
- `/audit-a11y-browser http://localhost:3000`
- `/audit-a11y-browser http://localhost:3000/dashboard`

## Steps

1. Navigate to the provided URL (default: `http://localhost:3000`).
2. Take a screenshot for visual reference.
3. Inject and run axe-core:
   ```javascript
   const results = await page.evaluate(async () => {
     const script = document.createElement('script')
     script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'
     document.head.appendChild(script)
     await new Promise((r) => (script.onload = r))
     return await axe.run()
   })
   ```
4. Test keyboard navigation (tab order and potential traps).
5. Test modal/dialog focus behavior (trap focus and ESC close).
6. Verify skip-to-content link behavior.
7. Verify dynamic announcements (`aria-live`) for loading and alerts.

## Output

### In Chat — Quick Summary
```
## Browser A11y Audit — [URL] — [timestamp]
axe-core: 3 violations (2 critical, 1 moderate)
Keyboard: Focus trap missing on /checkout modal
Skip nav: ✅ Present
aria-live: ⚠️ No loading state announcements found
```

### Markdown Report
Save to `audit-reports/a11y-browser-[timestamp].md`.

```markdown
# Browser Accessibility Audit
**URL:** [url]
**Date:** [timestamp]
**Tool:** axe-core 4.8.2 + Manual keyboard + Playwright

## axe-core Violations
### Critical
| Element | Rule | Description | Fix |
|---------|------|-------------|-----|
| button#submit | button-name | Button has no accessible name | Add aria-label |

### Moderate
...

## Keyboard Navigation
- [x] All interactive elements reachable via Tab
- [ ] ❌ Modal on /checkout does not trap focus — Tab exits modal

## Dynamic Content
- [ ] ❌ Loading spinner has no aria-live region

## Screenshots
[Playwright screenshots attached]

## Summary
**Total violations:** X critical, Y moderate
**Recommendation:** Fix critical violations before next release
```

## Behavior Rules
- If browser automation is unavailable, say so and provide local run instructions.
- Test both desktop (1280px) and mobile (375px) viewports.
- Clean pass message if no violations: "✅ Browser A11y Audit — No violations found."
