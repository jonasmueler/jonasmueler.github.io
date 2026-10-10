---
layout: home
title: About
---
<div class="home-grid">
<div class="home-main" markdown="1">

## About

<!-- DRAFT bio, inferred from your project folders. Rewrite it in your own words. -->
I work on machine learning for sensing the human body. Most of my research is about estimating
human pose and motion from **raw radar data**, with a focus on **uncertainty**: a model should know
when its prediction is unreliable. Along the way I work with biomechanical models, generative models
such as diffusion models and normalizing flows, and calibration of probabilistic predictions.

<ul class="interests">
  <li>Radar-based perception</li>
  <li>Human pose estimation</li>
  <li>Biomechanics</li>
  <li>Uncertainty quantification</li>
  <li>Generative models</li>
</ul>

</div>
<aside class="home-side">
{% if site.data.news.size > 0 %}
<h2>News</h2>
<ul class="news">
{% for item in site.data.news limit: 6 %}
  <li><span class="news-date">{{ item.date | date: "%b %Y" }}</span> <span>{{ item.text | markdownify | remove: '<p>' | remove: '</p>' }}</span></li>
{% endfor %}
</ul>
{% endif %}

{% if site.posts.size > 0 %}
<h2>Recent writing</h2>
<ul class="post-list">
{% for post in site.posts limit: 4 %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a><span class="post-list-date">{{ post.date | date: "%-d %b %Y" }}</span></li>
{% endfor %}
</ul>
<p class="more"><a href="{{ '/blog/' | relative_url }}">All posts →</a></p>
{% endif %}
</aside>
</div>
