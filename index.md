---
layout: default
title: About
---
<section class="hero">
  {% if site.hero_video != "" %}
  <video class="hero-media" autoplay muted loop playsinline preload="metadata"
         poster="{{ site.hero_poster | relative_url }}" aria-hidden="true">
    <source src="{{ site.hero_video | relative_url }}" type="video/mp4">
  </video>
  {% endif %}
  <div class="hero-text">
    {% if site.author.photo != "" %}
    <img class="profile-photo" src="{{ site.author.photo | relative_url }}" alt="{{ site.author.name }}">
    {% endif %}
    <h1 class="intro-name">{{ site.author.name }}</h1>
    <p class="intro-role">Machine learning researcher</p>
    {% include links.html %}
  </div>
</section>

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
