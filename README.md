# SHIPDESK + LabelOnZeWay

Public GitHub Pages site:

- SHIPDESK: <https://zinx3157.github.io/FBP/>
- LabelOnZeWay: <https://zinx3157.github.io/FBP/labelonzeway/>
- Installation guide: <https://zinx3157.github.io/FBP/install.html>
- Printing guide: <https://zinx3157.github.io/FBP/printing.html>

## LabelOnZeWay Web iOS 1.2.1

`/labelonzeway/` is the compact Android APK v1.2.1 workflow adapted for iPhone and iPad browsers. It includes coordinated customer and label entry, compact Batch and Manifest views, Back/Cancel controls, separate item quantity and label-copy counts, company profiles, records/archive, queues, exports/backups, an 80 mm condensed Manifest, complete A4 output, and reports.

Install it from Safari with **Share → Add to Home Screen**. System print/AirPrint is the default browser print route.

Safari cannot directly open the POS80C raw TCP port `9100`. For optional direct ESC/POS printing, download the hosted gateway package, run it on a Mac/PC on the printer network, and open its local LabelOnZeWay URL on the iPhone/iPad:

```text
http://COMPUTER_LAN_IP:8765/labelonzeway/
```

Direct label jobs use zero added feed by default and append a cut command after every physical label copy.

## Data safety

The applications are static and local-first. Customer, parcel, profile, queue, and archive data stays in browser storage. Back up records regularly and never commit operational exports, customer data, credentials, or private printer configuration.

## License

No open-source license has been added. Public source visibility does not itself grant reuse rights.
