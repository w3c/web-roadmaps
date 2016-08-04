var sections = [];
var hero = [];
var sectionsOrig = document.querySelectorAll("section");
for (var i = 0; i < sectionsOrig.length; i++) {
    sections.push(sectionsOrig[i].cloneNode(true));
}
var heroOrig = document.querySelectorAll("header *");
for (var i = 0; i < heroOrig.length; i++) {
    hero.push(heroOrig[i].cloneNode(true));
}
var scripts = ['https://w3c.github.io/mediartc-roadmap-ui/assets/js/sidenav.js', 'https://w3c.github.io/mediartc-roadmap-ui/assets/js/app.js'];

var templates = {
    "well-deployed": "<table><thead><tr><th>Feature</th><th>Specification</th><th>Maturity</th><th>Current Implementations</th></tr></thead><tbody></tbody></table>",
    "exploratory-work":  "<table><thead><tr><th>Feature</th><th>Specification</th><th>Group</th><th>Implementation intents</th></tr></thead><tbody></tbody></table>"
};
var templateTocItem = "<a href=''><div class='description'></div></a>";

var maturityLevels = {"ed":"low","LastCall":"medium","WD":"low","CR":"high","PR":"high","REC":"high"};

var browsers = ["firefox", "chrome", "edge", "safari", "webkit"];

function fillCell(el, data, image) {
    if (!data) return;
    if (data.level) {
	el.setAttribute("class",data.level);
    }
    if (image) {
	var img = new Image();
	img.setAttribute("src", image.src);
	img.setAttribute("alt", image.alt);
	if (image.width) {
	    img.setAttribute("width", image.width);
	}
	if (image.height) {
	    img.setAttribute("height", image.height);
	}
    }
    if (data.url) {
	var a = document.createElement("a");
	a.setAttribute("href", data.url);
	if (image) {
	    a.setAttribute("title", data.label);
	    a.appendChild(img);
	} else {
	    a.appendChild(document.createTextNode(data.label));
	}
	el.appendChild(a);
    } else {
	if (image) {
	    el.appendChild(img);
	} else {
	    el.appendChild(document.createTextNode(data.label));
	}
    }
}

function maturityData(spec) {
    var maturity ;
    var maturityIcon ;
    if (!maturityLevels[spec.maturity]) {
	if (spec.maturity == "NOTE") {
	    level = "high";
	} else {
	    level = "low";
	}
	maturity = {label: spec.maturity, level:level};
    } else {
	maturity = {label:spec.maturity, level: maturityLevels[spec.maturity]};
	maturityIcon = {src:"https://www.w3.org/2013/09/wpd-rectrack-icons/" + spec.maturity.toLowerCase().replace(/lastcall/,'lcwd') + '.svg', alt:spec.maturity, width:50, height:50};
	if (spec.maturity == "REC" || spec.maturity == "LastCall") {
	    maturityIcon.height = 53;
	}
    }
    return {maturity: maturity, maturityIcon: maturityIcon};
}

var specData, implData;
var templateXhr = new XMLHttpRequest();
var specXhr = new XMLHttpRequest();
var implXhr = new XMLHttpRequest();
var tocXhr = new XMLHttpRequest();
templateXhr.responseType = 'text';
templateXhr.open("GET", "js/template-page");
templateXhr.onload = function() {
    document.documentElement.innerHTML = this.responseText;
    for (var i = 0 ; i < sections.length ; i++) {
        document.querySelector('.main-content .container').appendChild(sections[i]);
    }
    for (var i = 0 ; i < hero.length ; i++) {
        document.querySelector('.hero .container').appendChild(hero[i]);
    }

    for (var i = 0 ; i < scripts.length ; i++) {
        var s = document.createElement("script");
        s.src = scripts[i];
        document.querySelector('body').appendChild(s);
    }

    tocXhr.open("GET", "toc.json");
    tocXhr.onload = function() {
        var toc = JSON.parse(this.responseText);
        var nav = document.querySelector("aside nav ul");
        for (var i = 0 ; i < toc.length; i++) {
            var navLi = document.createElement("li");
            navLi.innerHTML = templateTocItem;
            navLi.querySelector("a").href = toc[i].url;
            navLi.querySelector("div.description").textContent = toc[i].title;
            nav.appendChild(navLi);
        }
    }
    tocXhr.send();

    specXhr.open("GET", "specs/tr.json");
    specXhr.onload = function() {
        specData = JSON.parse(this.responseText);
        implXhr.open("GET", "specs/impl.json");
        implXhr.onload = function() {
            implData = JSON.parse(this.responseText);
            fillTables();
        }
        implXhr.send();
    };
    specXhr.send();
}
templateXhr.send();

