# LabelOnZeWay Beta 2

Side-by-side test build for `/FBP/labelonzeway-beta2/`. It does not replace `/FBP/labelonzeway/`.

## Included

- Shared teal LabelOnZeWay visual identity and matching `/shipdesk-beta2/` preview
- Light, dark, and system themes
- Mobile manifest constrained to the device width
- Native share, WhatsApp, and Messenger hand-off actions
- Existing-customer autocomplete by name, phone, area, or address
- Separate sales, delivery, and total-COD figures
- Save-customer-and-create-label actions
- Post-creation edit, print, share, complete, and delete controls
- Protected company-profile deletion
- Explicit fallback profile selection after deletion
- Admin, staff, and viewer role-aware controls for cloud workspaces
- Automated two-day delivery/payment exception report from active and archived manifests
- Date-based daily order numbers (`17826-1`, `17826-2`, … on 17 August 2026)
- Non-intrusive scan-review overlay beside the uploaded picture; stays open until customer/address and price are confirmed, then collapses
- iOS System Print/AirPrint without a computer bridge

## Data safety

Beta 2 uses `lzb2.*` and `b2.*` browser-storage keys. On first use it copies available local production records into the Beta namespace. Beta edits do not write back to the live browser data. Cloud synchronization is disabled until the Beta data migration is approved.

Direct raw ESC/POS output from an iOS Safari/PWA still requires either an AirPrint-compatible printer, the iOS system print sheet, or a native iOS wrapper. A public web page cannot open raw TCP port 9100 directly.

The experimental Qwen controls are hidden in Beta 2. A public HTML app cannot protect a Qwen/OpenRouter API key, and sending customer label images to a variable free endpoint is not an acceptable production default.
