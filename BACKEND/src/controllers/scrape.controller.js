const logger = require("../utils/logger");
const { runScraper } = require("../services/redditScraper.service");

/**
 * POST /api/scrape
 * Body: { "drug": "accutane", "mode": "quick" | "full" }
 */
const handleScrape = async (req, res) => {
  try {
    const { drug, mode } = req.body;

    if (!drug) {
      return res.status(400).json({ error: "Missing required field: drug" });
    }

    logger.info(`Scrape request received for drug: "${drug}" (${mode || "quick"})`);
    const result = await runScraper(drug, mode);

    return res.status(200).json({
      message: "Scraping completed successfully",
      ...result,
    });
  } catch (error) {
    logger.error(`Scrape controller error: ${error.message}`);
    // Sanitize raw Python tracebacks so users see a friendly message
    let userMessage = "An error occurred during analysis. Please try again.";
    if (error.message?.includes("ModuleNotFoundError")) {
      userMessage = "Server is missing required dependencies. Please contact support.";
    } else if (error.message?.includes("Traceback")) {
      userMessage = "Analysis service encountered an internal error.";
    } else if (error.message) {
      userMessage = error.message;
    }
    return res.status(500).json({ error: userMessage });
  }
};

module.exports = { handleScrape };
