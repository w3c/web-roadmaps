const $ = (el, selector) =>
  Array.prototype.slice.call(el.querySelectorAll(selector), 0);

const sections = $(document, 'section').map(el => el.cloneNode(true));
const hero = $(document, 'header > *').map(el => el.cloneNode(true));

const scripts = ['../js/sidenav.js'];

const templates = {
  'well-deployed': '<table><thead><tr><th>Feature</th><th>Specification</th><th>Maturity</th><th>Current Implementations</th></tr></thead><tbody></tbody></table>',
  'exploratory-work':  '<table><thead><tr><th>Feature</th><th>Specification</th><th>Group</th><th>Implementation intents</th></tr></thead><tbody></tbody></table>'
};
const templateTocItem = '<a href=""><div class="description"></div></a>';

const maturityLevels = {
  'ED': 'low',
  'LastCall': 'medium',
  'WD': 'low',
  'CR': 'high',
  'PR': 'high',
  'REC': 'high',
  'NOTE': 'high',
  'LS': 'high'
};

const browsers = ['firefox', 'chrome', 'edge', 'safari', 'webkit'];


function fillCell(el, data, image) {
  if (!data) return;
  if (data.level) {
    el.setAttribute('class',data.level);
  }

  let img;
  if (image) {
    img = new Image();
    img.setAttribute('src', image.src);
    img.setAttribute('alt', image.alt);
    if (image.width) {
      img.setAttribute('width', image.width);
    }
    if (image.height) {
      img.setAttribute('height', image.height);
    }
  }

  if (data.url) {
    let a = document.createElement("a");
    a.setAttribute('href', data.url);
    if (image) {
      a.setAttribute('title', data.label);
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
  return {
    maturity: {
      label: spec.maturity,
      level: maturityLevels[spec.maturity] || 'low'
    },
    maturityIcon: (!spec.maturity || (spec.maturity === 'NOTE')) ? null : {
      src: 'https://www.w3.org/2013/09/wpd-rectrack-icons/' +
        spec.maturity.toLowerCase().replace(/lastcall/,'lcwd') +
        '.svg',
      alt: spec.maturity,
      width: 50,
      height: (spec.maturity === 'REC' || spec.maturity === 'LastCall') ? 53 : 50
    }
  };
}


let specData, implData;
let templateXhr = new XMLHttpRequest();
templateXhr.responseType = 'text';
templateXhr.open('GET', '../js/template-page');
templateXhr.onload = function() {
  document.documentElement.innerHTML = this.responseText;
  sections.forEach(section => document.querySelector('.main-content .container').appendChild(section));
  hero.forEach(el => document.querySelector('.hero .container').appendChild(el));
  scripts.forEach(script => {
    let s = document.createElement("script");
    s.src = script;
    document.querySelector('body').appendChild(s);
  });

  let tocXhr = new XMLHttpRequest();
  tocXhr.open('GET', 'toc.json');
  tocXhr.onload = function() {
    let toc = JSON.parse(this.responseText);
    document.querySelector('title').textContent = hero[0].textContent + ' - ' + toc.title;
    $(document, 'section.contribute .discourse').forEach(link => {
      link.href = toc.discourse.url;
      if (link.classList.contains('discoursecat')) {
        link.textContent = toc.discourse.category;
      }
    });

    let nav = document.querySelector('aside nav ul');
    toc.pages.forEach(page => {
      let navLi = document.createElement('li');
      navLi.innerHTML = templateTocItem;
      navLi.querySelector('a').href = page.url;
      navLi.querySelector('div.description').textContent = page.title;
      nav.appendChild(navLi);
    });
  }
  tocXhr.send();

  let specXhr = new XMLHttpRequest();
  specXhr.open('GET', '../specs/tr.json');
  specXhr.responseType = 'text';
  specXhr.onload = function() {
    specData = JSON.parse(this.responseText);

    let implXhr = new XMLHttpRequest();
    implXhr.open('GET', '../specs/impl.json');
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
  let counterReq = 0;
  let counterRes = 0;

  sections.forEach(section => {
    if (!section.classList.contains('featureset')) {
      return;
    }
    let dataTable = document.createElement('div');
    let tableType = section.className.split(' ')[1];
    tableType = (tableType === 'in-progress') ? 'well-deployed' : tableType;

    dataTable.innerHTML = templates[tableType];

    let tbody = dataTable.querySelector('tbody');
    $(section, '[data-feature]').forEach(featureEl => {
      let featureName = featureEl.dataset['feature'];
      let tr = document.createElement('tr');
      let th = document.createElement('th');
      th.appendChild(document.createTextNode(featureName));

      let specs = [];
      if (featureEl.dataset['featureid']) {
        specs = [featureEl.dataset['featureid']];
      }
      else {
        let specEls = featureEl.querySelectorAll('[data-featureid]');
        for (var k = 0; k <specEls.length; k++) {
          if (specs.indexOf(specEls[k].dataset['featureid']) < 0) {
            specs.push(specEls[k].dataset['featureid']);
          }
        }
      }
      if (specs.length > 1) {
        th.setAttribute('rowspan', specs.length);
      }
      tr.appendChild(th);

      specs.forEach((spec, k) => {
        if (k > 0) {
          tr = document.createElement('tr');
        }
        tbody.appendChild(tr);

        let specTd = document.createElement('td');  
        let wgTd = document.createElement('td');
        let maturityTd = document.createElement('td');
        let implTd = document.createElement('td');
        let xhr = new XMLHttpRequest();
        xhr.tableType = tableType;
        xhr.open('GET', '../data/' + spec + '.json');
        counterReq++;

        let getLoadHandler = function (x, s, el1, el2, el3, el6) {
          return function() {
            counterRes++;
            let obj, level, editorsactivity, maturityInfo;
            let data;
            try {
              data = JSON.parse(x.responseText);
            } catch (e) {
              console.error('Failed to parse ' + spec + '.json: ' + x.responseText + '(' + e + ')');
            }
            $(document, 'a[data-featureid="' + s + '"]').forEach(link =>
              link.setAttribute('href', data.editors || data.ls || data.TR)
            );
            if (data.TR) {
              if (!specData[s]) {
                console.error('No spec data on ' + s);
              }
              fillCell(el1, {
                label: (data.feature ? data.feature + ' in ' : '') + specData[s].title,
                url: data.TR
              });
            }
            else {
              fillCell(el1, {
                label: (data.feature ? data.feature + ' in ' : '') + data.title,
                url: (x.dataType === 'deployed') ? undefined : (data.editors || data.ls)
              });
              specData[s] = {
                wgs: data.wgs,
                maturity: (data.editors ? "ED" : (data.ls ? "LS" : "Unknown"))
              };
            }
            specData[s].wgs = specData[s].wgs || [];

            for (var w = 0 ; w < specData[s].wgs.length; w++) {
              wg = specData[s].wgs[w];
              wg.label = wg.label || '';
              if (x.tableType === 'well-deployed') {
                wg.label = wg.label.replace(/ Working Group/,'');
              }
              wg.label = wg.label
                .replace(/Cascading Style Sheets \(CSS\)/, 'CSS')
                .replace(/Technical Architecture Group/, 'TAG')
                .replace(/Web Real-Time Communications/, 'WebRTC');
              if (w > 0) {
                if (w < specData[s].wgs.length - 1) {
                  el2.appendChild(document.createTextNode(','));
                }
                else {
                  el2.appendChild(document.createTextNode(' and'));
                }
                el2.appendChild(document.createElement('br'));
              }
              fillCell(el2, wg);
            }

            maturityInfo = maturityData(specData[s]);
            fillCell(el3, maturityInfo.maturity, maturityInfo.maturityIcon);
            el3.classList.add('maturity');

            el6.appendChild(formatImplData(implData[s], x.tableType));
          };
        };

        xhr.onload = getLoadHandler(xhr, spec, specTd, wgTd, maturityTd, implTd);
        xhr.send();

        tr.appendChild(specTd);
        if (tableType === 'well-deployed') {
          tr.appendChild(maturityTd);
        }

        if (tableType !== 'well-deployed') {
          tr.appendChild(wgTd);
        }

        tr.appendChild(implTd);
      });
    });

    section.appendChild(dataTable);
  });
}


function formatImplData(data, implType) {
  let div = document.createElement('div');
  if (!data) {
    if (implType === 'well-deployed') {
      div.appendChild(document.createTextNode('N/A'));
    }
    return div;
  }
  var sections = {
    'Shipped': 'shipped',
    'Experimental': 'experimental',
    'In development': 'indevelopment',
    'Under consideration': 'consideration'
  };
  for (var section in sections) {
      var uadata = data[sections[section]];
      uadata = uadata.filter(function (ua) {
        return browsers.indexOf(ua) !== -1;
      });
      if (uadata.length) {
          var heading = document.createElement('p');
          heading.appendChild(document.createTextNode(section));
          heading.appendChild(document.createElement('br'));
          uadata.forEach(function(ua) {
              var icon = document.createElement('img');
              icon.src = '../assets/impl/' + ua + '.png';
              icon.height = 30;
              icon.alt = section + ' in ' + ua;
              heading.appendChild(icon);
          });
          div.appendChild(heading);

      }
  }

  return div;
}

