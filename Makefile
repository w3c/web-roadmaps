all: specs/tr.json

specs/tr.json: $(wildcard data/*.json)
	python tools/extract-spec-data.py $^ > $@