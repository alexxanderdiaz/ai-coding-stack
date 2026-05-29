# Regenerate the demo GIF:  npm i -g ai-coding-stack && vhs docs/demo.tape
Output docs/demo.gif
Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 720
Set Padding 20
Set Theme "Dracula"
Hide
Type "d=$(mktemp -d) && cd $d && printf '%s' '{\"name\":\"billing-api\",\"dependencies\":{\"next\":\"14\",\"react\":\"18\"},\"devDependencies\":{\"typescript\":\"5\",\"eslint\":\"8\"},\"scripts\":{\"build\":\"next build\",\"test\":\"vitest\",\"lint\":\"eslint .\",\"dev\":\"next dev\"}}' > package.json && echo '{}' > tsconfig.json && export PS1='$ ' && clear" Enter
Show
Sleep 600ms
Type "# scaffold any project for Claude Code, Codex & Antigravity"
Enter
Sleep 1s
Type "aics-init . --about 'REST API with Stripe webhooks'"
Enter
Sleep 2500ms
Type "ls"
Enter
Sleep 1500ms
Type "sed -n '1,14p' AGENTS.md"
Enter
Sleep 3500ms
