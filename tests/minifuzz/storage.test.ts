import { runMinifuzzTest } from "./common.js";

const TRACES_DIR = "minifuzz-traces/storage";
runMinifuzzTest("storage", TRACES_DIR, 100);
