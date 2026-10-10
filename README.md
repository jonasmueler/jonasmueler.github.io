# jonasmueler.github.io

Personal research site. Built by GitHub Pages with Jekyll; no build step needed on your machine.

## Publish (first time)

1. On GitHub, create an empty public repo named exactly `jonasmueler.github.io`. Leave README, license and .gitignore unticked.
2. In this folder:

   ```bash
   git init -b main
   git add .
   git commit -m "First version of the site"
   git remote add origin git@github.com:jonasmueler/jonasmueler.github.io.git
   git push -u origin main
   ```

3. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
4. After a minute or two the site is live at https://jonasmueler.github.io.

## Everyday edits

| To…                         | Edit                                                   |
|-----------------------------|--------------------------------------------------------|
| change name, links, menu    | `_config.yml`                                          |
| write a blog post           | new file `_posts/YYYY-MM-DD-title.md`                  |
| add a video course          | `_data/courses.yml` + thumbnail in `assets/img/courses/` |
| add learning material       | new file in `_materials/` (copy `_materials/example-template.md`) |
| add a paper                 | `_data/publications.yml` (+ teaser in `assets/img/pubs/`) |
| update your CV              | `_data/cv.yml`                                         |
| change the look             | `assets/css/style.css`                                 |
| change the home banner      | `assets/js/surface.js` (see below)                     |

Then commit and push; GitHub rebuilds the site automatically.

### Front matter for posts

```yaml
---
title: "My post"
description: "One line shown in the post list and link previews."
tags: [radar, uncertainty]
math: true        # only if the post uses LaTeX: $$ ... $$
---
```

### Figures and videos

```liquid
{% include figure.html src="/assets/img/posts/plot.png" alt="..." caption="Figure 1. ..." %}
{% include figure.html src="/assets/video/clip.mp4" caption="..." width="70%" %}
{% include figure.html src="/assets/img/posts/big.png" caption="..." wide=true %}
```

Keep videos short and small (ffmpeg, H.264, no audio). This shrinks one to ~0.5 MB:

```bash
ffmpeg -i in.mp4 -an -vf "scale=900:-2,format=yuv420p" -c:v libx264 -crf 30 -movflags +faststart out.mp4
```

## The home-page banner

A live WebGL rendering (`assets/js/surface.js`, no dependencies) of the loss surface from the
original animation: three Gaussian wells plus ripples, matplotlib's "Blues" colormap, a faint grid,
and a contour map of the same function on a floor below. Gradient descent with momentum is computed
from the formula and drawn as a path rolling into a minimum; four start points play in turn.

- It is turned on per page with `hero: true` in the front matter (only the home page uses it).
- Speed: `ORBIT` (seconds per turn). Camera: `el`, `R`, `fovy` in `draw()`. Surface: `f()`, defined twice (JS and GLSL), keep both identical.
- Pauses when out of view or in a background tab. Shows a still frame for reduced-motion visitors.
- Without WebGL the still image `assets/img/hero-poster.jpg` is shown. To remake it, open `/?clean&t0=95` and screenshot the banner.
- `/?t0=60` starts the animation a minute in.

## Local preview (optional)

With Docker, no Ruby setup needed:

```bash
docker run --rm -it -p 4000:4000 -v "$PWD":/srv -w /srv ruby:3.3.6 \
  bash -c "bundle install && bundle exec jekyll serve --host 0.0.0.0"
```

Then open http://localhost:4000.

## Custom domain (optional)

Buy a domain, add a file `CNAME` containing it (e.g. `jonasmueller.ai`), and follow GitHub's
"Managing a custom domain" guide for the DNS records.
