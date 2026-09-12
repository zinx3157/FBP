# LabelOnZeWay Cloud Print Relay

## Purpose

Bridge-free printing for the existing POS80C when the router has a real public IPv4 and supports source-IP-restricted IPv4 port mapping.

Architecture:

`LabelOnZeWay -> Supabase cloud_print_jobs -> Oracle Cloud Always Free VM -> router high TCP port -> 192.168.100.73:9100 -> POS80C`

The iPhone, Android phone, Mac and Windows PC do not run a print bridge.

## Why Oracle Cloud

Use an Always Free eligible compute instance in a public subnet. Assign a **reserved public IPv4** to the instance so the router can allow only that source address.

The relay needs no inbound application port. It only:

1. connects outbound to Supabase over HTTPS;
2. claims one queued print job;
3. marks the job `sending` before TCP transmission;
4. opens TCP to the router's public print mapping;
5. sends the ESC/POS payload;
6. marks the job `printed`, or `uncertain/failed` through the existing Supabase RPCs.

## Router configuration

Do not use DMZ. Do not expose public TCP 9100.

Recommended mapping after the Oracle reserved public IPv4 is known:

- Type: User-defined
- Enable Port Mapping: On
- Mapping Name: `LabelOnZeWay-CloudPrint`
- WAN Name: current Internet WAN
- Internal Host: `192.168.100.73`
- External Source IP Address: Oracle reserved public IPv4, start = end
- Protocol: TCP
- External port number: `49173` - `49173`
- Internal port number: `9100` - `9100`
- External source port number: `1` - `65535`

The router should therefore accept `WAN_PUBLIC_IP:49173` only from the Oracle relay IP and forward it to `192.168.100.73:9100`.

## WAN address

Current tested WAN IPv4: `102.18.55.216`.

This address is DHCP assigned and can change. Initially the relay can target the IP directly. For unattended long-term use, configure DDNS on the router if the HG8145X6-10 account exposes a DDNS feature, then set `target_host` to that hostname.

## Oracle VM installation

Recommended image: Oracle Linux or Ubuntu on an Always Free eligible compute shape.

1. Create the VM in a public subnet.
2. Assign a reserved public IPv4.
3. Record that reserved IPv4. This is the ONLY address that should be entered under the router's External Source IP Address.
4. Copy this directory to the VM.
5. Run:

```bash
sudo bash install-oracle-linux.sh
```

6. Edit `/opt/labelonzeway-cloud-relay/cloud-print-relay.json`.
7. Edit `/etc/labelonzeway-cloud-relay.env` and set the Supabase password.
8. Start:

```bash
sudo systemctl start labelonzeway-cloud-relay
sudo systemctl status labelonzeway-cloud-relay
```

Logs:

```bash
sudo journalctl -u labelonzeway-cloud-relay -f
```

## Security controls

- No Supabase service-role key is stored on the VM.
- The relay signs in as a normal authenticated Supabase user.
- Existing workspace RLS and print RPCs remain in use.
- The relay accepts only one configured destination host and port.
- Private/loopback/link-local destinations are rejected.
- Invalid Base64 is rejected before network transmission.
- The job is moved to `sending` before bytes leave the VM to reduce duplicate-print risk.
- Router source-IP allowlisting prevents arbitrary Internet hosts from reaching the POS80C.
- DMZ must remain disabled.
- Never create an unrestricted `0.0.0.0/0 -> 9100` mapping.

## Regression test

```bash
python3 -m unittest -v test_cloud_relay.py
```

The software tests cover destination restrictions, state ordering, malformed payload protection, and empty payload protection.

## Physical UAT gate

Software tests cannot prove the physical WAN-to-router-to-POS80C path. Final UAT is complete only after:

1. Oracle VM has its reserved public IPv4;
2. router External Source IP is restricted to that exact address;
3. TCP `49173` maps to `192.168.100.73:9100`;
4. one LabelOnZeWay test label is queued;
5. the POS80C prints exactly one copy;
6. Supabase job ends in `printed`.
