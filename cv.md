---
title: CV
permalink: /cv/
---
{% assign sections = "education:Education|experience:Experience|awards:Awards & Funding" | split: "|" %}
{% for s in sections %}
{% assign key = s | split: ":" | first %}{% assign label = s | split: ":" | last %}
<h2>{{ label }}</h2>
<ul class="cv-list">
{% for e in site.data.cv[key] %}
  <li>
    <span class="cv-when">{{ e.when }}</span>
    <div class="cv-body">
      <span class="cv-what">{{ e.what }}</span>{% if e.where %}<span class="cv-where">{{ e.where }}</span>{% endif %}
      {% if e.detail %}<div class="cv-detail">{{ e.detail | markdownify | remove: '<p>' | remove: '</p>' }}</div>{% endif %}
    </div>
  </li>
{% endfor %}
</ul>
{% endfor %}
