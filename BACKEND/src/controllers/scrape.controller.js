const { spawn } = require("child_process");
const path = require("path");
const logger = require("../utils/logger");

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

    python.on("close", (code) => {
      if (code !== 0) {
        logger.error(`Python scraper exited with code ${code}: ${stderr}`);
        return res.status(500).json({
          error: "Scraping failed",
          details: stderr,
        });
      }

      try {
        const result = JSON.parse(stdout);
        return res.status(200).json({
          message: "Scraping completed successfully",
          drug,
          saved: result,
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
