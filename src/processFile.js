const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Process a single file: add timecode using ffmpeg.
 *
 * @param {string} inputFile - Path to the video file.
 * @param {Object} options - Options for processing.
 * @param {boolean} [options.destructive=false] - If true, delete the original file after processing.
 * @param {string} [options.rename] - A string to use as the new filename prefix.
 * @param {string} [options.start] - Optional initial timecode in hh:mm:ss:ff format.
 * @param {number} [options.framerate=24] - Frame rate to use when calculating timecode.
 * @returns {Promise<Object>} - Resolves with an object containing the timecode, output file path, and formatted creation time.
 */
function addTimecode(inputFile, options = {}) {
  return new Promise((resolve, reject) => {
    fs.stat(inputFile, (err, stats) => {
      if (err) {
        return reject(new Error(`Error reading file stats: ${err.message}`));
      }

      const framerate = options.framerate || 24;
      let timecode;
      let createdTimeFormatted;

      if (options.start) {
        // Validate that the provided start timecode is in the format hh:mm:ss:ff.
        const timecodeRegex = /^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
        const match = options.start.match(timecodeRegex);
        if (!match) {
          return reject(new Error('The provided start timecode must be in the format hh:mm:ss:ff'));
        }
        const frameValue = parseInt(match[4], 10);
        if (frameValue >= framerate) {
          return reject(new Error(`Frame number in start timecode must be less than the frame rate (${framerate}).`));
        }
        timecode = options.start;

        // For logging purposes, also format the file's creation time.
        const created = stats.birthtime;
        const hours = String(created.getHours()).padStart(2, '0');
        const minutes = String(created.getMinutes()).padStart(2, '0');
        const seconds = String(created.getSeconds()).padStart(2, '0');
        const milliseconds = String(created.getMilliseconds()).padStart(3, '0');
        createdTimeFormatted = `${hours}:${minutes}:${seconds}.${milliseconds}`;
      } else {
        const created = stats.birthtime;
        const hours = String(created.getHours()).padStart(2, '0');
        const minutes = String(created.getMinutes()).padStart(2, '0');
        const seconds = String(created.getSeconds()).padStart(2, '0');
        const milliseconds = String(created.getMilliseconds()).padStart(3, '0');
        createdTimeFormatted = `${hours}:${minutes}:${seconds}.${milliseconds}`;

        // Calculate frame number from the milliseconds using the given framerate.
        const frames = Math.floor((created.getMilliseconds() / 1000) * framerate);
        const framesStr = String(frames).padStart(2, '0');
        timecode = `${hours}:${minutes}:${seconds}:${framesStr}`;
      }

      console.log(`File creation time: ${createdTimeFormatted}`);
      console.log(`Using video timecode: ${timecode}`);

      // Build the output filename.
      const dir = path.dirname(inputFile);
      const ext = path.extname(inputFile);
      let outputFile;
      // Remove colons from the timecode to build a valid filename.
      const timecodeNoColons = timecode.replace(/:/g, '');
      if (options.rename) {
        outputFile = path.join(dir, `${options.rename}_${timecodeNoColons}${ext}`);
      } else {
        const base = path.basename(inputFile, ext);
        outputFile = path.join(dir, `${base}_tc${ext}`);
      }

      // Build the ffmpeg command with -map 0 to include all streams.
      const cmd = `ffmpeg -y -i "${inputFile}" -timecode "${timecode}" -map 0 -c copy "${outputFile}"`;
      console.log(`Executing ffmpeg command:\n${cmd}\n`);

      try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`Timecode ${timecode} added successfully to ${outputFile}`);

        // If destructive mode is enabled, delete the original file and rename the new one.
        if (options.destructive) {
          fs.unlinkSync(inputFile);
          fs.renameSync(outputFile, inputFile);
          console.log(`Replaced original file with updated file.`);
          outputFile = inputFile;
        }

        resolve({ timecode, outputFile, createdTimeFormatted });
      } catch (e) {
        reject(new Error(`Error executing ffmpeg: ${e.message}`));
      }
    });
  });
}

module.exports = addTimecode;
