# Loading the runner list

The "Add runner" screen on the Pace tab searches a start list by name or bib number. The list lives in
`public/entrants.json` and is published with the web app at
`https://jstrand894.github.io/CM100_app/entrants.json`. Phones fetch it on launch and keep a saved copy for offline.

```json
{
  "entrants": [
    { "bib": "101", "name": "Sam Rivera", "city": "Bozeman, MT" }
  ]
}
```

- `name` is required. `bib` and `city` are optional (bibs are usually assigned close to race day, so the list can be
  loaded first and updated later).
- Update the file and merge to `main`; no app update is needed.
- Only publish what the race has permission to share. Names and bibs are visible to anyone who opens the file.
- In development builds, when the file is empty or unreachable, a few sample runners show so the screen can be tested.
