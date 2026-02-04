# Open Questions & Talking Points

Items worth discussing before or during implementation. Roughly priority-ordered.

---

## Must Resolve Before M1

### Q1: Jörn's Forecasting Model
The rulebook prompt needs your model. What are the core dynamics?
- Capability growth curves
- Control/alignment mechanics
- How votes affect trajectory
- What triggers extinction vs utopia

### Q2: Emergency Proposals
What makes a proposal "emergency" (no defer allowed)?
- Triggered by game state? Random? LLM decides?
- Examples?

### Q3: Game Ending
What prevents infinite games?
- Max turns? Max game-years? LLM instruction?
- Fail-safe if LLM never outputs GameOver?

### Q4: Shared In-Progress Games
If someone visits `/?id=xyz` for an unfinished game:
- Can they continue playing (anyone can edit)?
- Read-only view?
- Error / redirect to landing?

---

## Should Clarify Soon

### Q5: Pass vs Defer
If player can pass 0-2, and defer is default... what's the difference between "pass 0" and "defer all"?
- Is defer an explicit action or just "didn't pass"?
- Game design intent?

### Q6: Proposal Lifecycle
- How long do deferred proposals stay on floor?
- When do failed proposals return (if ever)?
- LLM decides, or explicit rules?

### Q7: Pre-2026 History
- Hardcoded events or LLM-generated at game start?
- Same for all presets or varies?
- How many events?

### Q8: Phase Transitions
- Who decides phase changes? (LLM? date thresholds?)
- Full list of phases?

### Q9: Time Progression
- LLM outputs explicit month advance, or inferred from event dates?
- Min/max months per turn?

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
- [x] Freeform text input → No (2-4 proposals, pick 0-1)
- [x] Progress bars → No (news items + phase label)
- [x] Multiplayer comparison → Twitter + baseline, defer aggregation to M5
