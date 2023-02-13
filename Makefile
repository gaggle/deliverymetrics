.PHONY : test-cov test test-cli test-libs coverage lint lint-fix compile-dm-x86-gnu compile-dm-x86-win compile-dm-x86-mac compile-dm-a64-mac compile
ALLOW = --allow-read --allow-write --allow-net --allow-env
ALLOW_TEST = --allow-read --allow-write --allow-env

test-cov:
	rm -rf .coverage
	$(MAKE) test
	$(MAKE) coverage

test: test-cli test-libs

test-cli:
	cd cli && $(MAKE) test

test-libs:
	cd libs && $(MAKE) test

coverage:
	deno coverage .coverage && rm -rf coverage/html && mkdir -p .coverage/html && deno coverage .coverage --lcov > .coverage/html/coverage.lcov && genhtml -o .coverage/html .coverage/html/coverage.lcov

lint:
	deno fmt --check && deno check mod.ts dev-fixtures/mod.ts && deno lint

lint-fix:
	deno fmt && deno check mod.ts dev-fixtures/mod.ts && deno lint

compile-dm-x86-gnu:
	deno compile -q --output dm-x86-gnu --target=x86_64-unknown-linux-gnu --import-map=import_map.json $(ALLOW) ./mod.ts

compile-dm-x86-win:
	deno compile -q --output dm-x86-win --target=x86_64-pc-windows-msvc   --import-map=import_map.json $(ALLOW) ./mod.ts

compile-dm-x86-mac:
	deno compile -q --output dm-x86-mac --target=x86_64-apple-darwin      --import-map=import_map.json $(ALLOW) ./mod.ts

compile-dm-a64-mac:
	deno compile -q --output dm-a64-mac --target=aarch64-apple-darwin     --import-map=import_map.json $(ALLOW) ./mod.ts

compile: compile-dm-a64-mac compile-dm-x86-gnu compile-dm-x86-mac compile-dm-x86-win
