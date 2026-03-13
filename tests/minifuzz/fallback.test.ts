import { runMinifuzzTest } from "./common.js";

const TRACES_DIR = "minifuzz-traces/fallback";
runMinifuzzTest("fallback", TRACES_DIR, 100);
