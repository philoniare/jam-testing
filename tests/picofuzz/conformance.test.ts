import { runPicofuzzTest } from "./common.js";

const EXAMPLES_DIR = "picofuzz-conformance-data/picofuzz-data";
runPicofuzzTest("conformance", EXAMPLES_DIR, {
  repeat: 1,
  ignore: [],
});
