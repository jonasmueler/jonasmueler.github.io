---
title: Learning Materials
permalink: /materials/
class: page-wide
---
<p class="muted">Lecture series I recommend, and my own tutorials and notes.</p>

{% for g in site.data.courses.groups %}
<h2>{{ g.name }}</h2>
<div class="courses">
{% for c in g.courses %}
  {% capture yt %}https://www.youtube.com/playlist?list={{ c.list }}{% endcapture %}
  <article class="course">
    {% if c.embed %}
    <button class="course-media" type="button" data-list="{{ c.list }}" aria-label="Play {{ c.title }}">
      <img src="{{ '/assets/img/courses/' | append: c.thumb | append: '.jpg' | relative_url }}" alt="" loading="lazy">
      <span class="course-play" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#000" fill-opacity=".72"/><path d="M27 34V14l18 10z" fill="#fff"/></svg></span>
    </button>
    {% else %}
    <a class="course-media" href="{{ yt }}" target="_blank" rel="noopener" aria-label="{{ c.title }} on YouTube">
      <img src="{{ '/assets/img/courses/' | append: c.thumb | append: '.jpg' | relative_url }}" alt="" loading="lazy">
      <span class="course-external">Watch on YouTube ↗</span>
    </a>
    {% endif %}
    <div class="course-body">
      <h3 class="course-title">{{ c.title }}</h3>
      <p class="course-meta">
        {% if c.by and c.by != "" %}{{ c.by }} · {% endif %}{{ c.org }}{% if c.lectures %} · {{ c.lectures }} videos{% endif %}
        {% if c.lang %}<span class="tag">{{ c.lang }}</span>{% endif %}
      </p>
      <a class="course-link" href="{{ yt }}" target="_blank" rel="noopener">Playlist on YouTube ↗</a>
    </div>
  </article>
{% endfor %}
</div>
{% endfor %}
<p class="muted course-privacy">Videos are loaded from YouTube only after you press play.</p>

{% if site.data.books.size > 0 %}
<h2>Books</h2>
<div class="books">
{% for b in site.data.books %}
  <article class="book">
    <h3 class="book-title">{{ b.title }}</h3>
    {% if b.subtitle %}<p class="book-subtitle">{{ b.subtitle }}</p>{% endif %}
    <p class="book-meta">{{ b.authors }} · {{ b.published }}{% if b.free %} <span class="tag">Free</span>{% endif %}</p>
    {% if b.note %}<p class="book-note">{{ b.note }}</p>{% endif %}
    {% if b.links %}<div class="pub-links">{% for l in b.links %}<a href="{{ l[1] }}" target="_blank" rel="noopener">{{ l[0] }}</a>{% endfor %}</div>{% endif %}
  </article>
{% endfor %}
</div>
{% endif %}

{% assign items = site.materials | sort: "updated" | reverse %}
{% if items.size > 0 %}
<h2>Tutorials and notes</h2>
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

<script>
  // Swap a course card for the YouTube player only when someone presses play.
  document.querySelectorAll('button.course-media[data-list]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(btn.dataset.list) + '&autoplay=1&rel=0';
      f.title = btn.getAttribute('aria-label').replace(/^Play /, '');
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.className = 'course-frame';
      btn.replaceWith(f);
    });
  });
</script>
