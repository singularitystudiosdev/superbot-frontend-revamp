### Keys and authentication

A caller key starts with `{{KEY_PREFIX}}` and belongs to your account.

#### Mint a key

1. Open **Account > API**, find **Keys** and select **New key**.
2. Enter a **Name** of up to 64 characters.
3. Set the fields you need.
4. Select **Create key**.
5. Copy the key. The page shows it in full only once.

To revoke a key, select **Revoke** on its row under **Keys**. It stops working immediately.

#### Key settings

| Field | Choice | Effect |
|---|---|---|
| **Access** | **Models** (default) | calls models; reads usage and the credit balance |
| | **Read-only query** | reads your account; calls no model |
| | **Full access** | holds every scope listed under **Scopes** |
| **Spend from** | **Your providers** | uses your own vendor accounts; spends no credits |
| | **Credits** | spends your credit balance |
| | **Auto** (default) | uses your providers first, then credits |
| **Daily limit** | credits | caps the key's spend over any 24 hours; empty means no cap |
| **Monthly limit** | credits | caps the key's spend in a calendar month (UTC); empty means no cap |
| **More options** > **Mode** | **Single model call** (default) | calls the model id you send |
| | **Full agent turn** | runs the full superbot agent |
| **More options** > **Allowed models** | comma-separated ids | `*` matches any run of characters and `?` one character; empty means all |
| **More options** > **Incognito** | checkbox | keeps the key's turns out of your history |
| **Scopes** | one checkbox per scope | ticking any box replaces **Access**; a write scope includes its read |

#### Send a key

The key goes in the `Authorization: Bearer` header. `x-api-key` carries the same key for clients that expect it.

```bash
curl {{API_BASE}}/models \
  -H "Authorization: Bearer {{KEY_PREFIX}}…"
```

Related: [Set up your clients](/clients), [Account](/account)

### Models

`GET /v1/models` lists every model id the account can call, whether or not the key's **Allowed models** names it.

#### House models

{{AGENT_ROLES}}

{{HOUSE_MODELS_TABLE}}

#### Other models

Vendor model ids run on your own accounts and keys, or on credits. An endpoint added with **Add endpoint** under **Providers** on **Account > API** appears as `custom/<endpoint>/<model>`, for example `custom/example/llama-3.3-70b`.

