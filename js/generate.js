var sections = document.querySelectorAll("section.featureset");
var templates = {
    deployed: document.getElementById("template-deployed").textContent,
    explore:  document.getElementById("template-explore").textContent
};

var maturityLevels = {"ed":"low","LastCall":"medium","WD":"low","CR":"high","PR":"high","REC":"high"};

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

function importSVG(svgurl, el, postHook) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET",svgurl);
    xhr.responseType = "document";
    xhr.onload = function (e) {
	if (e.target.status == "200" || e.target.status == "304") {
	    var svg = e.target.response.documentElement;
	    svg.querySelector("style").remove();
	    el.appendChild(svg);
	    if (postHook) {
		postHook(el);
	    }
	}
    };
    xhr.send();
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
	maturityIcon = {src:"http://www.w3.org/2013/09/wpd-rectrack-icons/" + spec.maturity.toLowerCase().replace(/lastcall/,'lcwd') + '.svg', alt:spec.maturity, width:50, height:50};
	if (spec.maturity == "REC" || spec.maturity == "LastCall") {
	    maturityIcon.height = 53;
	}
    }
    return {maturity: maturity, maturityIcon: maturityIcon};
}

var specData;
var specXhr = new XMLHttpRequest();
specXhr.open("GET", "specs/tr.json");
specXhr.onload = function() {
    specData = JSON.parse(this.responseText);
    fillTables();
};
specXhr.send();

function fillTables() {
    var counterReq = 0 ,counterRes = 0;
    for (var i = 0; i < sections.length; i++) {
	var section = sections[i];
	var dataTable = document.createElement("div");
        var tableType = section.className.split(" ")[1]
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
		var stabilityTd = document.createElement("td");
		var implTd = document.createElement("td");
		var xhr = new XMLHttpRequest();
                xhr.tableType = tableType;
		xhr.open("GET", "data/" + spec + ".json");
                counterReq++;
		xhr.onload = function(x, s, el1, el2, el3, el4, el6) {
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
			    fillCell(el1, {label: data.title, url: x.dataType=="deployed" ? undefined : data.editors.url});
			    specData[s] = {  wgs:data.wgs};
			}
			for (var w = 0 ; w < specData[s].wgs.length; w++) {
			    wg = specData[s].wgs[w];
                            if (x.tableType === "deployed") {
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
			fillCell(el4, data.stability);
			fillCell(el6, data.impl);
			el6.appendChild(document.createElement("br"));
			importSVG("images/" + s + ".svg", el6);
		    };
		}(xhr, spec, specTd, wgTd, maturityTd, stabilityTd, implTd);
		xhr.send();
		tr.appendChild(specTd);
		tr.appendChild(wgTd);
                if (tableType === "deployed") {
		    tr.appendChild(maturityTd);
		    tr.appendChild(stabilityTd);
                }
		tr.appendChild(implTd);
	    }
	}
	section.appendChild(dataTable);
    }
}

// When two rows in a row (!) have the same content in the WG column,
// merge the two cells
function mergeWGCells() {
    var rows = document.querySelectorAll("tbody tr");
    var wgCells = [];
    for (var i = 0 ; i < rows.length; i++) {
	if (rows[i].getElementsByTagName("td")) {
	    wgCells.push(rows[i].getElementsByTagName("td")[1]);
	}
    }
    for (var i = wgCells.length - 1 ; i >= 0; i--) {
	var wgCell = wgCells[i];
	var prevTr = wgCell.parentNode.previousElementSibling;
	if (prevTr && prevTr.getElementsByTagName("td")[1] && prevTr.getElementsByTagName("td")[1].textContent == wgCell.textContent) {
	    var rowspan;
	    if (wgCell.getAttribute("rowspan")) {
		rowspan = parseInt(wgCell.getAttribute("rowspan"), 10);
	    } else {
		rowspan = 1;
	    }
	    prevCell = prevTr.getElementsByTagName("td")[1];
	    prevCell.setAttribute("rowspan", rowspan + 1);
	    wgCell.remove();
	}
    }
}

// clean up
var scripts = document.querySelectorAll("script");
for (var i = 0; i < scripts.length; i++) {
    scripts[i].remove();
}
