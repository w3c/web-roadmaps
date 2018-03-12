import sys
import json
from urllib import urlopen
errors = []

# Implementation data sources
# Some of these sources are maintained by browser vendors, and thus contain
# "more accurate" data for some user agents. These UA appear in the "coreua"
# property.
sources = {
    "caniuse": {
        "url": "https://caniuse.com/data.json"
    },
    "chromestatus": {
        "url": "https://www.chromestatus.com/features.json",
        "coreua": ["chrome"]
    },
    "edgestatus": {
        "url": "https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json",
        "coreua": ["edge"]
    },
    "webkitstatus": {
        "url": "https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json",
        "coreua": ["webkit", "safari"]
    },
    "other": {}
}


def normalize_ua(sourceName, ua):
    return ua


def get_implementation_status_from_source(origdata, sourceName, key, silentfail=False):
    source = sources[sourceName]["data"]
    impl = origdata["implementations"]
    chromeid = origdata.get("chromeid", None)
    if sourceName=="caniuse":
        for ua, uadata in source["data"][key]["stats"].iteritems():
            latest_version = source["agents"][ua]["versions"][-4]
            experimental_versions = source["agents"][ua]["versions"][-3:]

            ua = normalize_ua(sourceName, ua)
            if uadata[latest_version].startswith("y") or uadata[latest_version].startswith("a"):
                impl.append({ "ua": ua, "status": "shipped", "source": sourceName })
            elif uadata[latest_version].startswith("n d"):
                impl.append({ "ua": ua, "status": "experimental", "source": sourceName })
            else:
                for version in experimental_versions:
                    if version:
                        if uadata[version].startswith("y") or uadata[version].startswith("n d"):
                            impl.append({ "ua": ua, "status": "experimental", "source": sourceName })
    elif sourceName=="chromestatus":
        matching_data = filter(lambda a: a["id"]==key, source)
        chromestatus = None
        firefoxstatus = None
        if not(len(matching_data)):
            err = "Unknown Chrome feature %s" % key
            sys.stderr.write(err)
            if not silentfail:
                errors.append(err)
        else:
            chromeid = key
            feature_data = matching_data[0]["browsers"]
            chromestatus = feature_data["chrome"]["status"]["text"]
            firefoxstatus = feature_data["ff"]["view"]["text"]
            edgestatus = feature_data["edge"]["view"]["text"]
            safaristatus = feature_data["safari"]["view"]["text"]
        if chromestatus == "Enabled by default":
            impl.append({ "ua": "chrome", "status": "shipped", "source": sourceName })
        elif chromestatus == "Behind a flag":
            impl.append({ "ua": "chrome", "status": "experimental", "source": sourceName })
        elif chromestatus == "Origin trial":
            impl.append({ "ua": "chrome", "status": "experimental", "source": sourceName })
        elif chromestatus == "In development":
            impl.append({ "ua": "chrome", "status": "indevelopment", "source": sourceName })
        elif chromestatus == "Proposed":
            impl.append({ "ua": "chrome", "status": "consideration", "source": sourceName })
        if firefoxstatus == "Shipped":
            impl.append({ "ua": "firefox", "status": "shipped", "source": sourceName })
        elif firefoxstatus == "In development":
            impl.append({ "ua": "firefox", "status": "indevelopment", "source": sourceName })
        elif firefoxstatus == "Public support":
            impl.append({ "ua": "firefox", "status": "consideration", "source": sourceName })
        if edgestatus == "Shipped":
            impl.append({ "ua": "edge", "status": "shipped", "source": sourceName })
        elif edgestatus == "In development":
            impl.append({ "ua": "edge", "status": "indevelopment", "source": sourceName })
        elif edgestatus == "Public support":
            impl.append({ "ua": "edge", "status": "consideration", "source": sourceName })
        if safaristatus == "Shipped":
            impl.append({ "ua": "safari", "status": "shipped", "source": sourceName })
        elif safaristatus == "In development":
            impl.append({ "ua": "safari", "status": "indevelopment", "source": sourceName })
        elif safaristatus == "Public support":
            impl.append({ "ua": "safari", "status": "consideration", "source": sourceName })
    elif sourceName=="edgestatus":
        key_filter = "id"
        if type(key) is unicode:
            key_filter = "name"
        try:
            feature_data = filter(lambda a: a.get(key_filter, None)==key, source)[0]
            edgestatus = feature_data["ieStatus"]["text"]
        except IndexError:
            if not silentfail:
                err = "Unknown %s for edgestatus %s\n" % (key_filter, key)
                sys.stderr.write(err)
                errors.append(err)
            edgestatus = ""
        if edgestatus in ["Shipped", "Prefixed"]:
            impl.append({ "ua": "edge", "status": "shipped", "source": sourceName })
        elif edgestatus.lower() == "preview release":
            impl.append({ "ua": "edge", "status": "experimental", "source": sourceName })
        elif edgestatus == "In Development":
            impl.append({ "ua": "edge", "status": "indevelopment", "source": sourceName })
        elif edgestatus == "Under Consideration":
            impl.append({ "ua": "edge", "status": "consideration", "source": sourceName })
    elif sourceName=="webkitstatus":
        keytype = key.split("-")[0]
        if keytype == "feature":
            keytype = "features"
        keyname = " ".join(key.split("-")[1:])
        feature_data = filter(lambda a: a["name"].lower() == keyname, source[keytype])[0]
        webkitstatus = feature_data.get("status",{}).get("status", "")
        if webkitstatus == "Done" or webkitstatus == "Partial Support":
            impl.append({ "ua": "webkit", "status": "shipped", "source": sourceName })
        elif webkitstatus == "In Development":
            impl.append({ "ua": "webkit", "status": "indevelopment", "source": sourceName })
        elif webkitstatus == "Under Consideration":
            impl.append({ "ua": "webkit", "status": "consideration", "source": sourceName })
    elif sourceName=="other":
        if isinstance(key, list):
            for data in key:
                impl.append({ "ua": data["ua"], "status": data["status"], "source": data["source"] if "source" in data else "other"})
        else:
            for ua, status in key.iteritems():
                impl.append({ "ua": ua, "status": status, "source": "other" })
    return {
        "implementations": impl,
        "chromeid": chromeid
    }


