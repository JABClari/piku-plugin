# Piku for Claude Code

![Piku](icon.png)

[Piku](https://usepiku.com) gives anyone who sells a service one page with a Rate Card, plus quotes, invoices and Deals to get paid. This plugin connects Claude Code to Piku, so you can find creators and send requests, or run your own Piku account from a chat.

## Install

In Claude Code:

```
/plugin marketplace add JABClari/piku-plugin
/plugin install piku@piku
```

Or both in one step (Claude Code v2.1.275 or later):

```
/plugin install piku --marketplace JABClari/piku-plugin
```

From your shell:

```
claude plugin marketplace add JABClari/piku-plugin
claude plugin install piku@piku
```

## Sign in

Searching creators and reading Rate Cards works without an account. To use your own Piku account (Deals, quotes, invoices, your page):

1. Run `/mcp` in Claude Code.
2. Choose `piku` and select Authenticate.
3. Sign in to Piku in the browser and choose what Claude may do. You can untick sending.

You can disconnect any time in Piku under Settings > Agents.

## What the tools do

For anyone, no sign-in:

- `search_creators`: find creators by niche, location, platform and starting price
- `get_rate_card`: read a creator's Rates, what each includes, and their media kit
- `submit_request`: send a brand's request on one Rate. Piku emails the brand to confirm first
- `get_deal`: check where a request stands

For creators, on their own account:

- `list_deals`, `get_deal`: your Deals and their next step
- `create_quote`, `create_invoice`: prepare a Draft. Nothing is sent
- `send_draft`: send a Draft, only after you say yes to it in the chat
- `list_invoices`, `get_invoice`: who has paid, what is due or overdue
- `get_page`, `design_page`, `list_page_drafts`: prepare a new look for your page. Nothing changes until you apply it in Piku

Claude can never accept a quote, mark an invoice paid, cancel a Deal or move money.

## What is included

- `.mcp.json`: one remote MCP server, `https://usepiku.com/mcp`. Sign-in uses OAuth with Piku. The plugin holds no keys and runs nothing on your computer.
- `skills/find-creators`: how Claude searches, reads Rate Cards and sends requests.
- `skills/creator-tools`: how Claude drafts quotes and invoices, reads Deals and designs your page, and the rule that nothing is sent without your yes.

The plugin only talks to usepiku.com, and only when Claude calls a Piku tool.

## Privacy and support

- Guide: [usepiku.com/claude](https://usepiku.com/claude)
- Privacy: [usepiku.com/privacy](https://usepiku.com/privacy)
- Terms: [usepiku.com/terms](https://usepiku.com/terms)
- Support: [hello@usepiku.com](mailto:hello@usepiku.com) or [open an issue](https://github.com/JABClari/piku-plugin/issues)

## License

MIT
