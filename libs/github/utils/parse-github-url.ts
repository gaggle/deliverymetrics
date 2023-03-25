export function parseGithubUrl(id: string): { owner: string; repo: string } {
  const simpleMatch = /^([\w-.]+)\/([\w-.]+)$/.exec(id)
  if (simpleMatch) {
    const [, owner, repo] = simpleMatch
    return clean({ owner: owner.toLowerCase(), repo: repo.toLowerCase() })
  }

  const gitPrefixedMatch = /^git@([\w.]+):([\w.]+)\/([\w.]+).git$/.exec(id)
  if (gitPrefixedMatch) {
    const [, , owner, repo] = gitPrefixedMatch
    return clean({ owner, repo })
  }

  const pathnameMatch = /^\/([\w-.]+)\/([\w-.]+)/.exec(
    new URL(id).pathname.replace(/\.git$/, ""),
  )
  if (pathnameMatch) {
    const [, owner, repo] = pathnameMatch
    return clean({ owner, repo })
  }

  throw new TypeError(`Invalid URL: ${id}`)
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
