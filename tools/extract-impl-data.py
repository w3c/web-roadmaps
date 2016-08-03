import sys
import json
from urllib import urlopen

sources = {"caniuse": "http://caniuse.com/data.json", "chromestatus": "https://www.chromestatus.com/features.json", "edgestatus": "https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json", "webkitstatus": "https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json"}

def normalize_ua(source, ua):
    return ua


def feature_status(origdata, source, key):
    shipped = origdata["shipped"]
    exp = origdata["experimental"]
    indev = origdata["indevelopment"]
    consider = origdata["consideration"]
    if source=="caniuse":
        for ua, uadata in sources[source]["data"][key]["stats"].iteritems():
            latest_version = sources[source]["agents"][ua]["versions"][-4]
            experimental_versions = sources[source]["agents"][ua]["versions"][-3:]

            ua = normalize_ua(source, ua)
            if uadata[latest_version].startswith("y"):
                shipped.append(ua)
            elif uadata[latest_version].startswith("n d"):
                exp.append(ua)
            else:
                for version in experimental_versions:
                    if version:
                        if uadata[version].startswith("y") or uadata[version].startswith("n d"):
                            exp.append(ua)
    elif source=="chromestatus":
        feature_data = filter(lambda a: a["id"]==key, sources[source])[0]
        chromestatus = feature_data["impl_status_chrome"]
        if chromestatus == "Enabled by default":
            shipped.append("chrome")
        elif chromestatus == "Behind a flag":
            exp.append("chrome")
        elif chromestatus == "In development":
            indev.append("chrome")
        elif chromestatus == "Proposed":
            consider.append("chrome")
        firefoxstatus = feature_data["ff_views"]["text"]
        if firefoxstatus == "Shipped":
            shipped.append("firefox")
        elif firefoxstatus == "In development":
            indev.append("firefox")
        elif firefoxstatus == "Public support":
            consider.append("firefox")
    elif source=="edgestatus":
        key_filter = "id"
        if type(key) is unicode:
            key_filter = "name"
        try:
            feature_data = filter(lambda a: a.get(key_filter, None)==key, sources[source])[0]
            edgestatus = feature_data["ieStatus"]["text"]
        except IndexError:
            sys.stderr.write("Unknown %s for edgestatus %s" % (key_filter, key))
            edgestatus = ""
        if edgestatus in ["Shipped", "Prefixed"]:
            shipped.append("edge")
        elif edgestatus.lower() == "preview release":
            exp.append("edge")
        elif edgestatus == "In Development":
            indev.append("edge")
        elif edgestatus == "Under Consideration":
            consider.append("edge")
    elif source=="webkitstatus":
        keytype = key.split("-")[0]
        if keytype == "feature":
            keytype = "features"
        keyname = key.split("-")[1]
        feature_data = filter(lambda a: a["name"].lower() == keyname, sources[source][keytype])[0]
        webkitstatus = feature_data["status"].get("status", "")
        if webkitstatus == "Done" or webkitstatus == "Partial Support":
            shipped.append("webkit")
        elif webkitstatus == "In Development":
            indev.append("webkit")
        elif webkitstatus == "Under Consideration":
            consider.append("webkit")
    return {"shipped":shipped, "experimental":exp, "indevelopment": indev, "consideration": consider}


def processData():
    for key, url in sources.iteritems():
        unparsedjson = urlopen(url)
        sources[key] = json.loads(unparsedjson.read())

    data = {}
    for filename in sys.argv[1:]:
        id = filename.split("/")[-1].split(".")[0]
        f = open(filename)
        try:
            feature_data = json.loads(f.read())
        except:
            sys.stderr.write("Could not parse %s as JSON" % id)
            feature_data = {}
        data[id]={"shipped":[], "experimental": [], "indevelopment": [], "consideration": []}
        if feature_data.has_key("impl"):
            for key, url in sources.iteritems():
                if feature_data["impl"].get(key, None):
                    data[id] = feature_status(data[id], key, feature_data["impl"][key])


    print json.dumps(data, sort_keys=True, indent=2)

if __name__ == '__main__':
    processData()