Related: [Custom endpoints](#external-apis), [Credits](#credits), [The API page](/api)

### Endpoints

Each route links to its reference on [/developers](/developers).

A scope names what the key must hold. `any key` takes any live key, and `no key` answers without one.

{{ENDPOINTS_TABLE}}

Related: [Full API reference](/developers), [OpenAPI 3.1 spec](/docs/openapi.json)

#### Send a message

`POST /v1/chat/completions` takes an OpenAI Chat Completions body, `POST /v1/responses` an OpenAI Responses body and `POST /v1/messages` an Anthropic Messages body. Each answers in its own shape.

```bash
export OPENAI_BASE_URL={{API_BASE}}
export OPENAI_API_KEY={{KEY_PREFIX}}…
export ANTHROPIC_BASE_URL={{API_BASE}}
export ANTHROPIC_API_KEY={{KEY_PREFIX}}…
```

```bash
curl {{API_BASE}}/chat/completions \
  -H "Authorization: Bearer {{KEY_PREFIX}}…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "{{SAMPLE_MODEL}}",
    "messages": [{"role": "user", "content": "Summarize this thread."}]
  }'
```

```python
from openai import OpenAI

client = OpenAI(base_url="{{API_BASE}}", api_key="{{KEY_PREFIX}}…")
response = client.chat.completions.create(
    model="{{SAMPLE_MODEL}}",
    messages=[{"role": "user", "content": "Summarize this thread."}],
)
print(response.choices[0].message.content)
```

```python
from anthropic import Anthropic

client = Anthropic(base_url="{{API_BASE}}", api_key="{{KEY_PREFIX}}…")
message = client.messages.create(
    model="{{SAMPLE_MODEL}}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Summarize this thread."}],
)
print(message.content[0].text)
```

#### Streaming

Send `"stream": true` to any of the three routes to receive server-sent events in that route's own shape.

```bash
curl -N {{API_BASE}}/chat/completions \
  -H "Authorization: Bearer {{KEY_PREFIX}}…" \
  -H "Content-Type: application/json" \
  -d '{"model": "{{SAMPLE_MODEL}}", "stream": true, "messages": [{"role": "user", "content": "Summarize this thread."}]}'
```

- Chat Completions sends `data: {"choices":[…]}` frames and ends with `data: [DONE]`.
- Responses sends typed events such as `response.output_text.delta` and ends with `response.completed`.
- Messages sends Anthropic's events, from `message_start` to `message_stop`.

Usage and billing settle when the stream ends, and an aborted stream is billed for what it produced.

### Limits and errors

#### Rate limit

A caller key gets {{KEY_PER_MIN}} requests a minute. Over that, the route answers `429` before any model is called, with this body:

```json
{
  "error": {
    "type": "rate_limit_error",
    "message": "per-key rate limit reached",
    "retry_after": 12
  }
}
```

`retry_after` is in seconds. The `x-ratelimit-remaining` and `x-ratelimit-reset` headers carry the same window.

#### Errors

Model routes answer in the caller's dialect, and the Field column says where each code sits. A top-level `error` is a string code. Account routes answer in that form too, with `message`, `doc_url` and `request_id` beside it.

| Status | Field | Code | Meaning |
|---|---|---|---|
| 400 | `error.type` | `invalid_request_error` | the body is not valid JSON |
| 400 | `error.code` | `unknown_model` | no vendor claims the model id |
| 401 | `error.type` | `authentication_error` | the key is missing, malformed or unknown |
| 402 | `error` | `insufficient_balance` | the credit balance cannot cover the call; the 402 body follows |
| 402 | `error.code` | `daily_limit`, `monthly_limit` | the key reached its own limit |
| 403 | `error.type` | `permission_error` | the key is revoked |
| 403 | `error` | `insufficient_scope` | the key lacks the route's scope; `x-superbot-required-scopes` names it |
| 403 | `error.code` | `model_not_allowed` | the key's **Allowed models** does not include that model |
| 403 | `error.code` | `agent_not_granted` | the `n-agent` header names an agent with no live grant |
| 403 | `error.code` | `no_vendor_credential` | no usable sign-in or key for that model's vendor; `byo_url` links to where to add one |
| 429 | `error.type` | `rate_limit_error` | over the per-key rate |
| 5xx | `error.type` | `api_error` | the model provider or the agent turn failed |

A provider's own error passes through with the provider's status, marked by the `x-superbot-error-origin: vendor` header.

<!-- docs-402:start -->
#### The 402 body

An empty balance answers HTTP 402 with this body, built from what billing reports for the account:

```json
{
  "error": "insufficient_balance",
  "topup_url": "https://billing.ezo.dev/topup?t=…",
  "balance_tokens": 0,
  "plan": "sub",
  "reason": "allowance_exhausted",
  "renews_at": "2026-10-01T00:00:00.000Z",
  "plan_name": "superbot plus",
  "plan_price_usd_month": {{SAMPLE_PLAN_PRICE}},
  "plan_allowance_tokens": {{PLAN_ALLOWANCE_SAMPLE}},
{{OVERAGE_SAMPLE_LINE}}
  "auto_recharge": {
    "enabled": true,
    "threshold_mtok": 0,
    "amount_usd": {{SAMPLE_RECHARGE_AMOUNT}},
    "monthly_cap_usd": {{SAMPLE_RECHARGE_CAP}},
    "spent_this_month_usd": {{SAMPLE_RECHARGE_AMOUNT}}
  },
  "subscribe_url": "https://billing.ezo.dev/topup?t=…",
  "manage_url": "{{ORIGIN}}/account/billing",
  "byo_url": "{{ORIGIN}}/account/api#keys",
  "recharge_url": "https://billing.ezo.dev/topup?t=…",
  "grants": [],
  "ledger_balance_tokens": 0,
  "plan_tier": "plus"
}
```

`topup_url`, `subscribe_url` and `recharge_url` are signed links to the billing page, made for the account and expiring; when billing cannot make one, the field falls back to the account page. A caller key's body omits `topup_url`, `subscribe_url` and `recharge_url`. Amounts are credits, including the fields named `_tokens`. `overage_rate_usd_per_1k` appears when a rate is configured.

| `reason` | Meaning |
|---|---|
| `no_plan` | the account is on the free plan and its balance is spent |
| `topup_only` | the account holds packs only and its balance is spent |
| `allowance_exhausted` | the plan's monthly allowance is spent |
| `auto_recharge_off` | the balance is spent and auto-recharge is off |
| `recharge_cap_reached` | the next auto-recharge would pass its monthly limit |
| `recharge_failed` | the auto-recharge charge failed |
| `weekly_cap_reached` | the plan's weekly pace limit is reached; it clears on its own |
<!-- docs-402:end -->

Related: [Credits](#credits), [Plans and packs](#plans)
