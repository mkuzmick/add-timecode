#!/usr/bin/env node
const { addTimecode, watchFolder } = require('../index');
const argv = require('yargs')
  .usage('Usage: add-timecode <file> [options] or add-timecode --watch <folder> [options]')
  .option('destructive', {
    alias: 'd',
    type: 'boolean',
    description: 'Delete original file after processing',
    default: false,
  })
  .option('rename', {
    alias: 'r',
    type: 'string',
    description: 'String to use as the new filename prefix (without colons)',
  })
  .option('start', {
    alias: 's',
    type: 'string',
    description: 'Optional initial timecode in hh:mm:ss:ff format',
  })
  .option('framerate', {
    alias: 'f',
    type: 'number',
    description: 'Frame rate as an integer (default is 24)',
    default: 24,
  })
  .option('watch', {
    alias: 'w',
    type: 'string',
    description: 'Path to a folder to watch for new files',
  })
  // Instead of demanding a positional command, we add a check:
  .check((argv) => {
    if (!argv.watch && argv._.length === 0) {
      throw new Error("You must provide a video file or a folder to watch");
    }
    return true;
  })
  .help()
  .argv;

const options = {
  destructive: argv.destructive,
  start: argv.start,
  framerate: argv.framerate,
};
if (argv.rename !== undefined) {
  options.rename = argv.rename;
}

if (argv.watch) {
  watchFolder(argv.watch, options);
} else {
  const inputFile = argv._[0];
  addTimecode(inputFile, options)
    .then(({ timecode, outputFile, createdTimeFormatted }) => {
      console.log(`Operation complete: determined file creation time as ${createdTimeFormatted} and added timecode starting with ${timecode}`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
