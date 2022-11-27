.PHONY : test-watch test coverage lint compile help pull-github output-csv get-fixtures
ALLOW = --allow-read --allow-write --allow-net --allow-env --no-prompt

### Dev
test-watch:
	deno test --watch --cached-only $(ALLOW) .

test:
	rm -rf .coverage
	deno test --check --coverage=.coverage --parallel --cached-only $(ALLOW)
	$(MAKE) coverage

coverage:
	deno coverage .coverage && rm -rf coverage/html && mkdir -p .coverage/html && deno coverage .coverage --lcov > .coverage/html/coverage.lcov && genhtml -o .coverage/html .coverage/html/coverage.lcov

lint:
	deno fmt --check && deno check mod.ts dev-fixtures/mod.ts && deno lint

lint-fix:
	deno fmt

compile:
	deno compile --output dm-x86-gnu --target=x86_64-unknown-linux-gnu $(ALLOW) ./mod.ts
	deno compile --output dm-x86-win --target=x86_64-pc-windows-msvc   $(ALLOW) ./mod.ts
	deno compile --output dm-x86-mac --target=x86_64-apple-darwin      $(ALLOW) ./mod.ts
	deno compile --output dm-a64-mac --target=aarch64-apple-darwin     $(ALLOW) ./mod.ts

### CLI Commands
help:
	deno run $(ALLOW) ./mod.ts --help

pull-github:
	deno run $(ALLOW) ./mod.ts pull github ${GITHUB_REPO} ${GITHUB_TOKEN} --loglevel=DEBUG

output-csv:
	deno run $(ALLOW) ./mod.ts output csv .output/csv ${GITHUB_REPO} --loglevel=DEBUG

get-fixtures:
	deno run $(ALLOW) ./dev-fixtures/mod.ts
