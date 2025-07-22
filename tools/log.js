function log(txt) {
  if (process.env.ENV !== "DEV") console.log(txt);
}

module.exports = { log };
