# Open Questions & Talking Points

Items worth discussing before or during implementation. Roughly priority-ordered.

---

## Should Clarify Soon

### Q7: Pre-2026 History
- Hardcoded events or LLM-generated at game start?
- Same for all presets or varies?
- How many events?
- *Likely answer:* Hardcoded, same for all, ~10-20 events covering 2023-2025

### Q8: Phase Transitions
- Who decides phase changes? (LLM? date thresholds?)
- Full list of phases?
- *Likely answer:* LLM decides based on vibes, no fixed list

### Q9: Time Progression
- LLM outputs explicit month advance, or inferred from event dates?
- Min/max months per turn?
- *Likely answer:* Inferred from event dates; 1-6 months per turn

---

## Can Defer to Implementation

### Q10: Responsive Breakpoint
What px width for mobile/desktop switch? (768? 1024?)

### Q11: Loading Indicator Style
Dots count, color, animation? Or use standard spinner?

### Q12: Error Messages
- Format for "vote on all emergencies" error
- Format for network errors
- Retry behavior

### Q13: Share Text
- Generated at game end or on-demand?
- Fallback if generation fails?

### Q14: Multiple Tabs
- What if same game open in two tabs?
- Conflict resolution?

### Q15: Accessibility
- Keyboard navigation
- Screen reader support
- Content warning for doom themes?

---

## Noted But Low Priority

- ID format: lowercase only (36^6) or mixed case (62^6)?
- Glow effect exact styling
- Date format locale (always English "Mar"?)
- localStorage vs cookies for tracking
- Game retention / deletion policy
- Analytics / rate limiting

---

## Resolved During M0

- [x] LLM vs hand-authored scenarios → LLM
- [x] Sequential vs full trajectory → Sequential (boiling frog)
- [x] Backend scope → Full from start (Worker + D1)
- [x] Frontend framework → React + Vite + TypeScript
- [x] Freeform text input → No (2-4 proposals, pick 0-2)
- [x] Progress bars → No (news items + phase label)
- [x] Multiplayer comparison → Twitter + baseline, defer aggregation to M5
- [x] Q1: Forecasting model → Discussed; LLM tracks capability/alignment/policy qualitatively; proposals from pre-written library; P(doom)≈98% baseline, smart play can beat it
- [x] Q2: Emergency/Urgent proposals → Renamed to "Urgent"; LLM decides which can't wait another turn (window closing, decision forced)
- [x] Q3: Game endings → EXTINCTION (unaligned ASI), UTOPIA (aligned ASI, rare ~5-10%), MUDDLE (2050 failsafe, high fringeness)
- [x] Q4: Shared in-progress games → Anyone with URL can continue; player's responsibility; enables cross-device play
- [x] Naming: "Emergency" → "Urgent", "Normal floor" → "Floor"
- [x] Prompt priority: Clear > Actionable > Quality > Short
- [x] LLM turn procedure: Sample → Pressure check → Write news → Plan ending carefully → Write ending
- [x] Q5: Pass/Defer/Fail → Replaced with topic-based multiple choice (pick one per topic)
- [x] Q6: Proposal lifecycle → Replaced by topic system; LLM generates 1-3 topics per turn
- [x] Floor redesign: Topics with mutually exclusive options, no combinatorial explosion
- [x] Urgent votes: Removed (every topic must be answered = all are "urgent")
- [x] Fringeness: Gating (LLM only offers plausible options) + natural trajectory awareness
- [x] Snapshot-based storage: Each turn creates new hash, URL = /?snapshot=abc123
- [x] Topic/option descriptions: Optional, LLM decides based on complexity
- [x] Selection UX: Standard radio buttons, no defaults, Submit locked until all topics selected
