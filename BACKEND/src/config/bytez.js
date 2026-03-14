const Bytez = require('bytez.js');

// Initialize Bytez SDK with the API key
const bytezKey = process.env.BYTEZ_API_KEY;
const sdk = new Bytez(bytezKey);

// Use the biomedical NER model for extracting medical entities
const biomedicalNerModel = sdk.model("d4data/biomedical-ner-all");

module.exports = {
  sdk,
  biomedicalNerModel
};
