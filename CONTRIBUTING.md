# Contributing

Thanks for adding to Thinair's agent skills. The goal of this repo is narrow: give AI coding agents the *correct, Thinair-specific* way to use a library or system, so generated code lands right the first time.

## Adding a skill

1. **Create the folder.** `skills/<name>/SKILL.md`. The `<name>` must match the `name:` in the frontmatter and be `kebab-case`.
2. **Write the frontmatter.**
   ```markdown
   ---
   name: <name>
   description: <one specific, trigger-oriented line — when should an agent reach for this?>
   ---
   ```
   The `description` is the only thing an agent reads before loading the skill. Make it concrete (name the packages, the use cases), not vague.
3. **Write the guide.** Favor this shape (it's what makes these skills earn their keep):
   - **Quick Reference** — the canonical imports + a "core mental model" annotated snippet.
   - **Common Misconceptions** — a `Wrong | Correct` table targeting what LLMs hallucinate.
   - **Topic sections** — errors, context/DI, schema, etc., each with a minimal correct example.
   - **House Usage** *(if generic enough to be public)* — how *we* use it, pointing at real paths (e.g. `packages/<lib>/`). Internal-only house patterns go in the private `agent-skills-internal` repo.
   - **When NOT to use it** — a scenario/recommendation table.
   - **Resources** — upstream doc links.
4. **Optional `scripts/` and `references/`.** Add them only if the skill genuinely needs runnable helpers or large supporting docs the agent loads on demand. Don't pad.
5. **Register it.** Add the skill name to [`skills.sh.json`](skills.sh.json) under a fitting grouping (add a grouping if none fits), and add a row to the README's **Available Skills** table.

## Quality bar

- **Correct over comprehensive.** Every API shown must be real and current. When in doubt, verify against the installed version, not memory.
- **Version-pinned.** State the major version the skill targets and call out breaking-change seams.
- **No secrets.** These skills may be public. Don't include credentials, private endpoints, or anything you wouldn't want shipped to a client.
- **Tested in anger.** Prefer patterns we actually run in the codebase over hypothetical ones.

## Validation

`skills.sh.json` is validated in CI against every skill folder — each entry must resolve to a `skills/<name>/SKILL.md` with valid frontmatter, and every skill folder must be registered. Run the check locally before opening a PR:

```bash
node .github/scripts/validate.mjs
```
