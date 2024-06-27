var fs = require("fs")
var json = fs.readFileSync(__dirname + "/../package.json", "utf-8")
var version = JSON.parse(json).version

console.log(version)
function replace(path) {
    var value = fs.readFileSync(path, "utf-8")
    value = value.replace("<DEV>", version);
    fs.writeFileSync(path, value , "utf-8")
}

replace(__dirname + "/../dist/index.js")
replace(__dirname + "/../dist/index.cjs")