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
| add a note / cheat sheet    | new file in `_notes/`                                  |
| add a paper                 | `_data/publications.yml` (+ teaser in `assets/img/pubs/`) |
| add a news item             | `_data/news.yml`                                       |
| add your CV                 | put the PDF at `assets/cv.pdf`, edit `cv.md`           |
| change the look             | `assets/css/style.css`                                 |
| swap the home animation     | `hero_video` in `_config.yml`                          |

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
