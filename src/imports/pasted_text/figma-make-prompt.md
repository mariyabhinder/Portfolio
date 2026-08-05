Absolutely. Since you want **Figma Make to reproduce the design rather than reinterpret it**, the prompt should be very explicit about **visual fidelity, responsive behavior, interactions, and what is/isn't allowed to change**.

You can paste the following directly into Figma Make:

---

# Figma Make Prompt — Personal Portfolio Website

Create a **fully responsive, functional personal portfolio website** based exactly on the four provided reference screenshots.

The four screenshots represent:

* **Desktop Light Mode** — reference for the complete desktop layout in light mode.
* **Desktop Dark Mode** — reference for the first/hero section in dark mode.
* **Mobile Dark Mode** — reference for mobile layout in dark mode.
* **Mobile Light Mode** — reference for mobile layout in light mode.

Use the screenshots as the **primary visual source of truth**.

## IMPORTANT DESIGN RULE

**Do NOT redesign, modernize, simplify, rearrange, or reinterpret the visual design.**

The final website should look as close as possible to the screenshots.

Preserve:

* Exact overall composition
* Colors
* Illustrations
* Text placement
* Image placement
* Spacing
* Stitching effects
* Cloth textures
* Hand-drawn/handwritten aesthetic
* Decorative elements
* Shapes
* Borders
* Backgrounds
* Toggle appearance
* Character illustrations
* Flowers
* Clouds
* Stars
* Awning
* Section proportions

The website should feel like a **handmade scrapbook / stitched portfolio**, not like a generic modern portfolio website.

---

# 1. OVERALL PAGE STRUCTURE

The website consists of exactly **three main sections after the hero**:

1. Hero / Introduction
2. My Work Stitched Together
3. About Me
4. CTA / Contact section

The page should be vertically scrollable.

Desktop should follow the desktop screenshots.

Mobile should follow the mobile screenshots and should **not simply be a scaled-down desktop layout**. Rearrange elements responsively to match the mobile references.

---

# 2. HERO SECTION

The hero section is the most interactive section.

It should occupy the large introductory area at the top of the page.

## Light Mode Hero

Use the light-mode screenshot as the exact visual reference.

The background should be:

* Bright pastel sky blue
* Soft, airy and playful
* With illustrated white/light clouds
* Grass and flowers along the bottom
* The illustrated girl sitting in the flower field
* Handwritten typography
* Floating colored labels
* Light mode toggle on the right

Do not replace these illustrations with generic stock illustrations or unrelated graphics.

### Hero text

On the left:

**Hi I’m
Mariyah**

Use the same handwritten/hand-drawn visual style as the screenshot.

There should also be the hand-drawn curved arrow pointing toward the girl.

In the center area:

**I design beautiful things
and stitch ideas together.**

Keep this inside the same pale green rectangular note/card shown in the reference.

---

# 3. INTERACTIVE CLOUDS / PERSONAL QUALITIES

There are several floating clouds/labels throughout the hero section.

The qualities are:

* **UI UX DESIGNING**
* **CROSS STITCHING**
* **COFFEE LOVER**
* **LOVE CAPTURING CLOUDS**
* **MANDALA ART**

There is also the small instruction:

**“*hover on clouds to
know about me*”**

Preserve its location and handwritten style.

## Desktop interaction

Each cloud/quality element should be interactive.

When the mouse **hovers over a cloud/quality**, display a small overlay containing the corresponding personal quality/content.

For example:

* Hover over **UI UX DESIGNING** → show its related quality/content.
* Hover over **CROSS STITCHING** → show its related quality/content.
* Hover over **COFFEE LOVER** → show its related quality/content.
* Hover over **LOVE CAPTURING CLOUDS** → show its related quality/content.
* Hover over **MANDALA ART** → show its related quality/content.

The overlay should:

* Appear smoothly
* Be positioned close to the hovered cloud
* Match the handmade visual language of the website
* Not cause the page layout to shift
* Not push other elements around
* Disappear when the mouse leaves the interactive cloud/area

Use a subtle fade/scale transition rather than a sudden appearance.

### Important

The cloud/quality elements should remain in the same locations shown in the screenshots.

Do not replace them with cards, tooltips from a browser library, or conventional UI popups.

They should feel like **floating scrapbook elements**.

---

