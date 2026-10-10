---
title: Blog
permalink: /blog/
---
{% if site.posts.size == 0 %}<p class="muted">No posts yet.</p>{% endif %}
{% assign by_year = site.posts | group_by_exp: "p", "p.date | date: '%Y'" %}
{% for year in by_year %}
<h2 class="year">{{ year.name }}</h2>
<ul class="post-list">
  {% for post in year.items %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="post-list-date">{{ post.date | date: "%-d %b" }}</span>
    {% if post.description %}<p class="post-list-desc">{{ post.description }}</p>{% endif %}
  </li>
  {% endfor %}
</ul>
{% endfor %}
<p class="muted"><a href="{{ '/feed.xml' | relative_url }}">Subscribe via RSS</a></p>
