import "./mockdom"

global.location = require("url").parse("http://localhost:5353/");
global.document.location = global.location;

console.log("789")
var suites = Object.create(null)
globalThis.describe = function(name, fn) {
    var suite = {
        name,
        construct: fn,
        tests: Object.create(null),
        skipped: Object.create(null),
        it: function (name, fn) {
            this.tests[name] = fn;
        },
        skip: function (name, fn) {
            this.skipped[name] = fn;
        },
    };
    suites[name] = suite;
    globalThis.it = suite.it = suite.it.bind(suite);
    it.skip = suite.skip.bind(suite);
    suite.construct(); 
    
    async function run() {
        var total = 0;
        var skipped = 0;
        var failed = 0;
        var passed = 0;
        for (var suite of Object.values(suites)) {
            var skippedFromSuite = Object.keys(suite.skipped).length;
            skipped += skippedFromSuite
            total += Object.keys(suite.tests).length
                + skippedFromSuite;
            for (var i in suite.tests) {
                console.log(i)
                try {
                    await suite.tests[i]()
                    passed++
                } catch(e) {
                    failed++
                    console.error(e)
                }
                return
            }
        }
        console.log(`
            failed: ${failed}
            passed: ${passed},
            skipped: ${skipped},
            from: ${total}
        `)
    }
    
    run()
}

import("./webtest-vim")