# 4. HERO FLOWERS AND GIRL ILLUSTRATION

At the bottom of the hero:

* Create the dense illustrated grass/flower field exactly like the reference.
* Keep the pink flowers, yellow/orange flowers, white flowers and green grass.
* Preserve the visual layering.
* Keep the illustrated girl sitting toward the lower-left portion.
* Do not alter her illustration or clothing.
* Do not replace the illustration with another character.

The flower field should act as the visual bottom boundary of the hero.

---

# 5. LIGHT / DARK MODE TOGGLE

There is a toggle on the right side of the hero section.

It exists on:

* Desktop
* Mobile

The toggle should visually match the reference screenshots.

## Light mode

The toggle contains the **yellow/light circular element**.

When the user clicks the yellow circle/light side:

→ Light mode should be active.

## Dark mode

The toggle contains the **moon**.

When the user clicks the moon:

→ Dark mode should be active.

The toggle should have a smooth transition.

---

# 6. VERY IMPORTANT DARK MODE BEHAVIOR

Dark mode **ONLY affects the HERO SECTION.**

This is extremely important.

When switching from light mode to dark mode:

### Hero changes

The hero should change to the dark version shown in the reference:

* Light blue sky → deep navy/night sky
* Clouds → stars / nighttime atmosphere
* Light daytime appearance → nighttime appearance
* Flower field becomes darker/more glowing
* Pink flowers have a stronger glowing appearance
* Stars appear in the sky
* Hero labels change appropriately according to the dark screenshot
* Toggle changes to the moon/dark-mode appearance
* Hero typography/colors change where necessary to match the dark screenshot

### Everything below the hero MUST remain unchanged.

The following sections must **NOT** change when dark mode is activated:

* My Work Stitched Together
* About Me
* CTA
* Background textures
* Work cards
* About section
* Contact details
* Awning
* Character illustration

These sections should remain exactly like the **light mode design**.

Do NOT implement a global dark theme.

Instead, implement a **hero-only dark mode state**.

---

# 7. HERO DARK MODE CONTENT

The dark-mode hero should closely match the supplied dark desktop/mobile screenshots.

Use:

* Deep navy/black-blue night sky
* Small stars
* Larger glowing blue stars
* Glowing pink flowers
* Dark green grass
* Yellow-green illustrated girl
* White handwritten text where appropriate
* Colored floating labels
* Moon toggle

The overall composition should remain consistent with the light version.

Do not change the girl's position unnecessarily when switching modes.

The transition between light and dark hero should be smooth.

---

# 8. MOBILE HERO INTERACTION

On mobile, there is no traditional mouse hover.

Therefore, convert the cloud interaction into a **tap interaction** while preserving the same concept.

When the user taps a cloud/quality:

→ Show its corresponding quality overlay.

When the user taps another cloud:

→ Replace the currently displayed quality.

When the user taps outside the active cloud/overlay:

→ Hide the quality.

Do not permanently show all qualities.

The mobile hero should remain clean and uncluttered.

---

# 9. RESPONSIVE DESIGN

Create two carefully designed responsive layouts.

### Desktop

Follow the two desktop screenshots.

The hero should use the large horizontal composition.

The floating clouds/labels should remain distributed across the large sky area.

The girl should sit toward the lower-left.

The flower field should span the entire width.

### Mobile

Follow the two mobile screenshots.

Do not simply shrink the desktop design.

Instead:

* Stack content appropriately.
* Maintain the hero's visual hierarchy.
* Keep the girl toward the lower-left.
* Keep the flower field across the width.
* Maintain the floating cloud positions as closely as possible to the mobile reference.
* Keep the toggle visible.
* Make all text readable.
* Make touch targets large enough for mobile interaction.

The mobile page should look like the supplied mobile reference.

---

# 10. MY WORK — "MY WORK STITCHED TOGETHER"

Immediately after the hero, create the work portfolio section.

Use the **off-white cloth/fabric textured background** shown in the screenshot.

Heading:

**My Work Stitched Together**

Use the same dark reddish/brown typography shown in the reference.

---

## Desktop Work Layout

On desktop, display **three stitched fabric cards horizontally**.

### Card 1

Green stitched fabric card.

It contains:

* Website screenshot
* Text:

**Website Hero Page**

* Rounded cream/off-white "Read more →" button

### Card 2

Pink stitched fabric card.

