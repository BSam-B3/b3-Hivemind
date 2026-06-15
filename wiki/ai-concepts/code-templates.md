# Local AI Code Templates - B3 Best Practices

Use these as small few-shot examples for local models. Local models are useful for drafts, summaries, and first-pass bug hunting, but important code, security, SQL, and business decisions still need review by Codex/Claude/Gemini or a human.

## Local Policy

- `--local`: local only, no cloud fallback.
- `--prefer-local`: try local first, cloud fallback is allowed.
- `--cloud`: cloud only.
- Local output must be treated as `Local Draft` until verified.
- Keep prompts short. Prefer one clear task and one small code/context sample.

## Prompt Templates

### Code Review

```text
Review this code for bugs, regressions, missing tests, and operational risks.
Findings first. Be specific. Mark the answer as Local Draft.

Code:
...
```

### Standup Summary

```text
Create a Daily Standup Summary in Thai with key technical English terms in parentheses.
Sections:
1. Yesterday
2. Risks
3. Next Actions

Input:
...
```

### Thai Explanation

```text
Explain this for B3 in Thai. Put important English technical terms in parentheses.
Keep it practical and concise.

Topic:
...
```

## Next.js API Route Pattern

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('table_name')
      .insert([body])
      .select('id, status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 500 });
  }
}
```

## Supabase Query Pattern

```typescript
const { data, error } = await supabase
  .from('cit_computers')
  .select(`
    id,
    serial_number,
    status,
    cit_customers (
      id,
      name
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false });

if (error) {
  throw new Error(error.message);
}
```

## Quality Rules

- Avoid `select('*')` unless the caller truly needs every column.
- Validate inputs before database writes.
- Return clear error status codes.
- Do not expose service-role keys to client code.
- Add focused tests when changing shared logic, auth, payments, or data writes.
