import minimist from "minimist";

export type Args = {
  directory: string;
  socket: string;
  repeat: number;
  flavour: "tiny" | "full";
  mode: "default" | "jam-traces";
  output?: string;
  ignore: string[];
};

export function parseArgs(): Args {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      s: "stats",
      f: "flavour",
      r: "repeat",
      m: "mode",
      h: "help",
    },
    default: {
      repeat: 1,
      mode: "default",
    },
    string: ["directory", "socket", "mode", "ignore"],
  });

  if (argv.help) {
    console.log("Usage: picofuzz [options] <directory> <socket>");
    console.log("");
    console.log("Options:");
    console.log("  -f, --flavour <spec>      JAM spec: tiny | full (default: tiny)");
    console.log("  -m, --mode    <mode>      Processing mode: default | jam-traces (default: default)");
    console.log("  -r, --repeat  <count>     Number of repetitions (default: 1)");
    console.log("  -s, --stats   <file>      Append aggregated stats to a CSV file");
    console.log("  --ignore      <file>      Ignore specific .bin files (can be repeated)");
    console.log("  -h, --help                Show help");
    console.log("");
    console.log("Positional arguments:");
    console.log("  picofuzz <directory> <socket> [repeat]");
    process.exit(0);
  }

  // Support both flag-based and positional arguments
  const directory = argv._[0];
  const socket = argv._[1];
  const repeat = argv.repeat;
  const flavour = argv.flavour ?? "tiny";
  const mode = argv.mode ?? "default";
  const output = argv.stats;

  if (!directory || !socket) {
    console.error("Error: directory and socket are required");
    console.error("Usage: picofuzz [options] <directory> <socket>");
    console.error("Use --help for more information");
    process.exit(1);
  }

  if (Number.isNaN(repeat) || repeat < 1) {
    console.error(`Invalid repeat value: ${repeat}`);
    console.error("Repeat must be a positive number");
    process.exit(1);
  }

  if (flavour !== "tiny" && flavour !== "full") {
    console.error(`Invalid flavour value: ${flavour}`);
    console.error("Must be either 'tiny' or 'full'");
    process.exit(1);
  }

  if (mode !== "default" && mode !== "jam-traces") {
    console.error(`Invalid mode value: ${mode}`);
    console.error("Must be either 'default' or 'jam-traces'");
    process.exit(1);
  }

  const ignoreRaw = argv.ignore;
  const ignore: string[] = ignoreRaw === undefined ? [] : Array.isArray(ignoreRaw) ? ignoreRaw : [ignoreRaw];

  return {
    directory,
    socket,
    repeat,
    flavour,
    mode,
    output,
    ignore,
  };
}
