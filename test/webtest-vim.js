import {EditorState, EditorView, basicSetup} from "@codemirror/basic-setup"
import { CodeMirror, Vim, vim} from ".."
import {html} from "@codemirror/lang-html"
import {javascript} from "@codemirror/lang-javascript"
import ist from "ist";
import tests from "./vim_test.js"

describe("Vim extension", () => {
    var root
    var Pos = CodeMirror.Pos;
    function addRoot() {
        if (!root) {
            root = document.createElement("div")
            root.id = "testground"
            root.style.height = "500px";
        }
        document.body.appendChild(root)
    }
    addRoot()
    /**@type {EditorView}*/
    var lastView
    function CM(place, options) {
        addRoot()
        if (lastView) lastView.destroy()
        var state = EditorState.create({
            doc: options.value,
            extensions: [
                vim({}),
                basicSetup,
                javascript(),
            ]
        });
        
        var view =  new EditorView({
            state, 
            parent: root
        })
        lastView = view

        return view.cm
    }
    CM.Vim = Vim;
    CM.Pos = function(a,b) {
        return new Pos(a,b)
    }
    CM.commands = CodeMirror.commands
    function transformTest(name, fn) {
        return it(name, function() {
            fn()
            if (lastView) {
                // TODO without calling destroy old cm instances throw errors and break the test runner
                lastView.destroy()
                lastView = null;
            }
        })
    }
    tests(CM, transformTest, ist)
    
    // var defs = [];
    // var runTimeout
    //     defs.push([name, fn])
    //     // 
    //     if (!runTimeout) runTimeout = setTimeout(run, 10)
    // })
    // var i = 0
    // var failed = 0;
    // var passed = 0
    // function run() {
    //     while (i < defs.length) {
    //         let hadError = true
    //         let [name, fn] = defs[i];
    //         i++;
    //         console.log(`[${i}/${defs.length}] -- ${name} --`)
    //         try {
    //             fn()
    //             hadError = false
    //             passed++
    //         } catch(e) {
    //             console.error(e)
    //             failed++
    //         }
    //         //     if (hadError) setTimeout(run)
    //         //     failed++
    //         // }
    //     }
    //     console.log("---------------------------------")
    //     console.log(defs.length, passed, failed)
    //     console.log("---------------------------------")
    // }
});
