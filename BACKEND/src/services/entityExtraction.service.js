const { biomedicalNerModel } = require('../config/bytez');
const { parseExtractedEntities } = require('../utils/medicalParser');
const { getCache, setCache } = require('../utils/cache');
const { withRetry } = require('../utils/aiPatterns');

/**
 * Extracts medical entities from text using the Bytez biomedical-ner-all model.
 * The model performs Named Entity Recognition (NER) to identify drugs, symptoms,
 * dosages, and other medical terms from Reddit comments.
 */
const extractEntities = async (commentId) => {
  try {
    const cacheKey = `extract_${commentId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[Cache hit] Extract entities for ${commentId}`);
      return cached;
    }

    // In a real scenario, fetch the comment from DB:
    // const comment = await CommentModel.findById(commentId);
    // const text = comment.body;
    
    // For now, mock the text:
    const text = `I took 20mg of Accutane and by Week 2 I had severe dry lips.`;

    console.log(`[Bytez NER] Running biomedical-ner-all model for comment ${commentId}`);

    // Use the Bytez SDK to run the biomedical NER model with retry logic
    const nerOutput = await withRetry(async () => {
      const { error, output } = await biomedicalNerModel.run(text);
      if (error) {
        throw new Error(`Bytez API error: ${error}`);
      }
      return output;
    }, 3, 1000);

    console.log(`[Bytez NER] Raw output:`, JSON.stringify(nerOutput, null, 2));

    // Transform NER output into our expected entity format
    // The biomedical-ner-all model returns entities like:
    // [{ entity_group: "Drug", word: "Accutane", score: 0.99 }, ...]
    const extractedData = transformNerOutput(nerOutput);

    // Run through the medical parser for additional normalization
    const result = parseExtractedEntities(extractedData);
    
    setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error(`Error extracting entities after retries: ${error.message}`);
    // Return graceful fallback rather than crashing the app
    return parseExtractedEntities({
      drug: null,
      side_effect: null,
      dosage: null,
      timeline_marker: null
    });
  }
};

/**
 * Transforms raw NER model output into our structured entity format.
 * Maps entity groups from the biomedical model to our schema fields.
 */
const transformNerOutput = (nerEntities) => {
  const result = {
    drug: null,
    side_effect: null,
    dosage: null,
    timeline_marker: null
  };

  if (!Array.isArray(nerEntities)) {
    console.warn('[Bytez NER] Unexpected output format, returning empty extraction');
    return result;
  }

  for (const entity of nerEntities) {
    const group = (entity.entity_group || entity.entity || '').toLowerCase();
    const word = (entity.word || '').trim();

    if (!word) continue;

    // Map biomedical NER entity groups to our schema
    if (group.includes('drug') || group.includes('chemical')) {
      result.drug = result.drug || word;
    } else if (group.includes('disease') || group.includes('symptom') || group.includes('sign_symptom')) {
      result.side_effect = result.side_effect || word;
    } else if (group.includes('dosage') || group.includes('dose')) {
      result.dosage = result.dosage || word;
    } else if (group.includes('duration') || group.includes('time') || group.includes('frequency')) {
      result.timeline_marker = result.timeline_marker || word;
    }
  }

  return result;
};

module.exports = {
  extractEntities
};