function fillTables() {
    var counterReq = 0 ,counterRes = 0;
    for (var i = 0; i < sections.length; i++) {
	var section = sections[i];
	var dataTable = document.createElement("div");
        var tableType = section.className.split(" ")[1];
        tableType = tableType == "in-progress" ? "well-deployed" : tableType;
	dataTable.innerHTML = templates[tableType];
	var tbody = dataTable.querySelector("tbody");
	var features = section.querySelectorAll("[data-feature]");
	for (var j = 0; j < features.length; j++) {
	    var featureEl = features[j];
	    var featureName = featureEl.dataset["feature"];
	    var tr = document.createElement("tr");
	    var th = document.createElement("th");
	    th.appendChild(document.createTextNode(featureName));
	    var specs = [];
	    if (featureEl.dataset["featureid"]) {
		specs = [featureEl.dataset["featureid"]];
	    } else {
		var specEls = featureEl.querySelectorAll("[data-featureid]");
		for (var k = 0; k <specEls.length; k++) {
		    if (specs.indexOf(specEls[k].dataset["featureid"]) < 0) {
			specs.push(specEls[k].dataset["featureid"]);
		    }
		}
	    }
	    if (specs.length > 1) {
		th.setAttribute("rowspan", specs.length);
	    }
	    tr.appendChild(th);
	    for (var k = 0; k < specs.length; k++) {
		var spec = specs[k];
		if (k > 0) {
		    tr = document.createElement("tr");
		}
		tbody.appendChild(tr);

		var specTd = document.createElement("td");
		var wgTd = document.createElement("td");
		var maturityTd = document.createElement("td");
		var implTd = document.createElement("td");
		var xhr = new XMLHttpRequest();
                xhr.tableType = tableType;
		xhr.open("GET", "data/" + spec + ".json");
                counterReq++;
		xhr.onload = function(x, s, el1, el2, el3, el6) {
		    return function() {
                        counterRes++;
			var obj, level, editorsactivity, maturityInfo;
                        try {
			    var data = JSON.parse(x.responseText);
                        } catch (e) {
                            console.error("Failed to parse " + spec + ".json: " + x.responseText + "(" + e + ")");
                        }
			var links = document.querySelectorAll("a[data-featureid='" + s + "']");
			for (var l = 0 ; l < links.length; l++) {
			    var url = data.editors ? data.editors.url : undefined;
			    if (!url) {
				url = data.TR;
			    }
			    links[l].setAttribute("href",url);
			}
			if (data.TR) {
			    fillCell(el1, {label: (data.feature ? data.feature + " in " : "") + specData[s].title, url: data.TR});
			} else {
			    fillCell(el1, {label: (data.feature ? data.feature + " in " : "") + data.title, url: x.dataType=="deployed" ? undefined : data.editors.url});
			    specData[s] = {  wgs:data.wgs};
			}
			for (var w = 0 ; w < specData[s].wgs.length; w++) {
			    wg = specData[s].wgs[w];
                            if (x.tableType === "well-deployed") {
			        wg.label = wg.label.replace(/ Working Group/,'');
                            }
                            wg.label = wg.label.replace(/Cascading Style Sheets \(CSS\)/,'CSS').replace(/Technical Architecture Group/,'TAG').replace(/Web Real-Time Communications/, 'WebRTC');
			    if (w > 0) {
				if (w < specData[s].wgs.length - 1) {
				    el2.appendChild(document.createTextNode(","));
				} else {
				    el2.appendChild(document.createTextNode(" and"));
				}
				el2.appendChild(document.createElement("br"));
			    }
			    fillCell(el2, wg);
			}
                        maturityInfo = maturityData(specData[s]);
			fillCell(el3, maturityInfo.maturity, maturityInfo.maturityIcon);
                        el3.classList.add("maturity");

			el6.appendChild(formatImplData(implData[s]));
		    };
		}(xhr, spec, specTd, wgTd, maturityTd, implTd);
		xhr.send();
		tr.appendChild(specTd);
                if (tableType === "well-deployed") {
		    tr.appendChild(maturityTd);
                }
                if (tableType !== "well-deployed") {
		    tr.appendChild(wgTd);
                }
		tr.appendChild(implTd);
	    }
	}
	section.appendChild(dataTable);
    }
}

function formatImplData(data) {
    // unique
    var div = document.createElement("div");
    var sections = {"Shipping": "shipped", "Experimental": "experimental", "In development": "indevelopment", "Under consideration": "consideration"};
    for (var section in sections) {
        var uadata = data[sections[section]].filter(function(x, i, a) { return a.indexOf(x) === i});
        if (uadata.length) {
            var heading = document.createElement("p");
            heading.appendChild(document.createTextNode(section));
            div.appendChild(heading);

            uadata.forEach(function(ua) {
                if (browsers.indexOf(ua) !== -1) {
                    var icon = document.createElement("img");
                    icon.src = "icons/" + ua + ".png";
                    icon.height = 30;
                    icon.alt = section + " in " + ua;
                    div.appendChild(icon);
                }
            });
        }
    }

    return div;
}

