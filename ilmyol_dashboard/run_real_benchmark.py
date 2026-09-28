import json
import os
from validate_topic_novelty_engine import load_corpus, calculate_engine_metrics, normalize_text

def run_real_benchmark_validation():
    corpus = load_corpus()
    topics = corpus["topics"]
    pairs = corpus["benchmark_pairs"]
    
    # Map benchmark pairs by (topic_a, topic_b) and (topic_b, topic_a)
    pair_map = {}
    for p in pairs:
        pair_map[(p["topic_a"], p["topic_b"])] = p
        pair_map[(p["topic_b"], p["topic_a"])] = p
        
    benchmark_chip_ids = ["ILMYOL-001", "ILMYOL-003", "ILMYOL-013", "ILMYOL-023"]
    
    results = {}
    
    for chip_id in benchmark_chip_ids:
        source_topic = next((t for t in topics if t["corpus_id"] == chip_id), None)
        assert source_topic is not None, f"Topic {chip_id} not found!"
        
        matches = []
        for cand in topics:
            if cand["corpus_id"] == chip_id:
                continue
            metrics = calculate_engine_metrics(source_topic, cand)
            
            # Check if this pair has a defined benchmark expectation
            bm_pair = pair_map.get((chip_id, cand["corpus_id"]))
            expected_label = bm_pair["expected_label"] if bm_pair else "N/A"
            expected_band = bm_pair["expected_score_band_pct"] if bm_pair else "N/A"
            rationale = bm_pair["rationale"] if bm_pair else ""
            
            # Validation rule evaluation
            status = "PASS"
            if bm_pair:
                min_b, max_b = map(int, expected_band.split("-"))
                score = metrics["final_score"]
                if score < min_b:
                    diff = min_b - score
                    status = "WARNING" if diff <= 5 else "FAIL"
                elif score > max_b:
                    diff = score - max_b
                    status = "WARNING" if diff <= 5 else "FAIL"
                else:
                    status = "PASS"
            
            matches.append({
                "cand_id": cand["corpus_id"],
                "cand_title": cand["title_normalized_latin"],
                "cand_title_orig": cand["title_original"],
                "cand_author": cand["candidate_name"],
                "cand_institution": cand["institution"],
                "cand_specialty": cand["specialty_code"],
                "cand_oak_id": cand["oak_registration_id"],
                "metrics": metrics,
                "expected_label": expected_label,
                "expected_band": expected_band,
                "rationale": rationale,
                "status": status
            })
            
        # Sort matches by final_score descending
        matches.sort(key=lambda m: m["metrics"]["final_score"], reverse=True)
        top_5 = matches[:5]
        
        # Specific benchmark verification rules
        acceptance_checks = []
        if chip_id == "ILMYOL-001":
            # Must find ILMYOL-002 as top match with score 99-100%
            top_m = top_5[0]
            is_002 = (top_m["cand_id"] == "ILMYOL-002")
            score_ok = (99 <= top_m["metrics"]["final_score"] <= 100)
            acceptance_checks.append({
                "rule": "Must find ILMYOL-002 with 99-100% similarity",
                "result": f"Found {top_m['cand_id']} with {top_m['metrics']['final_score']}%",
                "passed": is_002 and score_ok
            })
        elif chip_id == "ILMYOL-003":
            # AI + journalism topics should rank high. Should not classify them automatically as duplicates.
            top_ids = [m["cand_id"] for m in top_5[:2]]
            ai_journalism_present = ("ILMYOL-004" in top_ids or "ILMYOL-005" in top_ids)
            not_duplicate = all(m["metrics"]["final_score"] < 95 for m in top_5)
            acceptance_checks.append({
                "rule": "AI + journalism topics should rank high, not classified as duplicates (<95%)",
                "result": f"Top ranks: {[m['cand_id'] + ' (' + str(m['metrics']['final_score']) + '%)' for m in top_5[:2]]}",
                "passed": ai_journalism_present and not_duplicate
            })
        elif chip_id == "ILMYOL-013":
            # PR communication topics should rank above unrelated media topics
            pr_ranks = [m["cand_id"] for m in top_5 if "PR" in m["cand_title"] or "PR" in m["cand_title_orig"]]
            top_match_is_pr = (top_5[0]["cand_id"] == "ILMYOL-014")
            acceptance_checks.append({
                "rule": "PR communication topics (ILMYOL-014) rank above unrelated media topics",
                "result": f"Top match is {top_5[0]['cand_id']} ({top_5[0]['metrics']['final_score']}%)",
                "passed": top_match_is_pr
            })
        elif chip_id == "ILMYOL-023":
            # Lexical trap: technical AI text analysis (05.01.11). Must NOT receive high similarity merely because of lexical words.
            media_scores = [m["metrics"]["final_score"] for m in matches if m["cand_id"] in ["ILMYOL-003", "ILMYOL-006"]]
            max_media_score = max(media_scores) if media_scores else 0
            safe_from_trap = (max_media_score <= 30)
            acceptance_checks.append({
                "rule": "Lexical trap test: Media topics must not receive high similarity due to shared AI/text words (<=30%)",
                "result": f"Media topic max score is {max_media_score}%",
                "passed": safe_from_trap
            })
            
        results[chip_id] = {
            "source_id": source_topic["corpus_id"],
            "source_title": source_topic["title_normalized_latin"],
            "source_specialty": source_topic["specialty_code"],
            "source_author": source_topic["candidate_name"],
            "source_institution": source_topic["institution"],
            "source_oak_id": source_topic["oak_registration_id"],
            "top_5": top_5,
            "acceptance_checks": acceptance_checks
        }
        
    out_path = os.path.join(os.path.dirname(__file__), "real_benchmark_validation_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print(f"Validation completed successfully. Output saved to {out_path}")
    return results

if __name__ == "__main__":
    run_real_benchmark_validation()
