# SkillTree

SkillTree is a local interactive graph workspace for mapping a profile to skills and projects.

## Features

- Profile-centered skill tree
- Empty profile-first workspace
- Expandable project and certification branches
- Click-based path highlighting
- Custom node connections
- Free pan and zoom
- Very large graph workspace for broad trees
- Add, update, and delete skills, projects, and certifications
- Dedicated subskill creation
- Optional project and certification branches per skill
- Right-click node menu for quick graph actions
- Pro mode with a glass tool drawer for graph-only editing
- File-backed local profile storage
- Multi-skill projects and skill/sub-skill relationships

## Run Locally

```bash
node server.js
```

Then open `http://127.0.0.1:4173`.

Profile data is stored under `data/profiles/<profile-key>.json`.
