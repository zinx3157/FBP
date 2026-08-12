# Release notes — GitHub Pages package 1.0

Date: 2026-08-12

## Included

- Responsive root launch page for both applications.
- SHIPDESK at `/shipdesk/` with the complete validated desktop workflow.
- LabelOnZeWay PWA at `/labelonzeway/` with relative Pages-safe manifest, service-worker scope, and icon paths.
- System/browser printing for desktop, AirPrint, and Android print services.
- Direct ESC/POS raster printing with one cut after every selected label.
- Hosted-origin gateway 2.0 with:
  - exact GitHub Pages origin configuration;
  - same-origin access for the bundled local mobile site;
  - private/local printer destination enforcement;
  - Local/Private Network Access response headers;
  - macOS and Windows launchers;
  - local LabelOnZeWay route for iPhone/iPad direct printing.
- GitHub Pages branch deployment instructions and optional Actions workflow.
- Public-site privacy, PWA installation, and printing compatibility guidance.

## Hosted direct-print behavior

- Desktop Chromium/Firefox-family browsers: loopback gateway access is generally practical, subject to browser local-network permission.
- Android Chrome: a computer LAN gateway URL can work, subject to browser version, local-network permission, Wi-Fi, and firewall configuration.
- Safari/iOS: public HTTPS to local HTTP is not dependable. Use AirPrint from the public app or open the gateway's local `/labelonzeway/` address for direct ESC/POS output.

## Placeholder configuration

The project intentionally leaves `USERNAME` and `REPOSITORY` placeholders in gateway configuration and documentation. The launcher prompts for the final values once. Application URLs and PWA assets are relative, so the app source does not require path rewriting.
