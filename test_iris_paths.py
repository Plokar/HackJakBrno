#!/usr/bin/env python3
import requests

# Zkusím různé možné cesty
paths = [
    "/",
    "/csp/sys/UtilHome.csp",
    "/csp/fhirUI",
    "/fhirUI",
    "/swagger-ui",
    "/csp/swagger-ui",
    "/fhir/r4/metadata",
    "/csp/fhir/r4/metadata",
    "/csp/healthshare/fhirserver/fhir/r4/metadata",
    "/api/fhir/r4/metadata",
]

base = "http://fhir-server:52773"
print(f"Testing IRIS endpoints on {base}")
print("="*70)

for path in paths:
    try:
        url = f"{base}{path}"
        response = requests.get(url, timeout=5, allow_redirects=False)
        status = response.status_code
        ct = response.headers.get('content-type', 'N/A')
        
        if status in [200, 302]:
            print(f"✓ {status} {path:50s} {ct[:40]}")
        elif status == 404:
            print(f"✗ {status} {path:50s}")
        else:
            print(f"? {status} {path:50s} {ct[:40]}")
    except Exception as e:
        print(f"ERROR {path:50s} {str(e)[:30]}")
