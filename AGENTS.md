# Working in this repo (for agents)

This repository **is** a set of agent skills. When you're asked to work *in* it, you're authoring or maintaining skills — not building an app.

## Layout

- `skills/<name>/SKILL.md` — one skill per folder. `<name>` matches the frontmatter `name:` and is kebab-case.
- `skills/<name>/scripts/`, `skills/<name>/references/` — optional, per skill.
- `skills.sh.json` — the registry. Every skill folder must be listed; every listed skill must exist.
- `README.md` — human-facing index. Keep the **Available Skills** table in sync with `skills.sh.json`.
- `CONTRIBUTING.md` — the authoring conventions. Follow them.

## Rules

1. **Adding a skill** = create the folder + `SKILL.md`, register it in `skills.sh.json`, add a README row. Do all three.
2. **Renaming/removing a skill** = update the folder, `skills.sh.json`, and the README together. They must never drift.
3. **A `SKILL.md` is a prompt, not prose.** Optimize it to make a model produce correct Thinair code: `Wrong → Correct` tables, minimal real examples, a Thinair-usage section with real paths, and a "when not to use it" table.
4. **Verify APIs before writing them.** These skills exist to *stop* hallucinated APIs — don't introduce them. Check the installed version when unsure.
5. **No secrets.** Assume this repo can be public.
6. **Run validation** before finishing: `node .github/scripts/validate.mjs`.

See `CONTRIBUTING.md` for the full skill template and quality bar.
