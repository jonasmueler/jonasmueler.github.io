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

<!-- DRAFT bio, inferred from your project folders. Rewrite it in your own words. -->
I work on machine learning for sensing the human body. Most of my research is about estimating
human pose and motion from **raw radar data**, with a focus on **uncertainty**: a model should know
when its prediction is unreliable. Along the way I work with biomechanical models, generative models
such as diffusion models and normalizing flows, and calibration of probabilistic predictions.

**Interests:** radar-based perception · human pose estimation · biomechanics · uncertainty quantification · generative models

{% if site.data.news.size > 0 %}
## News
<ul class="news">
{% for item in site.data.news limit: 6 %}
  <li><span class="news-date">{{ item.date | date: "%b %Y" }}</span> <span>{{ item.text | markdownify | remove: '<p>' | remove: '</p>' }}</span></li>
{% endfor %}
</ul>
{% endif %}

{% if site.posts.size > 0 %}
## Recent writing
<ul class="post-list">
{% for post in site.posts limit: 3 %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <span class="post-list-date">{{ post.date | date: "%-d %b %Y" }}</span></li>
{% endfor %}
</ul>
{% endif %}
