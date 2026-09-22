# Jason Nuttle — Portfolio Website

This repository contains the source for Jason Nuttle's personal portfolio website: a lightweight, static site built around an interactive tangram interface.

The site presents projects spanning art, engineering, fabrication, electronics, and interactive work. Instead of a conventional navigation menu, the homepage assembles seven tangram pieces into different figures. Individual pieces act as links to Projects, About, Tangram, Instagram, and 3D Models.

A separate Tangram page turns the same visual system into a playable puzzle deck, and project pages are generated from Markdown so new work can be added without editing page templates by hand.

The site is built with plain HTML, CSS, SVG, JavaScript, and Node.js build scripts. It has no runtime framework, database, API, or external JavaScript dependencies.

## Project structure

- `content/about.md` — source content for the About page
- `content/projects/` — Markdown files for individual projects
- `dist/` — complete static website and media
- `scripts/build-projects.mjs` — generates About and project pages
- `scripts/check-site.mjs` — validates routes, assets, JavaScript, and project output
- `dist/tangram-shapes.js` — shared tangram geometry
- `dist/app.js` — homepage tangram navigation
- `dist/tangram.js` — playable tangram interface

## Building and checking the site

Node.js 22 or later is recommended.

```bash
npm run build
npm run check
```

`npm run build` regenerates the About and project pages from the Markdown source.

`npm run check` verifies the generated pages, JavaScript syntax, local links, media references, and project metadata.

The finished website is served directly from `dist/`.

## Homepage tangram

The homepage uses seven SVG tangram pieces as the primary navigation interface. On each assembly, the pieces form one of several silhouettes and animate into position.

Labels are positioned and scaled dynamically to stay within each piece. The layout responds to screen size and respects the user's reduced-motion preference.

## Tangram puzzles

The Tangram page at `/tangram/` turns the same seven-piece system into an interactive puzzle.

Players can:

- drag pieces to move them
- rotate pieces in 45-degree increments
- flip the parallelogram
- cycle through a shuffled deck of silhouettes
- reveal solutions by moving cards to the discard pile
- reset the pieces without changing the current puzzle
- use keyboard controls instead of pointer input

The puzzle geometry and interaction are implemented entirely with local SVG, CSS, and JavaScript.

## Editing the About page

Edit:

```
content/about.md
```

The first level-one heading becomes the page title. After editing, rebuild the site with:

```bash
npm run build
```

The About page also includes an animated tangram that cycles through the site's different silhouettes.

## Adding or editing projects

Each Markdown file in `content/projects/` produces one project tile and one project page. The filename becomes the project's URL slug.

Example:

```markdown
---
title: Project name
date: 2026-07-15
tags: Art, Engineering
---

Project introduction.

## Process

Text with **bold**, *italic*, `code`, and [links](https://example.com).

![Image description](/media/projects/example.jpg)
```

Supported project tags are:

- Engineering
- Art
- Code
- Fabrication
- Interactive
- Experiment

Projects are sorted automatically by date, newest first. Dates may use `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. An empty date places a project at the end of the list.

Project filters on the site support shareable URLs such as:

```
/projects/?type=Art
```

## Project media

Project media is stored under:

```
dist/media/projects/
```

Images load lazily.

A standalone Markdown link to an MP4 renders as a native video player:

```markdown
[Watch the project](/media/projects/example.mp4)
```

If a JPG with the same filename exists beside the MP4, it is used as the video's poster image.

## Technology

The site intentionally keeps its technical stack small:

- HTML
- CSS
- JavaScript
- SVG
- Node.js build scripts
- Markdown content

There are no browser-side package dependencies, runtime APIs, or external application services required to serve the site.
