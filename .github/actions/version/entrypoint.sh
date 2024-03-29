#!/bin/bash
eval "$(pkgx --shellcode)"; env +yq
set -euo pipefail

debug_log() {
  if [ "${RUNNER_DEBUG:-0}" = "1" ]; then
    echo "$1" | while IFS= read -r line; do
      echo "##[debug]$line"
    done
  fi
}

log_content() {
  local content="$1"
  local label="${2:-}"

  if [[ -n "$label" ]]; then
    # Replace the beginning of each line with two spaces
    local indented_content="${content//$'\n'/$'\n'  }"
    printf "%s:\n  %s\n" "$label" "$indented_content"
  else
    echo "$content"
  fi
}

log_output() {
  echo ::group::Set outputs
  log_content "$(cat "$GITHUB_OUTPUT")" "GITHUB_OUTPUT"
  log_content "$(cat "$GITHUB_ENV")" "GITHUB_ENV"
  echo ::endgroup::
}

set_output() {
  local value="$1"
  local output_key="$2"
  local env_key="${3:-}"

  if [ -z "$value" ] || [ -z "$output_key" ]; then
    echo "Missing essential arguments to set_output_and_env"
    return 1
  fi

  # If env_key is empty, convert output_key to upper snake case
  if [ -z "$env_key" ]; then
    env_key=$(echo "$output_key" | awk '{print toupper($0)}' | sed 's/-/_/g')
  fi

  echo "$output_key=$value" >> "$GITHUB_OUTPUT"
  echo "$env_key=$value" >> "$GITHUB_ENV"
}

parse_semver_component() {
  component=$(echo "$1" | cut -f"$2" -d.)
  if [ -z "$component" ]; then
    echo "Could not parse version: $1"
    exit 1
  fi
  echo "$component"
}

check_git_tag_exists() {
  git show-ref --tags "v$1" --quiet && echo "true" || echo "false"
}

is_valid_semver() {
  local version=$1
  if [[ $version =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    return 0 # valid semver
  else
    return 1 # invalid semver
  fi
}

get_previous_release_tag() {
  echo "$(gh release list | awk 'NR==1{print $3}')"
}

get_version_from_pkgx() {
  local key=$1
  local file=".pkgx.yaml"
  local version

  version=$(yq e "$key" "$file" | tr -d '=')
  if [ -z "$version" ]; then
    echo "Could not find the key '$key' in the file '$file'"
    exit 1
  fi

  echo "$version"
}

debug_log "Processing default_branch..."
default_branch="$INPUT_DEFAULT_BRANCH"
debug_log "  $default_branch"

debug_log "Processing ref..."
ref=$GITHUB_REF
debug_log "  $ref"

debug_log "Processing semver..."
semver="$INPUT_SEMVER"
debug_log "  $semver"

debug_log "Processing tag_exists..."
tag_exists=$(check_git_tag_exists "$semver")
debug_log "  $tag_exists"

debug_log "Processing releasable..."
releasable="$( [ "$ref" == "refs/heads/${default_branch}" ] && [ "$tag_exists" == "false" ] && echo "true" || echo "false" )"
debug_log "  $releasable"

debug_log "Processing previous_release_tag..."
previous_release_tag=$(get_previous_release_tag "$semver")
debug_log "  $previous_release_tag"

set_output "$(parse_semver_component "$semver" 1)" "major"
set_output "$(parse_semver_component "$semver" 2)" "minor"
set_output "$(parse_semver_component "$semver" 3)" "patch"
set_output "$previous_release_tag" "previous-release-tag"
set_output "$releasable" "releasable"
set_output "$semver" "semver"
set_output "$tag_exists" "tag-exists"
log_output
