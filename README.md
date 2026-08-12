# Validation

Run the dependency-free gateway integration test from the repository root:

```bash
python3 tests/test_gateway.py
```

It checks exact hosted-origin CORS, same-gateway local origin access, rejection of another private origin, private-network preflight headers, ESC/POS byte forwarding to a mock local printer, and static LabelOnZeWay serving.
