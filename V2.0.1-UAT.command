#!/bin/bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"
echo "LabelOnZeWay V2.0.1 — Automated release gate"
echo "============================================="
python3 -m py_compile labelonzeway_local_service.py
bash -n ./*.command
grep -q '<b>V2.0.1</b>' labelonzeway/index.html
grep -q 'MILESTONE HISTORY' labelonzeway/index.html
grep -q "labelonzeway-v2.0.1" labelonzeway/service-worker.js
grep -q "idempotency_key" SUPABASE_CLOUD_PRINT_SETUP.sql
grep -q "status='uncertain'" SUPABASE_CLOUD_PRINT_SETUP.sql
grep -q "gateway_secret" labelonzeway_local_service.py
grep -q "X-LabelOnZeWay-Key" labelonzeway/index.html
grep -q "withoutPhotos" labelonzeway/cloud-sync.js
if grep -q "state.archive=state.archive.slice(0,90)" labelonzeway/index.html; then
  echo "FAIL: silent archive truncation remains"; exit 10
fi
echo "AUTOMATED RELEASE GATE: PASS"
echo "Physical UAT still required: profile, sync, one cloud print, one cut, milestone history, rollback backup."