def processData():
    # Load implementation data per source
    for key, source in sources.iteritems():
        if "url" in source:
            unparsedjson = urlopen(source["url"])
            sources[key]["data"] = json.loads(unparsedjson.read())
        else:
            sources[key]["data"] = {}
        if "coreua" not in sources[key]:
            sources[key]["coreua"] = []

    # Loop through files given as command line parameters and compute the
    # implementation status for each of them
    data = {}
    for filename in sys.argv[1:]:
        id = filename.split("/")[-1].split(".")[0]
        f = open(filename)
        try:
            feature_data = json.loads(f.read())
        except:
            err = "Could not parse %s as JSON" % id
            sys.stderr.write(err)
            errors.append(err)
            feature_data = {}

        # Compute implementation status only when we know where to look in the
        # implementation data
        if "impl" in feature_data:
            data[id] = { "implementations": [] }
            for sourceName, foo in sources.iteritems():
                # If we have the id returned by the Chrome status platform, we
                # can try to look at the Edge status platform, since it uses
                # that ID as well
                if ("chromeid" in data[id]) and (sourceName == "edgestatus"):
                    data[id] = get_implementation_status_from_source(
                        data[id], sourceName, data[id]["chromeid"], silentfail = True)

                # Otherwise, assemble the implementation info that we expect
                # (note this may set "chromeid" on data[id])
                if feature_data["impl"].get(sourceName, None):
                    data[id] = get_implementation_status_from_source(
                        data[id], sourceName, feature_data["impl"][sourceName])

            # Compute the final implementation status for each user agent with
            # the following rules:
            # 1. Trust platform sources to say the right thing about their own
            # user-agent or rendering engine. For instance, if chromestatus says
            # that a feature is "in development" in Chrome, consider that the
            # feature is really "in development" in Chrome, and ignore possible
            # claims in other sources that the feature is "shipped" in Chrome
            # 2. Keep the most optimistic status otherwise, meaning that if
            # chromestatus says that feature A has shipped in Edge while
            # caniuse says it is in development, consider that the feature has
            # shipped in Edge
            # 3. Due to the close relationship between webkit and Safari, trust
            # webkitstatus more than any other source about support in Safari.
            # If webkitstatus says that a feature is in development in webkit,
            # it means it cannot be at a more advanced level in Safari. In other
            # words, constrain the implementation status in Safari to the
            # implementation status in Webkit, when it is known to be lower.
            # 4. Also, once 3. is done, drop the Webkit entry when there is also
            # an entry for Safari. No need to confuse people with the
            # distinction between Safari and Webkit, unless that is needed
            # (it's only going to be needed for features that are being
            # developed in Webkit but for which there has not been any public
            # signal about support in Safari)
            data[id] = {
                "implementations": data[id]["implementations"],
                "shipped": set(),
                "experimental": set(),
                "indevelopment": set(),
                "consideration": set()
            }
            statuses = ["", "consideration", "indevelopment", "experimental", "shipped"]

            # Extract the list of user agents that appear in implementation
            # data, computing the status for "webkit" on the side to be able to
            # apply rules 3 and 4, and apply rules for each user agent.
            # (Note this code assumes that the webkitstatus platform is the only
            # source that describes the implementation status in webkit)
            uas = set(impl["ua"] for impl in data[id]["implementations"] if impl["ua"] != "webkit")
            webkitstatus = [impl["status"] for impl in data[id]["implementations"] if impl["ua"] == "webkit"]
            webkitstatus = webkitstatus[0] if len(webkitstatus) > 0 else None
            for ua in uas:
                status = ""
                impldata = [impl for impl in data[id]["implementations"] if impl["ua"] == ua]
                for impl in impldata:
                    if (ua == "safari") and (webkitstatus is not None) and (statuses.index(impl["status"]) > statuses.index(webkitstatus)):
                        # Rule 3, constrain safari status to that of webkit
                        # when it is lower
                        status = webkitstatus
                    elif (impl["source"] in sources) and (ua in sources[impl["source"]]["coreua"]):
                        # Rule 1, stop here, status comes from the right
                        # platform, we've found the implementation status
                        status = impl["status"]
                        break
                    elif (statuses.index(impl["status"]) > statuses.index(status)):
                        # Rule 2, be optimistic in life
                        status = impl["status"]
                if (status != ""):
                    data[id][status].add(ua)

            # Rule 4, insert Webkit entry if there was no Safari entry
            if ((webkitstatus is not None) and (webkitstatus != "") and ("safari" not in uas)):
                data[id][webkitstatus].add("webkit")

            # Convert sets back to lists for JSON serialization
            for status in statuses[1:]:
                data[id][status] = list(data[id][status])

            # Copy polyfill information over from the feature data file
            # (we'll just check that the data is correct)
            if ("polyfills" in feature_data):
                data[id]["polyfills"] = []
                for polyfill in feature_data["polyfills"]:
                    if ("url" not in polyfill):
                        err = "Missing URL for polyfill in %s" % filename
                        sys.stderr.write(err)
                        errors.append(err)
                    elif ("label" not in polyfill):
                        err = "Missing label for polyfill in %s" % filename
                        sys.stderr.write(err)
                        errors.append(err)
                    else:
                        data[id]["polyfills"].append(polyfill)

    print json.dumps(data, sort_keys=True, indent=2)
    if len(errors):
        sys.exit(2)

if __name__ == '__main__':
    processData()
