# Graph Report - .  (2026-08-23)

## Corpus Check
- Corpus is ~19,581 words - fits in a single context window. You may not need a graph.

## Summary
- 297 nodes · 559 edges · 24 communities (12 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Cloud Synchronization|Cloud Synchronization]]
- [[_COMMUNITY_Release Manifest|Release Manifest]]
- [[_COMMUNITY_Beta Application UI|Beta Application UI]]
- [[_COMMUNITY_Gateway HTTP Server|Gateway HTTP Server]]
- [[_COMMUNITY_Gateway Request Handling|Gateway Request Handling]]
- [[_COMMUNITY_Product Routes|Product Routes]]
- [[_COMMUNITY_Gateway Configuration|Gateway Configuration]]
- [[_COMMUNITY_Gateway Origin Policy|Gateway Origin Policy]]
- [[_COMMUNITY_Application Icons|Application Icons]]
- [[_COMMUNITY_Production Release Features|Production Release Features]]
- [[_COMMUNITY_Release Documentation|Release Documentation]]
- [[_COMMUNITY_Gateway Tests|Gateway Tests]]
- [[_COMMUNITY_Gateway Setup CLI|Gateway Setup CLI]]
- [[_COMMUNITY_Gateway Prompting|Gateway Prompting]]
- [[_COMMUNITY_Sync Configuration|Sync Configuration]]
- [[_COMMUNITY_Root Redirect|Root Redirect]]
- [[_COMMUNITY_Maskable Root Icons|Maskable Root Icons]]
- [[_COMMUNITY_Production Service Worker|Production Service Worker]]
- [[_COMMUNITY_Beta Service Worker|Beta Service Worker]]
- [[_COMMUNITY_Tracking Migration|Tracking Migration]]
- [[_COMMUNITY_Root App Icon|Root App Icon]]
- [[_COMMUNITY_Label App Icon|Label App Icon]]
- [[_COMMUNITY_Root Maskable Icon|Root Maskable Icon]]
- [[_COMMUNITY_Label Maskable Icon|Label Maskable Icon]]

## God Nodes (most connected - your core abstractions)
1. `files_sha256` - 43 edges
2. `GatewayHandler` - 15 edges
3. `GatewayHandler` - 15 edges
4. `captureProfile()` - 15 edges
5. `updateUI()` - 15 edges
6. `applyRemote()` - 14 edges
7. `injectUI()` - 14 edges
8. `setStatus()` - 14 edges
9. `loadWorkspaces()` - 12 edges
10. `currentProfileId()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `LabelOnZeWay iPhone web app` --references--> `LabelOnZeWay LZ wordmark app icon`  [EXTRACTED]
  labelonzeway/index.html → icons/icon-192.png
- `LZ application icon with right arrow` --semantically_similar_to--> `LZ application icon with right arrow`  [INFERRED] [semantically similar]
  icons/icon-512.png → labelonzeway/icons/icon-512.png
- `Maskable LZ application icon` --semantically_similar_to--> `Maskable LZ application icon`  [INFERRED] [semantically similar]
  icons/icon-maskable-192.png → labelonzeway/icons/icon-maskable-192.png
- `Maskable LZ application icon` --semantically_similar_to--> `Maskable LZ application icon`  [INFERRED] [semantically similar]
  icons/icon-maskable-512.png → labelonzeway/icons/icon-maskable-512.png
- `LabelOnZeWay Guided route` --references--> `cloud synchronization`  [EXTRACTED]
  guided/index.html → command/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LabelOnZeWay direct printing workflow** — labelonzeway_index_mobile_app, printing_pos80c_setup, printing_local_gateway [EXTRACTED 1.00]

## Communities (24 total, 12 thin omitted)

### Community 0 - "Cloud Synchronization"
Cohesion: 0.11
Nodes (57): applyRemote(), cancelPasswordForm(), captureProfile(), clearPasswordFields(), clearRecoveryUrl(), closePanel(), configured(), connectClient() (+49 more)

### Community 1 - "Release Manifest"
Cohesion: 0.04
Nodes (48): date, deployment_layout, files_sha256, 404.html, configure_gateway.py, DEPLOYMENT_CHECKLIST.md, downloads/configure_gateway.py, downloads/gateway-config.json (+40 more)

### Community 2 - "Beta Application UI"
Cohesion: 0.09
Nodes (38): BASE, bindDraft(), command(), customerFrom(), customerInputs(), esc(), fields(), guided() (+30 more)

### Community 3 - "Gateway HTTP Server"
Cohesion: 0.15
Nodes (17): BaseHTTPRequestHandler, clean_origin(), GatewayHandler, lan_addresses(), load_config(), main(), placeholder(), bool (+9 more)

### Community 4 - "Gateway Request Handling"
Cohesion: 0.17
Nodes (15): clean_origin(), GatewayHandler, lan_addresses(), load_config(), main(), placeholder(), bool, bytes (+7 more)

### Community 5 - "Product Routes"
Cohesion: 0.08
Nodes (25): cloud synchronization, LabelOnZeWay Command route, LabelOnZeWay Guided route, LabelOnZeWay LZ wordmark app icon, PWA manifest, SHIPDESK application entrypoint, browser-stored records, LabelOnZeWay installation guide (+17 more)

### Community 6 - "Gateway Configuration"
Cohesion: 0.29
Nodes (6): allowed_origins, host, open_browser, pages_url, port, web_root

### Community 7 - "Gateway Origin Policy"
Cohesion: 0.29
Nodes (6): allowed_origins, host, open_browser, pages_url, port, web_root

### Community 8 - "Application Icons"
Cohesion: 0.40
Nodes (5): LZ application icon with right arrow, Maskable LZ application icon, LZ application icon with right arrow, LZ application icon with right arrow, Maskable LZ application icon

### Community 9 - "Production Release Features"
Cohesion: 0.40
Nodes (5): non-destructive address-book recovery, password recovery and change flows, labelonzeway-ios-web-v130-auth4-address1 cache, Supabase-backed workspace synchronization, LabelOnZeWay Web iOS 1.3.0 release notes

### Community 10 - "Release Documentation"
Cohesion: 0.50
Nodes (4): historical address-book recovery, POS80C direct printing, Web iOS 1.3.0 release candidate, Supabase shared-workspace synchronization

### Community 11 - "Gateway Tests"
Cohesion: 0.83
Nodes (3): free_port(), main(), request()

## Knowledge Gaps
- **106 isolated node(s):** `release`, `date`, `deployment_layout`, `publication_status`, `.nojekyll` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GatewayHandler` connect `Gateway Request Handling` to `Gateway HTTP Server`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `release`, `date`, `deployment_layout` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cloud Synchronization` be split into smaller, more focused modules?**
  _Cohesion score 0.11412429378531073 - nodes in this community are weakly interconnected._
- **Should `Release Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Beta Application UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09308510638297872 - nodes in this community are weakly interconnected._
- **Should `Product Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._