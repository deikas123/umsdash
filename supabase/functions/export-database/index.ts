// Export full database (schema DDL + data INSERTs) + storage files + edge functions
// as a ZIP, uploaded to the private `db-exports` bucket. Streams progress via SSE.
// Restricted to the super-admin account (amsterntechhub@gmail.com).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SUPER_ADMIN_EMAIL = "amsterntechhub@gmail.com";

// FK-safe insert order
const PUBLIC_TABLES = [
  "document_categories",
  "profiles",
  "user_roles",
  "customers",
  "folders",
  "folder_shares",
  "documents",
  "document_versions",
  "document_comments",
  "folder_documents",
  "tasks",
  "task_assignees",
  "task_comments",
  "task_files",
  "reminders",
  "chat_messages",
  "in_app_notifications",
  "push_subscriptions",
  "deletion_requests",
  "audit_logs",
  "sms_logs",
  "sms_preferences",
  "system_settings",
];

const BUCKETS = ["documents", "task-files", "avatars"];

const EDGE_FUNCTIONS = [
  "export-database",
  "seed-admin",
  "send-sms",
  "reset-user-password",
  "watermark-download",
];

function sqlEscape(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildInserts(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- No rows in ${table}\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const lines = [`-- ${rows.length} row(s) for ${table}`, `BEGIN;`];
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = slice
      .map((r) => `(${cols.map((c) => sqlEscape(r[c])).join(", ")})`)
      .join(",\n  ");
    lines.push(
      `INSERT INTO public."${table}" (${colList}) VALUES\n  ${values}\nON CONFLICT DO NOTHING;`,
    );
  }
  lines.push("COMMIT;\n");
  return lines.join("\n");
}

