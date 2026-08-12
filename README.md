# Social Media AI

Find the Reels that are working in your niche, understand why, and get new concepts written for your brand.

It scrapes a list of competitors' recent Instagram videos, picks the most viral ones, has an AI watch them and break them down shot by shot, then writes fresh video concepts adapted to you.

Full walkthrough: **[oleg.ae/claude-reels](https://oleg.ae/claude-reels)**

---

## Setup

You need [Node.js](https://nodejs.org) (LTS) and three API keys.

```bash
# 1. get the code
git clone https://github.com/melnikoff-oleg/social-media.git
cd social-media

# 2. make your .env from the template
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. open .env and paste your three keys in

# 4. install and run
cd app
npm install
npm run dev
```

Then open http://localhost:3000

### The three keys

| Key | What it does | Where to get it | Cost |
|---|---|---|---|
| `APIFY_API_TOKEN` | scrapes competitors' Instagram videos | [apify.com](https://apify.com) → Settings → Integrations → Personal API token | free plan includes $5 of usage a month, which is plenty for a few dozen profiles |
| `GEMINI_API_KEY` | watches the videos and writes the breakdown | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | has a free tier, see the 429 note below |
| `ANTHROPIC_API_KEY` | generates the new concepts | [platform.claude.com](https://platform.claude.com) → API keys | pay per token, needs prepaid credit |

---

## Troubleshooting

These are the actual questions people asked under the video, with the actual answers.

### "There is no .env file in the folder"

Correct, and that is on purpose. `.env` is gitignored because it holds your private keys, and keys must never sit in a public repo. Copy the template instead:

```bash
cp .env.example .env          # macOS / Linux
Copy-Item .env.example .env   # Windows PowerShell
```

Then paste your keys after the `=` signs. No quotes, no spaces around the `=`. Keep `.env` at the **project root**, the same folder as this README, not inside `app/`. If you cannot see the file in VS Code, dotfiles are hidden in some setups: use the New File button and name it exactly `.env`.

### "zsh: command not found: claude" or "bash: claude: command not found"

Installing the **Claude Code extension in VS Code does not give you the `claude` terminal command.** The extension keeps its own private copy for its chat panel. To get the command you install Claude Code itself:

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

Then **close the terminal completely and open a new one**, and check:

```bash
claude --version
```

Still not found on macOS? Your PATH is missing the folder:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

`claude doctor` prints a full health report on your install if you are still stuck.

Note that Claude Code needs a **paid** Claude plan (Pro or higher) or an API account. The free claude.ai plan does not include it, so the command can install correctly and still refuse to sign you in.

### "cr: command not found" or "nothing happens when I type cr"

`cr` is not a Claude command, it is a shortcut defined in [shell-aliases.md](shell-aliases.md). Three things go wrong with it:

1. **It is lowercase.** Terminals are case sensitive, so `CR` is a different word and will never be found.
2. **A shortcut typed straight into a terminal dies when you close that window.** To keep it, put both lines in `~/.zshrc` (macOS) or `~/.bashrc` (Linux), then run `source ~/.zshrc`.
3. **On Windows, `alias` is not a command that defines anything.** In PowerShell `alias` means `Get-Alias`, which is why you get `ItemNotFoundException`. Use functions instead:

```powershell
function cs { claude "/prime" }
function cr { claude --dangerously-skip-permissions "/prime" }
```

To keep those permanently on Windows, run `notepad $PROFILE` and paste them in.

You never need the shortcut at all. Just run the command it stands for:

```bash
claude --dangerously-skip-permissions "/prime"
```

**What that flag does:** it turns off the "can I do this?" prompt, so Claude can edit files and run commands on this machine without asking each time. That is the whole reason it says "dangerously". Use it in a project folder like this one where you know what is inside, and drop the flag (`claude "/prime"`) any time you would rather approve each step.

### "Gemini error 429" / "does this need a paid Gemini plan?"

A 429 means you hit a quota on your Google AI key: requests per minute, tokens per minute, or requests per day. It is not a bug here, and **no, video analysis does not require a paid plan.** The claim going around that the paid tier has a $200 minimum is wrong: turning on billing is pay as you go.

Free ways to get under the limit:

- analyse fewer videos per run (lower "top k" and "max videos" on the run screen)
- wait and try again, the daily quota resets at midnight Pacific
- this project now backs off 2s, 4s, 8s between retries instead of a flat 5s, which clears most per-minute limits on its own

Check your own current limits at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). Google stopped publishing the free numbers in its docs, so that dashboard is the only accurate source.

One warning worth knowing: Google's pricing page says free tier content is used to improve their products. Do not push client material through a free key.

### "Gemini says the model does not exist (404)"

Google retires models. `gemini-2.0-flash`, which this project used to hardcode, was switched off and is no longer in the model list at all, which broke every run. It now defaults to `gemini-2.5-flash` and you can override it without touching code by setting `GEMINI_MODEL` in `.env`.

To see what your key can actually reach:

```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
```

Put any name from that list into `GEMINI_MODEL`. `gemini-3.1-flash-lite` is cheaper per token.

### "Credit balance too low. Add funds"

That message is about the **Anthropic API**, which is prepaid pay per token, and is a completely separate bill from a Claude Pro or Max subscription. A subscription never funds an API key. Add credit at [platform.claude.com](https://platform.claude.com) → Billing, and switch on auto reload so a run cannot die halfway.

If you did not mean to use an API key at all, check whether one is set in your shell:

```bash
echo $ANTHROPIC_API_KEY     # macOS / Linux
```

A key set in your environment overrides your subscription login, so remove it and run `/login` inside Claude Code.

### "Will this get my Instagram banned?"

This project never touches your account. It reads **public** competitor videos through Apify and never logs in as you, never posts, never follows, never messages. The risk profile of automating your own logged-in account is a different thing entirely, and this is not that.

### "Apify says I exceeded the limit"

The free Apify plan gives $5 of usage a month and it does not roll over. Most social scrapers bill per result, so read the pricing line on the actor's own store page before a big run. A few dozen profiles costs cents.

---

## How it works

1. **Scrape** — pulls each competitor's recent videos via Apify
2. **Rank** — flags the outliers, the ones that beat that account's own average
3. **Watch** — uploads the top videos to Gemini, which describes what actually happens in them
4. **Generate** — Claude turns the patterns into new concepts written for your brand

Everything runs locally. `.env` never leaves your machine.

## Project layout

```
.env.example        the template for your keys
app/                the Next.js app you actually use
  src/lib/apify.ts    scraping
  src/lib/gemini.ts   video analysis
  src/lib/claude.ts   concept generation
data/               your creators list and results, as CSV
CLAUDE.md           context Claude Code loads to work on this project
shell-aliases.md    the cs / cr shortcuts explained
```

---

Built by [Oleg Melnikov](https://oleg.ae). More free guides and tools: [oleg.ae](https://oleg.ae)
