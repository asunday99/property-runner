try {
    eval(new ActiveXObject("Scripting.FileSystemObject").OpenTextFile("last_script.js", 1).ReadAll());
    WScript.Echo("Syntax OK");
} catch(e) {
    WScript.Echo("Error: " + e.description + " on line " + e.line);
}
