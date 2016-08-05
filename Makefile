all: specs/tr.json specs/impl.json

specs/tr.json: $(wildcard data/*.json)
	python tools/extract-spec-data.py $^ > $@

specs/impl.json: $(wildcard data/*.json)
	python tools/extract-impl-data.py $^ > $@
