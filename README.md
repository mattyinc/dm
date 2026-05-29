# APC Handoff

Static GitHub Pages checklist for a one-week KT handover.

The page uses local P22 Mackinac Pro font files for headings, Inter for the main UI, and Google Sans Code for commands. It includes cream/light and dark themes, stored per browser. The schedule is CST-led and displays both CST and IST for every task window.

## Edit the schedule

Open `app.js` and update:

- `startCstDate` for the first CST date.
- `daysToShow` for the number of repeated days.
- `taskGroups` for the morning and evening task text.

The file number is generated as `01`, `02`, `03`, `04`, `05` and inserted wherever `{fileNo}` appears.

Open `styles.css` to tune the visual theme, spacing, and typography.

## Host on GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open **Settings > Pages**.
3. Set the source to the `main` branch and root folder.
4. Open the Pages URL GitHub provides.
