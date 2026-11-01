<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Pluggy (Open Finance) calls run only in src/lib/pluggy.functions.ts server functions; per-user credential overrides live in pluggy_credentials (service-role only), falling back to PLUGGY_CLIENT_ID/SECRET env — keeps secrets off the browser.
- AppShell shares navigation between the desktop sidebar and a mobile Sheet drawer; close the drawer on navigation so every destination remains reachable.
- The /despesas parent renders its monthly page only on an exact match and otherwise renders Outlet, so annual and installment child pages can display independently.
- Revenue uses user-scoped Cloud records and transaction functions for receipts and contract creation; append-only receipt events preserve originals and audited corrections separately from expense history.
- Revenue monetary correction rates are explicitly entered per update rather than fabricated from an index name; monthly interest is prorated over a 30-day basis.
- Agenda presentation uses a browser-safe holiday library and pure helpers for public holidays, actual payment/receipt dates, and current/future/past grouping; reuse existing financial reads rather than duplicating storage.
