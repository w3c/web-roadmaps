var hero = [];
var heroOrig = document.querySelectorAll("header *");
for (var i = 0; i < heroOrig.length; i++) {
    hero.push(heroOrig[i].cloneNode(true));
}
var scripts = ['https://w3c.github.io/mediartc-roadmap-ui/assets/js/sidenav.js', 'https://w3c.github.io/mediartc-roadmap-ui/assets/js/app.js'];

var templateItem = "<a href=''><div class='icon'><img src='' width='45' alt=''></div><div class='description'><h2></h2><p></p></div></a>";
var templateTocItem = "<a href=''><div class='description'></div></a>";


var templateXhr = new XMLHttpRequest();
var tocXhr = new XMLHttpRequest();
templateXhr.responseType = 'text';
templateXhr.open("GET", "js/template-index");
templateXhr.onload = function() {
    document.documentElement.innerHTML = this.responseText;

    for (var i = 0 ; i < hero.length ; i++) {
        document.querySelector('.hero .container').appendChild(hero[i]);
    }
    tocXhr.open("GET", "toc.json");
    tocXhr.onload = function() {
        var toc = JSON.parse(this.responseText);
        var ul = document.querySelector("ul.roadmap-list");

        var nav = document.querySelector("aside nav ul");
        for (var i = 0 ; i < toc.length; i++) {
            var li = document.createElement("li");
            li.innerHTML = templateItem;
            li.querySelector("a").href = toc[i].url;
            li.querySelector("h2").textContent = toc[i].title;
            li.querySelector("img").src = toc[i].icon;
            li.querySelector("p").textContent = toc[i].description;
            ul.appendChild(li);

            var navLi = document.createElement("li");
            navLi.innerHTML = templateTocItem;
            navLi.querySelector("a").href = toc[i].url;
            navLi.querySelector("div.description").textContent = toc[i].title;
            nav.appendChild(navLi);
        }
    }
    tocXhr.send();
    for (var i = 0 ; i < scripts.length ; i++) {
        var s = document.createElement("script");
        s.src = scripts[i];
        document.querySelector('body').appendChild(s);
    }
}
templateXhr.send();
