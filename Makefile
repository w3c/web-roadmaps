all: specs/tr.json specs/impl.json

DATA=$(wildcard data/*.json)

specs/tr.json: $(DATA)
	python tools/extract-spec-data.py $^ > $@

specs/impl.json: $(DATA)
	python tools/extract-impl-data.py $^ > $@

check: $(DATA) $(wildcard */*.html)
	python tools/validate-schema.py $(DATA)
	python tools/extract-impl-data.py $(DATA) > /dev/null
	python tools/extract-spec-data.py $(DATA) > /dev/null
	html5validator --root .
