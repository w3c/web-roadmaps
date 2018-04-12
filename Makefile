all: specs/tr.json specs/impl.json

DATA=$(wildcard data/*.json)

specs/tr.json: $(DATA)
	node tools/extract-spec-data.js data > $@

specs/impl.json: $(DATA)
	node tools/extract-impl-data.js data > $@

check: $(DATA) $(wildcard */*.html)
	python tools/validate-schema.py $(DATA)
	node tools/extract-impl-data.js data > /dev/null
	node tools/extract-spec-data.js data > /dev/null
	html5validator --root .
