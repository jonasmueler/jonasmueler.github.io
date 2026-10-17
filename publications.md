---
title: Publications
class: page-wide
---
{% if site.author.scholar and site.author.scholar != "" %}<p class="muted">Also on <a href="{{ site.author.scholar }}">Google Scholar</a>.</p>{% endif %}

{% assign by_year = site.data.publications | group_by: "year" %}
{% for group in by_year %}
<h2 class="year">{{ group.name }}</h2>
{% include pub-list.html pubs=group.items %}
{% endfor %}
