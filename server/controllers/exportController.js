import Project from "../models/Project.js";
import { projectMarkdown, writeProjectPdf } from "../services/exportService.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";

export async function exportProject(req, res) {
  // TODO: Load the project, build the download file name from its startup name, and stream
  // TODO: the json, markdown, or pdf export, rejecting unsupported formats with 400.
  res.status(501).json({ message: "Project export is not implemented yet" });
}
