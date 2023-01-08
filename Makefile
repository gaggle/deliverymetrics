.PHONY : test-watch test coverage lint lint-fix compile help pull-github output-csv get-fixtures
ALLOW = --allow-read --allow-write --allow-net --allow-env
ALLOW_TEST = --allow-read --allow-write --allow-env

### Dev
test-watch:
	deno test --watch --cached-only $(ALLOW_TEST) .

test:
	rm -rf .coverage
	deno test --check --coverage=.coverage --parallel --cached-only $(ALLOW_TEST)
	$(MAKE) coverage

coverage:
	deno coverage .coverage && rm -rf coverage/html && mkdir -p .coverage/html && deno coverage .coverage --lcov > .coverage/html/coverage.lcov && genhtml -o .coverage/html .coverage/html/coverage.lcov

lint:
	deno fmt --check && deno check mod.ts dev-fixtures/mod.ts && deno lint

lint-fix:
	deno fmt

compile:
	deno compile --output dm-x86-gnu --target=x86_64-unknown-linux-gnu --import-map=import_map.json $(ALLOW) ./mod.ts
	deno compile --output dm-x86-win --target=x86_64-pc-windows-msvc   --import-map=import_map.json $(ALLOW) ./mod.ts
	deno compile --output dm-x86-mac --target=x86_64-apple-darwin      --import-map=import_map.json $(ALLOW) ./mod.ts
	deno compile --output dm-a64-mac --target=aarch64-apple-darwin     --import-map=import_map.json $(ALLOW) ./mod.ts

### CLI Commands
help:
	deno run $(ALLOW) ./mod.ts --help

pull-github:
	deno run $(ALLOW) ./mod.ts pull github ${GITHUB_REPO} ${GITHUB_TOKEN} --loglevel=INFO

output-csv:
	deno run $(ALLOW) ./mod.ts output csv .output/csv ${GITHUB_REPO} --loglevel=INFO

get-fixtures:
	deno run $(ALLOW) ./dev-fixtures/mod.ts
