all: specs/tr.json specs/impl.json

DATA=$(wildcard data/*.json)

specs/tr.json: $(DATA)
	node tools/extract-spec-data.js $^ > $@

specs/impl.json: $(DATA)
	node tools/extract-impl-data.js $^ > $@

check: $(DATA) $(wildcard */*.html)
	python tools/validate-schema.py $(DATA)
	node tools/extract-impl-data.js $(DATA) > /dev/null
	node tools/extract-spec-data.js $(DATA) > /dev/null
	html5validator --root .
