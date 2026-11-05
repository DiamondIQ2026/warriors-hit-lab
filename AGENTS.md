# Hit Lab development

- This is a static web app. Start it from the repository root with:
  ```powershell
  npx.cmd --yes http-server . -a 127.0.0.1 -p 5500 -c-1
  ```
- Use http://127.0.0.1:5500 consistently. Browser saves are specific to the browser profile and origin.
- Python is not installed or required for local serving.
- Read `.github/workflows/hitlab-tests.yml` for the existing validation checks. It checks required files and JavaScript syntax in `sw.js` and eligible inline scripts in `index.html`; these are syntax checks, not gameplay tests.
- Preserve save compatibility. Before gameplay or storage changes, remind the user to use **Settings > Export Save**.
- Never clear browser saves as a troubleshooting step without the user's explicit approval.
- Keep changes in this repository separate from DiamondIQ.
- Review existing changes before editing. Do not commit, push, or deploy unless requested.
