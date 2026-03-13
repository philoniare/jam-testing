import { runMinifuzzTest } from "./common.js";

const TRACES_DIR = "minifuzz-traces/storage_light";
runMinifuzzTest("storage_light", TRACES_DIR, 100);
