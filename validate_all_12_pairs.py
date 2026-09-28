import json
import os
from test_pair_01_first import load_corpus, calculateTopicSimilarity

def run_all_12_benchmark_pairs():
    corpus = load_corpus()
    topics = {t["corpus_id"]: t for t in corpus["topics"]}
    pairs = corpus["benchmark_pairs"]
    
    results = []
    passed = 0
    warnings = 0
    failed = 0
    
    print("=== LIVE ENGINE BENCHMARK VALIDATION (12 PAIRS) ===")
    print("Executing calculateTopicSimilarity(topicA, topicB) for all pairs...\n")
    
    for p in pairs:
        tA = topics[p["topic_a"]]
        tB = topics[p["topic_b"]]
        
        # REQUIREMENT 1 & 2:
        # actualScore = calculateTopicSimilarity(topicA, topicB)
        # then compare: actualScore vs expected_score_band
        # then determine: PASS / WARNING / FAIL
        calc = calculateTopicSimilarity(tA, tB)
        actual_score = calc["final_score"]
        
        expected_band = p["expected_score_band_pct"]
        min_b, max_b = map(int, expected_band.split("-"))
        
        diff = 0
        if actual_score < min_b:
            diff = actual_score - min_b
            status = "WARNING" if abs(diff) <= 5 else "FAIL"
        elif actual_score > max_b:
            diff = actual_score - max_b
            status = "WARNING" if abs(diff) <= 5 else "FAIL"
        else:
            diff = 0
            status = "PASS"
            
        if status == "PASS":
            passed += 1
        elif status == "WARNING":
            warnings += 1
        else:
            failed += 1
            
        results.append({
            "pair_id": p["pair_id"],
            "topic_a": p["topic_a"],
            "topic_b": p["topic_b"],
            "expected_label": p["expected_label"],
            "expected_band": expected_band,
            "actual_score": actual_score,
            "diff": diff,
            "status": status,
            "calc_breakdown": {
                "lexical_similarity": calc["lexical_similarity"],
                "semantic_similarity": calc["semantic_similarity"],
                "domain_similarity": calc["domain_similarity"],
                "concept_similarity": calc["concept_similarity"],
                "exact_match": calc["exact_match"],
                "classification": calc["classification"]
            },
            "rationale": p["rationale"]
        })
        
        print(f"[{p['pair_id']}] {p['topic_a']} vs {p['topic_b']}: actual={actual_score}%, expected={expected_band}%, status={status}")

    print(f"\nSummary: Total={len(pairs)}, PASS={passed}, WARNING={warnings}, FAIL={failed}")
    
    with open("live_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "summary": {
                "total": len(pairs),
                "passed": passed,
                "warnings": warnings,
                "failed": failed
            },
            "results": results
        }, f, ensure_ascii=False, indent=2)
        
    return results

if __name__ == "__main__":
    run_all_12_benchmark_pairs()
