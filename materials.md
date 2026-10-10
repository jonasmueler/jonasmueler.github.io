---
title: Learning Materials
permalink: /materials/
---
<p class="muted">Tutorials, lecture notes and other learning material.</p>

{% assign items = site.materials | sort: "updated" | reverse %}
{% if items.size == 0 %}
<p>Materials are coming soon.</p>
{% else %}
<ul class="materials">
{% for m in items %}
  {% if m.external %}{% assign href = m.external %}{% else %}{% assign href = m.url | relative_url %}{% endif %}
  <li>
    <div class="material-head">
      <a href="{{ href }}">{{ m.title }}</a>{% if m.external %} <span class="muted">↗</span>{% endif %}
      {% if m.kind %}<span class="tag">{{ m.kind }}</span>{% endif %}
    </div>
    {% if m.description %}<p class="post-list-desc">{{ m.description }}</p>{% endif %}
  </li>
{% endfor %}
</ul>
{% endif %}