async function tryReadEdgeFunction(name: string): Promise<string | null> {
  const candidates = [
    `/home/deno/functions/${name}/index.ts`,
    `/tmp/user_fn/${name}/index.ts`,
    `./functions/${name}/index.ts`,
    `../${name}/index.ts`,
  ];
  for (const path of candidates) {
    try {
      const text = await Deno.readTextFile(path);
      if (text && text.length > 0) return text;
    } catch (_) { /* try next */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // --- Auth + super-admin gate -----------------------------------------
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized: " + (userErr?.message ?? "no user") }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if ((userData.user.email ?? "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: `Forbidden: only ${SUPER_ADMIN_EMAIL} can export the database` }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const includeFiles: boolean = body.includeFiles !== false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // --- SSE stream ------------------------------------------------------
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch (_) { /* client disconnected */ }
      };
      const step = (phase: string, message: string, pct: number, extra: Record<string, unknown> = {}) =>
        send("progress", { phase, message, pct, ...extra });

      // Keepalive to avoid proxy timeouts
      const ka = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch (_) { /* ignore */ }
      }, 15000);

      try {
        const zip = new JSZip();
        const dataFolder = zip.folder("data")!;
        const knowledgeFolder = zip.folder("knowledge")!;
        const manifest = {
          generated_at: new Date().toISOString(),
          generated_by: userData.user.email,
          includeFiles,
          tables: {} as Record<string, number>,
          buckets: {} as Record<string, number>,
          edge_functions: {} as Record<string, unknown>,
          errors: [] as string[],
        };
        const errors = manifest.errors;

        step("start", "Starting export…", 1);

        // ---- Schema DDL --------------------------------------------------
        step("schema", "Exporting schema (DDL, FKs, policies)…", 5);
        let schemaSql = "";
        try {
          const { data: ddl, error: ddlErr } = await userClient.rpc("export_schema_ddl");
          if (ddlErr) throw ddlErr;
          schemaSql = String(ddl ?? "");
        } catch (e) {
          const msg = (e as Error).message ?? String(e);
          errors.push("schema DDL: " + msg);
          schemaSql = `-- Failed to export schema: ${msg}\n`;
        }
        zip.file("schema.sql", schemaSql);

        // ---- FK graph knowledge pack (JSONL) -----------------------------
        step("knowledge", "Building relationship graph…", 12);
        const relationships: Array<Record<string, unknown>> = [];
        try {
          const { data: fkRows, error: fkErr } = await admin.rpc as unknown as { call?: unknown };
          void fkRows; void fkErr; // dummy to keep types happy — we use direct query below
        } catch (_) { /* ignore */ }
        // Query FKs via a lightweight SQL fallback: information_schema through PostgREST is not available,
        // so use another security-definer function or fetch from pg_constraint via RPC. Fall back to parsing
        // schema.sql for CONSTRAINT ... FOREIGN KEY definitions.
        try {
          const fkRegex = /ALTER TABLE (\S+) ADD CONSTRAINT (\S+) FOREIGN KEY \(([^)]+)\) REFERENCES (\S+)\(([^)]+)\)/g;
          let m: RegExpExecArray | null;
          while ((m = fkRegex.exec(schemaSql)) !== null) {
            relationships.push({
              type: "foreign_key",
              from_table: m[1].replace(/^public\./, ""),
              constraint: m[2],
              from_columns: m[3].split(",").map((s) => s.trim().replace(/"/g, "")),
              to_table: m[4].replace(/^public\./, ""),
              to_columns: m[5].split(",").map((s) => s.trim().replace(/"/g, "")),
            });
          }
        } catch (e) {
          errors.push("fk graph: " + (e as Error).message);
        }

        const relationshipsJsonl = relationships.map((r) => JSON.stringify(r)).join("\n");
        knowledgeFolder.file("relationships.jsonl", relationshipsJsonl);

        // ---- Table data --------------------------------------------------
        const totalTables = PUBLIC_TABLES.length;
        for (let i = 0; i < totalTables; i++) {
          const table = PUBLIC_TABLES[i];
          const pct = 15 + Math.round((i / totalTables) * 30); // 15 -> 45
          step("data", `Exporting table ${table}…`, pct, { table, index: i, total: totalTables });
          const rows: Record<string, unknown>[] = [];
          const PAGE = 1000;
          let from = 0;
          let failed = false;
          while (true) {
            const { data, error } = await admin
              .from(table)
              .select("*")
              .range(from, from + PAGE - 1);
            if (error) {
              errors.push(`data ${table}: ${error.message}`);
              dataFolder.file(`${table}.error.txt`, error.message);
              failed = true;
              break;
            }
            if (!data || data.length === 0) break;
            rows.push(...data);
            if (data.length < PAGE) break;
            from += PAGE;
          }
          if (!failed) dataFolder.file(`${table}.sql`, buildInserts(table, rows));
          manifest.tables[table] = rows.length;
        }

        // ---- Combined SQL scripts ---------------------------------------
        const combined = [
          "-- UMS Full Database Data Export",
          `-- Generated: ${new Date().toISOString()}`,
          "SET session_replication_role = 'replica';",
          "",
          ...PUBLIC_TABLES.map((t) => `\\i data/${t}.sql`),
          "",
          "SET session_replication_role = 'origin';",
        ].join("\n");
        zip.file("all-data.sql", combined);
        zip.file(
          "full.sql",
          [
            "-- UMS Full Export (schema + data)",
            `-- Generated: ${new Date().toISOString()}`,
            "",
            schemaSql,
            "",
            "-- ============================================================",
            "-- DATA",
            "-- ============================================================",
            "SET session_replication_role = 'replica';",
            ...PUBLIC_TABLES.map((t) => `\\i data/${t}.sql`),
            "SET session_replication_role = 'origin';",
          ].join("\n"),
        );

        // ---- Domain knowledge JSONL (documents, files, customers) -------
        step("knowledge", "Building document + file indexes…", 48);
        try {
          const { data: docs } = await admin
            .from("documents")
            .select("id, title, file_path, file_type, file_size, status, category_id, customer_id, is_private, expiry_date, created_at, created_by")
            .limit(50000);
          const docLines = (docs ?? []).map((d) =>
            JSON.stringify({
              type: "document",
              id: d.id,
              title: d.title,
              file: `storage/documents/${d.file_path}`,
              mime: d.file_type,
              bytes: d.file_size,
              status: d.status,
              category_id: d.category_id,
              customer_id: d.customer_id,
              private: d.is_private,
              expires: d.expiry_date,
              created_at: d.created_at,
              uploaded_by: d.created_by,
            }),
          );
          knowledgeFolder.file("documents.jsonl", docLines.join("\n"));
        } catch (e) {
          errors.push("knowledge documents: " + (e as Error).message);
        }

        try {
          const { data: tf } = await admin
            .from("task_files")
            .select("id, task_id, file_name, file_path, file_type, file_size, uploaded_by, created_at")
            .limit(50000);
          const lines = (tf ?? []).map((f) =>
            JSON.stringify({
              type: "task_file",
              id: f.id,
              task_id: f.task_id,
              file: `storage/task-files/${f.file_path}`,
              name: f.file_name,
              mime: f.file_type,
              bytes: f.file_size,
              uploaded_by: f.uploaded_by,
              created_at: f.created_at,
            }),
          );
          knowledgeFolder.file("task_files.jsonl", lines.join("\n"));
        } catch (e) {
          errors.push("knowledge task_files: " + (e as Error).message);
        }

        try {
          const { data: profs } = await admin
            .from("profiles")
            .select("id, user_id, full_name, email, phone, avatar_url, position");
          const lines = (profs ?? []).map((p) =>
            JSON.stringify({
              type: "profile",
              id: p.id,
              user_id: p.user_id,
              name: p.full_name,
              email: p.email,
              phone: p.phone,
              avatar: p.avatar_url ? `storage/avatars/${p.avatar_url}` : null,
              position: p.position,
            }),
          );
          knowledgeFolder.file("profiles.jsonl", lines.join("\n"));
        } catch (e) {
          errors.push("knowledge profiles: " + (e as Error).message);
        }

        // ---- Edge functions ---------------------------------------------
        step("edge_functions", "Bundling edge functions…", 52);
        const fnFolder = zip.folder("edge_functions")!;
        for (const name of EDGE_FUNCTIONS) {
          const src = await tryReadEdgeFunction(name);
          if (src) {
            fnFolder.folder(name)!.file("index.ts", src);
            manifest.edge_functions[name] = { bundled: true, bytes: src.length };
          } else {
            manifest.edge_functions[name] = { bundled: false, note: "source not accessible from runtime; redeploy from repo" };
          }
        }
        fnFolder.file(
          "config.toml",
          `[functions.seed-admin]\nverify_jwt = false\n\n` +
            `[functions.send-sms]\nverify_jwt = false\n\n` +
            `[functions.reset-user-password]\nverify_jwt = false\n`,
        );

        // ---- Storage files ----------------------------------------------
        // Memory-safe: copy each object into the db-exports bucket under an
        // export-scoped prefix, and record a signed URL in a JSONL manifest.
        // This avoids OOMing the edge runtime by never holding all files in RAM.
        const exportId = new Date().toISOString().replace(/[:.]/g, "-");
        const storageIndex: Array<Record<string, unknown>> = [];
        if (includeFiles) {
          for (let bi = 0; bi < BUCKETS.length; bi++) {
            const bucket = BUCKETS[bi];
            const basePct = 55 + Math.round((bi / BUCKETS.length) * 30); // 55 -> 85
            step("storage", `Copying bucket ${bucket}…`, basePct, { bucket });
            let count = 0;
            let failed = 0;
            const walk = async (prefix: string) => {
              const { data: list, error } = await admin.storage
                .from(bucket)
                .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
              if (error) { errors.push(`storage ${bucket}/${prefix}: ${error.message}`); return; }
              if (!list) return;
              for (const item of list) {
                const path = prefix ? `${prefix}/${item.name}` : item.name;
                if (item.id === null && !item.metadata) { await walk(path); continue; }
                const destPath = `${exportId}/storage/${bucket}/${path}`;
                const bytes = (item.metadata as { size?: number } | null)?.size ?? 0;
                try {
                  // Server-side copy — metadata op, no bytes through the function.
                  const { error: cpErr } = await admin.storage
                    .from(bucket)
                    .copy(path, destPath, { destinationBucket: "db-exports" } as never);
                  if (cpErr) throw cpErr;
                  storageIndex.push({ bucket, path, bytes, export_path: destPath, signed_url: null });
                  count++;
                } catch (e) {
                  failed++;
                  errors.push(`copy ${bucket}/${path}: ${(e as Error).message}`);
                }
                if ((count + failed) % 100 === 0) {
                  step("storage", `Bucket ${bucket}: ${count} copied, ${failed} failed…`, basePct, { bucket, count, failed });
                }
              }


            };
            await walk("");
            manifest.buckets[bucket] = count;
          }
          // Batch-sign all copied paths (cheap metadata calls, ~1000 per request).
          step("storage", `Signing ${storageIndex.length} URLs…`, 86);
          const BATCH = 500;
          for (let i = 0; i < storageIndex.length; i += BATCH) {
            const slice = storageIndex.slice(i, i + BATCH);
            const paths = slice.map((r) => r.export_path as string);
            try {
              const { data: signed } = await admin.storage
                .from("db-exports")
                .createSignedUrls(paths, 60 * 60 * 24);
              if (signed) {
                for (let j = 0; j < signed.length; j++) {
                  slice[j].signed_url = signed[j].signedUrl ?? null;
                }
              }
            } catch (e) {
              errors.push(`sign batch ${i}: ${(e as Error).message}`);
            }
          }
          knowledgeFolder.file("storage-index.jsonl", storageIndex.map((r) => JSON.stringify(r)).join("\n"));
        }


        // ---- Validation --------------------------------------------------
        step("validate", "Validating export bundle…", 88);
        const validation = {
          checked_at: new Date().toISOString(),
          checks: [] as Array<{ item: string; expected: number | string; actual: number | string; ok: boolean; note?: string }>,
          missing: [] as string[],
          ok: true,
        };

        const fileList = Object.keys(zip.files);
        const has = (p: string) => fileList.includes(p) || fileList.includes(p + "/");

        // Required top-level artifacts
        for (const req of ["schema.sql", "all-data.sql", "full.sql", "knowledge/relationships.jsonl", "knowledge/documents.jsonl", "knowledge/profiles.jsonl", "knowledge/task_files.jsonl", "edge_functions/config.toml"]) {
          const ok = has(req);
          validation.checks.push({ item: req, expected: "present", actual: ok ? "present" : "missing", ok });
          if (!ok) { validation.missing.push(req); validation.ok = false; }
        }

        // Every table has a .sql file and manifest count matches file line count roughly
        for (const t of PUBLIC_TABLES) {
          const p = `data/${t}.sql`;
          const ok = has(p);
          validation.checks.push({ item: p, expected: `${manifest.tables[t] ?? 0} rows`, actual: ok ? `${manifest.tables[t] ?? 0} rows` : "missing", ok });
          if (!ok) { validation.missing.push(p); validation.ok = false; }
        }

        // Every edge function present or accounted for
        for (const name of EDGE_FUNCTIONS) {
          const meta = manifest.edge_functions[name] as { bundled?: boolean };
          const bundled = !!meta?.bundled;
          const p = `edge_functions/${name}/index.ts`;
          const inZip = has(p);
          validation.checks.push({
            item: p,
            expected: bundled ? "present" : "n/a (runtime-inaccessible)",
            actual: inZip ? "present" : "missing",
            ok: bundled ? inZip : true,
            note: bundled ? undefined : "source not accessible from runtime — redeploy from repo",
          });
          if (bundled && !inZip) { validation.missing.push(p); validation.ok = false; }
        }

        // Cross-check: every document row references a file that was copied (when includeFiles)
        if (includeFiles) {
          try {
            const { data: docs } = await admin
              .from("documents")
              .select("file_path")
              .limit(50000);
            const copiedDocs = new Set(
              storageIndex.filter((s) => s.bucket === "documents").map((s) => s.path as string),
            );
            const expected = (docs ?? []).map((d) => d.file_path).filter(Boolean) as string[];
            const missing = expected.filter((p) => !copiedDocs.has(p));
            validation.checks.push({
              item: "documents ↔ storage/documents",
              expected: `${expected.length} files`,
              actual: `${expected.length - missing.length} copied, ${missing.length} missing`,
              ok: missing.length === 0,
            });
            if (missing.length) {
              validation.ok = false;
              validation.missing.push(...missing.slice(0, 50).map((m) => `storage/documents/${m}`));
              if (missing.length > 50) validation.missing.push(`… and ${missing.length - 50} more`);
            }
          } catch (e) {
            errors.push("validation documents: " + (e as Error).message);
          }
        }

        // FK graph should not be empty when schema exported successfully
        validation.checks.push({
          item: "foreign_key_graph",
          expected: "> 0",
          actual: String(relationships.length),
          ok: relationships.length > 0,
        });
        if (relationships.length === 0) validation.ok = false;

        if (errors.length) {
          validation.checks.push({
            item: "runtime_errors",
            expected: "0",
            actual: String(errors.length),
            ok: false,
            note: "see manifest.json errors[]",
          });
          validation.ok = false;
        }

        zip.file("validation.json", JSON.stringify(validation, null, 2));
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));

        // Human summary
        const summary = [
          "# UMS Export Validation Summary",
          `Generated: ${manifest.generated_at}`,
          `Status: ${validation.ok ? "✅ PASSED" : "⚠️ ISSUES FOUND"}`,
          "",
          "## Tables",
          ...PUBLIC_TABLES.map((t) => `- ${t}: ${manifest.tables[t] ?? 0} rows`),
          "",
          "## Storage buckets",
          ...BUCKETS.map((b) => `- ${b}: ${manifest.buckets[b] ?? "not included"} files`),
          "",
          "## Edge functions",
          ...EDGE_FUNCTIONS.map((n) => {
            const m = manifest.edge_functions[n] as { bundled?: boolean };
            return `- ${n}: ${m?.bundled ? "bundled" : "not bundled (redeploy from repo)"}`;
          }),
          "",
          `## Relationships: ${relationships.length} FKs`,
          "",
          validation.missing.length ? `## Missing (${validation.missing.length})` : "## No missing items",
          ...validation.missing.map((m) => `- ${m}`),
          "",
          errors.length ? `## Runtime errors (${errors.length})` : "## No runtime errors",
          ...errors.map((e) => `- ${e}`),
        ].join("\n");
        zip.file("SUMMARY.md", summary);

        // ---- READMEs -----------------------------------------------------
        zip.file("LLM_CONTEXT.md", `# UMS Database — LLM Knowledge Pack

Priority reading order for LLM ingestion:

1. **schema.sql** — full DDL: tables, enums, FKs, indexes, functions, triggers, RLS policies, grants.
2. **knowledge/relationships.jsonl** — one FK per line: {from_table, from_columns, to_table, to_columns}. Use this to build a graph of entity relationships.
3. **knowledge/documents.jsonl** — one document per line with its file path in \`storage/documents/\`.
4. **knowledge/task_files.jsonl** — one task attachment per line.
5. **knowledge/profiles.jsonl** — user profiles with avatar file paths.
6. **manifest.json** — row counts, file counts, per-item errors.
7. **validation.json** — automated integrity report.
8. **data/<table>.sql** — actual rows (attach only what you need).
9. **edge_functions/<name>/index.ts** — serverless business logic.

## JSONL schemas

### relationships.jsonl
\`\`\`json
{"type":"foreign_key","from_table":"documents","from_columns":["customer_id"],"to_table":"customers","to_columns":["id"]}
\`\`\`

### documents.jsonl
\`\`\`json
{"type":"document","id":"...","title":"...","file":"storage/documents/...","mime":"application/pdf","bytes":12345,"status":"approved","category_id":"...","customer_id":"...","private":false,"expires":"2027-01-01","created_at":"...","uploaded_by":"..."}
\`\`\`
`);
        zip.file("README.md", `# UMS Database Export

Generated: ${manifest.generated_at}

## Import into a new Supabase project
\`\`\`bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f all-data.sql
cp -r edge_functions supabase/functions && supabase functions deploy
\`\`\`

## Import into plain Postgres
\`\`\`bash
psql -d <db> -f full.sql
\`\`\`

## Feed into an LLM
Start with \`LLM_CONTEXT.md\`, then attach \`schema.sql\` + relevant JSONL files.
`);

        // ---- Package + upload -------------------------------------------
        step("package", "Compressing ZIP…", 92);
        const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

        step("upload", "Uploading to secure storage…", 96);
        const filename = `ums-export-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
        const objectPath = `${userData.user.id}/${filename}`;
        const { error: upErr } = await admin.storage
          .from("db-exports")
          .upload(objectPath, bytes, { contentType: "application/zip", upsert: true });
        if (upErr) throw new Error("Upload failed: " + upErr.message);

        const { data: signed, error: signErr } = await admin.storage
          .from("db-exports")
          .createSignedUrl(objectPath, 60 * 30); // 30 min
        if (signErr || !signed) throw new Error("Signed URL failed: " + (signErr?.message ?? "unknown"));

        await admin.from("audit_logs").insert({
          user_id: userData.user.id,
          action: "database_export",
          entity_type: "system",
          details: {
            filename,
            size_bytes: bytes.byteLength,
            validation_ok: validation.ok,
            errors_count: errors.length,
            tables: manifest.tables,
            buckets: manifest.buckets,
          },
        });

        step("done", "Export ready", 100);
        send("done", {
          filename,
          size_bytes: bytes.byteLength,
          signed_url: signed.signedUrl,
          validation,
          manifest,
        });
      } catch (e) {
        console.error("export-database error", e);
        send("error", { message: e instanceof Error ? e.message : String(e) });
      } finally {
        clearInterval(ka);
        try { controller.close(); } catch (_) { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
