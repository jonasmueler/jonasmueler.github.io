---
title: Publications
class: page-wide
---
{% if site.author.scholar and site.author.scholar != "" %}<p class="muted">Also on <a href="{{ site.author.scholar }}">Google Scholar</a>.</p>{% endif %}

{% assign by_year = site.data.publications | group_by: "year" %}
{% for group in by_year %}
<h2 class="year">{{ group.name }}</h2>
<ol class="pubs">
{% for p in group.items %}
  <li class="pub{% if p.image and p.image != "" %} has-image{% endif %}">
    {% if p.image and p.image != "" %}<a class="pub-image" href="{{ p.image | relative_url }}"><img src="{{ p.image | relative_url }}" alt="" loading="lazy"></a>{% endif %}
    <div class="pub-body">
    <div class="pub-title">{{ p.title }}</div>
    {% if p.authors and p.authors != "" %}<div class="pub-authors">{{ p.authors | markdownify | remove: '<p>' | remove: '</p>' }}</div>{% endif %}
    {% if p.venue and p.venue != "" %}<div class="pub-venue">{{ p.venue }}</div>{% endif %}
    {% if p.links %}
    <div class="pub-links">
      {% for l in p.links %}{% if l[1] != "" %}<a href="{{ l[1] }}">{{ l[0] }}</a>{% endif %}{% endfor %}
    </div>
    {% endif %}
    </div>
  </li>
{% endfor %}
</ol>
{% endfor %}
