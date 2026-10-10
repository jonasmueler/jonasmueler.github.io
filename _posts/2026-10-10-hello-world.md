---
title: "Hello, world"
description: "Why this site exists, and a quick test of math and code."
tags: [meta]
math: true
---

This is the first post. Delete it or rewrite it once you have something real to say.

Posts are Markdown files in the `_posts` folder, named `YYYY-MM-DD-some-title.md`.
Add `math: true` to the front matter to render LaTeX. Inline math looks like $$p(\theta \mid x)$$,
and a display equation goes on its own line:

$$
\mathcal{L}(\theta) = \mathbb{E}_{q(z \mid x)}\big[\log p_\theta(x \mid z)\big] - \mathrm{KL}\big(q(z \mid x)\,\|\,p(z)\big)
$$

Code blocks get syntax highlighting:

```python
import torch

def gaussian_nll(mu, log_var, y):
    return 0.5 * (log_var + (y - mu) ** 2 / log_var.exp()).mean()
```

Figures and videos go in with one line. Images open full size on click:

{% include figure.html src="/assets/img/pubs/radproposer.png" alt="RadProPoser architecture overview" caption="RadProPoser overview. Put images in `assets/img/` and reference them like this." wide=true %}

{% include figure.html src="/assets/video/loss-surface.mp4" caption="Videos loop silently, which works well for training dynamics or motion results." width="70%" %}
