<!-- billing-figures:start -->

### Credits

superbot bills in credits: {{CREDIT_UNIT}}. Each token type is priced as a multiple of the input rate (on superbot: {{WEIGHT_LADDER}}). A vendor model called on credits, with none of your own accounts attached, costs its own list price. Models on your own subscriptions and keys spend no credits. Credits are held and charged by the billing service behind superbot: the balance, the plan and every charge are its records, and the app and the API show what it reports.

{{FAST_FAIR_USE_TERMS}}

#### Read your balance

`GET /v1/credits` returns the balance as `balance_credits`, with the pots in `credits`, and the plan and auto-recharge state. It needs the `billing:read` scope, which **Models** and **Read-only query** keys hold. `low` is true at a balance of zero or less, and `reason` appears with it. The route reads the balance from billing and holds none itself, so while billing cannot be reached it answers 503 `billing_unavailable` with a retry hint.

```bash
curl {{API_BASE}}/credits \
  -H "Authorization: Bearer {{KEY_PREFIX}}…"
```

Related: [Models](#api-models), [The API page](/api)

### Plans and packs

- Free {{FREE_PLAN_CLAUSE}}.
- Superbot Plus {{PLAN_PLUS_CLAUSE}}.
- Pro {{PLAN_PRO_CLAUSE}}.
- Max {{PLAN_MAX_CLAUSE}}.
- Superbot Teams {{PLAN_TEAMS_CLAUSE}}.

Every paid plan also sells a yearly term at the yearly price, and a yearly plan still releases its allowance monthly. {{TRIAL_CLAUSE}}. Overage on any plan bills at the pack rate, and the frontier models are open on every tier including Free.

The run limits on a plan are limits on hosted cloud runs: a run on your own machine is never limited. A plan's scheduled runs are its routine runs, on a cron or an interval.

The plan allowance is paced: a week uses at most a quarter of it.

Packs are one-time purchases: {{PACK_LIST}}. A pack's credits never expire, and a plan does not reprice the {{PACK_PRICES}} packs. Plans and packs are bought on the billing page. **Account > Billing** opens it, and so does the `topup_url` or `subscribe_url` of a 402 or of `GET /v1/credits`: each is a signed link made for your account, and it expires.

#### Auto-recharge

Auto-recharge charges your card for more credits when the balance falls to a level you set. It is off until you turn it on, then {{RECHARGE_DEFAULTS}}. Declined charges count toward the monthly limit. `GET /v1/credits` reports its state as `auto_recharge`, and the `reason` of a 402 says when it is off, capped or failed.

Related: [Usage and spend](#usage)

<!-- billing-figures:end -->

### Which credits are spent first

From first to last: beta pot, plan allowance, promo credits, auto-recharge credits, packs. The beta pot expires on the 1st (UTC) and the plan allowance at renewal; neither rolls over. Packs and auto-recharge credits never expire.
