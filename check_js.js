import System;
import Microsoft.JScript;
import System.CodeDom.Compiler;

var compiler = new JScriptCodeProvider();
var parameters = new CompilerParameters();
parameters.GenerateExecutable = false;
var results = compiler.CompileAssemblyFromSource(parameters, System.IO.File.ReadAllText('last_script.js'));
foreach (var err in results.Errors) {
    Console.WriteLine(err);
}
