# GitHub and Vercel handoff

The site is static HTML, CSS, SVG, JavaScript, and local media. No database,
API keys, framework dependencies, or Sites runtime are required to serve it.
About and project pages are generated from Markdown with Node.js 22 or later.

## Prepared

- `npm run build` regenerates About and projects, including tags and filters.
- `npm run check` validates routes, local media links, JavaScript, and tagged projects.
- `vercel.json` selects the static output in `dist/` and runs build plus checks.
- `npm run export:github -- /absolute/path/to/empty-folder` exports tracked
  working files without the current Sites identity or Git configuration.
- Media is already local. Photos load on detail pages; videos use `preload="none"`.

Do not delete `dist/`: it contains authored pages and assets as well as generated
content. No installation is needed to run the build and checks.

## Move when ready

1. Review the About wording and the tags in `content/projects/`. These tags
   were assigned from the existing project descriptions and can be edited.
2. Review the undated Dream Car entry and the ukulele's original ongoing-work
   description. Replace the 3D Models placeholder when downloads are ready.
   Candle still needs a 22.5-degree flame adjustment or removal from the game.
3. Create the intended GitHub repository and choose its visibility. Export the
   committed source into an empty folder, then initialize Git there and push
   to that repository. The current Sites checkout remains available until cutover.
4. Import the new repository into Vercel. Use the included configuration, then
   verify the homepage, About, filters, all project pages, media, and touch controls.
5. Map old Wix project URLs (recorded as `source:` in Markdown) to the new slugs
   before domain cutover. Add the redirects to the hosting configuration.
6. Add `nuttlejason.com` and `www.nuttlejason.com` to the new host. Follow the
   DNS values it supplies and preserve any email-related DNS records.
7. Change DNS only after the new deployment is reviewed. Keep the existing
   hosting available until the domain and redirects have been verified.

Configuration reference: [Vercel project configuration](https://vercel.com/docs/project-configuration).

## Routine updates after the move

Edit About or a project Markdown file, add any media under `dist/media/`, run
`npm run build && npm run check`, and commit the changed source and generated
pages. The connected hosting project can publish the GitHub change.

Tags use a comma-separated `tags:` field. Supported types are Engineering, Art,
Code, Fabrication, Interactive, and Experiment. A project may have multiple
tags. Selecting All restores the full list; filtered results stay newest first.
Dates, titles, and tags remain content, rather than being hard-coded into the UI.
