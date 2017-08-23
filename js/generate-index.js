const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);

const hero = $(document, 'header > *').map(el => el.cloneNode(true));

const scripts = ['../js/sidenav.js'];

const templateItem = '<a href=""><div class="icon"><img src="" width="45" alt=""></div><div class="description"><h2></h2><p></p></div></a>';
const templateTocItem = '<a href=""><div class="description"></div></a>';

let templateXhr = new XMLHttpRequest();
templateXhr.responseType = 'text';
templateXhr.open('GET', '../js/template-index');
templateXhr.onload = function() {
  document.documentElement.innerHTML = this.responseText;
  hero.forEach(el => document.querySelector('.hero .container').appendChild(el));

  let tocXhr = new XMLHttpRequest();
  tocXhr.open('GET', 'toc.json');
    tocXhr.onload = function() {
      let toc = JSON.parse(this.responseText);
      let ul = document.querySelector('ul.roadmap-list');
      document.querySelector('title').textContent = toc.title;

      $(document, 'section.contribute .discourse').forEach(link => {
        link.href = toc.discourse.url;
        if (link.classList.contains('discoursecat')) {
            link.textContent = toc.discourse.category;
        }
      });

      let nav = document.querySelector('aside nav ul');
      toc.pages.forEach(page => {
        let li = document.createElement('li');
        li.innerHTML = templateItem;
        li.querySelector('a').href = page.url;
        li.querySelector('h2').textContent = page.title;
        li.querySelector('img').src = page.icon;
        li.querySelector('p').textContent = page.description;
        ul.appendChild(li);

        let navLi = document.createElement('li');
        navLi.innerHTML = templateTocItem;
        navLi.querySelector('a').href = page.url;
        navLi.querySelector('div.description').textContent = page.title;
        nav.appendChild(navLi);
      });
    };
    tocXhr.send();

    scripts.forEach(script => {
      let s = document.createElement('script');
      s.src = script;
      document.querySelector('body').appendChild(s);
    });
}
templateXhr.send();