It contains:

* Website screenshot
* Text:

**Website Hero Image**

* Rounded cream/off-white "Read more →" button

### Card 3

Blue stitched fabric card.

For now, this is an empty project placeholder.

It should contain:

* Blue fabric texture
* Clearly visible white/off-white stitching around the border
* No internal design/content unless shown in the reference

---

## Stitching Effect

The cards must look like actual pieces of stitched cloth.

Preserve:

* Fabric texture
* Rounded corners
* Thick stitched border
* Irregular handmade feeling
* Correct green / pink / blue colors

Do not replace the stitching with a standard CSS dashed border.

The stitching should visually resemble the supplied design.

---

# 11. MOBILE WORK SECTION

On mobile, the three cards should stack vertically.

Order:

1. Green card
2. Pink card
3. Blue card

Match the spacing and sizing from the mobile screenshot.

The heading remains at the top of this section.

Do not place the cards side-by-side on mobile.

---

# 12. WORK CARD INTERACTION

The **Read more →** buttons should be functional.

For now, create them as clickable buttons/links.

Structure the code so that each project can easily have a URL added later.

Do not make the buttons purely decorative.

Add a subtle hover interaction on desktop while keeping the original visual style.

Do not introduce large modern animations.

---

# 13. ABOUT ME SECTION

After the work section, create the About Me section.

The background should remain **white**.

## Desktop layout

Use a two-column layout.

### Left side

Use the provided portrait/photo exactly as shown.

The photo should be placed inside the handmade decorative frame:

* White/off-white paper area
* Yellow hand-drawn grid lines
* Flower decoration
* Small decorative elements
* Pink handwritten note
* Coffee cup illustration
* Text at the bottom:

**A cup of coffee is a must!**

Preserve the scrapbook/craft aesthetic.

### Right side

Heading:

**Hi! I am Mariyah**

The name **Mariyah** should use the yellow/orange accent color shown in the screenshot.

Below:

**UI/UX Designer**

Then:

**I’ve always found a special kind of joy
in the small, beautiful things around us.**

Maintain the same hierarchy and spacing as the reference.

---

# 14. MOBILE ABOUT ME

On mobile, stack the section vertically.

Order:

1. Portrait/scrapbook image
2. Heading
3. "UI/UX Designer"
4. Description

Center-align the text as shown in the mobile reference.

Do not place the photo and text side-by-side on mobile.

Keep generous whitespace.

---

# 15. CTA / CONTACT SECTION

The final section is the contact CTA.

The section should have a **white background**.

At the top of the CTA section is the decorative shop/café awning.

It consists of alternating:

* Pink
* Pale yellow
* Pink
* Pale yellow

rounded/scalloped fabric sections.

Preserve this exact playful awning style.

---

# 16. CTA DESKTOP LAYOUT

Desktop CTA should match the reference.

Left side:

Large heading:

**Lets Connect For A Cup
Of Coffee**

Use the same clean rounded typography as the screenshot.

Below it:

Email icon + email address:

**[bhinderwalamariyah@gmail.com](mailto:bhinderwalamariyah@gmail.com)**

The email should be clickable using a `mailto:` link.

Below that:

LinkedIn icon.

Make it a clickable LinkedIn link placeholder that can easily be replaced with the actual profile URL later.

Right side:

Use the illustrated girl holding a cup of coffee.

Keep her toward the bottom-right.

Do not replace this illustration.

---

# 17. MOBILE CTA

On mobile, the CTA should stack/reflow to match the supplied mobile screenshot.

Keep:

* Awning at the top
* Large whitespace
* CTA heading toward the lower-left
* Email below it
* LinkedIn icon
* Coffee-holding girl toward the bottom-right

The girl should remain partially anchored toward the bottom-right and should not cover the contact information.

---

# 18. TYPOGRAPHY

Typography is a very important part of this design.

Use fonts that closely resemble the supplied reference.

There are two visual styles:

### Handwritten font

Used for:

* Hero introduction
* Cloud labels
* Personal qualities
* Small decorative text
* Handwritten notes

It should look playful, hand-drawn and slightly imperfect.

### Clean rounded font

Used for:

* Section headings
* About Me
* CTA
* Portfolio titles
* Contact information

If the exact font from the design is unavailable, choose the **closest visual match** rather than changing the design to a generic font.

