import sys
import json
from urllib import urlopen
from lxml import etree

trs_rdf = urlopen("http://www.w3.org/2002/01/tr-automation/tr.rdf")
trs = etree.parse(trs_rdf)
wgs_rdf = urlopen("http://www.w3.org/2000/04/mem-news/public-groups.rdf")
wgs = etree.parse(wgs_rdf)
closed_wgs_rdf = urlopen("http://www.w3.org/2000/04/mem-news/closed-groups.rdf")
closed_wgs = etree.parse(closed_wgs_rdf)

ns = {"c":"http://www.w3.org/2000/10/swap/pim/contact#", "o":"http://www.w3.org/2001/04/roadmap/org#", "d":"http://www.w3.org/2000/10/swap/pim/doc#", "rdf":"http://www.w3.org/1999/02/22-rdf-syntax-ns#", "rec":"http://www.w3.org/2001/02pd/rec54#", "dc":"http://purl.org/dc/elements/1.1/"}

data = {}
errors = []
maturities = ["LastCall", "WD", "CR", "PR", "REC", "Retired", "NOTE"]

for filename in sys.argv[1:]:
    id = filename.split("/")[-1].split(".")[0]
    f = open(filename)
    try:
        feature_data = json.loads(f.read())
    except:
        err = "Could not load %s as JSON\n" % filename
        sys.stderr.write(err)
        errors.append(err)
        feature_data = {}
    url_comp = feature_data.get("TR", "").split("/")
    if len(url_comp) == 1:
        continue
    url_comp[0]="http:"
    tr_latest = "/".join(url_comp[:5])
    url_comp[0]="https:"
    tr_latest_https = "/".join(url_comp[:5])
    tr = trs.xpath("/rdf:RDF/*[d:versionOf/@rdf:resource='%s' or d:versionOf/@rdf:resource='%s/' or d:versionOf/@rdf:resource='%s' or d:versionOf/@rdf:resource='%s/']" % (tr_latest, tr_latest, tr_latest_https, tr_latest_https),namespaces=ns)
    if len(tr) == 0:
        err = "%s: %s not found in tr.rdf\n" % (id, tr_latest)
        sys.stderr.write(err)
        errors.append(err)
        continue
    tr = tr[0]
    title = tr.xpath("dc:title/text()", namespaces=ns)[0]
    maturity_url = tr.xpath("rdf:type/@rdf:resource",namespaces=ns)
    maturity_type = tr.tag.split("}")[1:][0]
    maturity = ""
    maturity_types = []
    if len(maturity_url) > 0:
        def getType(x): return x.split('#')[1]
        maturity_types = map(getType , maturity_url)
    maturity_types.append(maturity_type)
    pickMaturity = (lambda x, y: x if not y in maturities or (x in maturities and maturities.index(x) < maturities.index(y)) else y)
    maturity = reduce(pickMaturity, maturity_types)
    wg_urls = tr.xpath("o:deliveredBy/c:homePage/@rdf:resource", namespaces=ns)
    data[id]={"wgs":[], "maturity":maturity, "title":title}
    for url in wg_urls:
        wg = {"url":url}
        labels = wgs.xpath("/rdf:RDF/*[c:homePage/@rdf:resource='%s']/o:name/text()" % url, namespaces=ns)
        if len(labels) > 0:
            wg["label"] = labels[0]
        else:
            labels = closed_wgs.xpath("/rdf:RDF/*[c:homePage/@rdf:resource='%s']/o:name/text()" % url, namespaces=ns)
            if len(labels) > 0:
                wg["label"] = labels[0]
            else:
                err = "No group with home page %s found in public-groups.rdf nor closed-groups.rdf\n" % (url)
                sys.stderr.write(err)
                errors.append(err)
        data[id]["wgs"].append(wg)

print json.dumps(data, sort_keys=True, indent=2)

# if len(errors):
#     sys.exit(2)
