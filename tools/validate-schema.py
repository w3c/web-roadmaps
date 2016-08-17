import sys
from jsonschema import validate, ValidationError
import json

schema_f = open("tools/spec.jsons")
schema = json.loads(schema_f.read())

errors = []

for filename in sys.argv[1:]:
    f = open(filename)
    try:
        feature_data = json.loads(f.read())
    except:
        err = "Could not load %s as JSON\n" % filename
        sys.stderr.write(err)
        errors.append(err)
        feature_data = {}
    try:
        validate(feature_data, schema)
    except ValidationError as e:
        err = "%s does not validate against schema: %s" % (filename, e)
        sys.stderr.write(err)
        errors.append(err)

if len(errors):
    sys.exit(2)
