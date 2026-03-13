import { runMinifuzzTest } from "./common.js";

const TRACES_DIR = "minifuzz-traces/safrole";
runMinifuzzTest("safrole", TRACES_DIR, 100);
