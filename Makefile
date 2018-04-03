all: specs/tr.json specs/impl.json

DATA=$(wildcard data/*.json)

specs/tr.json: $(DATA)
	node tools/extract-spec-data.js $^ > $@

specs/impl.json: $(DATA)
	node tools/extract-impl-data.js $^ > $@

check: $(DATA) $(wildcard */*.html)
	python tools/validate-schema.py $(DATA)
	python tools/extract-impl-data.py $(DATA) > /dev/null
	python tools/extract-spec-data.py $(DATA) > /dev/null
	html5validator --root .
