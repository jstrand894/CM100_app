# Posting race news in CM100 Companion

News in the app comes from a Google Sheet. Edit the sheet and the app shows the change the next time someone opens
it (or pulls down on the News screen). You never need to update the app.

## One-time setup (about 5 minutes)

1. In Google Sheets, create a new sheet. Import `docs/news-template.csv` (File > Import > Upload), or type the
   headings below in row 1 by hand.
2. Choose **File > Share > Publish to web**.
3. Under "Link", pick the **news sheet tab** and the format **Comma-separated values (.csv)**, then press **Publish**.
4. Copy the link it gives you. It looks like `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`.
5. Send that link to the app developer, who pastes it into `NEWS_CSV_URL` in `src/data/news.ts` and ships one app
   update. After that, all news changes happen in the sheet.

Only people you share the Google Sheet with can edit it. Anyone with the published link can read the CSV, so don't put
anything private in it.

## The columns

| Column | What to put | Required |
|---|---|---|
| `date` | The post date as `yyyy-mm-dd`, for example `2026-12-01` | Yes |
| `title` | A short headline | Yes |
| `body` | The message. A few sentences work best | No |
| `link` | A web address for a "Read more" button | No |
| `urgent` | Type `yes` to mark the post Important. It gets an orange outline | No |
| `show` | Type `no` to hide a post without deleting it. Blank means show | No |

The newest date appears first. The newest post also shows on the Home screen.

## Posting something

Add a new row at the bottom. Fill in the date and title, and anything else you want. Save. That's it.
Google updates the published link within about 5 minutes.

## Tips

- Most of the course has no cell service. The app saves the last news it downloaded, so people can still read it. Posts
  made while someone is offline show up the next time they have signal.
- For time-sensitive news such as a weather delay, mark it `urgent`. People will only see it when they open the app,
  because the app does not send push notifications yet.
- Keep dates in `yyyy-mm-dd` format. Anything else will sort in the wrong order.
