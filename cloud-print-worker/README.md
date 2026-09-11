# LabelOnZeWay Cloud Print Worker

## Purpose

This worker removes the need for a print bridge/driver on every Windows PC, Mac, iPhone or Android device running LabelOnZeWay.

Client flow:

`LabelOnZeWay browser/PWA -> Supabase cloud_print_jobs -> printer-side worker -> POS80C 192.168.100.73:9100`

The worker must run on **one always-on device on the same LAN as the printer** because `192.168.100.73` is a private address and cannot be reached directly by a public cloud service. Recommended final host: Raspberry Pi / mini-PC / NAS. A Mac or Windows PC can also run it, but client computers do not need it.

## Security / reliability

- Authenticates as an ordinary Supabase user; no service-role key is stored.
- Uses the existing Row Level Security and workspace membership checks.
- Only the configured printer host/port is accepted.
- Payload is validated as Base64 and limited to 16 MB.
- Job is moved to `sending` **before** bytes are transmitted. A network/cloud failure after transmission becomes `uncertain` instead of silently reprinting and producing duplicate physical labels.
- Old payloads are purged by the existing Supabase RPC.

## Configuration

Copy `cloud-print-worker.example.json` to `cloud-print-worker.json`, then set:

- `workspace_id`
- `email`

The production LabelOnZeWay Supabase URL/key and POS80C target are already represented in the example.

Set the Supabase user's password in an environment variable rather than storing it in Git:

### macOS / Linux / Raspberry Pi

```bash
export LABELONZEWAY_CLOUD_PASSWORD='your-password'
python3 labelonzeway_cloud_print_worker.py --config cloud-print-worker.json
```

### Windows PowerShell

```powershell
$env:LABELONZEWAY_CLOUD_PASSWORD='your-password'
python .\labelonzeway_cloud_print_worker.py --config .\cloud-print-worker.json
```

## Regression test

```bash
python3 -m unittest -v test_cloud_print_worker.py
```

The regression suite validates:

1. exact ESC/POS byte delivery to a simulated TCP printer;
2. safe state ordering (`sending` before transmit, then `printed`);
3. invalid Base64 rejection;
4. unauthorized printer target rejection;
5. empty payload rejection;
6. one-time reauthentication after an expired Supabase token.

## Physical UAT gate

Software validation cannot prove the real POS80C paper/cutter hardware without access to the printer LAN. Final physical acceptance is:

1. worker device can open TCP `192.168.100.73:9100`;
2. enqueue one LabelOnZeWay TEST label from iPhone;
3. Supabase job changes `queued -> printing -> sending -> printed`;
4. POS80C produces exactly one correctly formatted 72/80 mm label and cuts once;
5. repeat from a Mac/Windows browser with no local print bridge installed.

Do not expose printer port 9100 to the public internet.
