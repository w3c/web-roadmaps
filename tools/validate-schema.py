import sys
from jsonschema import validate, ValidationError
import json

schema_f = open("tools/spec.jsons")
schema = json.loads(schema_f.read())


for filename in sys.argv[1:]:
    f = open(filename)
    try:
        feature_data = json.loads(f.read())
    except:
        sys.stderr.write("Could not load %s as JSON\n" % filename)
        feature_data = {}
    try:
        validate(feature_data, schema)
    except ValidationError as e:
        sys.stderr.write("%s does not validate against schema: %s" % (filename, e))
