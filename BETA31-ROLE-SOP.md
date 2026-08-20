# LabelOnZeWay Beta 3.1 — User Role SOP

## Purpose

Use the workspace assigned to the user's operational responsibility. Do not share Command access with preparation staff or riders merely for convenience.

## 1. Command

**Who uses it:** owner, operations manager, dispatcher, reconciliation supervisor, authorized administrator.

**Use Command for:**

- Daily parcel and COD overview.
- Exception monitoring and escalation.
- Full Manifest access and batch actions.
- Assigning route order and riders.
- Tracking-platform oversight.
- PDF, reports, archive and reconciliation.
- System Print or authorized POS gateway printing.
- Correcting records after escalation.

**Do not use Command for:** routine label entry on a shared preparation device or normal doorstep delivery updates.

**Start-of-day:** confirm profile, cloud status, manifest date, printer method and unresolved exceptions.

**End-of-day:** confirm all parcels have a status, reconcile COD, review exceptions, close the manifest, verify the PDF/archive and back up.

## 2. Guided

**Who uses it:** shop operator, customer-service agent, packing operator, label-preparation staff.

**Use Guided for:**

- Selecting or creating a customer.
- Adding the parcel photo.
- Confirming detected contact/address information.
- Entering quantity, unit price, COD and delivery cost.
- Creating, previewing and printing the label.
- Adding the parcel to the active Manifest.

**Do not use Guided for:** changing delivered parcels, closing the day, reconciliation, deleting archives or managing Rider delivery proof.

**Required checks before Save + Print:** correct customer, valid phone prefix, meaningful address, quantity, unit price, calculated collect amount, delivery cost and delivery date.

**Handoff to Command:** report duplicate customers, uncertain OCR, pricing disputes, print failures and any amendment after dispatch.

## 3. Rider

**Who uses it:** assigned driver, motorcycle courier, delivery agent or route supervisor operating as a rider.

**Use Rider for:**

- Viewing the next assigned stop.
- Calling the customer and opening Maps.
- Confirming COD due.
- Recording Dispatched, In transit, Delivered or Exception.
- Capturing recipient/proof information.
- Recording an exception reason.

**Do not use Rider for:** creating customers, changing prices, editing labels, deleting parcels, changing company profiles or closing manifests.

**Delivery rule:** mark Delivered only after physical handover and required COD/proof confirmation. Otherwise select Exception and record the factual reason.

**Handoff to Command:** cash difference, refusal, damage, wrong address, unreachable customer, return request or any status that cannot be synchronized.

## Responsibility matrix

| Action | Command | Guided | Rider |
|---|:---:|:---:|:---:|
| View all operational KPIs | Yes | No | No |
| Create/select customer | Yes | Yes | No |
| OCR/photo preparation | Yes | Yes | Limited rescan |
| Create label | Yes | Yes | No |
| Edit price/COD | Yes | Before dispatch | No |
| Print label | Yes | Yes | No |
| Full Manifest control | Yes | No | Assigned stops only |
| Assign route/rider | Yes | No | No |
| Update delivery status | Yes | Initial status only | Yes |
| Capture delivery proof | Review | No | Yes |
| Reconcile/close day | Yes | No | No |
| Delete/archive/profile administration | Authorized Command only | No | No |

## Escalation sequence

1. Guided creates and verifies the parcel.
2. Command reviews, assigns and dispatches it.
3. Rider delivers or records an exception.
4. Command reviews proof, tracking and COD.
5. Command closes and archives the manifest.
