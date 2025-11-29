import requests

paths = [
    "/csp/healthshare/fhirserver/fhir/r4/metadata",
    "/csp/healthshare/FHIRSERVER/fhir/r4/metadata",
    "/fhir-server/r4/metadata",
    "/fhirserver/fhir/r4/metadata",
    "/fhir/r4/metadata",
    "/r4/metadata",
    "/api/fhir/r4/metadata",
]

for path in paths:
    try:
        r = requests.get(f"http://localhost:32783{path}", timeout=5)
        print(f"{path}: {r.status_code}")
        if r.status_code == 200:
            print(f"  ✓ FOUND! Content type: {r.headers.get('content-type')}")
    except Exception as e:
        print(f"{path}: ERROR - {e}")
