# Nomad frontend: motion design brief

A prompt for anyone (person or AI) building Nomad's animated frontend. It names the motion each
page gets, why, and the rules every animation must follow. Read it before touching `apps/web`.

## The product in one line

Nomad matches solo travellers into small groups going to the same city on overlapping dates,
then lets the group pick and book a hotel together. The feeling to aim for: **arriving somewhere
with people you like**. Warm, a little editorial, unhurried. Not a fintech dashboard, not a game.

## What stays (non-negotiable)

- **The brand.** Cream paper (`#f4f1e9`), ink green (`#18231f`), coral signal (`#e3522e`),
  sage (`#789a87`), Fraunces for display, DM Sans for body, DM Mono for small data. The logo asset.
- **Every route, link, form field, handler, query key and API call.** Motion is added around
  existing markup; logic, props and data flow are not moved or renamed.
- **The copy.** No new claims, numbers or testimonials. The 96% card on the landing page is
  existing illustrative copy and stays as found.
- **Layouts.** Each page keeps its composition; this is a motion and polish pass, not a re-layout.

## Tooling

- **Motion for React** (`motion` package, `import { motion, AnimatePresence } from 'motion/react'`)
  for anything that needs presence (enter/exit), shared layout (`layoutId`), springs or counting.
- **Plain CSS keyframes** for simple staggered entrances on lists and forms. They are cheaper, need
  no markup change and work with scripting off (content is visible by default; the animation only
  plays the "from" state for a moment).
- `MotionConfig reducedMotion="user"` at the root, plus a `prefers-reduced-motion` block in CSS.

## Motion rules (apply everywhere)

1. Animate **only `transform` and `opacity`** (a clip or filter only if it stays smooth). Never
   `width`, `height`, `top`, `left`, never `transition: all`. A progress bar fills with `scaleX`.
2. **Durations:** micro 120ms (press, tick, colour), short 220ms (hover, tooltip, menu),
   long 420ms (dialog, tab change, reveal). Exits run at about 65% of the enter.
3. **Easing:** ease-out `cubic-bezier(.2,.8,.2,1)` for arrivals, ease-in `cubic-bezier(.4,0,1,1)`
   for exits. Springs only for things the user moved (a toggled chip, a tab indicator), with no
   visible overshoot on UI state.
4. **Stagger:** 40ms between list rows, 80ms between blocks, 500ms total at most, played once.
5. **One entrance per page.** Content arrives once on load; it does not re-animate on every
   re-render or refetch. Scroll reveals use `whileInView` with `once: true`.
6. **Motion carries state, never decoration**, on app screens (dashboard, search, matches, group
   page): something appeared, was chosen, was sent, was booked. The landing page and the auth art
   panel are the only places allowed a little ambient life.
7. **Reduced motion:** every entrance shows its end state at once; loops stop; the marquee stops.
8. **Loops:** the landing ticker is the only long loop. It pauses on hover and on focus.
9. **Focus rings never animate** and appear instantly on `:focus-visible`.
10. **No** parallax, custom cursors, cursor followers, pulsing dots, bouncing arrows or confetti.

## Page by page

### Landing (`/`, `pages/Landing.tsx`)
The one marketing page, so it gets the most expressive treatment.
- **Hero headline:** each line rises 24px and fades in, 80ms apart; the coral second line last.
- **Lede and actions:** fade up after the headline (one sequence, about 600ms total).
- **Photo card:** settles in from a slight scale (0.96 to 1) with the sun disc rising 20px into place.
- **Floating cards** (match card, note card): drift in from their own side after the photo,
  then hold still. No idle bobbing.
- **Match score:** counts up from 0 to the value already printed, once, when the card lands.
- **Ticker:** a continuous marquee, pauses on hover/focus, stops under reduced motion.
- **Feature cards (how it works):** reveal on scroll, staggered 80ms, lift 2px on hover.

### Sign in / Sign up (`/signin`, `/signup`, `pages/SignUp.tsx`)
- **Art panel:** the quote lines fade up in sequence; the city line fades in last.
- **Form:** heading, subtitle, then each field fades up 40ms apart.
- **Error message:** slides down into place (no shake: shaking reads as scolding).
- **Demo accounts panel** (when shown): rows stagger in; the picked row's coral edge appears at micro speed.
- **Submit:** pressed state scales to 0.98; "One moment…" swaps in without layout jump.

### Profile setup (`/profile`, `pages/ProfileSetup.tsx`)
- Intro column and form card enter as two blocks, 80ms apart.
- **Interest options:** a selected option fills with a short colour transition and a 0.96 press.
- Validation errors fade in under their field.

### Dashboard (`/dashboard`, `pages/Dashboard.tsx`)
- **Sidebar nav:** the active pill is one shared element (`layoutId`) that slides between
  Overview and Profile instead of blinking.
- **Tab change:** content cross-fades (out 150ms, in 220ms with a 8px rise).
- **Welcome card and option cards:** enter once, staggered.
- **Group cards** (leading / part of): stagger in.
- **Pending request rows:** when approved or rejected the row collapses out (fade + slide) instead
  of vanishing; the pending badge count updates in place.
- **Welcome orbit badge:** rotates slowly (one ambient loop, 40s, stops under reduced motion).

### Create group (`/groups/new`) and Search (`/search`)
- Intro column then form card, as on profile setup; form fields stagger 40ms.
- **Interest chips:** a press scales to 0.96; turning on fills ink at micro speed.
- **Submit while searching:** the button keeps its width; the label swaps to "Searching…".

### Matches (`/search/:id`, `pages/Matches.tsx`)
The page the whole product leads to, so the results should feel like they *arrive*.
- **Header:** the count and city line rise in; the summary facts fade in after.
- **Match cards:** stagger in, 60ms apart, 12px rise.
- **Capacity bar:** fills from 0 with `scaleX` once the card is in, to the real ratio.
- **Filters:** changing a chip or the make-up toggle re-lays the list with `layout` animation:
  cards that leave fade out, the rest slide into their new place.
- **Request to join:** the button label cross-fades to "Request pending".
- **Empty states:** the ✦ mark and text fade up; no looping.

### Group page and booking (`/groups/:id/plan`, `pages/GroupPlan.tsx`, `components/GroupChat.tsx`)
- **Header and chat card** enter as blocks.
- **Chat:** each new message slides in from its side (own messages from the right) at short speed.
- **Hotel cards:** stagger in; photo fades in when loaded.
- **Confirm booking dialog:** backdrop fades, dialog scales 0.96 to 1 and fades in (long).
- **Booked card:** the big moment. It enters with a scale/fade, then the "Booked" badge stamps in
  (scale 1.2 to 1, 220ms). Once, no confetti.

### Members (`/groups/:id/members`) and traveller profile (`/travellers/:id`)
- Rows stagger in; approved/rejected request rows leave like the dashboard's.

### Page transitions (all routes)
- A short cross-fade between routes (out 120ms, in 220ms with a 6px rise), keyed on the pathname
  so query-string filter changes on Matches do not trigger it.

## Accessibility and robustness checks

- Content is fully visible if JavaScript animation never runs (CSS entrances start from the end
  state under reduced motion and on `@media (scripting: none)`).
- Nothing that conveys state relies on motion alone: badges, labels and `aria-live` stay.
- No layout shift from animation: entrances use transforms only.
- `npm run typecheck` and `npm run build` pass; every existing flow (sign up, profile, search,
  request, approve, book) works end to end.
