import { runPicofuzzTest } from "./common.js";

const EXAMPLES_DIR = "picofuzz-stf-data/picofuzz-data/storage";
runPicofuzzTest("storage", EXAMPLES_DIR);
