---
name: page-styles
description: Designs a creator's whole Piku page from one of three Page styles (Front Row, On Air, Keynote) in their own colours, as a Page draft they preview and apply themselves. Use when a creator asks to design, redo, restyle or set up their Piku page, or asks what their page could look like.
---

# Page styles

Use this when a creator asks you to design their Piku page. Each style is taken from a page we built, and it only sets the look; you arrange the rest from the creator's own page. Nothing goes live: `design_page` saves a Page draft, and the creator previews it and applies it in the page builder.

## The flow

1. Call `get_page`. Its `styles` list has each style's id, name, who it suits, three palettes and a recipe. Keep the ids of their links, Rates and widgets.
2. Offer the three styles by name, one short line each on who it suits:
   - **Front Row** (`front-row`): people who run classes, shows or sessions. Events first, one main ask.
   - **On Air** (`on-air`): hosts with a show, podcast or channel. Episodes in a row, asks for guests and sponsors.
   - **Keynote** (`keynote`): founders, speakers and advisers. Dark page, talks, ventures, a way to book them.
3. Ask for their colours. They can send hex codes, or a logo or photo: read three colours from it and say which you picked. Or offer the chosen style's three palettes by name.
4. Call `design_page` with:
   - `style`: the style's id. It fills the theme, button colour, shape and alignment you leave out.
   - `look.palette`: three colours like `#4A2073`. They are the cover glow, left to right. The first also colours the main ask (the first Rate button under the bio, and event buttons) and is the button colour unless you give `button_colour`. Text on them is picked for contrast.
   - The style's `recipe`, arranged from THEIR page: `sections`, `groups` (Row for videos, List for the rest), `rate_buttons`, `portfolio`, `links_order`, and `shows` for social profiles (On Air wants the show's own profiles as buttons: `show: button`).
5. Show the changes and the `preview_url`. Say nothing is live until they apply it in the page builder. Picking a theme there later goes back to the theme's own glow.

## Rules

- Never invent links, numbers, Rates or events. Leave out a part of the recipe they do not have, and say what they could add.
- Only add links they gave you, as https addresses.
- A developer's GitHub fits any style as a `github` widget (`{type: "github", value: "<username>"}`; Full near the top for Keynote, Compact in a list otherwise). Only an account they gave you.
- Rate buttons only open a Rate's request sheet; prices never change here.
- Never say the page was updated. A new design replaces their open one.
