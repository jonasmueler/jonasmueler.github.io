---
layout: default
title: About
hero: true
---
<div class="home-about">
<section class="home-col" markdown="1">

## About

I am associated with the **Institute for Artificial Intelligence in Medicine** at LMU Munich
and a PhD researcher at the [Department of Artificial Intelligence in Biomedical Engineering (AIBE)](https://aibe.tf.fau.de/)
at Friedrich-Alexander-Universität Erlangen-Nürnberg (FAU), where I also lead the **Applied Machine Learning Group**.

</section>
<section class="home-col" markdown="1">

## Research

<!-- DRAFT: adjust the wording to your own voice. -->
I work on **probabilistic modelling** and, more broadly, on machine learning and AI for the natural sciences.
I am interested in models that describe the process behind the data and are honest about how certain they are.
The problems I work on include:

<ul class="interests">
  <li>Perception from radar, cameras and other sensors</li>
  <li>Inverse problems</li>
  <li>Neuroscience modelling</li>
  <li>Biomechanics</li>
</ul>

</section>
</div>

<section class="home-section home-news">
  <h2>News</h2>
  <ul class="news">
  {% for n in site.data.news %}
    <li><span class="news-date">{{ n.date }}</span><span>{{ n.text | markdownify | remove: '<p>' | remove: '</p>' }}</span></li>
  {% endfor %}
  </ul>
</section>

<section class="home-section home-pubs">
  <h2>Publications</h2>
  {% include pub-list.html pubs=site.data.publications show_year=true %}
</section>
