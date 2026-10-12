# Posting notifications in CM100 Companion

Notifications live in `public/notifications.json`. Edit it, merge to `main`, and the GitHub Pages deploy publishes it
at `https://jstrand894.github.io/CM100_app/notifications.json`. Phones fetch it each time the app opens (and on
pull-to-refresh in the Notifications screen), and keep a saved copy for offline. No app update is needed.

```json
{
  "notifications": [
    {
      "id": "2027-07-28-weather",
      "date": "2027-07-28",
      "title": "Storms forecast Friday night",
      "body": "Pack a rain shell for the high country.",
      "link": "https://www.crazymountainultra.com",
      "urgent": true
    }
  ]
}
```

- `id` must be unique and never change after posting (it tracks who has read it). Changing an id makes it "new" again.
- `date` is `yyyy-mm-dd`. `body`, `link` and `urgent` are optional.
- Add `"show": false` to hide a notification without deleting it.
- The red badge on the Home bell counts notifications the person has not opened yet.
- The welcome message is built into the app (`WELCOME` in `src/data/notifications.ts`).
