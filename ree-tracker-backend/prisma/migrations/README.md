# Migrations

Until now this project had **no migration history at all**. `render.yaml` ran
`prisma db push` on every deploy, which diffs the live database against
`schema.prisma` and mutates it in place. That meant:

- there was no record of what the schema was at any past deploy, so rolling back
  application code could not roll back the schema — there was nothing to roll
  back *to*;
- the DDL was invisible in review: the schema change and the statements it
  implied were the same commit, and nobody saw the SQL;
- schema drift was applied on every deploy, including preview and failed ones,
  directly against production;
- a rename (drop + add) hard-fails the build with no path forward other than a
  manual database edit or `--accept-data-loss` — and the pressure at that moment
  is to add the flag.

`0_init/migration.sql` is a baseline generated from the current schema with
`prisma migrate diff --from-empty --to-schema`. It describes the schema as it
stands after PR1–PR5 (including `IdempotencyRecord`, `QuestionFlag`,
`ExamSession @@unique([id, userId])`, `Battle.startedAt`, and the foreign-key
indexes added in PR4).

## Cutting over — a deliberate, one-time operator step

The production database **already contains this schema**, so `migrate deploy`
would try to create tables that exist and fail. It has to be told the baseline is
already applied, once:

```bash
npx prisma migrate resolve --applied 0_init
```

Run that against production **once**, with `DATABASE_URL` pointing at it. Then
change `render.yaml`'s build command from:

```
npm install && npx prisma generate && npx prisma db push
```

to:

```
npm install && npx prisma generate && npx prisma migrate deploy
```

This repo deliberately does **not** make that swap for you: doing it before the
baseline is recorded breaks the deploy, and doing it automatically (e.g.
`migrate resolve || true`) would silently mark the baseline applied on a *fresh*
database without creating any tables — a much worse failure. It is two commands
in the right order, and it should be run by someone watching.

## Afterwards

Create schema changes with `npx prisma migrate dev --name <what-changed>`, which
writes a reviewable `.sql` file alongside the schema edit. `db push` remains fine
for throwaway local databases; it should not touch production again.

Take a backup before the cutover. There is no pre-deploy backup step anywhere in
`render.yaml`.
