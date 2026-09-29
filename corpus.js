/**
 * Loads the full OAK Bulletin 2026/2 topic list (data/oak_bulletin_2026_2.json) in the background
 * and appends it to the topic-novelty corpus. The 30 curated benchmark topics stay first and unchanged.
 */
(function () {
  // IlmYolData is a top-level const in data.js, so it is not a window property.
  const corpus = typeof IlmYolData !== 'undefined' && IlmYolData.oakBenchmarkCorpus;
  if (!corpus) return;
  corpus.benchmarkCount = corpus.topics.length;

  fetch('data/oak_bulletin_2026_2.json?v=1')
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then(doc => {
      const have = new Set(corpus.topics.map(t => t.oak_registration_id));
      doc.topics.forEach(t => {
        if (have.has(t.id)) return;
        corpus.topics.push({
          corpus_id: t.id,
          test_group: 'OAK_2026_2',
          specialty_code: t.code,
          oak_registration_id: t.id,
          previous_registration_id: t.prev,
          candidate_name: t.name,
          title_original: t.title,
          title_normalized_latin: t.lat,
          supervisor_name: t.sup,
          institution: t.inst,
          degree: t.deg,
          field: t.field,
          source_page: t.page
        });
      });
      corpus.fullLoaded = true;
      console.log(`[Corpus] OAK Bulletin 2026/2 loaded: ${corpus.topics.length} topics`);
      if (typeof renderCorpusTopics === 'function') renderCorpusTopics();
      if (typeof AppState !== 'undefined' && AppState.currentView === 'topic_novelty' && typeof executeRealTopicNoveltyEngine === 'function') {
        executeRealTopicNoveltyEngine();
      }
    })
    .catch(err => console.warn('[Corpus] Full bulletin not loaded, using 30-topic test corpus.', err));
})();
