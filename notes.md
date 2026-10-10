---
title: Notes
permalink: /notes/
---
<p class="muted">Cheat sheets, reading lists and other things I keep coming back to.</p>
{% assign notes = site.notes | sort: "title" %}
<ul class="post-list">
{% for n in notes %}
  <li>
    <a href="{{ n.url | relative_url }}">{{ n.title }}</a>
    {% if n.description %}<p class="post-list-desc">{{ n.description }}</p>{% endif %}
  </li>
{% endfor %}
</ul>