Do not use overly corporate, geometric or futuristic fonts.

---

# 19. COLORS

Do not invent a new color palette.

Preserve the colors from the screenshots.

Important colors include:

* Pastel sky blue
* Deep navy night blue
* Bright yellow/lime clothing
* Pink flowers
* Green grass
* Yellow/orange flowers
* Off-white cloth
* Green stitched card
* Pink stitched card
* Blue stitched card
* Pale yellow
* Pink
* Orange/yellow accent for "Mariyah"
* White
* Dark brown/red heading color

Color matching should prioritize the supplied screenshots.

---

# 20. ANIMATIONS

Keep animations subtle and handmade.

Use animations only where they improve the interaction.

Recommended:

* Smooth light/dark hero transition
* Cloud hover fade/scale
* Cloud quality overlay fade-in
* Button hover transition
* Very subtle card hover movement

Avoid:

* Excessive parallax
* Large page transitions
* Bouncing elements
* Excessive spinning
* Modern glassmorphism
* Generic UI animations
* Anything that changes the visual composition from the reference

The design should remain calm, playful and handcrafted.

---

# 21. CODE STRUCTURE

Build this as a real working responsive website, not a static mockup.

Use reusable components such as:

* `Hero`
* `ThemeToggle`
* `QualityCloud`
* `WorkSection`
* `WorkCard`
* `AboutSection`
* `ContactSection`

The theme state should be controlled cleanly.

Example logic:

```text
theme = "light" | "dark"
```

When `theme === "dark"`:

* Only Hero receives the dark styling/assets.

When `theme === "light"`:

* Hero returns to light styling.

The rest of the page should never receive dark-mode styling.

---

# 22. RESPONSIVE BREAKPOINTS

Make the website responsive across:

* Desktop
* Laptop
* Tablet
* Mobile

Use the supplied desktop and mobile designs as the main reference points.

Do not allow:

* Horizontal scrolling
* Elements going outside the viewport
* Text clipping
* Images becoming distorted
* Overlapping contact information
* Broken stitching cards
* Broken flower field
* Broken toggle

Maintain correct aspect ratios for all illustrations and images.

---

# 23. ACCESSIBILITY AND FUNCTIONALITY

Make interactive elements accessible.

The theme toggle should have:

* Proper button semantics
* Accessible label
* Keyboard support

Quality cloud interactions should also be usable with keyboard focus where practical.

Email should use:

`mailto:`

LinkedIn should use a normal external link placeholder.

Buttons should have visible hover/focus states without changing the visual language.

---

# 24. MOST IMPORTANT IMPLEMENTATION RULE

**Treat the four screenshots as the design specification.**

Do not create a new portfolio design based on the screenshots.

Instead, reproduce the supplied design as faithfully as possible in code.

The final result should preserve the feeling of:

**handmade + stitched fabric + scrapbook + clouds + flowers + coffee + playful illustration + personal portfolio.**

The page should look like the same designer created the screenshots and then converted them into a functional website.

---

## FINAL CHECKLIST

Before finishing, verify:

* [ ] Desktop Light Mode matches screenshot
* [ ] Desktop Dark Mode matches screenshot
* [ ] Mobile Light Mode matches screenshot
* [ ] Mobile Dark Mode matches screenshot
* [ ] Hero cloud interactions work
* [ ] Desktop cloud hover shows quality overlay
* [ ] Overlay disappears on mouse leave
* [ ] Mobile cloud tap interaction works
* [ ] Light/dark toggle works
* [ ] Clicking yellow/light toggle activates light hero
* [ ] Clicking moon activates dark hero
* [ ] **Only the hero changes in dark mode**
* [ ] Work section stays light in dark mode
* [ ] About section stays light in dark mode
* [ ] CTA stays light in dark mode
* [ ] Work cards retain fabric/stitching appearance
* [ ] Work cards stack vertically on mobile
* [ ] About section switches from 2-column to vertical on mobile
* [ ] CTA is responsive
* [ ] Email is clickable
* [ ] LinkedIn is clickable
* [ ] No horizontal scrolling
* [ ] No elements are unnecessarily redesigned
* [ ] No colors are changed
* [ ] No illustrations are replaced
* [ ] No decorative elements are removed

**Prioritize visual fidelity to the supplied screenshots over generic best practices or redesign suggestions.**
