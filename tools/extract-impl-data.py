import sys
import json
from urllib import urlopen

sources = {"caniuse": "http://caniuse.com/data.json", "chromestatus": "https://www.chromestatus.com/features.json", "edgestatus": "https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json", "webkitstatus": "https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json"}

def normalize_ua(source, ua):
    return ua


def feature_status(origdata, source, key, silentfail = False):
    shipped = origdata["shipped"]
    exp = origdata["experimental"]
    indev = origdata["indevelopment"]
    consider = origdata["consideration"]
    chromeid = origdata.get("chromeid", None)
    if source=="caniuse":
        for ua, uadata in sources[source]["data"][key]["stats"].iteritems():
            latest_version = sources[source]["agents"][ua]["versions"][-4]
            experimental_versions = sources[source]["agents"][ua]["versions"][-3:]

            ua = normalize_ua(source, ua)
            if uadata[latest_version].startswith("y"):
                shipped.add(ua)
            elif uadata[latest_version].startswith("n d"):
                exp.add(ua)
            else:
                for version in experimental_versions:
                    if version:
                        if uadata[version].startswith("y") or uadata[version].startswith("n d"):
                            exp.add(ua)
    elif source=="chromestatus":
        feature_data = filter(lambda a: a["id"]==key, sources[source])[0]
        chromeid = feature_data["id"]
        chromestatus = feature_data["impl_status_chrome"]
        if chromestatus == "Enabled by default":
            shipped.add("chrome")
        elif chromestatus == "Behind a flag":
            exp.add("chrome")
        elif chromestatus == "In development":
            indev.add("chrome")
        elif chromestatus == "Proposed":
            consider.add("chrome")
        firefoxstatus = feature_data["ff_views"]["text"]
        if firefoxstatus == "Shipped":
            shipped.add("firefox")
        elif firefoxstatus == "In development":
            indev.add("firefox")
        elif firefoxstatus == "Public support":
            consider.add("firefox")
    elif source=="edgestatus":
        key_filter = "id"
        if type(key) is unicode:
            key_filter = "name"
        try:
            feature_data = filter(lambda a: a.get(key_filter, None)==key, sources[source])[0]
            edgestatus = feature_data["ieStatus"]["text"]
        except IndexError:
            if not silentfail:
                sys.stderr.write("Unknown %s for edgestatus %s" % (key_filter, key))
            edgestatus = ""
        if edgestatus in ["Shipped", "Prefixed"]:
            shipped.add("edge")
        elif edgestatus.lower() == "preview release":
            exp.add("edge")
        elif edgestatus == "In Development":
            indev.add("edge")
        elif edgestatus == "Under Consideration":
            consider.add("edge")
    elif source=="webkitstatus":
        keytype = key.split("-")[0]
        if keytype == "feature":
            keytype = "features"
        keyname = key.split("-")[1]
        feature_data = filter(lambda a: a["name"].lower() == keyname, sources[source][keytype])[0]
        webkitstatus = feature_data["status"].get("status", "")
        if webkitstatus == "Done" or webkitstatus == "Partial Support":
            shipped.add("webkit")
        elif webkitstatus == "In Development":
            indev.add("webkit")
        elif webkitstatus == "Under Consideration":
            consider.add("webkit")
    return {"shipped":shipped, "experimental":exp, "indevelopment": indev, "consideration": consider, "chromeid": chromeid}


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
        data[id]={"shipped":set(), "experimental": set(), "indevelopment": set(), "consideration": set()}
        if feature_data.has_key("impl"):
            for key, url in sources.iteritems():
                if feature_data["impl"].get(key, None):
                    data[id] = feature_status(data[id], key, feature_data["impl"][key])
                if data[id].has_key("chromeid") and key == "edgestatus":
                    data[id] = feature_status(data[id], key, data[id]["chromeid"], silentfail = True)

        # in case of overlapping / conflicting data, we keep the most optimistic

        statuses = ["consideration", "indevelopment", "experimental", "shipped"]
        for status in ["consideration", "indevelopment", "experimental"]:
            higherstatuses = statuses[statuses.index(status)+1:]
            for ua in data[id][status].copy():
                for st in higherstatuses:
                    if ua in data[id][st]:
                        data[id][status].remove(ua)
                        break
        # turning the sets into lists for JSON serialization
        for status in statuses:
            data[id][status] = list(data[id][status])

    print json.dumps(data, sort_keys=True, indent=2)

if __name__ == '__main__':
    processData()
