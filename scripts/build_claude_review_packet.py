#!/usr/bin/env python3
"""Build a bounded source-review packet from a GitHub PR using read-only API access."""
import argparse, base64, json, os, pathlib, urllib.request, urllib.error

MAX_FILES=35
MAX_FILE_BYTES=75000
MAX_TOTAL_BYTES=600000
ALLOWED={".js",".cjs",".mjs",".html",".css",".json",".md",".yml",".yaml",".txt",".ts",".tsx",".jsx"}
EXCLUDE_PARTS={".env","secrets","credentials","private","node_modules","vendor","dist"}
def api(url, token):
    req=urllib.request.Request(url,headers={"Authorization":f"Bearer {token}","Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"})
    with urllib.request.urlopen(req,timeout=25) as response:return json.load(response)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",required=True)
    p.add_argument("--pr",required=True,type=int)
    p.add_argument("--out",default="claude-review-packet.md")
    args=p.parse_args()
    owner,repo=args.repo.split("/",1)
    token=os.environ["GH_TOKEN"]
    root=f"https://api.github.com/repos/{owner}/{repo}"
    pr=api(f"{root}/pulls/{args.pr}",token)
    sha=pr["head"]["sha"]
    files=[]
    for page in range(1,11):
        batch=api(f"{root}/pulls/{args.pr}/files?per_page=100&page={page}",token)
        files.extend(batch)
        if len(batch)<100:break
    selected=[]
    omitted=[]
    total=0
    for f in files:
        name=f["filename"]
        path=pathlib.PurePosixPath(name)
        if f["status"]=="removed" or len(selected)>=MAX_FILES or path.suffix.lower() not in ALLOWED or any(part.lower() in EXCLUDE_PARTS for part in path.parts):
            omitted.append(name);continue
        if int(f.get("changes",0))>3000:
            omitted.append(name);continue
        try:
            data=api(f"{root}/contents/{name}?ref={sha}",token)
            if data.get("encoding")!="base64":
                omitted.append(name);continue
            raw=base64.b64decode(data["content"])
            if len(raw)>MAX_FILE_BYTES or total+len(raw)>MAX_TOTAL_BYTES:
                omitted.append(name);continue
            text=raw.decode("utf-8")
            selected.append((name,text))
            total+=len(raw)
        except (ValueError, UnicodeError, KeyError, urllib.error.HTTPError):
            omitted.append(name)
    output=[
        "# Claude independent read-only review packet",
        "",
        f"- Repository: `{args.repo}`",
        f"- Pull request: #{args.pr} ({pr['html_url']})",
        f"- Head commit: `{sha}`",
        f"- Base branch: `{pr['base']['ref']}`",
        f"- Files included: {len(selected)} of {len(files)} changed files",
        "- Generated automatically from the PR head SHA using GitHub API; no code executed from PR.",
        "- The review packet is source evidence, not a CI result or approval.",
        "",
        "## Independent review instructions",
        "Identify verified defects separately from risks, list precise affected files, do not make code changes, and log findings in Claude Agent Log only when authorized.",
        "",
        "## Omitted files (limits, unsupported types, deleted files, or sensitive path exclusions)",
        *([f"- `{name}`" for name in omitted] if omitted else ["None"]),
    ]
    for name,content in selected:
        fence="````" if "```" in content else "```"
        output += ["",f"## Source: `{name}`",f"{fence}{pathlib.PurePosixPath(name).suffix.lstrip('.') or 'text'}",content,fence]
    pathlib.Path(args.out).write_text("\n".join(output)+"\n",encoding="utf-8")
    print(f"Produced {args.out} ({len(selected)} files, {total} source bytes, {len(omitted)} omitted)")

if __name__=="__main__":main()
