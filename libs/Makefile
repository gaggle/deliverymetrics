.PHONY : test test-watch

test:
	deno test --check --parallel -A --coverage=../.coverage

test-watch:
	nice -20 deno test --check --parallel -A --watch
