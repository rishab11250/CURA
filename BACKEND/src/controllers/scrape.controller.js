const { spawn } = require("child_process");
const path = require("path");
const logger = require("../utils/logger");
const { processScrapedComments } = require("../services/pipeline.service");

/**
 * POST /api/scrape
 * Body: { "drug": "accutane", "mode": "quick" | "full" }
 *
 * Spawns the Python scraper script and streams the result back.
 * mode defaults to "quick" (~1-2 min) for live API calls.
 * Use "full" for comprehensive overnight data collection.
 */
const handleScrape = async (req, res) => {
  try {
    const { drug, mode } = req.body;

    if (!drug) {
      return res.status(400).json({ error: "Missing required field: drug" });
    }

    const scrapeMode = mode === "full" ? "--full" : "--quick";
    logger.info(`Scrape request received for drug: "${drug}" (${scrapeMode})`);

    const scriptPath = path.join(__dirname, "../../scripts/scraper.py");

    const python = spawn("python", [scriptPath, drug, scrapeMode], {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", async (code) => {
      if (code !== 0) {
        logger.error(`Python scraper exited with code ${code}: ${stderr}`);
        return res.status(500).json({
          error: "Scraping failed",
          details: stderr,
        });
      }

      try {
        const result = JSON.parse(stdout);

        // Auto-trigger the NER pipeline to generate Insights from new comments
        logger.info(`[Pipeline] Starting post-scrape analysis for "${drug}"...`);
        let pipelineResult = null;
        try {
          pipelineResult = await processScrapedComments(drug);
          logger.info(`[Pipeline] Generated ${pipelineResult.processed} insights for "${drug}"`);
        } catch (pipelineError) {
          logger.error(`[Pipeline] Failed: ${pipelineError.message}`);
          // Don't fail the whole request — scraping still succeeded
        }

        return res.status(200).json({
          message: "Scraping completed successfully",
          drug,
          saved: result,
          pipeline: pipelineResult,
        });
      } catch (parseError) {
        logger.error(`Failed to parse scraper output: ${stdout}`);
        return res.status(500).json({
          error: "Failed to parse scraper output",
          raw: stdout,
        });
      }
    });
  } catch (error) {
    logger.error(`Scrape controller error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleScrape };
