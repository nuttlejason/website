# Jason Nuttle

Static tangram website. The homepage lives in `dist/`.

Build content with `npm run build`, then validate with `npm run check`.
See `MIGRATION.md` for the prepared GitHub/Vercel handoff and remaining launch tasks.

## Tangram puzzles

The homepage Tangram tile opens `/tangram/`. The puzzle deck uses 17 of the 18
designs in `dist/tangram-shapes.js`, excluding Ship because its sail needs a
15-degree rotation. The homepage collection is unchanged. Card fronts use a
single consistent-winding union fill, without insets or strokes, to hide the
internal piece boundaries. Small reference offsets at the dolphin tail and
bunny ear are closed by rigid translation in both the puzzle and solution.
Goat (36), Shrimp (83), Teapot (261), Polar Bear (37), and Giraffe (38) are
reconstructed from the supplied book photographs and appear on both pages.
Each deck is
shuffled without repeats. Press a card to flip it into the discard pile with
its solution visible; the next silhouette appears on the draw pile. Shuffle
again when the deck is empty. Tap the top discard to flip it back onto the draw
pile, revealing the previous discard underneath. Cards have a 5:7 playing-card
aspect ratio. Changing cards leaves the movable pieces alone.

`dist/tangram.js` implements pointer-based movement and corner rotation with
one uniform scale for all seven pieces. Rotation snaps to 45-degree increments
throughout the drag and on release. Select the parallelogram to mirror it with Flip piece.
Keyboard users can Tab to a piece, move with arrows, rotate with Q/E, and flip
with F. The movement tutorial opens on each page load and from How to play.
Reset pieces restores the starting arrangement without changing the cards.
All game geometry and behavior are local SVG/CSS/JavaScript, with no added
dependencies, images, or network services. The game script loads only here.

## Editing About

Edit `content/about.md` to update the standalone `/about/` page. Its first
level-one heading supplies the page title. It supports the same Markdown as
projects. Run `node scripts/build-projects.mjs` to rebuild both About and projects
before publishing. The homepage About tile navigates directly to this page.
The decorative dance below the text cycles through all existing tangram forms,
holding each assembly before moving seven rigid SVG pieces to the next. It pauses
offscreen or in a background tab, respects reduced motion, and has a pause button.

## Editing projects

Each file in `content/projects/` creates a project tile and a separate page.
The filename becomes its URL, so retain filenames when changing titles.

```markdown
---
title: Project name
date: 2026-07-15
tags: Art, Engineering
---

Project introduction.

## Process

Text with **bold**, *italic*, `code`, and [links](https://example.com).

![Image description](/images/example.jpg)
```

Tags may be Engineering, Art, Code, Fabrication, Interactive, or Experiment.
Use a comma-separated list for multiple types. Filters sit above the project
column; project detail pages show linked tags. Filtering repacks the tiles,
preserves date order, and supports shareable `?type=Art` URLs and browser Back.

Dates sort automatically, newest first. Dates may be YYYY, YYYY-MM, or YYYY-MM-DD;
leave `date:` empty for undated work, which sorts last. Optional `date_label:`
preserves the published wording, including ongoing work. Empty bodies show a
coming-soon message. The 13 projects were imported from nuttlejason.com/portfolio;
each Markdown file records its original page in `source:`. Dream Car was undated
on the source website. The sample projects have been removed.
Supported Markdown: headings, paragraphs, bold, italic, code, fenced code,
lists, blockquotes, links, and images. Raw HTML is escaped.
Place image assets under `dist/images/`; images load lazily.
Imported media lives under `dist/media/projects/`. A standalone Markdown link
to an MP4, such as `[Watch the project](/media/projects/example.mp4)`, renders a
native video player with controls, inline playback, and no video preloading.
A JPG beside an MP4 with the same filename becomes its preview poster.

After editing or adding Markdown files, run `node scripts/build-projects.mjs`
and publish the updated `dist/` directory. No browser Markdown dependency
or runtime API is needed. Rebuild before publishing every content change.
