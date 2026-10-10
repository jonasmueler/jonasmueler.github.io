---
title: Publications
---
{% assign pubs = site.data.publications %}
{% if site.author.scholar != "" %}<p class="muted">Full list on <a href="{{ site.author.scholar }}">Google Scholar</a>.</p>{% endif %}

<ol class="pubs">
{% for p in pubs %}
  <li class="pub{% if p.image and p.image != "" %} has-image{% endif %}">
    {% if p.image and p.image != "" %}<a class="pub-image" href="{{ p.image | relative_url }}"><img src="{{ p.image | relative_url }}" alt="" loading="lazy"></a>{% endif %}
    <div class="pub-body">
    <div class="pub-title">{{ p.title }}</div>
    {% if p.authors != "" %}<div class="pub-authors">{{ p.authors | markdownify | remove: '<p>' | remove: '</p>' }}</div>{% endif %}
    {% if p.venue != "" or p.year != "" %}<div class="pub-venue">{{ p.venue }}{% if p.venue != "" and p.year != "" %}, {% endif %}{{ p.year }}</div>{% endif %}
    {% if p.links %}
    <div class="pub-links">
      {% for l in p.links %}{% if l[1] != "" %}<a href="{{ l[1] }}">{{ l[0] }}</a>{% endif %}{% endfor %}
    </div>
    {% endif %}
    </div>
  </li>
{% endfor %}
</ol>
