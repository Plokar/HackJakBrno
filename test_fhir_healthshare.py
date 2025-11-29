#!/usr/bin/env python3
import sys
import os
import requests

# Test různých URL
urls = [
    'http://fhir-server:52773/csp/healthshare/fhirserver/fhir/r4',
    'http://fhir-server:52773/fhir/r4',
]

for url in urls:
    print(f"\n{'='*60}")
    print(f"Testing: {url}")
    print('='*60)
    try:
        # Test metadata endpoint
        response = requests.get(f"{url}/metadata", timeout=10)
        print(f"✓ Status: {response.status_code}")
        if response.status_code == 200:
            print(f"✓ Content-Type: {response.headers.get('content-type')}")
            data = response.json()
            print(f"✓ FHIR Version: {data.get('fhirVersion')}")
            print(f"✓ Resource Type: {data.get('resourceType')}")
            print(f"\n🎉 SUCCESS! Correct URL is: {url}")
            break
    except Exception as e:
        print(f"✗ Error: {e}")
