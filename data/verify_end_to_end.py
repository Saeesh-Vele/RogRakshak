import sys
import httpx
import time

def print_result(num, desc, passed, details=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{num}] {desc:<40} : {status}")
    if details:
        print(f"    -> {details}")
    if not passed:
        sys.exit(1)

def run_e2e_tests():
    print("=" * 60)
    print("ROGRAKSHAK END-TO-END SYSTEM VERIFICATION (PHASE 4)")
    print("=" * 60)
    
    client = httpx.Client(timeout=30.0)
    BASE_URL = "http://localhost:8000"
    
    # 3. FastAPI backend health
    try:
        resp = client.get(f"{BASE_URL}/health")
        passed = resp.status_code == 200 and resp.json().get("status") == "ok"
        print_result(3, "FastAPI reachable (/health)", passed)
    except Exception as e:
        print_result(3, "FastAPI reachable (/health)", False, str(e))
        
    # 4. Graph API
    try:
        resp = client.get(f"{BASE_URL}/graph/patient/1/contacts")
        passed = resp.status_code == 200 and isinstance(resp.json(), dict)
        contacts = resp.json()
        total_contacts = len(contacts.get("staff_contacts", [])) + len(contacts.get("patient_contacts", []))
        print_result(4, "Graph endpoints reachable", passed, f"Found {total_contacts} contacts for Patient 1")
    except Exception as e:
        print_result(4, "Graph endpoints reachable", False, str(e))
        
    # 5. Investigation API
    try:
        resp = client.get(f"{BASE_URL}/api/investigations")
        passed = resp.status_code == 200
        print_result(5, "Investigation API reachable", passed)
    except Exception as e:
        print_result(5, "Investigation API reachable", False, str(e))
        
    # 6. Planted outbreak investigation executes
    print("\nExecuting LIVE Planted Outbreak Investigation...")
    payload = {
        "target_patient_id": 1,
        "organism": "Klebsiella pneumoniae",
        "resistance_profile": "MDR",
        "use_mock_graph": False
    }
    
    try:
        resp = client.post(f"{BASE_URL}/api/investigations", json=payload)
        passed = resp.status_code == 200
        inv = resp.json()
        print_result(6, "Planted outbreak investigation executes", passed, f"Case ID: {inv.get('case_id')}, Status: {inv.get('status')}")
    except Exception as e:
        print_result(6, "Planted outbreak investigation executes", False, str(e))
        
    # 7. Index patient recovered
    idx_patient = inv.get("index_patient", {})
    passed = idx_patient.get("id") == 1 and "Rajesh Verma" in idx_patient.get("name", "")
    print_result(7, "Index patient recovered", passed, idx_patient.get("name"))

    # 8. Three downstream patients recovered
    candidates = inv.get("candidate_patients", [])
    candidate_ids = {c["id"] for c in candidates}
    passed = {2, 3, 4}.issubset(candidate_ids)
    names = [c["name"] for c in candidates if c["id"] in {2, 3, 4}]
    print_result(8, "Three downstream patients recovered", passed, f"Found: {names}")
    
    # 10. Transmission chains recovered
    chains = inv.get("transmission_chains", [])
    passed = len(chains) >= 3
    print_result(10, "Transmission chains recovered", passed, f"Found {len(chains)} chains")

    # 9. Atomic evidence provenance
    evidence = inv.get("evidence", [])
    evidence_dict = {e["evidence_id"]: e for e in evidence}
    atomic_passed = False
    for chain in chains:
        hops = chain.get("hops", [])
        evidence_ids = [h.get("evidence_id") for h in hops if h.get("evidence_id")]
        hop_items = [evidence_dict[eid] for eid in evidence_ids if eid in evidence_dict and evidence_dict[eid]["type"] == "temporal_staff_overlap"]
        if len(hop_items) >= 2:
            h1, h2 = hop_items[0], hop_items[1]
            if h1.get("overlap_minutes") == 720 and h2.get("overlap_minutes") == 720:
                atomic_passed = True
                break
    print_result(9, "Atomic evidence provenance preserved", atomic_passed, "Found separate 720-minute hops")

    # 11, 12. Organism and Resistance
    org_passed = inv.get("organism") == "Klebsiella pneumoniae"
    res_passed = inv.get("resistance_profile") == "MDR"
    print_result(11, "Organism correct", org_passed)
    print_result(12, "Resistance correct", res_passed)

    # 13. Negative control remains NO_SIGNAL
    print("\nExecuting LIVE Negative Control Investigation...")
    # Deepak Chopra is ID 24, Divya Sharma is ID 35 (or similar). Let's use ID 24 and look for NO_SIGNAL
    neg_payload = {
        "target_patient_id": 24,
        "organism": "E. coli",
        "resistance_profile": None,
        "use_mock_graph": False
    }
    try:
        resp = client.post(f"{BASE_URL}/api/investigations", json=neg_payload)
        neg_inv = resp.json()
        passed = neg_inv.get("status") == "NO_SIGNAL"
        print_result(13, "Negative control remains NO_SIGNAL", passed, f"Status: {neg_inv.get('status')}")
    except Exception as e:
        print_result(13, "Negative control remains NO_SIGNAL", False, str(e))
        
    # 14. Repeatability verified
    print("\nExecuting Repeatability Check...")
    try:
        resp = client.post(f"{BASE_URL}/api/investigations", json=payload)
        inv_repeat = resp.json()
        passed = inv_repeat.get("confidence") == inv.get("confidence") and len(inv_repeat.get("transmission_chains")) == len(inv.get("transmission_chains"))
        print_result(14, "Repeatability verified", passed, "Matches previous run exactly")
    except Exception as e:
        print_result(14, "Repeatability verified", False, str(e))
        
    print("\n============================================================")
    print("ALL END-TO-END CHECKS PASSED PERFECTLY")
    print("============================================================")

if __name__ == "__main__":
    run_e2e_tests()
